import mongoose from "mongoose";

const resignationSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    lastDateOfWork: {
        type: Date
    },
    fnfAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: {
        type: Date
    },
    remarks: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

const ResignationRequest = mongoose.model("ResignationRequest", resignationSchema);

export default ResignationRequest;
