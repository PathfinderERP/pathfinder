import mongoose from "mongoose";

const marketingPlannerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String, // "YYYY-MM-DD"
        required: true
    },
    expectedLeadTarget: {
        type: Number,
        required: true
    },
    expectedHotLeads: {
        type: Number,
        required: true
    },
    // Activity specific fields (each document is one activity block/row)
    type: {
        type: String,
        required: true
    },
    institution: {
        type: String,
        default: ""
    },
    owner: {
        type: String,
        required: true
    },
    plan: {
        type: String, // e.g. "02:30 PM"
        default: ""
    },
    planTimeRaw: {
        type: String, // e.g. "14:30"
        default: ""
    },
    estimatedDuration: {
        type: String,
        default: ""
    },
    notes: {
        type: String,
        default: ""
    },
    priority: {
        type: String,
        default: "Medium"
    },
    actual: {
        type: String,
        default: ""
    },
    leads: {
        type: String,
        default: "0"
    },
    photo: {
        type: String,
        default: null
    },
    photos: {
        type: [String],
        default: []
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    locationName: {
        type: String,
        default: ""
    },
    captureDateTime: {
        type: String,
        default: ""
    },
    submittedAt: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    remarks: {
        type: String,
        default: ""
    }
}, { timestamps: true });

const MarketingPlanner = mongoose.model("MarketingPlanner", marketingPlannerSchema);
export default MarketingPlanner;
