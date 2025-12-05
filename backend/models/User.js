import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    employeeId: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    mobNum: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['teacher', 'admin', 'superAdmin', 'telecaller', 'counsellor'],
        default: 'admin',
        required: true,
    },
    centres: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
    }],
    permissions: {
        type: [String], // Array of strings representing accessible modules e.g., ['admissions', 'finance']
        default: [],
    }

}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
