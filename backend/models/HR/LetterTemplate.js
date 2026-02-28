import mongoose from "mongoose";

const letterTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    letterContent: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        enum: ['Offer Letter', 'Appointment Letter', 'Contract Letter', 'Experience Letter', 'Release Letter', 'Virtual ID'],
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const LetterTemplate = mongoose.model("LetterTemplate", letterTemplateSchema);
export default LetterTemplate;
