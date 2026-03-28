import mongoose from "mongoose";

const posTransactionSchema = mongoose.Schema({
    p2pRequestId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true },
    amount: { type: Number, required: true },
    externalRefNumber: { type: String },
    customerName: { type: String },
    customerMobileNumber: { type: String },
    admissionId: { type: mongoose.Schema.Types.ObjectId },
    admissionType: { type: String, enum: ["NORMAL", "BOARD"] },
    status: { 
        type: String, 
        enum: ["INITIATING", "WAITING", "AUTHORIZED", "SUCCESS", "FAILED", "DECLINED", "CANCELLED", "EXPIRED"], 
        default: "WAITING" 
    },
    erpProcessed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const PosTransaction = mongoose.model("PosTransaction", posTransactionSchema);
export default PosTransaction;
