import mongoose from "mongoose";

const logCalendarSchema = new mongoose.Schema({
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
    department: {
        type: String,
        default: "Operations"
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
    title: {
        type: String,
        required: true
    },
    activityType: {
        type: String,
        default: "Meeting"
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        default: ""
    },
    place: {
        type: String,
        default: ""
    },
    priority: {
        type: String,
        enum: ["High", "Medium", "Low"],
        default: "Medium"
    },
    status: {
        type: String,
        enum: ["Upcoming", "In Progress", "Completed", "Cancelled"],
        default: "Upcoming"
    },
    notes: {
        type: String,
        default: ""
    },
    color: {
        type: String,
        default: "#6366f1"
    },
    sourceModule: {
        type: String,
        default: "LogCalendar"
    },
    marketingTaskId: {
        type: String,
        default: ""
    }
}, { timestamps: true });

logCalendarSchema.index({ user: 1, startDate: 1, endDate: 1 });
logCalendarSchema.index({ startDate: 1, endDate: 1 });
logCalendarSchema.index({ startDate: 1, endDate: 1, status: 1 });
logCalendarSchema.index({ startDate: 1, endDate: 1, centre: 1 });
logCalendarSchema.index({ startDate: 1, endDate: 1, userRole: 1 });
logCalendarSchema.index({ marketingTaskId: 1 });
logCalendarSchema.index({ user: 1, sourceModule: 1 });

const LogCalendar = mongoose.model("LogCalendar", logCalendarSchema);
export default LogCalendar;
