import ExpenseCategory from "../../models/Master_data/ExpenseCategory.js";

export const createExpenseCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;
        const category = new ExpenseCategory({ 
            name, 
            description,
            status: status || "Active"
        });
        await category.save();
        res.status(201).json({ message: "Category created", data: category });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getExpenseCategories = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};

        if (status && status !== "All") {
            if (status === "Active") {
                query.$or = [
                    { status: "Active" },
                    { status: { $exists: false } },
                    { status: null },
                    { status: "" }
                ];
            } else if (status === "Deactive" || status === "Inactive") {
                query.status = { $in: ["Deactive", "Inactive"] };
            } else {
                query.status = status;
            }
        }

        if (search) {
            const searchCondition = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchCondition }
                ];
                delete query.$or;
            } else {
                query.$or = searchCondition;
            }
        }

        const categories = await ExpenseCategory.find(query).sort({ name: 1 });
        res.status(200).json(categories || []);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const updateExpenseCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, status } = req.body;
        
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;

        const category = await ExpenseCategory.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

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
