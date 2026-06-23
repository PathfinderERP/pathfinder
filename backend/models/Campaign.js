import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
    adName: {
        type: String,
        required: true,
        trim: true
    },
    platform: {
        type: String,
        required: true,
        enum: ['Facebook', 'Instagram', 'YouTube', 'Google Search', 'Other'],
        default: 'Facebook'
    },
    creativeName: {
        type: String,
        trim: true
    },
    duration: {
        type: String,
        trim: true
    },
    budget: {
        type: Number,
        required: true
    },
    cpc: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    leads: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;
