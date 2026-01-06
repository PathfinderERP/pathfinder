import mongoose from "mongoose";

const budgetSchema = mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    month: {
        type: String,
        required: true
    },
    financialYear: {
        type: String,
        required: true
    },
    budgetAmount: {
        type: Number,
        default: 0
    },
    expense: {
        type: Number,
        default: 0
    },
    income: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

const Budget = mongoose.model("Budget", budgetSchema);
export default Budget;
