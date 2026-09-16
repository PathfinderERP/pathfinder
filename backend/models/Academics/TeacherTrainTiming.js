import mongoose from "mongoose";

const teacherTrainTimingSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    teacherName: {
        type: String,
        trim: true,
        default: ""
    },
    sex: {
        type: String,
        trim: true,
        default: "M"
    },
    age: {
        type: Number,
        default: null
    },
    dateOfJourney: {
        type: String,
        trim: true,
        default: ""
    },
    centreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: false
    },
    day: {
        type: String,
        default: "Monday",
        trim: true
    },
    date: {
        type: Date,
        required: false
    },
    trainName: {
        type: String,
        required: true,
        trim: true
    },
    trainNumber: {
        type: String,
        trim: true,
        default: ""
    },
    journeyType: {
        type: String,
        enum: ["UP", "DOWN", "ROUND_TRIP"],
        default: "UP"
    },
    fromStation: {
        type: String,
        required: true,
        trim: true
    },
    toStation: {
        type: String,
        required: true,
        trim: true
    },
    travelClass: {
        type: String,
        trim: true,
        default: "AC"
    },
    boardingStation: {
        type: String,
        trim: true,
        default: ""
    },
    phoneNo: {
        type: String,
        trim: true,
        default: ""
    },
    departureTime: {
        type: String,
        trim: true,
        default: "" // e.g. "06:15 AM" or "06:15"
    },
    arrivalTime: {
        type: String,
        trim: true,
        default: "" // e.g. "07:45 AM" or "07:45"
    },
    classStartTime: {
        type: String,
        trim: true,
        default: ""
    },
    classEndTime: {
        type: String,
        trim: true,
        default: ""
    },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    },
    remarks: {
        type: String,
        trim: true,
        default: ""
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

// Compound index for fast queries by teacher, centre, and day
teacherTrainTimingSchema.index({ teacherId: 1, day: 1 });
teacherTrainTimingSchema.index({ centreId: 1 });
teacherTrainTimingSchema.index({ dateOfJourney: 1 });

const TeacherTrainTiming = mongoose.model("TeacherTrainTiming", teacherTrainTimingSchema);
export default TeacherTrainTiming;

