import mongoose from "mongoose";

const tomorrowPlannerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    // The date this plan is FOR (i.e. "tomorrow" when it was created)
    planDate: {
        type: Date,
        required: true
    },
    tasks: [{
        taskDetails: {
            type: String,
            required: true
        },
        priority: {
            type: String,
            enum: ["High", "Medium", "Low"],
            default: "Medium"
        },
        estimatedDuration: {
            type: String,
            default: ""
        },
        notes: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["Planned", "Completed", "Skipped"],
            default: "Planned"
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// One plan document per user per plan-date
tomorrowPlannerSchema.index({ user: 1, planDate: 1 }, { unique: true });

const TomorrowPlanner = mongoose.model("TomorrowPlanner", tomorrowPlannerSchema);
export default TomorrowPlanner;
