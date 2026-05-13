import mongoose from "mongoose";

const courseTargetSchema = new mongoose.Schema({
    centre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Centre',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: false // Changed to false to allow department-level targets
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true
    },
    examTag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExamTag',
        required: false
    },
    year: {
        type: Number,
        required: true
    },
    month: {
        type: String, // January, February, etc.
    },
    quarter: {
        type: String, // Q1, Q2, Q3, Q4
    },
    week: {
        type: Number, // 1-52
    },
    targetCount: {
        type: Number,
        default: 0,
        required: true
    },
    targetType: {
        type: String,
        enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }
}, { timestamps: true });

// Ensure uniqueness based on type and period
courseTargetSchema.index({ centre: 1, course: 1, year: 1, month: 1, quarter: 1, week: 1, targetType: 1 }, { unique: true });

const CourseTarget = mongoose.model('CourseTarget', courseTargetSchema);

export default CourseTarget;
