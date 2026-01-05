import mongoose from "mongoose";

const pettyCashExpenditureSchema = new mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExpenseCategory",
        required: true
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExpenseSubCategory",
        required: true
    },
    expenditureType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExpenditureType",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    approvedBy: {
        type: String,
        trim: true
    },
    vendorName: {
        type: String,
        trim: true
    },
    paymentMode: {
        type: String,
        trim: true
    },
    taxApplicable: {
        type: Boolean,
        default: false
    },
    billImage: {
        type: String,
        trim: true
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
    actionTakenBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee"
    },
    actionDate: {
        type: Date
    },
    rejectionReason: {
        type: String
    }
}, { timestamps: true });

const PettyCashExpenditure = mongoose.model("PettyCashExpenditure", pettyCashExpenditureSchema);
export default PettyCashExpenditure;
