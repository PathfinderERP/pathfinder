import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    // Reference to Admission
    admission: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admission",
        required: true
    },
    
    // Payment Details
    installmentNumber: { 
        type: Number, 
        required: true 
    },
    
    amount: { 
        type: Number, 
        required: true 
    },
    
    paidAmount: { 
        type: Number, 
        required: true 
    },
    
    dueDate: { 
        type: Date, 
        required: true 
    },
    
    paidDate: { 
        type: Date 
    },
    
    status: { 
        type: String, 
        enum: ["PENDING", "PAID", "OVERDUE", "PARTIAL"], 
        default: "PENDING" 
    },
    
    // Payment Method Details
    paymentMethod: {
        type: String,
        enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE"],
        default: null
    },
    
    transactionId: { 
        type: String 
    },
    
    remarks: { 
        type: String 
    },
    
    // Who recorded this payment
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NormalAdmin"
    },

    // Bill Details
    billId: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined values to not conflict
    },
    cgst: {
        type: Number,
        default: 0
    },
    sgst: {
        type: Number,
        default: 0
    },
    courseFee: {
        type: Number, // The base amount before tax
        default: 0
    },
    totalAmount: {
        type: Number, // The final amount including taxes
        default: 0
    }
}, { timestamps: true });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
