import mongoose from "mongoose";

const draftPlannerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    date: {
        type: String, // "YYYY-MM-DD"
        required: true
    },
    expectedLeadTarget: {
        type: Number,
        default: 0
    },
    expectedHotLeads: {
        type: Number,
        default: 0
    },
    activities: {
        type: Array,
        default: []
    }
}, { timestamps: true });

const DraftPlanner = mongoose.model("DraftPlanner", draftPlannerSchema);
export default DraftPlanner;
