import mongoose from "mongoose";
import "./Master_data/Class.js";
import "./Master_data/Centre.js";
import "./Master_data/Session.js";
import "./Master_data/ExamTag.js";
import "./Master_data/Boards.js";
import "./Payment/Payment.js";
import "./Students.js";

const pmoStudentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true,
    },
    secondaryMobile: {
        type: String,
        required: false,
        default: "",
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
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Boards',
        required: true,
    },
    course: {
        type: String,
        required: true,
    },
    amountPaid: {
        type: Number,
        default: 100,
    },
    waiver: {
        type: Number,
        default: 0,
    },
    paymentType: {
        type: String,
        enum: ['free', 'paid'],
        default: 'paid',
    },
    isImported: {
        type: Boolean,
        default: false,
    },
    isPaymentPending: {
        type: Boolean,
        default: false,
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'],
        default: 'CASH',
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
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
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
    examVenue: {
        type: String,
        required: false,
    },
    reportingTime: {
        type: String,
        required: false,
    },
    timeSlot: {
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

const PMOStudent = mongoose.model("PMOStudent", pmoStudentSchema);
export default PMOStudent;
