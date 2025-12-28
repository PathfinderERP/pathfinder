import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    fileKey: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number },
    fileType: { type: String, enum: ["Video", "PDF", "Image", "Other"], required: true },
    fileUrl: { type: String } // Virtual or signed URL populated during retrieval
}, { _id: false });

const trainingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, default: "General" },
    visibility: { type: String, enum: ["All", "Specific"], default: "All" },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    files: [fileSchema]
}, { timestamps: true });

const Training = mongoose.model("Training", trainingSchema);
export default Training;
