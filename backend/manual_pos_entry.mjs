/**
 * Manual POS Payment Entry Script
 * 
 * Use this to manually record a confirmed POS payment into the ERP
 * when Ezetap API no longer returns the transaction (P2P IDs expire quickly).
 * 
 * The payment details are confirmed from the physical receipt:
 *   - RRN: 7301396335
 *   - Amount: ₹1 (test transaction)
 *   - Date: 27 March 2026, 4:25 PM
 *   - Payment ID: 260327105509456E821037032
 * 
 * USAGE:
 *   1. Set the ADMISSION_ID below to the correct MongoDB Admission _id
 *   2. Set AMOUNT to the actual payment amount
 *   3. Set ADMISSION_TYPE to "NORMAL" or "BOARD"
 *   4. Run: node manual_pos_entry.mjs
 */

import "dotenv/config";
import mongoose from "mongoose";
import Admission from "./models/Admission/Admission.js";
import BoardCourseAdmission from "./models/Admission/BoardCourseAdmission.js";
import Payment from "./models/Payment/Payment.js";
import CentreSchema from "./models/Master_data/Centre.js";
import { generateBillId } from "./utils/billIdGenerator.js";
import { updateCentreTargetAchieved } from "./services/centreTargetService.js";

// ─────────────────────────────────────────────────────────────
// CONFIGURE THESE BEFORE RUNNING:
// ─────────────────────────────────────────────────────────────
const ADMISSION_ID = "PASTE_ADMISSION_ID_HERE";   // MongoDB ObjectId of the student's admission
const AMOUNT = 1;                                  // Actual payment amount in ₹ (change to real amount e.g. 5000)
const ADMISSION_TYPE = "NORMAL";                   // "NORMAL" or "BOARD"
const TRANSACTION_REF = "RRN-7301396335-POS-20260327"; // RRN from receipt
const PAYMENT_DATE = new Date("2026-03-27T16:25:00+05:30");
// ─────────────────────────────────────────────────────────────

if (ADMISSION_ID === "PASTE_ADMISSION_ID_HERE") {
    console.error("❌ Please set ADMISSION_ID in this script before running!");
    process.exit(1);
}

await mongoose.connect(process.env.MONGO_URL, { family: 4 });
console.log("✅ Connected to MongoDB\n");

let admission = await Admission.findById(ADMISSION_ID);
if (!admission && ADMISSION_TYPE === "BOARD") {
    admission = await BoardCourseAdmission.findById(ADMISSION_ID);
}

if (!admission) {
    console.error(`❌ Admission not found for ID: ${ADMISSION_ID}`);
    await mongoose.disconnect();
    process.exit(1);
}

console.log(`✅ Found admission for: ${admission.studentName || admission.name || "Student"}`);
console.log(`   Total Fees: ₹${admission.totalFees || "N/A"}`);
console.log(`   Total Paid: ₹${admission.totalPaidAmount || 0}`);
console.log(`   Centre: ${admission.centre}`);
console.log(`   Payment Status: ${admission.paymentStatus}`);

// Check if already processed
const alreadyProcessed =
    (admission.downPaymentTransactionId === TRANSACTION_REF) ||
    (admission.paymentBreakdown && admission.paymentBreakdown.some(p => p.transactionId === TRANSACTION_REF)) ||
    (admission.monthlySubjectHistory && admission.monthlySubjectHistory.some(h => h.transactionId === TRANSACTION_REF));

if (alreadyProcessed) {
    console.log(`\n⚠️ This transaction reference (${TRANSACTION_REF}) is already recorded in the ERP!`);
    await mongoose.disconnect();
    process.exit(0);
}

let installmentNum = 1;
let instObj = null;
const isDownPayment = (admission.totalPaidAmount || 0) < 1 || admission.downPaymentStatus === "PENDING";

if (isDownPayment) {
    admission.downPaymentStatus = "PAID";
    admission.downPaymentTransactionId = TRANSACTION_REF;
    admission.downPaymentMethod = "RAZORPAY_POS";
    admission.downPaymentReceivedDate = PAYMENT_DATE;
    installmentNum = 0;
    console.log("\n📝 Recording as DOWN PAYMENT");
} else {
    if (admission.paymentBreakdown && admission.paymentBreakdown.length > 0) {
        instObj = admission.paymentBreakdown.find(i => i.status !== "PAID" && i.status !== "PENDING_CLEARANCE");
        if (instObj) {
            installmentNum = instObj.installmentNumber;
            console.log(`\n📝 Recording as INSTALLMENT #${installmentNum}`);
        }
    }
    if (instObj) {
        instObj.status = "PAID";
        instObj.paidAmount = AMOUNT;
        instObj.paidDate = PAYMENT_DATE;
        instObj.paymentMethod = "RAZORPAY_POS";
        instObj.transactionId = TRANSACTION_REF;
    }
}

admission.totalPaidAmount = (admission.totalPaidAmount || 0) + AMOUNT;
if (admission.totalFees) {
    admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);
    admission.paymentStatus = (admission.totalPaidAmount >= admission.totalFees) ? "COMPLETED" : "PARTIAL";
}

await admission.save();
console.log(`✅ Admission updated: Total Paid = ₹${admission.totalPaidAmount}`);

let centreCode = 'POS';
if (admission.centre) {
    const centre = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
    if (centre) centreCode = centre.enterCode || 'POS';
}

const billId = await generateBillId(centreCode);
const taxableAmount = AMOUNT / 1.18;
const cgst = (AMOUNT - taxableAmount) / 2;
const sgst = cgst;

const paymentDoc = {
    admission: admission._id,
    installmentNumber: installmentNum,
    amount: AMOUNT,
    paidAmount: AMOUNT,
    dueDate: (instObj && instObj.dueDate) ? instObj.dueDate : PAYMENT_DATE,
    paidDate: PAYMENT_DATE,
    receivedDate: PAYMENT_DATE,
    status: "PAID",
    paymentMethod: "RAZORPAY_POS",
    transactionId: TRANSACTION_REF,
    recordedBy: null,
    billId,
    cgst: parseFloat(cgst.toFixed(2)),
    sgst: parseFloat(sgst.toFixed(2)),
    courseFee: parseFloat(taxableAmount.toFixed(2)),
    totalAmount: AMOUNT,
    remarks: `Manual POS Entry (RRN: 7301396335, Receipt: POS-1774608905158)`,
    billingMonth: new Date(PAYMENT_DATE).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
};

if (admission.boardCourseName) paymentDoc.boardCourseName = admission.boardCourseName;

const newPayment = new Payment(paymentDoc);
await newPayment.save();

if (admission.centre) await updateCentreTargetAchieved(admission.centre, PAYMENT_DATE);

console.log(`\n✅ PAYMENT RECORDED SUCCESSFULLY!`);
console.log(`   Bill ID: ${billId}`);
console.log(`   Amount: ₹${AMOUNT}`);
console.log(`   Transaction Ref: ${TRANSACTION_REF}`);

await mongoose.disconnect();
