import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

import "./models/Payment/Payment.js";
import "./models/Payment/BillCounter.js";
import "./models/Master_data/Centre.js";
import "./models/Admission/Admission.js";
import "./models/Students.js";

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URL, { family: 4 });

        const Payment = mongoose.model("Payment");
        const BillCounter = mongoose.model("BillCounter");

        // Find payment with billId 637 or 111 or recently modified
        const p111 = await Payment.find({
            $or: [
                { billId: { $regex: /111/ } },
                { billId: { $regex: /637/ } },
                { remarks: { $regex: /111/ } },
                { remarks: { $regex: /637/ } }
            ]
        }).populate({
            path: "admission",
            populate: { path: "student" }
        }).sort({ updatedAt: -1 }).limit(10).lean();

        console.log("Found matching payments:", p111.length);
        p111.forEach(p => {
            console.log({
                id: p._id,
                billId: p.billId,
                paidAmount: p.paidAmount,
                receivedDate: p.receivedDate,
                paidDate: p.paidDate,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                remarks: p.remarks,
                student: p.admission?.student?.studentsDetails?.[0]?.studentName || p.admission?.studentName,
                centre: p.admission?.centre
            });
        });

        // Let's also check all payments created/updated today in Behala
        const todayBehala = await Payment.find({
            $or: [
                { billId: { $regex: /PATH\/BE\// } },
                { billId: { $regex: /PATH\/PBEH\// } }
            ]
        }).sort({ updatedAt: -1 }).limit(10).lean();

        console.log("\nRecent Behala payments (top 10):");
        todayBehala.forEach(p => {
            console.log(p.billId, p.paidAmount, "receivedDate:", p.receivedDate, "paidDate:", p.paidDate, "createdAt:", p.createdAt, "updatedAt:", p.updatedAt);
        });

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

main();
