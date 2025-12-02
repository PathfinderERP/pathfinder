import mongoose from "mongoose";

const paymentBreakdownSchema = new mongoose.Schema({
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ["PENDING", "PAID", "OVERDUE"], 
        default: "PENDING" 
    },
    paidDate: { type: Date },
    paidAmount: { type: Number, default: 0 },
    paymentMethod: {
        type: String,
        enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"],
        default: null
    },
    transactionId: { type: String },
    remarks: { type: String }
});

const admissionSchema = new mongoose.Schema({
    // Student Reference
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },

    // Course Details
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class"
    },
    examTag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExamTag",
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department"
    },
    centre: {
        type: String,
        required: true
    },

    // Admission Details
    admissionDate: {
        type: Date,
        default: Date.now
    },
    admissionNumber: {
        type: String,
        unique: true
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
        enum: ["ACTIVE", "INACTIVE", "CANCELLED", "COMPLETED"],
        default: "ACTIVE"
    },

    // Additional Details
    remarks: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NormalAdmin"
    }
}, { timestamps: true });

// Generate admission number before saving
admissionSchema.pre('save', async function() {
    if (!this.admissionNumber) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments();
        this.admissionNumber = `PathStd${year}${String(count + 1).padStart(5, '0')}`;
    }
});

const Admission = mongoose.model("Admission", admissionSchema);
export default Admission;
