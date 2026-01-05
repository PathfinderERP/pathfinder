import mongoose from "mongoose";

const expenseSubCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExpenseCategory",
        required: true
    },
    description: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Ensure subcategory name is unique within a category
expenseSubCategorySchema.index({ name: 1, category: 1 }, { unique: true });

const ExpenseSubCategory = mongoose.model("ExpenseSubCategory", expenseSubCategorySchema);
export default ExpenseSubCategory;
