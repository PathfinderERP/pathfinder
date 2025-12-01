import Class from "../../models/Master_data/Class.js";

export const createClass = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) return res.status(400).json({ message: "Class name is required" });

        const newClass = new Class({ name });
        await newClass.save();

        res.status(201).json({ message: "Class created successfully", data: newClass });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
