import mongoose from "mongoose";

const manpowerTargetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    month: {
        type: String,
        required: true // e.g. "July"
    },
    year: {
        type: Number,
        required: true // e.g. 2026
    },
    viewMode: {
        type: String,
        enum: ["MONTHLY", "QUARTERLY", "YEARLY"],
        required: true
    },
    calls: {
        type: Number,
        default: 0
    },
    counselling: {
        type: Number,
        default: 0
    },
    admissions: {
        type: Number,
        default: 0
    },
    collection: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

// Unique index to prevent duplicate target configurations
manpowerTargetSchema.index({ userId: 1, month: 1, year: 1, viewMode: 1 }, { unique: true });

const ManpowerTarget = mongoose.model("ManpowerTarget", manpowerTargetSchema);
export default ManpowerTarget;
