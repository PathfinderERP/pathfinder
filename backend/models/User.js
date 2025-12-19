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
        enum: ['teacher', 'admin', 'superAdmin', 'telecaller', 'counsellor', 'RM', 'Class_Coordinator', 'HOD'],
        default: 'admin',
        required: true,
    },
    centres: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CentreSchema',
    }],
    favourites: [{ // Kept for legacy or general use
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }],

    // Teacher Specific Fields
    subject: { type: String },
    teacherDepartment: {
        type: String,
        enum: ['Foundation', 'All India', 'Board'], // Capitalized to match frontend
        default: null
    },
    boardType: { type: String }, // e.g. JEE, NEET, CBSE
    teacherType: {
        type: String,
        enum: ['Full Time', 'Part Time'],
        default: null
    },
    designation: { type: String },

    // HOD Flags
    isDeptHod: { type: Boolean, default: false },
    isBoardHod: { type: Boolean, default: false },
    isSubjectHod: { type: Boolean, default: false },

    // Granular Permissions Structure
    // Format: { module: { section: { create: bool, edit: bool, delete: bool } } }
    granularPermissions: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
        /* Example structure:
        {
            "admissions": {
                "allLeads": { "create": true, "edit": true, "delete": false },
                "enrolledStudents": { "create": false, "edit": true, "delete": false }
            },
            "masterData": {
                "class": { "create": true, "edit": true, "delete": true },
                "examTag": { "create": true, "edit": false, "delete": false },
                "department": { "create": false, "edit": true, "delete": false },
                "centre": { "create": true, "edit": true, "delete": true },
                "course": { "create": true, "edit": true, "delete": false }
            },
            "finance": {
                "fees": { "create": true, "edit": true, "delete": false }
            },
            "userManagement": {
                "users": { "create": true, "edit": true, "delete": false }
            }
        }
        */
    },
    // Legacy permissions field (kept for backward compatibility)
    permissions: {
        type: [String],
        default: [],
    },
    canEditUsers: {
        type: Boolean,
        default: false,
    },
    canDeleteUsers: {
        type: Boolean,
        default: false,
    },
    assignedScript: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Script'
    }

}, { timestamps: true });

const User = mongoose.model("User", userSchema);
export default User;
