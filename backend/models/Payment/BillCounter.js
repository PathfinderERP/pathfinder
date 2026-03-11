import mongoose from "mongoose";

const billCounterSchema = new mongoose.Schema({
    prefix: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    seq: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const BillCounter = mongoose.model("BillCounter", billCounterSchema);
export default BillCounter;
