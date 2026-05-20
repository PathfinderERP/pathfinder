import mongoose from "mongoose";

const dailyTrackingLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    date: {
        type: Date,
        required: true,
        default: () => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d;
        }
    },
    activities: [{
        time: {
            type: String,
            required: true
        },
        workDetails: {
            type: String,
            required: true
        },
        completedWork: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ['In Progress', 'Completed'],
            default: 'Completed'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

// Index for quick lookup of user's logs for a specific day
dailyTrackingLogSchema.index({ user: 1, date: 1 }, { unique: true });

const DailyTrackingLog = mongoose.model("DailyTrackingLog", dailyTrackingLogSchema);
export default DailyTrackingLog;
