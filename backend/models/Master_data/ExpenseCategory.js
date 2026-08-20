import mongoose from "mongoose";

const expenseCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ["Active", "Deactive", "Inactive"],
        default: "Active"
    }
}, { timestamps: true });

const ExpenseCategory = mongoose.model("ExpenseCategory", expenseCategorySchema);
export default ExpenseCategory;
