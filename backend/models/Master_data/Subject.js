import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
    subName: {
        type: String,
        required: true,
        unique: true
    },
    subPrice: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Subject = mongoose.model("Subject", subjectSchema);
export default Subject;
