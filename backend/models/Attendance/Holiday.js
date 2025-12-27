import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['Public', 'Office', 'Optional'],
        default: 'Public'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;
