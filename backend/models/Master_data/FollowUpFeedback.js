import mongoose from "mongoose";

const followUpFeedbackSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const FollowUpFeedback = mongoose.model("FollowUpFeedback", followUpFeedbackSchema);
export default FollowUpFeedback;
