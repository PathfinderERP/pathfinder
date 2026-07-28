import mongoose from "mongoose";

// ─────────────────────────────────────────────
//  Sub-schema: Contact Person
// ─────────────────────────────────────────────
const contactPersonSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            default: "",
        },
        designation: {
            type: String,
            trim: true,
            default: "", // e.g. "Principal", "Vice Principal", "Coordinator"
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },
        phoneNumber: {
            type: String,
            trim: true,
            default: "",
        },
        whatsappNumber: {
            type: String,
            trim: true,
            default: "",
        },
    },
    { _id: false }
);

// ─────────────────────────────────────────────
//  Sub-schema: Task Assignment
// ─────────────────────────────────────────────
const taskAssignmentSchema = new mongoose.Schema(
    {
        taskTitle: {
            type: String,
            trim: true,
            required: true,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        dueDate: {
            type: Date,
            default: null,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },
        status: {
            type: String,
            enum: ["pending", "in_progress", "completed", "cancelled", "on_hold"],
            default: "pending",
        },
        remarks: {
            type: String,
            trim: true,
            default: "",
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// ─────────────────────────────────────────────
//  Main Schema: School for Task
// ─────────────────────────────────────────────
const schoolForTaskSchema = new mongoose.Schema(
    {
        // ── Basic School Information ──────────────
        schoolName: {
            type: String,
            required: true,
            trim: true,
        },
        schoolCode: {
            type: String,
            trim: true,
            unique: true,
            sparse: true, // allows multiple docs without a code
            default: null,
        },
        affiliationNumber: {
            type: String,
            trim: true,
            default: "",
        },
        board: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Boards",
            default: null,
        },
        schoolType: {
            type: String,
            enum: ["government", "private", "aided", "central", "international", "other"],
            default: "private",
        },
        medium: {
            type: String,
            enum: ["english", "hindi", "regional", "other"],
            default: "english",
        },
        establishedYear: {
            type: Number,
            default: null,
        },

        // ── Location & Address ────────────────────
        address: {
            street: { type: String, trim: true, default: "" },
            city: { type: String, trim: true, default: "" },
            district: { type: String, trim: true, default: "" },
            state: { type: String, trim: true, default: "" },
            pincode: { type: String, trim: true, default: "" },
        },
        area: {
            type: String,
            trim: true,
            default: "",
        },
        zone: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ZoneLegacy",
            default: null,
        },
        centre: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CentreSchema",
            default: null,
        },
        latitude: {
            type: Number,
            default: null,
        },
        longitude: {
            type: Number,
            default: null,
        },

        // ── Contact Information ───────────────────
        phoneNumber: {
            type: String,
            trim: true,
            default: "",
        },
        alternatePhoneNumber: {
            type: String,
            trim: true,
            default: "",
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },
        website: {
            type: String,
            trim: true,
            default: "",
        },

        // ── Key Contacts ──────────────────────────
        contactPersons: [contactPersonSchema],

        // ── Academic Details ──────────────────────
        classesOffered: [
            {
                type: String,
                trim: true,
                // e.g. "Class 6", "Class 7", ... "Class 12"
            },
        ],
        totalStudents: {
            type: Number,
            default: 0,
        },
        studentStrength: {
            type: String,
            enum: ["<100", "100-500", "500-1000", "1000-2000", ">2000"],
            default: "100-500",
        },
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Session",
            default: null,
        },

        // ── Task / CRM Fields ─────────────────────
        source: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Sources",
            default: null,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            default: null,
        },
        assignedSalesPerson: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        tasks: [taskAssignmentSchema],
        followUpDate: {
            type: Date,
            default: null,
        },
        lastFollowUpDate: {
            type: Date,
            default: null,
        },
        followUpFeedback: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FollowUpFeedback",
            default: null,
        },
        followUpRemarks: {
            type: String,
            trim: true,
            default: "",
        },
        leadStatus: {
            type: String,
            enum: [
                "new",
                "contacted",
                "interested",
                "not_interested",
                "converted",
                "lost",
                "follow_up",
                "on_hold",
            ],
            default: "new",
        },

        // ── Partnership / Tie-Up Details ──────────
        isTiedUp: {
            type: Boolean,
            default: false,
        },
        tieUpDate: {
            type: Date,
            default: null,
        },
        tieUpRemarks: {
            type: String,
            trim: true,
            default: "",
        },
        expectedStudents: {
            type: Number,
            default: 0,
        },

        // ── Status & Meta ─────────────────────────
        status: {
            type: String,
            enum: ["active", "inactive", "blocked"],
            default: "active",
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        notes: {
            type: String,
            trim: true,
            default: "",
        },
        tags: [
            {
                type: String,
                trim: true,
            },
        ],
    },
    { timestamps: true }
);

// ─────────────────────────────────────────────
//  Indexes for faster queries
// ─────────────────────────────────────────────
schoolForTaskSchema.index({ schoolName: 1 });
schoolForTaskSchema.index({ centre: 1 });
schoolForTaskSchema.index({ zone: 1 });
schoolForTaskSchema.index({ leadStatus: 1 });
schoolForTaskSchema.index({ assignedSalesPerson: 1 });
schoolForTaskSchema.index({ "address.city": 1 });
schoolForTaskSchema.index({ status: 1 });

const SchoolForTask = mongoose.model("SchoolForTask", schoolForTaskSchema);
export default SchoolForTask;
