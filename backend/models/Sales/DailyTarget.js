import mongoose from "mongoose";

const dailyTargetSchema = new mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    targetAmount: {
        type: Number,
        required: true,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

// Prevent duplicate targets for same centre on same date
dailyTargetSchema.index({ centre: 1, date: 1 }, { unique: true });

const DailyTarget = mongoose.model("DailyTarget", dailyTargetSchema);
export default DailyTarget;
