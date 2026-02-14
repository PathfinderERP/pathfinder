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

// Get All Subjects with Pagination, Search and Filters
export const getAllSubjects = async (req, res) => {
    try {
        const { page, limit, search = "", classId = "" } = req.query;

        const query = {};
        if (search) {
            query.subjectName = { $regex: search, $options: "i" };
        }
        if (classId) {
            query.classId = classId;
        }

        // Backward compatibility: If no pagination, return plain array
        if (!page && !limit) {
            const subjects = await AcademicsSubject.find(query).populate('classId', 'className').sort({ createdAt: -1 });
            return res.status(200).json(subjects);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const subjects = await AcademicsSubject.find(query)
            .populate('classId', 'className')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await AcademicsSubject.countDocuments(query);

        res.status(200).json({
            subjects,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete Multiple Subjects
export const deleteMultipleSubjects = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No IDs provided" });
        }

        const result = await AcademicsSubject.deleteMany({ _id: { $in: ids } });
        res.status(200).json({
            message: `${result.deletedCount} subjects deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get Subjects by Class ID
export const getSubjectsByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const subjects = await AcademicsSubject.find({ classId }).sort({ createdAt: -1 });
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
