import mongoose from "mongoose";

const paymentBreakdownSchema = new mongoose.Schema({
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ["PENDING", "PAID", "OVERDUE", "PENDING_CLEARANCE"],
        default: "PENDING"
    },
    paidDate: { type: Date },
    receivedDate: { type: Date }, // Actual date when money was received
    paidAmount: { type: Number, default: 0 },
    paymentMethod: {
        type: String,
        enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"],
        default: null
    },
    transactionId: { type: String },
    accountHolderName: { type: String },
    chequeDate: { type: Date },
    remarks: { type: String }
});

const admissionSchema = new mongoose.Schema({
    // Student Reference
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },

    // Admission Type
    admissionType: {
        type: String,
        enum: ["NORMAL", "BOARD"],
        default: "NORMAL"
    },

    // Course Details
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: function () { return this.admissionType === "NORMAL"; }
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class"
    },
    examTag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExamTag",
        required: function () { return this.admissionType === "NORMAL"; }
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: function () { return this.admissionType === "NORMAL"; }
    },
    centre: {
        type: String,
        required: true
    },
    // Board Admission Specifics
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Boards",
        required: function () { return this.admissionType === "BOARD"; }
    },
    selectedSubjects: [{
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject"
        },
        name: String,
        price: Number
    }],
    billingMonth: { // For Board courses - tracks current billing month
        type: String // e.g., "January 2026"
    },
    monthlySubjectHistory: [{ // Track subject selections per month
        month: String, // e.g., "2026-01"
        subjects: [{
            subject: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Subject"
            },
            name: String,
            price: Number
        }],
        totalAmount: Number,
        isPaid: { type: Boolean, default: false }
    }],
    courseDurationMonths: { // For Board courses - total duration in months
        type: Number
    },
    boardCourseName: { // Constructed name for board course
        type: String
    },

    // Admission Details
    admissionDate: {
        type: Date,
        default: Date.now
    },
    admissionNumber: {
        type: String
        // Removed unique constraint to allow same ID for multiple courses of same student
    },
    academicSession: {
        type: String,
        required: true
    },

    // Student Image
    studentImage: {
        type: String,
        default: null
    },

    // Fee Details
    previousBalance: {
        type: Number,
        default: 0
    },
    baseFees: {
        type: Number,
        required: true
    },
    discountAmount: { // Fee Waiver
        type: Number,
        default: 0
    },
    cgstAmount: {
        type: Number,
        required: true,
        default: 0
    },
    sgstAmount: {
        type: Number,
        required: true,
        default: 0
    },
    totalFees: { // Final amount including GST
        type: Number,
        required: true
    },
    downPayment: {
        type: Number,
        required: true
    },
    downPaymentStatus: {
        type: String,
        enum: ["PENDING", "PAID", "PENDING_CLEARANCE", "REJECTED"],
        default: "PAID"
    },
    downPaymentReceivedDate: { type: Date }, // Actual date when down payment was received
    downPaymentMethod: {
        type: String,
        enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"],
        default: "CASH"
    },
    downPaymentTransactionId: { type: String },
    downPaymentAccountHolderName: { type: String },
    downPaymentChequeDate: { type: Date },
    remainingAmount: {
        type: Number,
        required: true
    },
    numberOfInstallments: {
        type: Number,
        required: true,
        min: 1
    },
    installmentAmount: {
        type: Number,
        required: true
    },

    // Payment Breakdown
    paymentBreakdown: [paymentBreakdownSchema],

    // Fee Structure from Course
    feeStructureSnapshot: [{
        feesType: String,
        value: Number,
        discount: String
    }],

    // Payment Status
    paymentStatus: {
        type: String,
        enum: ["PENDING", "PARTIAL", "COMPLETED"],
        default: "PENDING"
    },
    totalPaidAmount: {
        type: Number,
        default: 0
    },

    // Admission Status
    admissionStatus: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "CANCELLED", "COMPLETED", "TRANSFERRED"],
        default: "ACTIVE"
    },

    // Additional Details
    remarks: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    // Section Allotment
    sectionAllotment: {
        examSection: { type: String, default: null },
        studySection: { type: String, default: null },
        omrCode: { type: String, default: null },
        rm: { type: String, default: null } // Relationship Manager
    }
}, { timestamps: true });

// Generate admission number before saving
admissionSchema.pre('save', async function () {
    if (!this.admissionNumber) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments();
        this.admissionNumber = `PathStd${year}${String(count + 1).padStart(5, '0')}`;
    }
});

const Admission = mongoose.model("Admission", admissionSchema);
export default Admission;
