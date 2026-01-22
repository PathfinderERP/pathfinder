import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import csv from "csv-parser";
import path from "path";
import { fileURLToPath } from "url";
import AcademicsClass from "../models/Academics/Academics_class.js";
import AcademicsSubject from "../models/Academics/Academics_subject.js";
import AcademicsChapter from "../models/Academics/Academics_chapter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Env
dotenv.config({ path: path.join(__dirname, "../.env") });

const CSV_FILE_PATH = "c:/Users/USER/erp_1/uploads/test.attendence_chapters.csv";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("MongoDB Connected");
    } catch (err) {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    }
};

const importChapters = async () => {
    await connectDB();

    const results = [];

    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            console.log(`Parsed ${results.length} records. Processing...`);

            let success = 0;
            let skipped = 0;
            let failed = 0;

            // Cache for performance
            const classCache = {}; // name -> _id
            const subjectCache = {}; // "className_subjectName" -> _id

            for (const row of results) {
                try {
                    // CSV Headers: name, classifyId, subjectId
                    // Mapped to: chapterName, className, subjectName

                    const chapterName = row.name?.trim();
                    const className = row.classifyId?.trim();
                    const subjectName = row.subjectId?.trim();

                    if (!chapterName || !className || !subjectName) {
                        failed++;
                        continue;
                    }

                    // 1. Find or Create Class ID
                    let classId = classCache[className.toLowerCase()];
                    if (!classId) {
                        let classDoc = await AcademicsClass.findOne({
                            className: { $regex: new RegExp(`^${className}$`, "i") }
                        });

                        if (!classDoc) {
                            // Create Class
                            classDoc = new AcademicsClass({ className: className });
                            await classDoc.save();
                            console.log(`Created Class: ${className}`);
                        }

                        classId = classDoc._id;
                        classCache[className.toLowerCase()] = classId;
                    }

                    // 2. Find or Create Subject ID (linked to Class)
                    const subjectKey = `${className}_${subjectName}`.toLowerCase();
                    let subjectId = subjectCache[subjectKey];

                    if (!subjectId) {
                        let subjectDoc = await AcademicsSubject.findOne({
                            subjectName: { $regex: new RegExp(`^${subjectName}$`, "i") },
                            classId: classId
                        });

                        if (!subjectDoc) {
                            // Create Subject
                            subjectDoc = new AcademicsSubject({
                                subjectName: subjectName,
                                classId: classId
                            });
                            await subjectDoc.save();
                            console.log(`Created Subject: ${subjectName} in ${className}`);
                        }

                        subjectId = subjectDoc._id;
                        subjectCache[subjectKey] = subjectId;
                    }

                    // 3. Check duplicate Chapter
                    const existing = await AcademicsChapter.findOne({
                        chapterName: { $regex: new RegExp(`^${chapterName}$`, "i") },
                        subjectId: subjectId
                    });

                    if (existing) {
                        skipped++;
                        continue;
                    }

                    // 4. Create Chapter
                    const newChapter = new AcademicsChapter({
                        chapterName: chapterName,
                        subjectId: subjectId
                    });

                    await newChapter.save();
                    success++;
                    if (success % 50 === 0) process.stdout.write(".");

                } catch (err) {
                    console.error(`Error processing row:`, err.message);
                    failed++;
                }
            }

            console.log(`\nImport Complete.`);
            console.log(`Success: ${success}`);
            console.log(`Skipped (Existing): ${skipped}`);
            console.log(`Failed (Invalid Data): ${failed}`);

            mongoose.disconnect();
            process.exit(0);
        });
};

importChapters();
