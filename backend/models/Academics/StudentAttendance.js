import mongoose from "mongoose";

const studentAttendanceSchema = new mongoose.Schema({
    classScheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClassSchedule",
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        required: true
    },
    status: {
        type: String,
        enum: ["Present", "Absent"],
        default: "Absent"
    },
    date: {
        type: Date,
        default: Date.now
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

// Ensure a student can only have one attendance record per class
studentAttendanceSchema.index({ classScheduleId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("StudentAttendance", studentAttendanceSchema);
