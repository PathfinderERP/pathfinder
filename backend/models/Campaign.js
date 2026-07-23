import mongoose from "mongoose";

const runLogEntrySchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['start', 'end', 'restart'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    by: {
        type: String // Store user name for display
    }
}, { _id: false });

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
    },
    totalLikes: {
        type: Number,
        default: 0
    },
    totalViews: {
        type: Number,
        default: 0
    },
    comments: {
        type: Number,
        default: 0
    },
    shares: {
        type: Number,
        default: 0
    },
    imageLink: {
        type: String,
        trim: true
    },
    videoLink: {
        type: String,
        trim: true
    },
    uploadedMedia: [{
        type: String
    }],
    // ── Run lifecycle tracking ──────────────────────────────────────
    runStatus: {
        type: String,
        enum: ['idle', 'running', 'ended'],
        default: 'idle'
    },
    // Latest timestamps per action for quick UI display
    lastStartedAt: { type: Date, default: null },
    lastEndedAt:   { type: Date, default: null },
    lastRestartedAt: { type: Date, default: null },
    // Full chronological log of every action
    runLog: [runLogEntrySchema]
}, { timestamps: true });

const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;
