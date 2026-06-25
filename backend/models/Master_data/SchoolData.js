import mongoose from "mongoose";

const schoolDataSchema = new mongoose.Schema({
    schoolName: {
        type: String,
        required: true,
        trim: true
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    className: {
        type: String,
        required: true,
        trim: true
    },
    board: {
        type: String,
        required: true,
        trim: true
    },
    area: {
        type: String,
        trim: true,
        default: ""
    }
}, { timestamps: true });

const SchoolData = mongoose.model("SchoolData", schoolDataSchema);
export default SchoolData;
