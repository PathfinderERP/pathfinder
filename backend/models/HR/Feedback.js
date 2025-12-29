import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["Feedback", "Self Evaluation", "Grievance", "Other"],
        default: "Feedback"
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Responded", "Acknowledged"],
        default: "Pending"
    },
    hrResponse: {
        type: String,
        default: ""
    },
    respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    respondedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
