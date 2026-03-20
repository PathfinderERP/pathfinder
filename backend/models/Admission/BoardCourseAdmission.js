import mongoose from "mongoose";

const boardCourseAdmissionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    studentName: {
        type: String,
        required: true
    },
    mobileNum: {
        type: String,
        required: true
    },
    boardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Boards",
        required: true
    },
    centre: {
        type: String,
        required: true
    },
    programme: {
        type: String,
        enum: ['CRP', 'NCRP']
    },
    lastClass: {
        type: String,
        required: true
    },
    selectedSubjects: [{
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject"
        },
        priceAtAdmission: {
            type: Number,
            required: true
        }
    }],
    totalDurationMonths: {
        type: Number,
        required: true
    },
    totalWaiver: {
        type: Number,
        default: 0
    },
    monthlyWaiver: {
        type: Number,
        default: 0
    },
    admissionFee: {
        type: Number,
        default: 0
    },
    examFee: {
        type: Number,
        default: 0
    },
    examFeePaid: {
        type: Number,
        default: 0
    },
    examFeeStatus: {
        type: String,
        enum: ["PENDING", "PARTIAL", "PAID"],
        default: "PENDING"
    },
    admissionDate: {
        type: Date,
        default: Date.now
    },
    billingStartDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["ACTIVE", "COMPLETED", "CANCELLED"],
        default: "ACTIVE"
    },
    installments: [{
        monthNumber: Number, // 1 to totalDurationMonths
        dueDate: Date,
        standardAmount: Number, // Sum of subject prices at that time
        subjects: [{ // Track which subjects were active for this specific month
            subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
            price: Number
        }],
        waiverAmount: Number, // Monthly waiver share
        adjustmentAmount: { // Extra payment from DP or previous overpayment/underpayment
            type: Number,
            default: 0
        },
        payableAmount: Number, // standardAmount - waiverAmount - adjustmentAmount
        paidAmount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ["PENDING", "PARTIALLY_PAID", "PARTIAL", "PAID"],
            default: "PENDING"
        },
        paymentTransactions: [{
            amount: Number,
            date: Date,
            paymentMethod: String,
            transactionId: String,
            bankName: String,
            accountHolderName: String,
            chequeDate: Date,
            receivedBy: mongoose.Schema.Types.ObjectId
        }]
    }],
    totalExpectedAmount: Number,
    totalPaidAmount: {
        type: Number,
        default: 0
    },
    admissionNumber: {
        type: String
    },
    boardCourseName: {
        type: String
    },
    academicSession: {
        type: String
    },
    centre: String,
    remarks: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

// Generate admission number before saving
boardCourseAdmissionSchema.pre('save', async function () {
    if (!this.admissionNumber) {
        try {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const prefix = `PATH${year}`;

            // Check BOTH Admission and BoardCourseAdmission for the latest number
            const Admission = mongoose.model("Admission");
            const [lastNormal, lastBoard] = await Promise.all([
                Admission.findOne({ admissionNumber: new RegExp(`^${prefix}`) }).sort({ admissionNumber: -1 }).lean(),
                this.constructor.findOne({ admissionNumber: new RegExp(`^${prefix}`) }).sort({ admissionNumber: -1 }).lean()
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
            console.error("Error generating Board Admission sequence:", error);
            throw error;
        }
    }
});

const BoardCourseAdmission = mongoose.model("BoardCourseAdmission", boardCourseAdmissionSchema);
export default BoardCourseAdmission;
