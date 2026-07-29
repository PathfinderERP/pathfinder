import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Centre from "./models/Master_data/Centre.js";
import Boards from "./models/Master_data/Boards.js";
import SchoolForTask from "./models/Master_data/SchoolForTask.js";

async function testImport() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to Mongo");

        const sampleRows = [
            { CenterName: "ARAMBAGH", SchoolName: "ARAMBAGH GIRLS HIGH SCHOOL", Board: "WBBSE", Tier: "A", SCHOOLACCESS: "NO", Status: "OTHERS" },
            { CenterName: "BALURGHAT", SchoolName: "GANGARAMPUR GIRL'S HIGH SCHOOL", Board: "WBBSE", Tier: "", SCHOOLACCESS: "", Status: "OTHERS" },
            { CenterName: "HAZRA H.O", SchoolName: "APEEJAY (PARK STREET)", Board: "CBSE", Tier: "A", SCHOOLACCESS: "NO", Status: "OTHERS" },
            { CenterName: "HAZRA H.O", SchoolName: "LORETO HOUSE 9AM - 10AM", Board: "ICSE", Tier: "B", SCHOOLACCESS: "NO", Status: "OTHERS" }
        ];

        // Simulate bulkImport logic
        const [allCentres, allBoards] = await Promise.all([
            Centre.find({}, "_id centreName"),
            Boards.find({}, "_id boardCourse name")
        ]);

        const centreMap = new Map();
        allCentres.forEach(c => {
            if (c.centreName) centreMap.set(c.centreName.trim().toLowerCase(), c._id);
        });

        const boardMap = new Map();
        allBoards.forEach(b => {
            if (b.boardCourse) boardMap.set(b.boardCourse.trim().toLowerCase(), b._id);
            if (b.name) boardMap.set(b.name.trim().toLowerCase(), b._id);
        });

        const clean = (val) => (val == null ? "" : String(val).trim());

        const results = { inserted: 0, failed: [], total: sampleRows.length };
        const validRecords = [];

        for (const row of sampleRows) {
            const rawSchoolName = clean(row.schoolName || row["SchoolName"] || row["School Name"] || row["SchoolName*"] || row["School Name*"]);
            const rawCenter = clean(row.centerName || row["CenterName"] || row["Center Name"] || row["CenterName*"] || row["Center Name*"]);
            const rawBoard = clean(row.board || row["Board"] || row["Board Name"]);
            const tier = clean(row.tier || row["Tier"]) || "A";
            const schoolAccess = clean(row.schoolAccess || row["SchoolAccess"] || row["SCHOOLACCESS"] || row["School Access"]) || "YES";
            const status = clean(row.status || row["Status"] || row["STATUS"]) || "ONLY INFORMATION GIVEN TO STUDENTS";
            const remarks = clean(row.remarks || row["Remarks"] || row["REMARKS"]);

            let centreId = null;
            if (rawCenter) {
                if (mongoose.Types.ObjectId.isValid(rawCenter)) {
                    centreId = rawCenter;
                } else {
                    centreId = centreMap.get(rawCenter.toLowerCase()) || null;
                }
            }

            let boardId = null;
            let boardError = null;
            if (rawBoard) {
                if (mongoose.Types.ObjectId.isValid(rawBoard)) {
                    boardId = rawBoard;
                } else {
                    const resolvedId = boardMap.get(rawBoard.toLowerCase()) || null;
                    if (resolvedId) {
                        boardId = resolvedId;
                    } else {
                        boardError = `Board '${rawBoard}' not found in Master Board data.`;
                    }
                }
            }

            if (!rawSchoolName || !centreId || boardError) {
                results.failed.push({
                    row,
                    reason: !rawSchoolName
                        ? "Missing required field: SchoolName"
                        : boardError
                        ? boardError
                        : `CenterName '${rawCenter}' not found in Master Centre data`
                });
                continue;
            }

            validRecords.push({
                schoolName: rawSchoolName,
                centerName: centreId,
                board: boardId,
                tier: tier || "A",
                schoolAccess: schoolAccess || "YES",
                status: status || "ONLY INFORMATION GIVEN TO STUDENTS",
                remarks
            });
        }

        console.log("Valid records to insert:", validRecords);
        console.log("Failed pre-validations:", results.failed);

        try {
            const docs = await SchoolForTask.insertMany(validRecords, { ordered: false });
            console.log("Insert success count:", docs.length);
        } catch (err) {
            console.error("Insert error:", err.message);
            if (err.errors) {
                console.error("Validation errors:", Object.keys(err.errors).map(k => `${k}: ${err.errors[k].message}`));
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testImport();
