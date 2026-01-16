import mongoose from "mongoose";

const boardsSchema = new mongoose.Schema({
    boardCourse: {
        type: String,
        required: true,
        unique: true
    },
    duration: {
        type: String, // e.g., "6 Months", "1 Year"
    },
    subjects: [{
        subjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject"
        },
        price: {
            type: Number,
            default: 0
        }
    }]
}, { timestamps: true });

const Boards = new mongoose.model("Boards", boardsSchema);
export default Boards;