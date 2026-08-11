import mongoose from "mongoose";

const activityPurposeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

const ActivityPurpose = mongoose.model("ActivityPurpose", activityPurposeSchema);
export default ActivityPurpose;
