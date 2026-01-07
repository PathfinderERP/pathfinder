import mongoose from "mongoose";

const partTimeTeacherSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    // We can store redundantly or just fetch from User. 
    // Storing redundantly makes independent queries easier but we prefer normalized if we always join.
    // Let's store fee structure.

    // Fee Structure
    feeType: {
        type: String,
        enum: ["HOURLY", "CLASS_WISE", "DAY_WISE"],
        default: "HOURLY"
    },
    rate: {
        type: Number,
        default: 0,
        min: 0
    },

    // Metadata
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    }
}, { timestamps: true });

const PartTimeTeacher = mongoose.model("PartTimeTeacher", partTimeTeacherSchema);
export default PartTimeTeacher;
