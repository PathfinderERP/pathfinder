import mongoose from "mongoose";
import Class from "./Master_data/Class.js";
import CentreSchema from "./Master_data/Centre.js";

const leadManagementSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
    },
    schoolName: {
        type: String,
        required: true,
    },
    className: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Class,
    },
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: CentreSchema,
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
    },
    source: {
        type: String,
    },
    targetExam: {
        type: String,
    },
    leadType: {
        type: String,
        enum: ['HOT LEAD', 'COLD LEAD', 'NEGATIVE'],
    },
    leadResponsibility: {
        type: String,
    },
    // New fields for easier querying
    lastFollowUpDate: {
        type: Date
    },
    nextFollowUpDate: {
        type: Date
    },
    followUps: [{
        date: {
            type: Date,
            default: Date.now
        },
        feedback: {
            type: String, // Static feedback text
            required: true
        },
        remarks: {
            type: String // Optional detailed remarks
        },
        nextFollowUpDate: {
            type: Date
        },
        updatedBy: {
            type: String // Optional: store who added the follow-up
        }
    }]
}, { timestamps: true });

const LeadManagement = new mongoose.model("LeadManagement", leadManagementSchema);
export default LeadManagement;
