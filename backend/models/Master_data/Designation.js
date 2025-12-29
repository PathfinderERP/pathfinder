import mongoose from "mongoose";

const designationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    travelAmount: {
        type: Number,
        default: 0
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department"
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Designation = mongoose.model("Designation", designationSchema);

export default Designation;
