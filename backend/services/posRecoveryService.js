/**
 * POS Recovery Service
 * 
 * Runs every 2 minutes as a cron job.
 * Checks all WAITING or CANCELLED PosTransactions created in the last 30 minutes
 * and polls Ezetap to see if any were actually AUTHORIZED/SUCCESS on the machine.
 * 
 * This is the critical backstop for when:
 *   - The frontend's 120-second timer expires before the machine completes payment
 *   - The browser tab is closed mid-transaction
 *   - Network issues interrupt the frontend polling
 */

import PosTransaction from "../models/Payment/PosTransaction.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import Payment from "../models/Payment/Payment.js";
import CentreSchema from "../models/Master_data/Centre.js";
import { generateBillId } from "../utils/billIdGenerator.js";
import { updateCentreTargetAchieved } from "./centreTargetService.js";

const getBaseUrl = () => {
    return process.env.EZETAP_MODE === 'production'
        ? "https://www.ezetap.com/api/3.0/p2padapter"
        : "https://demo.ezetap.com/api/3.0/p2padapter";
};

export const recoverPendingPosPayments = async () => {
    try {
        // Look for transactions in WAITING or CANCELLED state created in the past 30 minutes
        const cutoff = new Date(Date.now() - 30 * 60 * 1000);
        const pendingTxns = await PosTransaction.find({
            status: { $in: ["WAITING", "CANCELLED"] },
            createdAt: { $gte: cutoff }
        });

        if (pendingTxns.length === 0) return;

        console.log(`[POS Recovery] Checking ${pendingTxns.length} pending/cancelled transaction(s)...`);

        for (const tx of pendingTxns) {
            try {
                const payload = {
                    appKey: process.env.EZETAP_APP_KEY,
                    username: process.env.EZETAP_USERNAME,
                    p2pRequestId: tx.p2pRequestId
                };

                const response = await fetch(`${getBaseUrl()}/status`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!data || !data.success) {
                    console.log(`[POS Recovery] No response for ${tx.p2pRequestId}: ${data?.errorMessage}`);
                    continue;
                }

                const apiStatus = data.status || "WAITING";
                const isSuccess = ["AUTHORIZED", "SUCCESS"].includes(apiStatus);

                if (!isSuccess) {
                    // Mark as expired/failed if terminal says so
                    if (["FAILED", "DECLINED", "EXPIRED"].includes(apiStatus)) {
                        tx.status = apiStatus;
                        await tx.save();
                        console.log(`[POS Recovery] Marked ${tx.p2pRequestId} as ${apiStatus}`);
                    }
                    continue;
                }

                // ─── PAYMENT WAS ACTUALLY SUCCESSFUL ON THE MACHINE ───
                console.log(`[POS Recovery] 🎉 Found recovered payment: ${tx.p2pRequestId} — Status: ${apiStatus}`);

                tx.status = apiStatus;
                await tx.save();

                if (!tx.admissionId) {
                    console.log(`[POS Recovery] No admissionId on tx ${tx.p2pRequestId}, skipping ERP update.`);
                    continue;
                }

                // Check if already processed
                let admission = await Admission.findById(tx.admissionId);
                if (!admission && tx.admissionType === "BOARD") {
                    admission = await BoardCourseAdmission.findById(tx.admissionId);
                }

                if (!admission) {
                    console.log(`[POS Recovery] Admission ${tx.admissionId} not found, skipping.`);
                    continue;
                }

                const alreadyProcessed =
                    (admission.downPaymentTransactionId === tx.p2pRequestId) ||
                    (admission.paymentBreakdown && admission.paymentBreakdown.some(p => p.transactionId === tx.p2pRequestId)) ||
                    (admission.monthlySubjectHistory && admission.monthlySubjectHistory.some(h => h.transactionId === tx.p2pRequestId));

                if (alreadyProcessed) {
                    console.log(`[POS Recovery] Transaction ${tx.p2pRequestId} already processed in ERP.`);
                    continue;
                }

                // Process the payment into the ERP
                const { amount } = tx;
                let installmentNum = 1;
                let instObj = null;
                const isDownPayment = (admission.totalPaidAmount || 0) < 1 || admission.downPaymentStatus === "PENDING";

                if (isDownPayment) {
                    admission.downPaymentStatus = "PAID";
                    admission.downPaymentTransactionId = tx.p2pRequestId;
                    admission.downPaymentMethod = "RAZORPAY_POS";
                    admission.downPaymentReceivedDate = new Date();
                    installmentNum = 0;
                } else {
                    if (admission.paymentBreakdown && admission.paymentBreakdown.length > 0) {
                        instObj = admission.paymentBreakdown.find(i => i.status !== "PAID" && i.status !== "PENDING_CLEARANCE");
                        if (instObj) installmentNum = instObj.installmentNumber;
                    } else if (admission.monthlySubjectHistory && admission.monthlySubjectHistory.length > 0) {
                        instObj = admission.monthlySubjectHistory.find(h => h.status !== "PAID");
                        if (instObj) installmentNum = 99;
                    }

                    if (instObj) {
                        instObj.status = "PAID";
                        instObj.paidAmount = amount;
                        instObj.paidDate = new Date();
                        instObj.paymentMethod = "RAZORPAY_POS";
                        instObj.transactionId = tx.p2pRequestId;
                    }
                }

                admission.totalPaidAmount = (admission.totalPaidAmount || 0) + amount;
                if (admission.totalFees) {
                    admission.remainingAmount = Math.max(0, (admission.totalFees || 0) - admission.totalPaidAmount);
                    admission.paymentStatus = (admission.totalPaidAmount >= admission.totalFees) ? "COMPLETED" : "PARTIAL";
                }

                await admission.save();

                let centreCode = 'POS';
                if (admission.centre) {
                    const centre = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
                    if (centre) centreCode = centre.enterCode || 'POS';
                }

                const billId = await generateBillId(centreCode);
                const taxableAmount = amount / 1.18;
                const cgst = (amount - taxableAmount) / 2;
                const sgst = cgst;

                const paymentDoc = {
                    admission: admission._id,
                    installmentNumber: installmentNum,
                    amount,
                    paidAmount: amount,
                    dueDate: (instObj && instObj.dueDate) ? instObj.dueDate : new Date(),
                    paidDate: new Date(),
                    receivedDate: new Date(),
                    status: "PAID",
                    paymentMethod: "RAZORPAY_POS",
                    transactionId: tx.p2pRequestId,
                    recordedBy: null,
                    billId,
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    courseFee: parseFloat(taxableAmount.toFixed(2)),
                    totalAmount: amount,
                    remarks: `POS Recovery Sync: ${tx.externalRefNumber}`,
                    billingMonth: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                };

                if (admission.boardCourseName) paymentDoc.boardCourseName = admission.boardCourseName;

                const newPayment = new Payment(paymentDoc);
                await newPayment.save();

                if (admission.centre) await updateCentreTargetAchieved(admission.centre, new Date());

                console.log(`[POS Recovery] ✅ ERP sync complete for recovered payment: ${tx.p2pRequestId} → Bill ${billId}`);

            } catch (txError) {
                console.error(`[POS Recovery] Error processing tx ${tx.p2pRequestId}:`, txError.message);
            }
        }
    } catch (error) {
        console.error("[POS Recovery] Fatal error:", error);
    }
};
