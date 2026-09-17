import mongoose from "mongoose";

const examScheduleSchema = new mongoose.Schema(
    {
        examName: {
            type: String,
            required: [true, "Exam name is required"],
            trim: true,
            index: true
        },
        className: {
            type: [String],
            required: [true, "At least one class is required"],
            default: []
        },
        session: {
            type: String,
            required: [true, "Session is required"],
            trim: true,
            index: true
        },
        centers: {
            type: [String],
            required: [true, "At least one center is required"],
            validate: {
                validator: function (v) {
                    return Array.isArray(v) && v.length > 0;
                },
                message: "Please select at least one center"
            },
            index: true
        },
        fromDate: {
            type: Date,
            required: [true, "From date is required"]
        },
        toDate: {
            type: Date,
            required: [true, "To date is required"]
        },
        fromTime: {
            type: String,
            required: [true, "From time is required"],
            trim: true
        },
        toTime: {
            type: String,
            required: [true, "To time is required"],
            trim: true
        },
        days: {
            type: [String],
            default: []
        },
        status: {
            type: String,
            enum: ["Scheduled", "Ongoing", "Completed", "Cancelled"],
            default: "Scheduled",
            index: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

// Helpful compound index for fast searches and filtering
examScheduleSchema.index({ session: 1, fromDate: 1, toDate: 1 });
examScheduleSchema.index({ className: 1 });

const ExamSchedule = mongoose.model("ExamSchedule", examScheduleSchema);
export default ExamSchedule;
