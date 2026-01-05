import mongoose from "mongoose";

const pettyCashCentreSchema = new mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true,
        unique: true
    },
    totalDeposit: {
        type: Number,
        default: 0
    },
    totalExpenditure: {
        type: Number,
        default: 0
    },
    remainingBalance: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const PettyCashCentre = mongoose.model("PettyCashCentre", pettyCashCentreSchema);
export default PettyCashCentre;
