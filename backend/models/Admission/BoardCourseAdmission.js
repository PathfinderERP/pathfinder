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
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const prefix = `PATH${year}`;

        // Find the latest admission number for the current year (across both models or just this one?)
        // The user said "also the enrollment id will generate", implying consistency.
        // We'll search in this collection for now. 
        const lastRecord = await this.constructor.findOne({
            admissionNumber: new RegExp(`^${prefix}`)
        }).sort({ admissionNumber: -1 });

        let sequence = 1;
        if (lastRecord && lastRecord.admissionNumber) {
            const lastSeq = parseInt(lastRecord.admissionNumber.slice(6), 10);
            if (!isNaN(lastSeq)) sequence = lastSeq + 1;
        }

        this.admissionNumber = `${prefix}${String(sequence).padStart(6, '0')}`;
    }
});

const BoardCourseAdmission = mongoose.model("BoardCourseAdmission", boardCourseAdmissionSchema);
export default BoardCourseAdmission;
