import AcademicsClass from "../../models/Academics/Academics_class.js";

// Create Class
export const createClass = async (req, res) => {
    try {
        const { className } = req.body;
        if (!className) {
            return res.status(400).json({ message: "Class Name is required" });
        }
        const newClass = new AcademicsClass({ className });
        await newClass.save();
        res.status(201).json({ message: "Class created successfully", data: newClass });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get All Classes
export const getAllClasses = async (req, res) => {
    try {
        const classes = await AcademicsClass.find().sort({ createdAt: -1 });
        res.status(200).json(classes);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update Class
export const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { className } = req.body;
        const updatedClass = await AcademicsClass.findByIdAndUpdate(
            id,
            { className },
            { new: true }
        );
        if (!updatedClass) return res.status(404).json({ message: "Class not found" });
        res.status(200).json({ message: "Class updated successfully", data: updatedClass });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete Class
export const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedClass = await AcademicsClass.findByIdAndDelete(id);
        if (!deletedClass) return res.status(404).json({ message: "Class not found" });
        res.status(200).json({ message: "Class deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
