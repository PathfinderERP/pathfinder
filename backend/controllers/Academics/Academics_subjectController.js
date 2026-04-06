import AcademicsSubject from "../../models/Academics/Academics_subject.js";
import Class from "../../models/Master_data/Class.js";

// Create Subject
export const createSubject = async (req, res) => {
    try {
        const { masterSubjectId, classId } = req.body;
        if (!masterSubjectId || !classId) {
            return res.status(400).json({ message: "Master Subject ID and Class ID are required" });
        }

        const classExists = await Class.findById(classId);
        if (!classExists) {
            return res.status(404).json({ message: "Class not found" });
        }

        const newSubject = new AcademicsSubject({ masterSubjectId, classId });
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

        let query = {};
        if (search) {
            const masterSubjects = await mongoose.model("Subject").find({
                subName: { $regex: search, $options: "i" }
            });
            const masterSubjectIds = masterSubjects.map(s => s._id);
            query.masterSubjectId = { $in: masterSubjectIds };
        }
        if (classId) {
            query.classId = classId;
        }

        // Backward compatibility: If no pagination, return plain array
        if (!page && !limit) {
            const subjects = await AcademicsSubject.find(query)
                .populate('classId', 'name')
                .populate('masterSubjectId', 'subName')
                .sort({ createdAt: -1 });

            // Flatten for frontend
            const flattenedSub = subjects.map(s => ({
                ...s.toObject(),
                subjectName: s.masterSubjectId?.subName || "Unnamed Subject",
                className: s.classId?.name || "N/A"
            }));

            return res.status(200).json(flattenedSub);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const subjects = await AcademicsSubject.find(query)
            .populate('classId', 'name')
            .populate('masterSubjectId', 'subName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await AcademicsSubject.countDocuments(query);

        // Flatten for frontend
        const flattenedSubjects = subjects.map(s => ({
            ...s.toObject(),
            subjectName: s.masterSubjectId?.subName || "Unnamed Subject",
            className: s.classId?.name || "N/A"
        }));

        res.status(200).json({
            subjects: flattenedSubjects,
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
        const subjects = await AcademicsSubject.find({ classId })
            .populate('masterSubjectId', 'subName')
            .sort({ createdAt: -1 });

        // Map to flatten subName for frontend compatibility
        const flattenedSubjects = subjects.map(s => ({
            ...s.toObject(),
            subjectName: s.masterSubjectId?.subName || "Unnamed Subject"
        }));

        res.status(200).json(flattenedSubjects);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update Subject
export const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { masterSubjectId, classId } = req.body;
        const updatedSubject = await AcademicsSubject.findByIdAndUpdate(
            id,
            { masterSubjectId, classId },
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
