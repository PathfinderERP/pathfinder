import mongoose from "mongoose";

const AllocationItemSchema = new mongoose.Schema({
    itemName: { 
        type: String, 
        required: true,
        trim: true
    },
    quantity: { 
        type: Number, 
        default: 1 
    },
    itemType: {
        type: String,
        enum: ['Free', 'Paid'],
        default: 'Free'
    },
    price: {
        type: Number,
        default: 0
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
        required: false
    },
    centre: {
        type: String,
        trim: true
    },
    centreCode: {
        type: String,
        trim: true
    },
    billNumber: {
        type: String,
        trim: true
    },
    hasPaidItems: {
        type: Boolean,
        default: false
    },
    grossAmount: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment"
    },
    paymentMethod: {
        type: String
    },
    session: { type: String },
    className: { type: String },
    departmentName: { type: String },
    examTagName: { type: String },
    boardName: { type: String },
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
