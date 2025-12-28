import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    files: [{
        url: { type: String, required: true },
        fileType: { type: String }, // 'pdf', 'image', 'video'
        fileName: { type: String }
    }],
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    uploadedByName: { type: String }, // Snapshot for quick display
    uploadedByDepartment: { type: String }, // Snapshot
    targetAudience: {
        type: String,
        enum: ["All", "Department", "Designation"],
        default: "All"
    },
    targetDepartment: {
        type: String, // e.g. "HR", "Sales"
        default: null
    },
    targetDesignation: {
        type: String, // e.g. "Manager", "Intern"
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Document = mongoose.model("Document", documentSchema);
export default Document;
