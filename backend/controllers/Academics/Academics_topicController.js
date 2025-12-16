import AcademicsTopic from "../../models/Academics/Academics_topic.js";
import AcademicsChapter from "../../models/Academics/Academics_chapter.js";

// Create Topic
export const createTopic = async (req, res) => {
    try {
        const { topicName, chapterId } = req.body;
        if (!topicName || !chapterId) {
            return res.status(400).json({ message: "Topic Name and Chapter ID are required" });
        }

        // Verify chapter exists
        const chapterExists = await AcademicsChapter.findById(chapterId);
        if (!chapterExists) {
            return res.status(404).json({ message: "Chapter not found" });
        }

        const newTopic = new AcademicsTopic({ topicName, chapterId });
        await newTopic.save();
        res.status(201).json({ message: "Topic created successfully", data: newTopic });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get All Topics
export const getAllTopics = async (req, res) => {
    try {
        const topics = await AcademicsTopic.find().populate({
            path: 'chapterId',
            select: 'chapterName subjectId',
            populate: {
                path: 'subjectId',
                select: 'subjectName classId',
                populate: { path: 'classId', select: 'className' }
            }
        }).sort({ createdAt: -1 });
        res.status(200).json(topics);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update Topic
export const updateTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { topicName, chapterId } = req.body;
        const updatedTopic = await AcademicsTopic.findByIdAndUpdate(
            id,
            { topicName, chapterId },
            { new: true }
        );
        if (!updatedTopic) return res.status(404).json({ message: "Topic not found" });
        res.status(200).json({ message: "Topic updated successfully", data: updatedTopic });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete Topic
export const deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTopic = await AcademicsTopic.findByIdAndDelete(id);
        if (!deletedTopic) return res.status(404).json({ message: "Topic not found" });
        res.status(200).json({ message: "Topic deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
