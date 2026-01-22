import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Models
import ClassSchedule from "../models/Academics/ClassSchedule.js";
import AcademicsSubject from "../models/Academics/Academics_subject.js";
import User from "../models/User.js";
import Course from "../models/Master_data/Courses.js";
import Centre from "../models/Master_data/Centre.js";
import Batch from "../models/Master_data/Batch.js";

const parseCSV = (data) => {
    const lines = data.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const row = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { row.push(current.trim()); current = ''; }
            else { current += char; }
        }
        row.push(current.trim());
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = row[idx]; });
        results.push(obj);
    }
    return results;
};

const normalizeBatch = (name) => {
    if (!name) return "";
    let n = name.toUpperCase().trim();
    if (n === "NEET-N1") return "NEET- N1";
    if (n === "NEET-N2") return "NEET- N2";
    if (n === "NEET-N3") return "NEET- N3";

    // FND normalization
    let fndMatch = n.match(/(FND|FDN).*?(\d+).*?([AB])/);
    if (fndMatch) {
        let num = fndMatch[2];
        let letter = fndMatch[3];
        return letter === "A" ? `FND class  ${num}A` : `FND class ${num}B`;
    }

    // Default to a known batch if it contains keywords
    if (n.includes("NEET")) return "NEET- N1";
    if (n.includes("JEE")) return "JEE-E1";
    if (n.includes("E1")) return "JEE-E1";
    if (n.includes("E2")) return "JEE-E2";
    if (n.includes("E3")) return "JEE-E3";

    return n;
};

const importData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        await ClassSchedule.deleteMany({});
        console.log("Cleared existing class schedules");

        const records = parseCSV(fs.readFileSync("C:/Users/USER/erp_1/uploads/test.attendence_classes.csv", "utf8"));

        const [batches, centers, subjects, users, defaultCourse] = await Promise.all([
            Batch.find().lean(),
            Centre.find().lean(),
            AcademicsSubject.find().lean(),
            User.find().lean(),
            Course.findOne().lean()
        ]);

        console.log(`Starting import of ${records.length} records...`);
        let successCount = 0;
        let failCount = 0;
        const errorSummary = new Map();

        for (const record of records) {
            try {
                // CENTRE
                let foundCentreId = null;
                const searchCenter = record.center.toUpperCase().replace(/[^A-Z0-9]/g, "");
                for (const c of centers) {
                    const dbCenter = (c.centreName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
                    if (dbCenter && (dbCenter.includes(searchCenter) || searchCenter.includes(dbCenter))) {
                        foundCentreId = c._id;
                        break;
                    }
                }
                if (!foundCentreId) throw new Error(`Centre not found: ${record.center}`);

                // TEACHER
                let foundTeacherId = null;
                const searchTeacher = record.teacher.toUpperCase().trim();
                for (const u of users) {
                    if (u.name && u.name.toUpperCase().includes(searchTeacher)) {
                        foundTeacherId = u._id;
                        break;
                    }
                }
                if (!foundTeacherId) throw new Error(`Teacher not found: ${record.teacher}`);

                // BATCH
                let foundBatchId = null;
                const normBatch = normalizeBatch(record.batch);
                for (const b of batches) {
                    if (b.batchName.toUpperCase() === normBatch.toUpperCase() || b.batchName.toUpperCase() === record.batch.toUpperCase()) {
                        foundBatchId = b._id;
                        break;
                    }
                }
                // Loose backup for batch
                if (!foundBatchId) {
                    for (const b of batches) {
                        if (record.batch.toUpperCase().includes(b.batchName.toUpperCase())) {
                            foundBatchId = b._id;
                            break;
                        }
                    }
                }
                if (!foundBatchId) throw new Error(`Batch not found: ${record.batch}`);

                // SUBJECT
                let foundSubjectId = null;
                const searchSub = record.subject.toUpperCase().trim();
                for (const s of subjects) {
                    if (s.subjectName.toUpperCase() === searchSub) {
                        foundSubjectId = s._id;
                        break;
                    }
                }
                if (!foundSubjectId) throw new Error(`Subject not found: ${record.subject}`);

                // DATE
                let classDate;
                if (record.date.includes('-')) {
                    const [d, m, y] = record.date.split('-');
                    classDate = new Date(`${y}-${m}-${d}T00:00:00Z`);
                } else {
                    classDate = new Date(record.date);
                }

                const newClassSchedule = new ClassSchedule({
                    className: record.name || "Class",
                    date: classDate,
                    classMode: record.classMode === 'Offline' ? 'Offline' : 'Online',
                    startTime: record.startTime || "00:00",
                    endTime: record.endTime || "01:00",
                    subjectId: foundSubjectId,
                    teacherId: foundTeacherId,
                    session: record.session || "2025-26",
                    courseId: defaultCourse?._id,
                    centreId: foundCentreId,
                    batchIds: [foundBatchId],
                    status: record.startedTime ? 'Completed' : 'Upcoming',
                    actualStartTime: record.startedTime ? new Date(record.startedTime) : undefined,
                });

                await newClassSchedule.save();
                successCount++;
                if (successCount % 20 === 0) console.log(`Saved ${successCount} classes...`);

            } catch (err) {
                failCount++;
                const msg = err.message;
                errorSummary.set(msg, (errorSummary.get(msg) || 0) + 1);
            }
        }

        console.log(`\nImport Finished!`);
        console.log(`Success: ${successCount}`);
        console.log(`Failed: ${failCount}`);
        console.log(`\nError Breakdown:`);
        for (let [err, count] of errorSummary) {
            console.log(`- ${err}: ${count}`);
        }

    } catch (err) {
        console.error("FATAL ERROR:", err);
    } finally {
        await mongoose.disconnect();
    }
};

importData();
