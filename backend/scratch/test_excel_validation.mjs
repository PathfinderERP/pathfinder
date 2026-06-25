import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import xlsx from "xlsx";
import { fileURLToPath } from "url";

// Models
import ClassSchedule from "../models/Academics/ClassSchedule.js";
import AcademicsSubject from "../models/Academics/Academics_subject.js";
import User from "../models/User.js";
import Centre from "../models/Master_data/Centre.js";
import Batch from "../models/Master_data/Batch.js";
import ExamTag from "../models/Master_data/ExamTag.js";
import AcademicsClass from "../models/Academics/Academics_class.js";
import AcademicsChapter from "../models/Academics/Academics_chapter.js";
import AcademicsTopic from "../models/Academics/Academics_topic.js";
import Session from "../models/Master_data/Session.js";
import Subject from "../models/Master_data/Subject.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function run() {
    try {
        const MONGO_URL = process.env.MONGO_URL;
        console.log("Connecting to MongoDB at:", MONGO_URL);
        await mongoose.connect(MONGO_URL);
        console.log("Connected successfully.");

        // 1. Fetch valid master data for building the test excel row
        console.log("\nSearching for valid database entries...");

        const batch = await Batch.findOne({});
        if (!batch) throw new Error("No Batch found in DB");
        const batchName = batch.batchName || batch.name;
        console.log(`- Batch: ${batchName} (${batch._id})`);

        const centre = await Centre.findOne({});
        if (!centre) throw new Error("No Center found in DB");
        const centreName = centre.centreName || centre.name;
        console.log(`- Center: ${centreName} (${centre._id})`);

        const subject = await Subject.findOne({});
        if (!subject) throw new Error("No Master Subject found in DB");
        console.log(`- Subject: ${subject.subName} (${subject._id})`);

        const teacher = await User.findOne({ role: "teacher" });
        if (!teacher) throw new Error("No teacher found in DB");
        console.log(`- Teacher: ${teacher.name} (${teacher._id})`);

        const sessionDoc = await Session.findOne({});
        if (!sessionDoc) throw new Error("No Session found in DB");
        console.log(`- Session: ${sessionDoc.sessionName} (${sessionDoc._id})`);

        const exam = await ExamTag.findOne({});
        if (!exam) throw new Error("No Exam found in DB");
        const examName = exam.name || exam.tagName;
        console.log(`- Exam: ${examName} (${exam._id})`);

        const acadClass = await AcademicsClass.findOne({});
        if (!acadClass) throw new Error("No Academic Class found in DB");
        console.log(`- Academic Class: ${acadClass.className} (${acadClass._id})`);

        // Check or create AcademicsSubject linking the academic class and master subject
        let acadSubject = await AcademicsSubject.findOne({ classId: acadClass._id, masterSubjectId: subject._id });
        if (!acadSubject) {
            console.log("No AcademicsSubject found linking class and subject. Creating one for testing...");
            acadSubject = new AcademicsSubject({ classId: acadClass._id, masterSubjectId: subject._id });
            await acadSubject.save();
        }
        console.log(`- Academics Subject linked: Class (${acadClass.className}) <-> Subject (${subject.subName})`);

        // Find or create a chapter for this academics subject
        let chapter = await AcademicsChapter.findOne({ subjectId: acadSubject._id });
        if (!chapter) {
            console.log("No AcademicsChapter found. Creating one for testing...");
            chapter = new AcademicsChapter({ chapterName: "Test Chapter 1", subjectId: acadSubject._id });
            await chapter.save();
        }
        console.log(`- Chapter: ${chapter.chapterName} (${chapter._id})`);

        // Find or create a topic for this chapter
        let topic = await AcademicsTopic.findOne({ chapterId: chapter._id });
        if (!topic) {
            console.log("No AcademicsTopic found. Creating one for testing...");
            topic = new AcademicsTopic({
                topicName: "Test Topic 1",
                chapterId: chapter._id,
                subjectId: acadSubject._id,
                classId: acadClass._id
            });
            await topic.save();
        }
        console.log(`- Topic: ${topic.topicName} (${topic._id})`);

        // 2. Generate a temporary Excel file
        const testData = [
            {
                "Class Name": "Verification Automated Test Class",
                "Date": "2026-07-01",
                "Class Mode": "Offline",
                "Start Time": "14:00",
                "Class Hours": 1.5,
                "End Time": "15:30",
                "Subject": subject.subName,
                "Teacher": teacher.name,
                "Session": sessionDoc.sessionName,
                "Exam": examName,
                "Center": centreName,
                "Batch": batchName,
                "Academic Class": acadClass.className,
                "Chapter Name": chapter.chapterName,
                "Topic Names": topic.topicName,
                "Message": "This is a dry-run test"
            }
        ];

        const tempFilePath = path.join(__dirname, "temp_test_import.xlsx");
        const ws = xlsx.utils.json_to_sheet(testData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
        xlsx.writeFile(wb, tempFilePath);
        console.log(`\nTemporary test excel file written to: ${tempFilePath}`);

        // 3. Emulate importClassesExcel function logic locally
        console.log("\nEmulating importClassesExcel database lookups and insert logic...");
        const errors = [];
        const classesToInsert = [];

        // Center authorization logic
        const userRole = "superAdmin"; // superAdmin bypasses authorization checks

        const rows = xlsx.utils.sheet_to_json(wb.Sheets["Sheet1"]);
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNumber = i + 2;

            // Enforce required fields
            const requiredFields = [
                'Class Name', 
                'Date', 
                'Class Mode', 
                'Start Time', 
                'Class Hours',
                'End Time', 
                'Center', 
                'Batch', 
                'Subject', 
                'Teacher', 
                'Session',
                'Exam',
                'Academic Class',
                'Chapter Name',
                'Topic Names'
            ];
            let missingFields = [];
            for (let field of requiredFields) {
                if (row[field] === undefined || row[field] === null || String(row[field]).trim() === "") {
                    missingFields.push(field);
                }
            }
            if (missingFields.length > 0) {
                errors.push(`Row ${rowNumber}: Missing mandatory fields -> ${missingFields.join(", ")}`);
                continue;
            }

            const classMode = String(row['Class Mode']).trim();
            if (!["Online", "Offline"].includes(classMode)) {
                errors.push(`Row ${rowNumber}: Class Mode must be exactly 'Online' or 'Offline'`);
                continue;
            }

            const classHours = Number(row['Class Hours']);
            if (isNaN(classHours) || classHours <= 0) {
                errors.push(`Row ${rowNumber}: Class Hours must be a positive number`);
                continue;
            }

            let dateObj = new Date(row['Date']);
            if (isNaN(dateObj.getTime())) {
                errors.push(`Row ${rowNumber}: Invalid date format`);
                continue;
            }

            const centreRegex = new RegExp(`^${String(row['Center']).trim()}$`, "i");
            const centreDoc = await Centre.findOne({ $or: [{ centreName: centreRegex }, { name: centreRegex }] });
            if (!centreDoc) {
                errors.push(`Row ${rowNumber}: Center '${row['Center']}' not found`);
                continue;
            }

            const examRegex = new RegExp(`^${String(row['Exam']).trim()}$`, "i");
            const examDoc = await ExamTag.findOne({ $or: [{ name: examRegex }, { tagName: examRegex }] });
            if (!examDoc) {
                errors.push(`Row ${rowNumber}: Exam '${row['Exam']}' not found`);
                continue;
            }
            const examId = examDoc._id;

            const masterSubRegex = new RegExp(`^${String(row['Subject']).trim()}$`, "i");
            const subjectDoc = await Subject.findOne({ subName: masterSubRegex });
            if (!subjectDoc) {
                errors.push(`Row ${rowNumber}: Subject '${row['Subject']}' not found in Master Data`);
                continue;
            }

            const teacherRegex = new RegExp(`^${String(row['Teacher']).trim()}$`, "i");
            const teacherDoc = await User.findOne({ name: teacherRegex, role: 'teacher' });
            if (!teacherDoc) {
                errors.push(`Row ${rowNumber}: Teacher exactly matching '${row['Teacher']}' not found in the users list`);
                continue;
            }

            const sessionRegex = new RegExp(`^${String(row['Session']).trim()}$`, "i");
            const sessionDocDB = await Session.findOne({ sessionName: sessionRegex });
            if (!sessionDocDB) {
                errors.push(`Row ${rowNumber}: Session '${row['Session']}' not found`);
                continue;
            }

            const batchNames = String(row['Batch']).split(',').map(b => b.trim()).filter(b => b);
            const batchDocs = await Batch.find({
                $or: [
                    { batchName: { $in: batchNames.map(b => new RegExp(`^${b}$`, "i")) } },
                    { name: { $in: batchNames.map(b => new RegExp(`^${b}$`, "i")) } }
                ]
            });
            if (batchDocs.length !== batchNames.length) {
                const foundBatchNames = batchDocs.map(b => (b.batchName || b.name).toLowerCase());
                const missing = batchNames.filter(b => !foundBatchNames.includes(b.toLowerCase()));
                errors.push(`Row ${rowNumber}: Batches not found: ${missing.join(", ")}`);
                continue;
            }
            const batchIds = batchDocs.map(b => b._id);

            const acadClassRegex = new RegExp(`^${String(row['Academic Class']).trim()}$`, "i");
            const acadClassDoc = await AcademicsClass.findOne({ className: acadClassRegex });
            if (!acadClassDoc) {
                errors.push(`Row ${rowNumber}: Academic Class '${row['Academic Class']}' not found`);
                continue;
            }
            const acadClassId = acadClassDoc._id;

            const acadSubjectDoc = await AcademicsSubject.findOne({
                classId: acadClassId,
                masterSubjectId: subjectDoc._id
            });
            if (!acadSubjectDoc) {
                errors.push(`Row ${rowNumber}: Subject '${row['Subject']}' is not linked to Academic Class '${row['Academic Class']}'`);
                continue;
            }
            const acadSubjectId = acadSubjectDoc._id;

            const chapterNames = String(row['Chapter Name']).split(',').map(c => c.trim()).filter(c => c);
            const chapterDocs = await AcademicsChapter.find({
                subjectId: acadSubjectId,
                chapterName: { $in: chapterNames.map(name => new RegExp(`^${name}$`, "i")) }
            });
            if (chapterDocs.length !== chapterNames.length) {
                const foundChapterNames = chapterDocs.map(c => c.chapterName.toLowerCase());
                const missing = chapterNames.filter(c => !foundChapterNames.includes(c.toLowerCase()));
                errors.push(`Row ${rowNumber}: Chapter(s) not found under Subject '${row['Subject']}': ${missing.join(", ")}`);
                continue;
            }
            const chapterIds = chapterDocs.map(c => c._id);

            const topicNames = String(row['Topic Names']).split(',').map(t => t.trim()).filter(t => t);
            const topicDocs = await AcademicsTopic.find({
                chapterId: { $in: chapterIds },
                topicName: { $in: topicNames.map(name => new RegExp(`^${name}$`, "i")) }
            });
            if (topicDocs.length !== topicNames.length) {
                const foundTopicNames = topicDocs.map(t => t.topicName.toLowerCase());
                const missing = topicNames.filter(t => !foundTopicNames.includes(t.toLowerCase()));
                errors.push(`Row ${rowNumber}: Topic(s) not found under selected chapters: ${missing.join(", ")}`);
                continue;
            }
            const topicIds = topicDocs.map(t => t._id);

            classesToInsert.push({
                className: String(row['Class Name']).trim(),
                date: dateObj,
                classMode: classMode,
                startTime: String(row['Start Time']).trim(),
                endTime: String(row['End Time']).trim(),
                subjectId: subjectDoc._id,
                teacherId: teacherDoc._id,
                session: sessionDocDB.sessionName,
                examId: examId,
                centreIds: [centreDoc._id],
                batchIds: batchIds,
                acadClassId: acadClassId,
                acadSubjectId: acadSubjectId,
                chapterId: chapterIds[0],
                chapterIds: chapterIds,
                topicIds: topicIds,
                message: row['Message'] ? String(row['Message']).trim() : "",
                classHours: classHours
            });
        }

        // Clean up Excel file
        fs.unlinkSync(tempFilePath);
        console.log("Excel file cleaned up.");

        if (errors.length > 0) {
            console.error("\n❌ Import validation failed:");
            errors.forEach(e => console.error("- " + e));
        } else {
            console.log("\n✅ All validations passed!");
            console.log("Ready to insert documents:", JSON.stringify(classesToInsert, null, 2));

            // Perform a dry-run insert and remove to make sure DB validations pass
            console.log("\nTesting document save validation...");
            for (let item of classesToInsert) {
                const doc = new ClassSchedule(item);
                await doc.validate();
                console.log(`Document validated successfully: "${item.className}"`);
            }
            console.log("✅ All documents validated successfully on schema level!");
        }

    } catch (err) {
        console.error("Error during test run:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

run();
