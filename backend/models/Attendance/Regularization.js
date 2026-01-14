import mongoose from 'mongoose';

const regularizationSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    fromTime: {
        type: String, // Format: "HH:mm"
    },
    toTime: {
        type: String, // Format: "HH:mm"
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    type: {
        type: String,
        enum: ['On Duty', 'Missed Punch', 'Work From Home', 'Other'],
        default: 'On Duty'
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewRemark: {
        type: String
    },
    // New fields for geo-tagged photo
    photo: {
        type: String
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
    locationAddress: {
        type: String
    }
}, { timestamps: true });

const Regularization = mongoose.model('Regularization', regularizationSchema);
export default Regularization;
