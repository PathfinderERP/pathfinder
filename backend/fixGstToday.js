import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./db/connect.js";
import Admission from "./models/Admission/Admission.js";
import Payment from "./models/Payment/Payment.js";

const ADMIN_ID = "6970c4129590082b81674b65";

const runFix = async () => {
    try {
        await connectDB();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const admissions = await Admission.find({
            createdAt: { $gte: today },
            createdBy: ADMIN_ID
        });

        console.log(`Found ${admissions.length} admissions to update.`);

        for (const adm of admissions) {
            // We need the ORIGINAL Excel amount. 
            // If we already ran the fix once, adm.baseFees should be that original amount.
            // If we haven't, adm.totalFees was that original amount.
            // To be safe, let's assume if baseFees is roughly totalFees/1.18, it's already "inclusive"
            // If baseFees == totalFees, it's our first pass.

            let originalBase;
            if (adm.totalFees > adm.baseFees * 1.05) {
                // Already updated? Total is about 1.18x base.
                // Leave originalBase as adm.baseFees
                originalBase = adm.baseFees;
            } else {
                // First pass or totalFees was the Excel amount
                originalBase = adm.totalFees;
            }

            const baseFees = Math.round(originalBase);
            const cgstAmount = Math.round(baseFees * 0.09);
            const sgstAmount = Math.round(baseFees * 0.09);
            const newTotalFees = baseFees + cgstAmount + sgstAmount;

            const dpRecord = await Payment.findOne({ admission: adm._id, installmentNumber: 0 });
            let newPaidAmount = adm.totalPaidAmount;

            if (dpRecord) {
                // Use the original courseFee (which was Excel DP amount) as base
                const dpBase = Math.round(dpRecord.courseFee || dpRecord.paidAmount);
                const dpCgst = Math.round(dpBase * 0.09);
                const dpSgst = Math.round(dpBase * 0.09);
                newPaidAmount = dpBase + dpCgst + dpSgst;

                await Payment.findByIdAndUpdate(dpRecord._id, {
                    $set: {
                        amount: newPaidAmount,
                        paidAmount: newPaidAmount,
                        totalAmount: newPaidAmount,
                        cgst: dpCgst,
                        sgst: dpSgst,
                        courseFee: dpBase,
                        remarks: "Imported Admission Payment (GST Recalculated)"
                    }
                });
            }

            const finalRemaining = Math.max(0, newTotalFees - newPaidAmount);
            const finalStatus = (newPaidAmount >= newTotalFees) ? "COMPLETED" : "PARTIAL";

            await Admission.findByIdAndUpdate(adm._id, {
                $set: {
                    baseFees,
                    cgstAmount,
                    sgstAmount,
                    totalFees: newTotalFees,
                    totalPaidAmount: newPaidAmount,
                    remainingAmount: finalRemaining,
                    paymentStatus: finalStatus,
                    "paymentBreakdown.0.amount": finalRemaining
                }
            });

            console.log(`Updated Admission ${adm.admissionNumber}: New Total ${newTotalFees}, Paid ${newPaidAmount}`);
        }

        console.log("Fix completed.");
        process.exit(0);
    } catch (err) {
        console.error("Fix failed:", err);
        process.exit(1);
    }
};

runFix();
