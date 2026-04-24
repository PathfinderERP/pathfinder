/**
 * FIX SCRIPT: Create a bill (Payment record) for student PATH26002588
 * - Amount: ₹9000 (exam fee already recorded in BoardCourseAdmission)
 * - Date: 22-April-2026 (2026-04-22)
 * - Scoped ONLY to this student — no other records touched.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// ── Models ─────────────────────────────────────────────────────────────────
import BoardCourseAdmission from "./models/Admission/BoardCourseAdmission.js";
import Payment from "./models/Payment/Payment.js";
import BillCounter from "./models/Payment/BillCounter.js";
import Centre from "./models/Master_data/Centre.js";

// ── Bill ID generator (inline, same logic as generateBillId util) ──────────
async function generateBillId(centreCode, requestDate) {
  const date = requestDate ? new Date(requestDate) : new Date();
  const month = date.getMonth();
  const year = date.getFullYear();

  let startYear, endYear;
  if (month >= 3) { startYear = year; endYear = year + 1; }
  else            { startYear = year - 1; endYear = year; }

  const yearStr = `${startYear}-${endYear.toString().slice(-2)}`;
  const prefix  = `PATH/${centreCode}/${yearStr}/`;

  let counter = await BillCounter.findOneAndUpdate(
    { prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  let nextNumber = counter.seq;

  const prefixRegex = new RegExp(`^${prefix.replace(/\//g, '\\/')}\\d+$`);
  const highestBill = await Payment.findOne({ billId: { $regex: prefixRegex } })
    .select("billId").sort({ billId: -1 }).lean();

  if (highestBill) {
    const parts = highestBill.billId.split("/");
    const dbMaxSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(dbMaxSeq) && dbMaxSeq >= nextNumber) {
      nextNumber = dbMaxSeq + 1;
      await BillCounter.updateOne({ prefix }, { $set: { seq: nextNumber } });
    }
  }

  return `${prefix}${nextNumber.toString().padStart(7, "0")}`;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB");

  const ENROLLMENT = "PATH26002588";
  const AMOUNT     = 9000;
  // Date: 22-April-2026 (IST midnight → UTC 2026-04-22T00:00:00+05:30)
  const PAYMENT_DATE = new Date("2026-04-22T00:00:00+05:30");

  // 1. Find the admission
  const admission = await BoardCourseAdmission.findOne({ admissionNumber: ENROLLMENT }).lean();
  if (!admission) {
    console.error(`❌ No BoardCourseAdmission found for enrollmentNumber: ${ENROLLMENT}`);
    process.exit(1);
  }
  console.log(`✅ Found admission: ${admission._id} | ${admission.boardCourseName}`);
  console.log(`   examFee: ${admission.examFee}, examFeePaid: ${admission.examFeePaid}, examFeeStatus: ${admission.examFeeStatus}`);

  // 2. Safety: check no bill already exists for this admission with AMOUNT 9000
  const existing = await Payment.findOne({
    admission: admission._id,
    paidAmount: AMOUNT,
    totalAmount: AMOUNT,
  }).lean();

  if (existing) {
    console.error(`❌ A payment record of ₹${AMOUNT} already exists for this admission! (billId: ${existing.billId})`);
    console.error("   Aborting to avoid duplicates.");
    process.exit(1);
  }

  // 3. Resolve centre code
  const centre = admission.centre;
  let centreObj = await Centre.findOne({ centreName: centre }).lean();
  if (!centreObj) {
    centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${centre}$`, "i") } }).lean();
  }
  const centreCode = centreObj ? centreObj.enterCode : "GEN";
  console.log(`✅ Centre: "${centre}" → code: "${centreCode}"`);

  // 4. Generate bill ID (using date 22-April-2026)
  const billId = await generateBillId(centreCode, PAYMENT_DATE);
  console.log(`✅ Generated billId: ${billId}`);

  // 5. Tax breakdown (same formula as controller)
  const taxableAmount = AMOUNT / 1.18;
  const cgst = (AMOUNT - taxableAmount) / 2;
  const sgst = cgst;

  // 6. Create the Payment record
  const courseName = `${admission.boardCourseName || ""} + Examination`;
  const paymentRecord = new Payment({
    admission:         admission._id,
    installmentNumber: 0,                  // standalone fee marker
    amount:            admission.examFee || AMOUNT,
    paidAmount:        AMOUNT,
    dueDate:           PAYMENT_DATE,
    paidDate:          PAYMENT_DATE,
    receivedDate:      PAYMENT_DATE,
    status:            "PAID",
    paymentMethod:     "CASH",
    billingMonth:      PAYMENT_DATE.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    billId:            billId,
    courseFee:         taxableAmount,
    cgst:              cgst,
    sgst:              sgst,
    totalAmount:       AMOUNT,
    boardCourseName:   courseName,
    remarks:           "Board Examination Fee Payment [Backfilled via fix script 22-Apr-2026]",
  });

  await paymentRecord.save();
  console.log(`✅ Payment record saved! billId = ${billId}`);

  // 7. Print summary — NO change to the admission record itself
  console.log("\n─── Summary ──────────────────────────────────────────────────");
  console.log(`  Student     : ${ENROLLMENT}`);
  console.log(`  Admission   : ${admission._id}`);
  console.log(`  Amount      : ₹${AMOUNT}`);
  console.log(`  Date        : 22-Apr-2026`);
  console.log(`  Bill ID     : ${billId}`);
  console.log(`  Course Name : ${courseName}`);
  console.log("──────────────────────────────────────────────────────────────");
  console.log("✅ Done. No other records were modified.");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Script failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
