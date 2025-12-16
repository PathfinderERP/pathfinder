import mongoose from "mongoose";

const academicsClassSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

export default mongoose.model("AcademicsClass", academicsClassSchema);
