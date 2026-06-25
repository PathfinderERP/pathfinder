/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           ZERO-OUT BILL BY BILL NUMBER — Standalone Script              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node delete_bill_by_number.mjs <BILL_ID> [--dry-run]
 *
 * Examples:
 *   node delete_bill_by_number.mjs PATH/KAL/2025-26/0000123
 *   node delete_bill_by_number.mjs PATH/KAL/2025-26/0000123 --dry-run
 *
 * What this script does (bill is KEPT, only amounts are zeroed):
 *   ✅ Payment record  → cgst, sgst, courseFee, totalAmount, paidAmount  = 0
 *                     → status set to CANCELLED
 *                     → billId kept intact (bill still exists)
 *   ✅ Admission       → matching installment in paymentBreakdown
 *                        paidAmount = 0, status = PENDING
 *   ✅ BoardCourseAdmission → matching installment paidAmount = 0,
 *                             paymentTransactions cleared, status = PENDING
 *   ✅ totalPaidAmount on the admission is recalculated and reduced
 *
 * --dry-run: shows exactly what WOULD change — nothing is saved.
 */

import mongoose from "mongoose";
import dotenv   from "dotenv";
import readline from "readline";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// ── Models ───────────────────────────────────────────────────────────────────
// Import every model that Mongoose needs to know about in this process.
// We avoid .populate() chains to prevent MissingSchemaError cascades.
import Payment              from "./models/Payment/Payment.js";
import Admission            from "./models/Admission/Admission.js";
import BoardCourseAdmission from "./models/Admission/BoardCourseAdmission.js";
import Student              from "./models/Students.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (ans) => { rl.close(); resolve(ans.trim().toLowerCase()); });
    });
}

