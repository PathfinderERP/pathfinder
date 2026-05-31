import mongoose from "mongoose";
import Category from "../Master_data/Category.js";
import User from "../User.js";

const expenseSchema = new mongoose.Schema(
    {
        expenseType: {
            type: String,
            enum: ['General', 'Salary'],
            default: 'General'
        },
        name: {
            type: String,
            required: function () { return this.expenseType === 'General'; },
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: function () { return this.expenseType === 'General'; },
        },
        months: {
            type: String,
            enum: [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December",
            ],
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: function () { return this.expenseType === 'General'; },
        },
        approvedDate: {
            type: Date,
            required: function () { return this.expenseType === 'General'; },
        },
        expenseDate: {
            type: Date,
            default: Date.now,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        // HR Salary Specific Fields ff
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        centreId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CentreSchema"
        },
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department"
        },
        salaryPeriod: {
            type: String // e.g., "Week 1, May 2026"
        },
        amount: {
            type: Number
        },
        hrApprovedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        hrApprovedDate: {
            type: Date
        },
        financeStatus: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending'
        },
        financeApprovedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        financeApprovedDate: {
            type: Date
        },
        givenBy: {
            type: String
        },
        reason: {
            type: String
        },
        originalAmount: {
            type: Number
        },
        paidAmount: {
            type: Number,
            default: 0
        },
        remainingAmount: {
            type: Number
        },
        payments: [
            {
                amountPaid: { type: Number, required: true },
                paidDate: { type: Date, default: Date.now },
                paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                givenBy: String,
                reason: String
            }
        ]
    }, { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);