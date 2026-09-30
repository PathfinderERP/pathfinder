import mongoose from "mongoose";

const marketingRequirementSchema = new mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
        required: false
    },
    centreName: {
        type: String,
        default: ""
    },
    destinationCentre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
        required: false
    },
    destinationCentreName: {
        type: String,
        default: "HAZRA H.O"
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
    bags: {
        type: Number,
        default: 0,
        min: 0
    },
    tshirts: {
        type: Number,
        default: 0,
        min: 0
    },
    books: {
        type: Number,
        default: 0,
        min: 0
    },
    bookType: {
        type: String,
        default: ""
    },
    ktsBooks: {
        type: Number,
        default: 0,
        min: 0
    },
    vsoBooks: {
        type: Number,
        default: 0,
        min: 0
    },
    itemType: {
        type: String,
        default: ""
    },
    quantity: {
        type: Number,
        default: 0,
        min: 0
    },
    purpose: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Fulfilled', 'Rejected'],
        default: 'Pending'
    },
    approvedLeaflets: {
        type: Number,
        default: 0
    },
    approvedBanners: {
        type: Number,
        default: 0
    },
    approvedBags: {
        type: Number,
        default: 0
    },
    approvedTshirts: {
        type: Number,
        default: 0
    },
    approvedKtsBooks: {
        type: Number,
        default: 0
    },
    approvedVsoBooks: {
        type: Number,
        default: 0
    },
    approvedBooks: {
        type: Number,
        default: 0
    },
    approvedQuantity: {
        type: Number,
        default: 0
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    approverRemarks: {
        type: String,
        default: ""
    },
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        default: ""
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

marketingRequirementSchema.index({ centre: 1, createdAt: -1 });
marketingRequirementSchema.index({ status: 1 });

export default mongoose.model("MarketingRequirement", marketingRequirementSchema);
