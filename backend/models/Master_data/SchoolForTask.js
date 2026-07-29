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
            enum: ["A", "B", "C", "D", "E"],
            default: "A",
        },

        // ── School Access (SCHOOLACCESS) ──────────
        schoolAccess: {
            type: String,
            enum: ["YES", "NO"],
            default: "YES",
        },

        // ── Status ────────────────────────────────
        status: {
            type: String,
            enum: [
                "MOCK TEST TIE-UP",
                "CRP TIE-UP",
                "(INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT",
                "ONLY INFORMATION GIVEN TO STUDENTS",
                "OTHERS"
            ],
            default: "ONLY INFORMATION GIVEN TO STUDENTS",
        },

        // ── Remarks ───────────────────────────────
        remarks: {
            type: String,
            trim: true,
            default: "",
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
schoolForTaskSchema.index({ status: 1 });

const SchoolForTask = mongoose.model("SchoolForTask", schoolForTaskSchema);
export default SchoolForTask;
