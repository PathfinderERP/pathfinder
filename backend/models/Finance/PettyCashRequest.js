import mongoose from "mongoose";

const pettyCashRequestSchema = new mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    requestedAmount: {
        type: Number,
        required: true
    },
    approvedAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee"
    },
    approvalDate: {
        type: Date
    },
    remarks: {
        type: String,
        trim: true
    }
}, { timestamps: true });

const PettyCashRequest = mongoose.model("PettyCashRequest", pettyCashRequestSchema);
export default PettyCashRequest;
