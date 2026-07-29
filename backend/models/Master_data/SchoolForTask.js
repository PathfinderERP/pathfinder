import mongoose from "mongoose";

// ─────────────────────────────────────────────
//  Schema: SchoolForTask
//  Fields: CenterName | SchoolName | Board | Tier | SchoolAccess
// ─────────────────────────────────────────────
const schoolForTaskSchema = new mongoose.Schema(
    {
        // ── Centre (CenterName) ───────────────────
        centerName: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CentreSchema",
            required: true,
            default: null,
        },

        // ── School Name ───────────────────────────
        schoolName: {
            type: String,
            required: true,
            trim: true,
        },

        // ── Board ─────────────────────────────────
        board: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Boards",
            default: null,
        },

        // ── Tier ──────────────────────────────────
        tier: {
            type: String,
            enum: ["Tier-1", "Tier-2", "Tier-3", "Tier-4", "Other"],
            default: "Tier-1",
        },

        // ── School Access (SCHOOLACCESS) ──────────
        schoolAccess: {
            type: String,
            enum: ["open", "restricted", "blocked"],
            default: "open",
        },
    },
    { timestamps: true }
);

// ─────────────────────────────────────────────
//  Indexes for faster queries
// ─────────────────────────────────────────────
schoolForTaskSchema.index({ schoolName: 1 });
schoolForTaskSchema.index({ centerName: 1 });
schoolForTaskSchema.index({ board: 1 });
schoolForTaskSchema.index({ tier: 1 });
schoolForTaskSchema.index({ schoolAccess: 1 });

const SchoolForTask = mongoose.model("SchoolForTask", schoolForTaskSchema);
export default SchoolForTask;
