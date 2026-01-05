import ExpenseSubCategory from "../../models/Master_data/ExpenseSubCategory.js";

export const createExpenseSubCategory = async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const subCategory = new ExpenseSubCategory({ name, category, description });
        await subCategory.save();
        res.status(201).json({ message: "Sub Category created", data: subCategory });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getExpenseSubCategories = async (req, res) => {
    try {
        const { categoryId } = req.query;
        let query = {};
        if (categoryId) query.category = categoryId;

        const subCategories = await ExpenseSubCategory.find(query)
            .populate("category", "name")
            .sort({ name: 1 });
        res.status(200).json(subCategories);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const updateExpenseSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description } = req.body;
        const subCategory = await ExpenseSubCategory.findByIdAndUpdate(
            id,
            { name, category, description },
            { new: true }
        );
        res.status(200).json({ message: "Sub Category updated", data: subCategory });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const deleteExpenseSubCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await ExpenseSubCategory.findByIdAndDelete(id);
        res.status(200).json({ message: "Sub Category deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
