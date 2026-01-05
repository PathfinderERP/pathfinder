import ExpenseCategory from "../../models/Master_data/ExpenseCategory.js";

export const createExpenseCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = new ExpenseCategory({ name, description });
        await category.save();
        res.status(201).json({ message: "Category created", data: category });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getExpenseCategories = async (req, res) => {
    try {
        const categories = await ExpenseCategory.find().sort({ name: 1 });
        res.status(200).json(categories);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const updateExpenseCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const category = await ExpenseCategory.findByIdAndUpdate(id, { name, description }, { new: true });
        res.status(200).json({ message: "Category updated", data: category });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const deleteExpenseCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await ExpenseCategory.findByIdAndDelete(id);
        res.status(200).json({ message: "Category deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
