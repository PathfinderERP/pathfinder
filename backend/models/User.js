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
        enum: ['teacher', 'admin', 'superAdmin', 'telecaller', 'centralizedTelecaller', 'counsellor', 'RM', 'Class_Coordinator', 'HOD', 'marketing'],
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
        default: ["Dashboard"],
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
    },
    redFlags: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    lastPenaltyDate: {
        type: Date
    },
    performanceResetDate: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastSocialVisit: {
        type: Date,
        default: null
    }
}, { timestamps: true });

// Pre-save hook to set default permissions and ensure Dashboard access
userSchema.pre('save', async function () {
    // Always ensure "Dashboard" is in permissions
    if (!this.permissions.includes("Dashboard")) {
        this.permissions.push("Dashboard");
    }

    if (this.isNew || !this.granularPermissions || Object.keys(this.granularPermissions).length === 0) {
        if (this.role === 'counsellor' || this.role === 'marketing') {
            this.granularPermissions = {
                // ... [existing counsellor permissions]
                employeeCenter: {
                    holidayList: { create: true, edit: true, delete: true },
                    holidayCalendar: { create: true, edit: true, delete: true },
                    markAttendance: { create: true, edit: true, delete: true },
                    leaveManagement: { create: true, edit: true, delete: true },
                    regularization: { create: true, edit: true, delete: true },
                    profile: { create: true, edit: true, delete: true },
                    documents: { create: true, edit: true, delete: true },
                    training: { create: true, edit: true, delete: true },
                    feedback: { create: true, edit: true, delete: true },
                    posh: { create: true, edit: true, delete: true },
                    reimbursement: { create: true, edit: true, delete: true },
                    resign: { create: true, edit: true, delete: true }
                },
                leadManagement: {
                    leads: { view: true, create: true, edit: true, delete: true },
                    dashboard: { view: true }
                },
                admissions: {
                    allLeads: { view: true, create: true, edit: true, delete: false },
                    enrolledStudents: { view: true, create: true, edit: true, delete: false }
                }
            };
        }
    }
});

const User = mongoose.model("User", userSchema);
export default User;
