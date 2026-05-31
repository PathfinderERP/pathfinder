import mongoose from "mongoose";
import dotenv from "dotenv";
import Admission from "../models/Admission/Admission.js";

dotenv.config();

function sanitizeAdmission(admission) {
    let paymentBreakdown = JSON.parse(JSON.stringify(admission.paymentBreakdown));
    let modified = false;

    // 1. First, check if there are any negative installment amounts
    let hasNegatives = paymentBreakdown.some(inst => inst.amount < 0);
    if (!hasNegatives) {
        return { modified: false, paymentBreakdown };
    }

    // 2. Resolve negatives
    for (let i = 0; i < paymentBreakdown.length; i++) {
        let inst = paymentBreakdown[i];
        if (inst.amount < 0) {
            modified = true;
            let excess = Math.abs(inst.amount);
            inst.amount = 0;
            if (inst.status !== "PAID") {
                inst.status = "PAID";
                inst.paidAmount = 0;
                inst.paidDate = inst.paidDate || new Date();
                inst.paymentMethod = "CASH";
                inst.transactionId = inst.transactionId || "SYSTEM_ADJUST";
            }
            inst.remarks = (inst.remarks ? inst.remarks + "; " : "") + `Sanitized negative amount of -₹${excess}`;

            // Try to distribute the excess to subsequent installments
            for (let j = i + 1; j < paymentBreakdown.length; j++) {
                if (excess <= 0) break;
                let nextInst = paymentBreakdown[j];
                if (nextInst.amount > 0) {
                    let deduct = Math.min(excess, nextInst.amount);
                    nextInst.amount = parseFloat((nextInst.amount - deduct).toFixed(3));
                    excess = parseFloat((excess - deduct).toFixed(3));
                    nextInst.remarks = (nextInst.remarks ? nextInst.remarks + "; " : "") + `Deducted ₹${deduct} to offset negative installment`;
                    if (nextInst.amount === 0 && nextInst.status !== "PAID") {
                        nextInst.status = "PAID";
                        nextInst.paidAmount = 0;
                        nextInst.paidDate = new Date();
                        nextInst.paymentMethod = "CASH";
                        nextInst.transactionId = "SYSTEM_ADJUST";
                    }
                }
            }

            // If there's still excess, go backward to previous non-paid/non-zero installments
            if (excess > 0) {
                for (let j = i - 1; j >= 0; j--) {
                    if (excess <= 0) break;
                    let prevInst = paymentBreakdown[j];
                    if (prevInst.amount > 0) {
                        let deduct = Math.min(excess, prevInst.amount);
                        prevInst.amount = parseFloat((prevInst.amount - deduct).toFixed(3));
                        excess = parseFloat((excess - deduct).toFixed(3));
                        prevInst.remarks = (prevInst.remarks ? prevInst.remarks + "; " : "") + `Deducted ₹${deduct} to offset negative installment`;
                        if (prevInst.amount === 0 && prevInst.status !== "PAID") {
                            prevInst.status = "PAID";
                            prevInst.paidAmount = 0;
                            prevInst.paidDate = new Date();
                            prevInst.paymentMethod = "CASH";
                            prevInst.transactionId = "SYSTEM_ADJUST";
                        }
                    }
                }
            }
        }
    }

    return { modified, paymentBreakdown };
}

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        const negativeAdmissions = await Admission.find({
            "paymentBreakdown.amount": { $lt: 0 }
        });

        console.log(`Found ${negativeAdmissions.length} admissions with negative installments to sanitize.\n`);

        let sanitizedCount = 0;
        for (const adm of negativeAdmissions) {
            const { modified, paymentBreakdown } = sanitizeAdmission(adm);
            if (modified) {
                adm.paymentBreakdown = paymentBreakdown;
                await adm.save();
                console.log(`Sanitized Admission No: ${adm.admissionNumber}`);
                sanitizedCount++;
            }
        }

        console.log(`\nSuccessfully sanitized ${sanitizedCount} records.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
