import mongoose from "mongoose";

const classScheduleSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    classMode: {
        type: String,
        enum: ["Online", "Offline"],
        required: true
    },
    startTime: {
        type: String, // Or Date, but Time picker usually returns string like "10:00"
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicsSubject",
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Assuming teachers are Users
        required: true
    },
    session: {
        type: String, // Or ObjectId if Session model exists
        required: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExamTag", // Assuming Exam comes from ExamTag or similar
        required: false // Maybe optional
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    centreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        required: true
    },
    // New Fields from Screenshot (Academics Content)
    acadClassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicsClass",
        required: false // Optional for now as not all schedules might have content
    },
    acadSubjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicsSubject",
        required: false
    },
    chapterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicsChapter",
        required: false
    },
    topicIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicsTopic"
    }],
    message: {
        type: String,
        default: ""
    }
}, { timestamps: true });

export default mongoose.model("ClassSchedule", classScheduleSchema);
