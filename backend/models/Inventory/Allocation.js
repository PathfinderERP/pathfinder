import mongoose from "mongoose";

const AllocationItemSchema = new mongoose.Schema({
    itemName: { 
        type: String, 
        required: true,
        enum: ['Dress', 'Academic Books', 'Pens', 'Bags', 'Other']
    },
    quantity: { 
        type: Number, 
        default: 1 
    },
    status: { 
        type: String, 
        enum: ['Allocated', 'Pending', 'Returned'], 
        default: 'Allocated' 
    },
    remarks: { type: String }
}, { _id: true });

const AllocationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    admission: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admission",
        required: true
    },
    items: [AllocationItemSchema],
    allocatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    allocationDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const Allocation = mongoose.model("Allocation", AllocationSchema);
export default Allocation;
