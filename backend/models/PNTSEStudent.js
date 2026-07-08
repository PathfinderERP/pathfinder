import mongoose from "mongoose";

const pntseStudentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false,
    },
    dob: {
        type: String,
        required: false,
    },
    gender: {
        type: String,
        required: false,
    },
    address: {
        type: String,
        required: false,
    },
    city: {
        type: String,
        required: false,
    },
    state: {
        type: String,
        required: false,
    },
    pincode: {
        type: String,
        required: false,
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true,
    },
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
        required: true,
    },
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
    },
    examTag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamTag',
        required: true,
    },
    course: {
        type: String,
        required: true,
        enum: [
            'PNTSE CLASS 6',
            'PNTSE CLASS 7',
            'PNTSE CLASS 8',
            'PNTSE CLASS 9',
            'PNTSE CLASS 10'
        ]
    },
    amountPaid: {
        type: Number,
        default: 0,
    },
    waiver: {
        type: Number,
        default: 0,
    },
    paymentType: {
        type: String,
        enum: ['free', 'paid'],
        default: 'free',
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'],
        default: null,
    },
    billId: {
        type: String,
        default: null,
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        default: null,
    },
    rollNo: {
        type: String,
        required: true,
        unique: true,
    },
    school: {
        type: String,
        required: false,
    },
    guardianName: {
        type: String,
        required: false,
    },
    guardianMobile: {
        type: String,
        required: false,
    },
    examDate: {
        type: String,
        required: false,
    },
    remarks: {
        type: String,
        required: false,
    },
    status: {
        type: String,
        enum: ['Qualified', 'Appeared', 'Not Qualified'],
        default: 'Appeared',
    },
    score: {
        type: Number,
        default: 0,
    },
    rank: {
        type: Number,
        required: false,
    }
}, { timestamps: true });

const PNTSEStudent = mongoose.model("PNTSEStudent", pntseStudentSchema);
export default PNTSEStudent;
