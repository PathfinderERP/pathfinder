import mongoose from "mongoose";

const studentServiceCallSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        default: null
    },
    admission: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admission",
        default: null
    },
    studentName: {
        type: String,
        required: true
    },
    enrollmentNo: {
        type: String,
        default: ""
    },
    studentPhone: {
        type: String,
        default: ""
    },
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        default: null
    },
    centreName: {
        type: String,
        default: ""
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        default: ""
    },
    servicePurpose: {
        type: String,
        enum: ["EMI Purpose", "Cross Selling", "Carry Forward", "Any Other Dispute", "Attendance & Academic Issue", "General Service Calling", "Other"],
        required: true
    },
    status: {
        type: String,
        enum: ["Neutral", "Hot", "Warm", "Cold", "Invalid"],
        default: "Neutral"
    },
    remarks: {
        type: String,
        default: ""
    },
    nextFollowUpDate: {
        type: String,
        default: ""
    },
    callDate: {
        type: String, // YYYY-MM-DD
        required: true
    }
}, { timestamps: true });

studentServiceCallSchema.index({ user: 1, callDate: 1 });
studentServiceCallSchema.index({ centre: 1, callDate: 1 });
studentServiceCallSchema.index({ student: 1 });
studentServiceCallSchema.index({ admission: 1 });

const StudentServiceCall = mongoose.model("StudentServiceCall", studentServiceCallSchema);
export default StudentServiceCall;
