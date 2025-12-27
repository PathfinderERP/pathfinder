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
