import mongoose from "mongoose";
import Category from "../Master_data/Category.js";
import User from "../User.js";

const expenseSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        months: {
            type: String,
            enum: [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ],
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        approvedDate: {
            type: Date,
            required: true,
        },
        expenseDate: {
            type: Date,
            default: Date.now(),
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    }, { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);