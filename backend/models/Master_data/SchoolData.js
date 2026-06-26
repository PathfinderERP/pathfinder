import mongoose from "mongoose";

const schoolDataSchema = new mongoose.Schema({
    schoolName: {
        type: String,
        required: true,
        trim: true
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    className: {
        type: String,
        required: true,
        trim: true
    },
    board: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        trim: true,
        default: ""
    },
    secondaryPhoneNumber: {
        type: String,
        trim: true,
        default: ""
    },
    year: {
        type: String,
        trim: true,
        default: ""
    },
    area: {
        type: String,
        trim: true,
        default: ""
    },
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CentreSchema",
        default: null
    }
}, { timestamps: true });

const SchoolData = mongoose.model("SchoolData", schoolDataSchema);
export default SchoolData;
