import Subject from "../../models/Master_data/Subject.js";


export const createSubject = async (req, res) => {
    try {
        const { subName } = req.body;
        if (!subName) {
            return res.status(400).json({ success: false, message: "Subject name is required" });
        }

        const existingSubject = await Subject.findOne({ subName });
        if (existingSubject) {
            return res.status(400).json({ success: false, message: "Subject already exists" });
        }

        const newSubject = new Subject({ subName });
        await newSubject.save();

        res.status(201).json({ success: true, message: "Subject created successfully", data: newSubject });
    } catch (error) {
        console.error("Error creating subject:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getAllSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find({});
        res.status(200).json(subjects);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { subName } = req.body;

        const updatedSubject = await Subject.findByIdAndUpdate(
            id,
            { subName },
            { new: true }
        );

        if (!updatedSubject) {
            return res.status(404).json({ success: false, message: "Subject not found" });
        }

        res.status(200).json({ success: true, message: "Subject updated successfully", data: updatedSubject });
    } catch (error) {
        console.error("Error updating subject:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSubject = await Subject.findByIdAndDelete(id);

        if (!deletedSubject) {
            return res.status(404).json({ success: false, message: "Subject not found" });
        }

        res.status(200).json({ success: true, message: "Subject deleted successfully" });
    } catch (error) {
        console.error("Error deleting subject:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
