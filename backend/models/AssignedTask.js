import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────
//  Schema: AssignedTask
//  Purpose: Super admin assigns a school-visit task to a staff
//           member. The school comes from SchoolForTask master data.
//           Assigned tasks are merged into the assignee's Today Task
//           and Tomorrow Planner views automatically.
// ─────────────────────────────────────────────────────────────
const assignedTaskSchema = new mongoose.Schema(
    {
        // ── Who assigned this task ────────────────────────────
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        assignedByName: {
            type: String,
            default: "",
        },

        // ── Who this task is assigned TO ──────────────────────
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        assignedToName: {
            type: String,
            default: "",
        },

        // ── School from SchoolForTask master data ─────────────
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SchoolForTask",
            required: true,
        },
        // Denormalized fields from SchoolForTask (so we don't always need populate)
        schoolName: {
            type: String,
            default: "",
        },
        schoolStatus: {
            type: String,
            default: "",
        },
        schoolTier: {
            type: String,
            default: "",
        },
        centreName: {
            type: String,
            default: "",
        },

        // ── The date this task is for ─────────────────────────
        planDate: {
            type: Date,
            required: true,
        },

        // ── Task Details ──────────────────────────────────────
        activityType: {
            type: String,
            default: "School Visit",
        },
        time: {
            type: String,
            default: "",
        },
        estimatedDuration: {
            type: String,
            default: "",
        },
        notes: {
            type: String,
            default: "",
        },
        priority: {
            type: String,
            enum: ["High", "Medium", "Low"],
            default: "Medium",
        },

        // ── Status of the assigned task ───────────────────────
        status: {
            type: String,
            enum: ["Pending", "Completed", "Cancelled"],
            default: "Pending",
        },

        // ── Optional remarks by the assignee when completing ──
        completionRemarks: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────
assignedTaskSchema.index({ assignedTo: 1, planDate: 1 });
assignedTaskSchema.index({ assignedBy: 1, planDate: 1 });
assignedTaskSchema.index({ school: 1 });
assignedTaskSchema.index({ status: 1 });

const AssignedTask = mongoose.model("AssignedTask", assignedTaskSchema);
export default AssignedTask;
