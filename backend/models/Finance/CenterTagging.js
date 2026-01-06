import mongoose from "mongoose";

const centerTaggingSchema = mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true,
        unique: true
    },
    headCentre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        required: true
    }
}, { timestamps: true });

const CenterTagging = mongoose.model("CenterTagging", centerTaggingSchema);
export default CenterTagging;
