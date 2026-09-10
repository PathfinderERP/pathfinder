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
        nextFollowUpDate: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Compound index for fast lookups by student
studentFollowUpSchema.index({ studentId: 1, studentType: 1, callDate: -1 });

const StudentFollowUp = mongoose.model("StudentFollowUp", studentFollowUpSchema);
export default StudentFollowUp;
