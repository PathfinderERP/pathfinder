import mongoose from "mongoose";

const marketingStockMovementSchema = new mongoose.Schema({
    movementType: {
        type: String,
        enum: [
            'STOCK_IN',              // New stock added to main warehouse
            'STOCK_OUT',             // Stock moved out manually/for direct use
            'REQUISITION_DISPATCH',  // Stock deducted when a centre's requisition is approved
            'REQUISITION_REVERSAL',  // Stock restored when an approved requisition is rejected/deleted
            'INITIAL_STOCK',         // Baseline stock setup
            'STOCK_ADJUSTMENT'       // Manual correction/count update
        ],
        required: true
    },
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
        required: true
    },
    centreName: {
        type: String,
        default: "HAZRA H.O"
    },
    targetCentre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
        required: false
    },
    targetCentreName: {
        type: String,
        default: ""
    },
    requisition: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MarketingRequirement',
        required: false
    },
    material: {
        type: String,
        default: ""
    },
    quantity: {
        type: Number,
        default: 0
    },
    items: [
        {
            material: { type: String, required: true },
            quantity: { type: Number, required: true },
            previousStock: { type: Number, default: 0 },
            newStock: { type: Number, default: 0 }
        }
    ],
    sourceOrVendor: {
        type: String,
        default: ""
    },
    purpose: {
        type: String,
        default: ""
    },
    remarks: {
        type: String,
        default: ""
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

marketingStockMovementSchema.index({ centre: 1, createdAt: -1 });
marketingStockMovementSchema.index({ movementType: 1 });
marketingStockMovementSchema.index({ requisition: 1 });

export default mongoose.model("MarketingStockMovement", marketingStockMovementSchema);
