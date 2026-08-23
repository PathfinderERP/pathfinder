import mongoose from "mongoose";

const b2bComparisonSchema = new mongoose.Schema(
    {
        schoolRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SchoolForTask",
            default: null,
            index: true
        },
        centerRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CentreSchema",
            default: null,
            index: true
        },
        centerName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        schoolName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        category: {
            type: String,
            enum: ["Lost Tie-ups", "New Tie-ups", "High Turnout No Visit", "P1 Schools", "Pending Visits", "General"],
            default: "General",
            index: true
        },
        sourceSheet: {
            type: String,
            default: ""
        },
        // --- Sheet 1: Lost Tie-ups / Historic fields ---
        lastYearTieUp: {
            type: String,
            default: ""
        },
        studentsAppearedLastYear: {
            type: Number,
            default: 0
        },
        historicHighTurnout: {
            type: String,
            default: ""
        },
        // --- Current status fields ---
        currentMockTieUp: {
            type: String,
            default: "Not confirmed"
        },
        currentStatus: {
            type: String,
            default: ""
        },
        tier: {
            type: String,
            default: "A"
        },
        board: {
            type: String,
            default: ""
        },
        schoolAccess: {
            type: String,
            default: "YES"
        },
        mockTieUpApproach: {
            type: String,
            default: ""
        },
        visitedThisYear: {
            type: String,
            default: "No"
        },
        lastVisitDate: {
            type: Date,
            default: null
        },
        lastExecutive: {
            type: String,
            default: ""
        },
        hoHelpNeeded: {
            type: String,
            default: "No"
        },
        priority: {
            type: String,
            enum: ["P1", "P2", "P3", "N/A", ""],
            default: "P1",
            index: true
        },
        actionStage: {
            type: String,
            default: ""
        },
        nextAction: {
            type: String,
            default: ""
        },
        simpleInference: {
            type: String,
            default: ""
        },
        potentialDateStatus: {
            type: String,
            default: ""
        },
        activeRelationship: {
            type: String,
            default: ""
        },
        currentApproachEvidence: {
            type: String,
            default: ""
        },
        // --- Sheet 5: Pending visit fields ---
        visitDate: {
            type: Date,
            default: null
        },
        originalInstitutionEntered: {
            type: String,
            default: ""
        },
        matchMethod: {
            type: String,
            default: ""
        },
        visitNotes: {
            type: String,
            default: ""
        },
        leads: {
            type: Number,
            default: 0
        },
        approvalStatus: {
            type: String,
            default: ""
        },
        approvedBy: {
            type: String,
            default: ""
        },
        remarks: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

b2bComparisonSchema.index({ centerName: 1, schoolName: 1, category: 1 });

const B2BComparison = mongoose.model("B2BComparison", b2bComparisonSchema);
export default B2BComparison;
