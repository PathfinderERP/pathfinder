import mongoose from "mongoose";

const paymentReminderSchema = new mongoose.Schema({
    admission: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admission",
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    installmentNumber: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    daysOverdue: {
        type: Number,
        default: 0
    },
    remindersSent: [{
        sentDate: { type: Date, default: Date.now },
        method: { type: String, enum: ["SMS", "EMAIL", "WHATSAPP"], default: "SMS" },
        status: { type: String, enum: ["SENT", "FAILED"], default: "SENT" },
        message: String
    }],
    status: {
        type: String,
        enum: ["PENDING", "REMINDED", "PAID"],
        default: "PENDING"
    }
}, { timestamps: true });

const PaymentReminder = mongoose.model("PaymentReminder", paymentReminderSchema);
export default PaymentReminder;
