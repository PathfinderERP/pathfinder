import mongoose from "mongoose";

const paymentBreakdownSchema = new mongoose.Schema({
    installmentNumber: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ["PENDING", "PAID", "PARTIAL", "OVERDUE", "PENDING_CLEARANCE", "REJECTED"],
        default: "PENDING"
    },
    paidDate: { type: Date },
    receivedDate: { type: Date }, // Actual date when money was received
    paidAmount: { type: Number, default: 0 },
    paymentMethod: {
        type: String,
        enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "RAZORPAY_POS", "RAZORPAY_SMS"],
        default: null
    },
    transactionId: { type: String },
    bankName: { type: String },
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
        isPaid: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ["PENDING", "PAID", "PARTIAL", "PENDING_CLEARANCE", "REJECTED"],
            default: "PENDING"
        }
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
        enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "RAZORPAY_POS", "RAZORPAY_SMS"],
        default: "CASH"
    },
    downPaymentTransactionId: { type: String },
    downPaymentBankName: { type: String },
    downPaymentAccountHolderName: { type: String },
    downPaymentChequeDate: { type: Date },
    remainingAmount: {
        type: Number,
        required: true
    },
    numberOfInstallments: {
        type: Number,
        required: true,
        min: 0
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
        examSection: [String],
        studySection: [String],
        omrCode: { type: String, default: null },
        rm: { type: String, default: null } // Relationship Manager
    }
}, { timestamps: true });

// Pre-save hook to ensure a unique sequence number is generated across both admission types
admissionSchema.pre('save', async function () {
    if (!this.admissionNumber) {
        try {
            // Check if this student ALREADY has an admission number in ANY admission record (Normal or Board)
            let BoardCourseAdmission;
            try {
                BoardCourseAdmission = mongoose.model("BoardCourseAdmission");
            } catch (e) {
                BoardCourseAdmission = null;
            }

            const [existingNormal, existingBoard] = await Promise.all([
                this.constructor.findOne({ student: this.student, admissionNumber: { $exists: true, $ne: null } }).lean(),
                BoardCourseAdmission 
                    ? BoardCourseAdmission.findOne({ studentId: this.student, admissionNumber: { $exists: true, $ne: null } }).lean()
                    : Promise.resolve(null)
            ]);

            const sharedId = (existingNormal && existingNormal.admissionNumber) || (existingBoard && existingBoard.admissionNumber);

            if (sharedId) {
                this.admissionNumber = sharedId;
                return;
            }

            // Generate new sequence if student has no existing ID
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const prefix = `PATH${year}`;

            const [lastNormal, lastBoard] = await Promise.all([
                this.constructor.findOne({ admissionNumber: new RegExp(`^${prefix}`) }).sort({ admissionNumber: -1 }).lean(),
                BoardCourseAdmission 
                    ? BoardCourseAdmission.findOne({ admissionNumber: new RegExp(`^${prefix}`) }).sort({ admissionNumber: -1 }).lean()
                    : Promise.resolve(null)
            ]);

            let seqNormal = 0;
            let seqBoard = 0;

            if (lastNormal && lastNormal.admissionNumber) {
                seqNormal = parseInt(lastNormal.admissionNumber.slice(6), 10) || 0;
            }
            if (lastBoard && lastBoard.admissionNumber) {
                seqBoard = parseInt(lastBoard.admissionNumber.slice(6), 10) || 0;
            }

            const nextSequence = Math.max(seqNormal, seqBoard) + 1;
            this.admissionNumber = `${prefix}${String(nextSequence).padStart(6, '0')}`;
        } catch (error) {
            console.error("Error generating Normal Admission sequence:", error);
            throw error;
        }
    }
});

const Admission = mongoose.model("Admission", admissionSchema);
export default Admission;
