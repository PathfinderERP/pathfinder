import mongoose from "mongoose";

const reimbursementSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    purpose: {
        type: String,
        required: true,
        trim: true
    },
    travelType: {
        type: String,
        required: true,
        enum: ["Official", "Training", "Client Visit", "Other"],
        default: "Official"
    },
    travelMode: {
        type: String,
        required: true,
        enum: ["Train", "Bus", "Flight", "Car", "Bike", "Taxi", "Other"]
    },
    fromDate: {
        type: Date,
        required: true
    },
    toDate: {
        type: Date,
        required: true
    },
    allowanceType: {
        type: String,
        required: true,
        enum: ["Travel Allowance", "Daily Allowance", "Lodging", "Food", "Other"]
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true
    },
    proof: {
        type: String // Path to uploaded file
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    rejectionReason: {
        type: String
    }
}, {
    timestamps: true
});

const Reimbursement = mongoose.model("Reimbursement", reimbursementSchema);

export default Reimbursement;
