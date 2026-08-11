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
            required: false
        },
        activityType: {
            type: String,
            default: ""
        },
        activityPurpose: {
            type: String,
            default: ""
        },
        // place can be a free-text string (user's own task)
        // or resolved school name (assigned task from master data)
        place: {
            type: String,
            default: ""
        },
        // Optional: ObjectId ref to SchoolForTask (when assigned by admin)
        schoolRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SchoolForTask",
            default: null
        },
        // Denormalised school status shown to user
        schoolStatus: {
            type: String,
            default: ""
        },
        time: {
            type: String,
            default: ""
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
        // Whether this task was admin-assigned (vs self-planned)
        isAssigned: {
            type: Boolean,
            default: false
        },
        // The user who assigned this task (if isAssigned = true)
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        assignedByName: {
            type: String,
            default: ""
        },
        // Reference to the AssignedTask document (if any)
        assignedTaskRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AssignedTask",
            default: null
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
