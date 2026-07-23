import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    days: {
        type: Number,
        required: true,
        min: 0
    },
    // Optional override: days allowed specifically for teachers
    teacherDays: {
        type: Number,
        min: 0,
        default: null
    },
    validity: {
        type: String,
        enum: ['yearly', 'monthly'],
        default: 'yearly'
    },
    designations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Designation'
    }],
    description: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const LeaveType = mongoose.model('LeaveType', leaveTypeSchema);
export default LeaveType;