const SEP  = "─".repeat(72);
const sep  = () => console.log(SEP);
const tag  = (label, value) => console.log(`  ${label.padEnd(22)}: ${value}`);

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);

    if (!args.length || args[0] === "--help" || args[0] === "-h") {
        console.log(`
  Usage:
    node delete_bill_by_number.mjs <BILL_ID> [--dry-run]

  Examples:
    node delete_bill_by_number.mjs PATH/KAL/2025-26/0000123
    node delete_bill_by_number.mjs PATH/KAL/2025-26/0000123 --dry-run
        `);
        process.exit(0);
    }

    const billIdArg = args[0];
    const isDryRun  = args.includes("--dry-run");

    if (isDryRun) console.log("\n🔍  DRY-RUN mode — NO changes will be saved.\n");

    // ── Connect ───────────────────────────────────────────────────────────────
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅  Connected to MongoDB\n");

    // ── 1. Find Payment record ────────────────────────────────────────────────
    const payment = await Payment.findOne({ billId: billIdArg });
    if (!payment) {
        console.error(`❌  No Payment record found with billId: "${billIdArg}"`);
        await mongoose.disconnect();
        process.exit(1);
    }

    // ── 2. Find linked Admission (Normal or Board) — NO .populate() to avoid
    //        MissingSchemaError for Course/ExamTag/Department etc. in standalone scripts.
    let normalAdm = null;
    let boardAdm  = null;

    normalAdm = await Admission.findById(payment.admission).lean();
    if (!normalAdm) {
        boardAdm = await BoardCourseAdmission.findById(payment.admission).lean();
    }

    // Fetch the Student document directly (only model we actually need to resolve)
    const studentId = normalAdm?.student || boardAdm?.studentId;
    const studentDoc = studentId
        ? await Student.findById(studentId).lean()
        : null;

    const studentName  = studentDoc?.studentsDetails?.[0]?.studentName
                      || boardAdm?.studentName
                      || "N/A";
    const admissionNum = normalAdm?.admissionNumber || boardAdm?.admissionNumber || "N/A";
    const courseName   = normalAdm?.boardCourseName
                      || boardAdm?.boardCourseName
                      || payment.boardCourseName
                      || "N/A";

    // ── 3. Show current state ─────────────────────────────────────────────────
    sep();
    console.log("  📄  BILL DETAILS (CURRENT STATE)");
    sep();
    tag("Bill ID",            payment.billId);
    tag("Payment DB ID",      payment._id);
    tag("Student",            studentName);
    tag("Admission Number",   admissionNum);
    tag("Course",             courseName);
    tag("Installment #",      payment.installmentNumber);
    tag("Paid Amount",        `₹${payment.paidAmount}`);
    tag("Total Amount",       `₹${payment.totalAmount}`);
    tag("CGST",               `₹${payment.cgst}`);
    tag("SGST",               `₹${payment.sgst}`);
    tag("Course Fee",         `₹${payment.courseFee}`);
    tag("Payment Method",     payment.paymentMethod || "N/A");
    tag("Status",             payment.status);
    tag("Paid Date",          payment.paidDate?.toDateString() || "N/A");
    tag("Billing Month",      payment.billingMonth || "N/A");
    sep();

    // Find the matching installment in admission
    let matchedInstallment  = null;
    let installmentIndex    = -1;

    if (normalAdm) {
        installmentIndex = normalAdm.paymentBreakdown.findIndex(
            (p) => p.installmentNumber === payment.installmentNumber
        );
        matchedInstallment = installmentIndex !== -1
            ? normalAdm.paymentBreakdown[installmentIndex]
            : null;
    } else if (boardAdm) {
        // For board: installmentNumber in Payment is monthNumber-1 (0-indexed)
        // Try both mappings
        installmentIndex = boardAdm.installments.findIndex(
            (i) => i.monthNumber === payment.installmentNumber
                || i.monthNumber === payment.installmentNumber + 1
        );
        matchedInstallment = installmentIndex !== -1
            ? boardAdm.installments[installmentIndex]
            : null;
    }

    if (matchedInstallment) {
        console.log("\n  📋  MATCHING INSTALLMENT IN ADMISSION (will also be zeroed)");
        sep();
        if (normalAdm) {
            tag("Installment #",    matchedInstallment.installmentNumber);
            tag("Paid Amount",      `₹${matchedInstallment.paidAmount}`);
            tag("Status",           matchedInstallment.status);
        } else {
            tag("Month #",          matchedInstallment.monthNumber);
            tag("Paid Amount",      `₹${matchedInstallment.paidAmount}`);
            tag("Status",           matchedInstallment.status);
            tag("Transactions",     matchedInstallment.paymentTransactions?.length || 0);
        }
        sep();
    } else {
        console.log("\n  ℹ️   No matching installment found in the admission document.\n");
    }

    // ── 4. What will change ───────────────────────────────────────────────────
    console.log("\n  🔧  CHANGES THAT WILL BE APPLIED");
    sep();
    console.log("  Payment record (billId stays intact):");
    console.log(`    paidAmount   : ₹${payment.paidAmount}  →  ₹0`);
    console.log(`    totalAmount  : ₹${payment.totalAmount}  →  ₹0`);
    console.log(`    cgst         : ₹${payment.cgst}  →  ₹0`);
    console.log(`    sgst         : ₹${payment.sgst}  →  ₹0`);
    console.log(`    courseFee    : ₹${payment.courseFee}  →  ₹0`);
    console.log(`    status       : ${payment.status}  →  CANCELLED`);
    if (matchedInstallment && normalAdm) {
        console.log("\n  Admission paymentBreakdown installment:");
        console.log(`    paidAmount   : ₹${matchedInstallment.paidAmount}  →  ₹0`);
        console.log(`    status       : ${matchedInstallment.status}  →  PENDING`);
        console.log(`    totalPaidAmount on Admission  →  reduced by ₹${matchedInstallment.paidAmount}`);
    }
    if (matchedInstallment && boardAdm) {
        console.log("\n  BoardCourseAdmission installment:");
        console.log(`    paidAmount            : ₹${matchedInstallment.paidAmount}  →  ₹0`);
        console.log(`    status                : ${matchedInstallment.status}  →  PENDING`);
        console.log(`    paymentTransactions   : cleared`);
        console.log(`    totalPaidAmount on BoardCourseAdmission  →  reduced by ₹${matchedInstallment.paidAmount}`);
    }
    sep();

    // ── 5. Dry-run exit ───────────────────────────────────────────────────────
    if (isDryRun) {
        console.log("\n✅  DRY-RUN complete. Nothing was changed. Remove --dry-run to apply.\n");
        await mongoose.disconnect();
        process.exit(0);
    }

    // ── 6. Confirm ────────────────────────────────────────────────────────────
    console.log("\n⚠️   This will ZERO OUT all amounts for bill:", billIdArg);
    console.log("     The bill number itself will remain in the system.\n");
    const confirm = await ask("  Type  YES  to confirm: ");

    if (confirm !== "yes") {
        console.log("\n❌  Aborted. Nothing was changed.");
        await mongoose.disconnect();
        process.exit(0);
    }

    const zeroedAt   = new Date().toISOString();
    const auditNote  = `[ZEROED on ${zeroedAt}] Bill ${payment.billId} amounts set to 0 via delete_bill_by_number.mjs script.`;

    // ── 7a. Zero out Payment record ───────────────────────────────────────────
    // payment was fetched without .lean() so it IS a Mongoose document — .save() works fine
    payment.paidAmount   = 0;
    payment.totalAmount  = 0;
    payment.cgst         = 0;
    payment.sgst         = 0;
    payment.courseFee    = 0;
    payment.status       = "CANCELLED";
    payment.remarks      = [payment.remarks, auditNote].filter(Boolean).join(" | ");

    await payment.save();
    console.log(`\n✅  Payment record zeroed (billId "${payment.billId}" preserved)`);

    // ── 7b. Zero out Normal Admission installment ─────────────────────────────
    // normalAdm was fetched with .lean() (plain object), so we use updateOne + positional $
    if (normalAdm && installmentIndex !== -1) {
        const prevPaid      = normalAdm.paymentBreakdown[installmentIndex].paidAmount || 0;
        const installNum    = normalAdm.paymentBreakdown[installmentIndex].installmentNumber;
        const newTotal      = Math.max(0, (normalAdm.totalPaidAmount || 0) - prevPaid);

        await Admission.updateOne(
            {
                _id: normalAdm._id,
                "paymentBreakdown.installmentNumber": installNum
            },
            {
                $set: {
                    "paymentBreakdown.$.paidAmount": 0,
                    "paymentBreakdown.$.status":     "PENDING",
                    totalPaidAmount:                  newTotal
                }
            }
        );
        console.log(`✅  Admission installment #${installNum} zeroed`);
        console.log(`   totalPaidAmount on Admission updated: ₹${newTotal}`);
    }

    // ── 7c. Zero out BoardCourseAdmission installment ────────────────────────
    // boardAdm was also fetched with .lean() — use updateOne + positional $
    if (boardAdm && installmentIndex !== -1) {
        const prevPaid   = boardAdm.installments[installmentIndex].paidAmount || 0;
        const monthNum   = boardAdm.installments[installmentIndex].monthNumber;
        const newTotal   = Math.max(0, (boardAdm.totalPaidAmount || 0) - prevPaid);

        await BoardCourseAdmission.updateOne(
            {
                _id: boardAdm._id,
                "installments.monthNumber": monthNum
            },
            {
                $set: {
                    "installments.$.paidAmount":          0,
                    "installments.$.status":              "PENDING",
                    "installments.$.paymentTransactions": [],
                    totalPaidAmount:                       newTotal
                }
            }
        );
        console.log(`✅  BoardCourseAdmission month #${monthNum} zeroed`);
        console.log(`   totalPaidAmount on BoardCourseAdmission updated: ₹${newTotal}`);
    }

    // ── 8. Summary ────────────────────────────────────────────────────────────
    sep();
    console.log("  ✅  DONE — ALL AMOUNTS ZEROED");
    sep();
    tag("Bill ID",            payment.billId);
    tag("Student",            `${studentName} (${admissionNum})`);
    tag("Zeroed At",          zeroedAt);
    tag("Payment Status",     "CANCELLED");
    tag("Note",               "Bill number is KEPT. Amounts are 0.");
    sep();

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error("❌  Script failed:", err);
    mongoose.disconnect();
    process.exit(1);
});
