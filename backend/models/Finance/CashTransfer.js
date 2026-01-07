import mongoose from "mongoose";

const cashTransferSchema = new mongoose.Schema({
    fromCentre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    toCentre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true // Could be H.O. or another centre
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    transferDate: {
        type: Date,
        default: Date.now
    },
    receivedDate: {
        type: Date
    },
    debitedDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ["PENDING", "RECEIVED", "CANCELLED", "REJECTED"],
        default: "PENDING"
    },
    uniquePassword: {
        type: String,
        required: true
    },
    serialNumber: {
        type: Number,
        unique: true
    },
    referenceNumber: {
        type: String
    },
    receiptFile: {
        type: String // URL or Path to uploaded file
    },
    accountNumber: {
        type: String,
        required: true
    },
    transferredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    remarks: {
        type: String
    }
}, { timestamps: true });

// Pre-save hook to generate serial number
cashTransferSchema.pre("save", async function () {
    if (this.isNew) {
        const lastTransfer = await this.constructor.findOne({}, {}, { sort: { serialNumber: -1 } });
        this.serialNumber = lastTransfer && lastTransfer.serialNumber ? lastTransfer.serialNumber + 1 : 1;
    }
});

const CashTransfer = mongoose.model("CashTransfer", cashTransferSchema);
export default CashTransfer;
