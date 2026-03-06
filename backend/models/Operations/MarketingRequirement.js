import mongoose from "mongoose";

const marketingRequirementSchema = new mongoose.Schema({
    leaflets: {
        type: Number,
        required: true,
        default: 0
    },
    banners: {
        type: Number,
        required: true,
        default: 0
    },
    books: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Fulfilled', 'Rejected'],
        default: 'Pending'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, { timestamps: true });

export default mongoose.model("MarketingRequirement", marketingRequirementSchema);
