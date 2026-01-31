import mongoose from "mongoose";
import Class from "./Master_data/Class.js";
import CentreSchema from "./Master_data/Centre.js";
import Boards from "./Master_data/Boards.js";
import Course from "./Master_data/Courses.js";

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
        ref: Course,
    },
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Boards,
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
    isCounseled: {
        type: Boolean,
        default: false
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
        },
        callStartTime: {
            type: Date
        },
        callEndTime: {
            type: Date
        },
        callDuration: {
            type: String
        }
    }],
    recordings: [{
        audioUrl: {
            type: String,
            required: true
        },
        fileName: {
            type: String
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: {
            type: String
        },
        transcription: {
            type: String
        },
        accuracyScore: {
            type: Number,
            default: 0
        },
        analysisData: {
            clarity: { type: Number, default: 0 },
            pace: { type: Number, default: 0 },
            confidence: { type: Number, default: 0 }
        },
        scriptUsed: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Script'
        }
    }]
}, { timestamps: true });

const LeadManagement = new mongoose.model("LeadManagement", leadManagementSchema);
export default LeadManagement;
