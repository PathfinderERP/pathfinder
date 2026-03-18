import mongoose from "mongoose";

const boardCourseSubjectSchema = new mongoose.Schema({
    boardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Boards", // Referencing the existing Boards model if it represents the Board entity
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true
    },
    subjects: [{
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true
        },
        amount: {
            type: Number,
            required: true,
            default: 0
        }
    }]
}, { timestamps: true });

// Uniqueness for board and class combination
boardCourseSubjectSchema.index({ boardId: 1, classId: 1 }, { unique: true });

const BoardCourseSubject = mongoose.model("BoardCourseSubject", boardCourseSubjectSchema);
export default BoardCourseSubject;
