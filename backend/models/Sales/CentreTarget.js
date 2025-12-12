import mongoose from "mongoose";

const centreTargetSchema = new mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    financialYear: {
        type: String,
        required: true // e.g., "2025-2026"
    },
    year: {
        type: Number,
        required: true // e.g., 2025
    },
    month: {
        type: String,
        required: true // e.g., "November"
    },
    targetAmount: {
        type: Number,
        required: true,
        default: 0
    },
    achievedAmount: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

const CentreTarget = mongoose.model("CentreTarget", centreTargetSchema);
export default CentreTarget;
