import mongoose from 'mongoose';

const CarryForwardRemarkSchema = new mongoose.Schema({
    studentId: { type: String, index: true },
    admissionNumber: { type: String, index: true },
    session: { type: String, index: true },
    latestRemark: { type: String, default: '' },
    remarksHistory: [
        {
            remark: { type: String, required: true },
            addedBy: { type: String },
            addedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    updatedBy: { type: String },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

CarryForwardRemarkSchema.index({ studentId: 1, session: 1 });
CarryForwardRemarkSchema.index({ admissionNumber: 1, session: 1 });

const CarryForwardRemark = mongoose.model('CarryForwardRemark', CarryForwardRemarkSchema);
export default CarryForwardRemark;
