import mongoose from "mongoose";

const boardCourseMasterSchema = new mongoose.Schema({
    boardName: {
        type: String,
        required: true,
    },
    className: {
        type: String,
        required: true,
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

// Ensure uniqueness of boardName and className combination
boardCourseMasterSchema.index({ boardName: 1, className: 1 }, { unique: true });

const BoardCourseMaster = mongoose.model("BoardCourseMaster", boardCourseMasterSchema);
export default BoardCourseMaster;
