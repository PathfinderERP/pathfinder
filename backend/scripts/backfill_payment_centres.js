import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Payment from "../models/Payment/Payment.js";
import Centre from "../models/Master_data/Centre.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";

async function backfillPaymentCentresFast() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // 1. Build enterCode -> centreName map
        const centres = await Centre.find({}).lean();
        const codeToNameMap = {};
        centres.forEach(c => {
            if (c.enterCode && c.centreName) {
                codeToNameMap[c.enterCode.toUpperCase().trim()] = c.centreName;
            }
            if (c.centreCode && c.centreName) {
                codeToNameMap[c.centreCode.toUpperCase().trim()] = c.centreName;
            }
        });

        codeToNameMap["CT"] = "CONTAI";
        codeToNameMap["TM"] = "TAMLUK";
        codeToNameMap["TAMLUK"] = "TAMLUK";
        codeToNameMap["BR"] = "BARASAT";
        codeToNameMap["HZ"] = "HAZRA H.O";
        codeToNameMap["HAZRA"] = "HAZRA H.O";

        console.log("Fetching payments & admissions...");
        const [payments, normalAdmissions, boardAdmissions] = await Promise.all([
            Payment.find({}, "_id billId admission centre").lean(),
            Admission.find({}, "_id centre").lean(),
            BoardCourseAdmission.find({}, "_id centre").lean()
        ]);

        console.log(`Loaded ${payments.length} payments, ${normalAdmissions.length + boardAdmissions.length} admissions.`);

        const admMap = new Map();
        normalAdmissions.forEach(a => admMap.set(a._id.toString(), a.centre));
        boardAdmissions.forEach(a => admMap.set(a._id.toString(), a.centre));

        const bulkOps = [];
        let matchedByBillId = 0;
        let matchedByAdmission = 0;

        for (const p of payments) {
            let determinedCentre = p.centre || null;

            // Strategy A: Check billId prefix (e.g. PATH/CT/2026-27/0000215)
            if (p.billId && p.billId.toUpperCase().startsWith("PATH/")) {
                const parts = p.billId.split("/");
                if (parts.length >= 2) {
                    const code = parts[1].toUpperCase().trim();
                    if (codeToNameMap[code]) {
                        determinedCentre = codeToNameMap[code];
                        matchedByBillId++;
                    }
                }
            }

            // Strategy B: Fallback to Admission centre
            if (!determinedCentre && p.admission) {
                const admCentre = admMap.get(p.admission.toString());
                if (admCentre) {
                    determinedCentre = admCentre;
                    matchedByAdmission++;
                }
            }

            if (determinedCentre && p.centre !== determinedCentre) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: p._id },
                        update: { $set: { centre: determinedCentre } }
                    }
                });
            }
        }

        console.log(`Prepared ${bulkOps.length} update operations.`);
        if (bulkOps.length > 0) {
            const chunkSize = 1000;
            for (let i = 0; i < bulkOps.length; i += chunkSize) {
                const chunk = bulkOps.slice(i, i + chunkSize);
                await Payment.bulkWrite(chunk);
                console.log(`Executed bulkWrite chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(bulkOps.length / chunkSize)}`);
            }
        }

        console.log(`\nFast backfill complete! Updated ${bulkOps.length} payments.`);
        console.log(`- Matched by billId prefix: ${matchedByBillId}`);
        console.log(`- Matched by admission: ${matchedByAdmission}`);

    } catch (error) {
        console.error("Backfill failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

backfillPaymentCentresFast();
