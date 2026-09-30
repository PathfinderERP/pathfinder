import mongoose from "mongoose";

const marketingCentreBucketSchema = new mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
        required: true,
        unique: true
    },
    centreName: {
        type: String,
        required: true
    },
    leaflets: {
        type: Number,
        default: 0,
        min: 0
    },
    banners: {
        type: Number,
        default: 0,
        min: 0
    },
    totalLeafletsReceived: {
        type: Number,
        default: 0
    },
    totalBannersReceived: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

export default mongoose.model("MarketingCentreBucket", marketingCentreBucketSchema);
