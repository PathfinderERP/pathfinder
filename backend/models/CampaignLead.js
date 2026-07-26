import mongoose from "mongoose";
import Class from "./Master_data/Class.js";
import CentreSchema from "./Master_data/Centre.js";
import Boards from "./Master_data/Boards.js";
import Course from "./Master_data/Courses.js";

const campaignLeadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: false,
    },
    phoneNumber: {
        type: String,
    },
    secondPhoneNumber: {
        type: String,
    },
    schoolName: {
        type: String,
        required: false,
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
    courseText: {
        type: String,
        default: "",
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
        enum: ['HOT LEAD', 'WARM LEAD', 'COLD LEAD', 'NEUTRAL LEAD', 'INVALID LEAD'],
    },
    leadResponsibility: {
        type: String,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isBulkUpload: {
        type: Boolean,
        default: false
    },
    isPriority: {
        type: Boolean,
        default: true
    },
    marketingBy: {
        type: String,
    },
    assignedAt: {
        type: Date
    },
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        default: null
    },
    campaignFrom: {
        type: String
    },
    isPushed: {
        type: Boolean,
        default: false
    },
    pushedAt: {
        type: Date
    }
}, { timestamps: true });

const CampaignLead = mongoose.model("CampaignLead", campaignLeadSchema);
export default CampaignLead;
