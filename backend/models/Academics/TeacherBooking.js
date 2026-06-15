import mongoose from "mongoose";

const studentDetailSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LeadManagement",
        required: false
    },
    studentName: { type: String, required: true },
    phoneNumber: { type: String },
    email: { type: String },
    className: { type: String },
    course: { type: String },
    notes: { type: String }
}, { _id: true });

const teacherBookingSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    routineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TeacherRoutine",
        required: false
    },
    centreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: false
    },
    day: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        required: true
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subject: { type: String },
    className: { type: String },
    bookedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    students: [studentDetailSchema],
    status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled"],
        default: "pending"
    },
    bookingDate: {
        type: Date,
        default: Date.now
    },
    notes: { type: String },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

const TeacherBooking = mongoose.model("TeacherBooking", teacherBookingSchema);
export default TeacherBooking;
