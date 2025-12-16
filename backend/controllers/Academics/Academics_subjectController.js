import AcademicsSubject from "../../models/Academics/Academics_subject.js";
import AcademicsClass from "../../models/Academics/Academics_class.js";

// Create Subject
export const createSubject = async (req, res) => {
    try {
        const { subjectName, classId } = req.body;
        if (!subjectName || !classId) {
            return res.status(400).json({ message: "Subject Name and Class ID are required" });
        }

        const classExists = await AcademicsClass.findById(classId);
        if (!classExists) {
            return res.status(404).json({ message: "Class not found" });
        }

        const newSubject = new AcademicsSubject({ subjectName, classId });
        await newSubject.save();
        res.status(201).json({ message: "Subject created successfully", data: newSubject });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get All Subjects
export const getAllSubjects = async (req, res) => {
    try {
        const subjects = await AcademicsSubject.find().populate('classId', 'className').sort({ createdAt: -1 });
        res.status(200).json(subjects);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update Subject
export const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjectName, classId } = req.body;
        const updatedSubject = await AcademicsSubject.findByIdAndUpdate(
            id,
            { subjectName, classId },
            { new: true }
        );
        if (!updatedSubject) return res.status(404).json({ message: "Subject not found" });
        res.status(200).json({ message: "Subject updated successfully", data: updatedSubject });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete Subject
export const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSubject = await AcademicsSubject.findByIdAndDelete(id);
        if (!deletedSubject) return res.status(404).json({ message: "Subject not found" });
        res.status(200).json({ message: "Subject deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
