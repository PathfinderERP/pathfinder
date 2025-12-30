import mongoose from "mongoose";

const poshComplaintSchema = new mongoose.Schema({
    complainant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    accused: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
    designation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Designation",
        required: true
    },
    complaintDetails: {
        type: String,
        required: true
    },
    documents: [{
        type: String // Cloudflare R2 URLs
    }],
    status: {
        type: String,
        enum: ["Pending", "Under Review", "Resolved", "Dismissed"],
        default: "Pending"
    },
    hrResponse: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

const PoshComplaint = mongoose.model("PoshComplaint", poshComplaintSchema);

export default PoshComplaint;
