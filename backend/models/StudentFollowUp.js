import mongoose from "mongoose";

const studentFollowUpSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        studentType: {
            type: String,
            enum: ["PMO", "PNTSE"],
            required: true,
        },
        calledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        callDate: {
            type: Date,
            default: Date.now,
        },
        feedback: {
            type: String,
            enum: [
                "Foundation class 6",
                "Foundation class 7",
                "Foundation class 8",
                "Foundation class 9",
                "Foundation class 10",
                "Not Interested",
                "Neet 2 year",
                "Neet 1 year",
                "JEE 2 year",
                "JEE 1 year",
                "No Response",
                "Call Back Later",
                "Other",
            ],
            required: true,
        },
        notes: {
            type: String,
            default: "",
        },
        callDuration: {
            type: Number, // in seconds
            default: null,
        },
        centre: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CentreSchema",
            default: null,
        },
        nextFollowUpDate: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Compound index for fast lookups by student and center
studentFollowUpSchema.index({ studentId: 1, studentType: 1, callDate: -1 });
studentFollowUpSchema.index({ centre: 1, callDate: -1 });
studentFollowUpSchema.index({ studentType: 1, callDate: -1 });

const StudentFollowUp = mongoose.model("StudentFollowUp", studentFollowUpSchema);
export default StudentFollowUp;
