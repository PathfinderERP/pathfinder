import AcademicsChapter from "../../models/Academics/Academics_chapter.js";
import AcademicsSubject from "../../models/Academics/Academics_subject.js";

// Create Chapter
export const createChapter = async (req, res) => {
    try {
        const { chapterName, subjectId } = req.body;
        if (!chapterName || !subjectId) {
            return res.status(400).json({ message: "Chapter Name and Subject ID are required" });
        }

        // Verify subject exists
        const subjectExists = await AcademicsSubject.findById(subjectId);
        if (!subjectExists) {
            return res.status(404).json({ message: "Subject not found" });
        }

        const newChapter = new AcademicsChapter({ chapterName, subjectId });
        await newChapter.save();
        res.status(201).json({ message: "Chapter created successfully", data: newChapter });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get All Chapters
export const getAllChapters = async (req, res) => {
    try {
        const chapters = await AcademicsChapter.find()
            .populate({
                path: 'subjectId',
                select: 'subjectName classId',
                populate: { path: 'classId', select: 'className' }
            })
            .sort({ createdAt: -1 });
        res.status(200).json(chapters);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get Chapters by Subject ID (Optional utility)
export const getChaptersBySubject = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const chapters = await AcademicsChapter.find({ subjectId }).sort({ createdAt: -1 });
        res.status(200).json(chapters);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// Update Chapter
export const updateChapter = async (req, res) => {
    try {
        const { id } = req.params;
        const { chapterName, subjectId } = req.body;
        const updatedChapter = await AcademicsChapter.findByIdAndUpdate(
            id,
            { chapterName, subjectId },
            { new: true }
        );
        if (!updatedChapter) return res.status(404).json({ message: "Chapter not found" });
        res.status(200).json({ message: "Chapter updated successfully", data: updatedChapter });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete Chapter
export const deleteChapter = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedChapter = await AcademicsChapter.findByIdAndDelete(id);
        if (!deletedChapter) return res.status(404).json({ message: "Chapter not found" });
        res.status(200).json({ message: "Chapter deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
