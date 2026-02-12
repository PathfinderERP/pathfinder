import AcademicsTopic from "../../models/Academics/Academics_topic.js";
import AcademicsChapter from "../../models/Academics/Academics_chapter.js";
import AcademicsSubject from "../../models/Academics/Academics_subject.js";
import AcademicsClass from "../../models/Academics/Academics_class.js";

// Bulk Import Topics
export const bulkImportTopics = async (req, res) => {
    try {
        if (!req.body || !Array.isArray(req.body) || req.body.length === 0) {
            return res.status(400).json({ message: "No data provided" });
        }

        const importData = req.body;
        const results = {
            successCount: 0,
            failedCount: 0,
            errors: []
        };

        // Cache to minimize DB calls
        const classCache = {};
        const subjectCache = {};
        const chapterCache = {};

        for (const row of importData) {
            try {
                // Normalize keys (handle CSV variations)
                const topicName = row['Topic Name'] || row['topic'] || row['Topic'];
                const className = row['Class Name'] || row['classifyId'] || row['Section'] || row['Class'];
                const subjectName = row['Subject Name'] || row['subjectId'] || row['Subject'];
                const chapterName = row['Chapter Name'] || row['chapterId'] || row['Chapter'];

                if (!topicName || !className || !subjectName || !chapterName) {
                    results.failedCount++;
                    results.errors.push({ row, error: "Missing required fields (Topic, Chapter, Subject, Class)" });
                    continue;
                }

                const normClassName = String(className).trim();
                const normSubjectName = String(subjectName).trim();
                const normChapterName = String(chapterName).trim();
                const normTopicName = String(topicName).trim();

                // 1. Find or Create Class
                let classId = classCache[normClassName.toLowerCase()];
                if (!classId) {
                    let classDoc = await AcademicsClass.findOne({
                        className: { $regex: new RegExp(`^${normClassName}$`, "i") }
                    });
                    if (!classDoc) {
                        classDoc = new AcademicsClass({ className: normClassName });
                        await classDoc.save();
                    }
                    classId = classDoc._id;
                    classCache[normClassName.toLowerCase()] = classId;
                }

                // 2. Find or Create Subject
                const subjectKey = `${classId}_${normSubjectName}`.toLowerCase();
                let subjectId = subjectCache[subjectKey];
                if (!subjectId) {
                    let subjectDoc = await AcademicsSubject.findOne({
                        subjectName: { $regex: new RegExp(`^${normSubjectName}$`, "i") },
                        classId: classId
                    });
                    if (!subjectDoc) {
                        subjectDoc = new AcademicsSubject({ subjectName: normSubjectName, classId: classId });
                        await subjectDoc.save();
                    }
                    subjectId = subjectDoc._id;
                    subjectCache[subjectKey] = subjectId;
                }

                // 3. Find or Create Chapter
                const chapterKey = `${subjectId}_${normChapterName}`.toLowerCase();
                let chapterId = chapterCache[chapterKey];
                if (!chapterId) {
                    let chapterDoc = await AcademicsChapter.findOne({
                        chapterName: { $regex: new RegExp(`^${normChapterName}$`, "i") },
                        subjectId: subjectId
                    });
                    if (!chapterDoc) {
                        chapterDoc = new AcademicsChapter({ chapterName: normChapterName, subjectId: subjectId });
                        await chapterDoc.save();
                    }
                    chapterId = chapterDoc._id;
                    chapterCache[chapterKey] = chapterId;
                }

                // 4. Check Duplicate Topic
                const existingTopic = await AcademicsTopic.findOne({
                    topicName: { $regex: new RegExp(`^${normTopicName}$`, "i") },
                    chapterId: chapterId
                });

                if (existingTopic) {
                    // Skip duplicate
                    continue;
                }

                // 5. Create Topic
                const newTopic = new AcademicsTopic({
                    topicName: normTopicName,
                    chapterId: chapterId
                });

                await newTopic.save();
                results.successCount++;

            } catch (err) {
                results.failedCount++;
                results.errors.push({ row, error: err.message });
            }
        }

        res.status(200).json({
            message: "Import processed",
            results
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

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

// Get All Topics with Pagination, Search and Filters
export const getAllTopics = async (req, res) => {
    try {
        const { page, limit, search = "", classId = "", subjectId = "", chapterId = "" } = req.query;

        const query = {};
        if (search) {
            query.topicName = { $regex: search, $options: "i" };
        }
        if (chapterId) {
            query.chapterId = chapterId;
        } else if (subjectId) {
            const chapters = await AcademicsChapter.find({ subjectId }).select('_id');
            query.chapterId = { $in: chapters.map(c => c._id) };
        } else if (classId) {
            const subjects = await AcademicsSubject.find({ classId }).select('_id');
            const chapters = await AcademicsChapter.find({ subjectId: { $in: subjects.map(s => s._id) } }).select('_id');
            query.chapterId = { $in: chapters.map(c => c._id) };
        }

        // Backward compatibility: If no pagination, return plain array
        if (!page && !limit) {
            const topics = await AcademicsTopic.find(query).populate({
                path: 'chapterId',
                select: 'chapterName subjectId',
                populate: {
                    path: 'subjectId',
                    select: 'subjectName classId',
                    populate: { path: 'classId', select: 'className' }
                }
            }).sort({ createdAt: -1 });
            return res.status(200).json(topics);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const topics = await AcademicsTopic.find(query).populate({
            path: 'chapterId',
            select: 'chapterName subjectId',
            populate: {
                path: 'subjectId',
                select: 'subjectName classId',
                populate: { path: 'classId', select: 'className' }
            }
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await AcademicsTopic.countDocuments(query);

        res.status(200).json({
            topics,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete Multiple Topics
export const deleteMultipleTopics = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No IDs provided" });
        }

        const result = await AcademicsTopic.deleteMany({ _id: { $in: ids } });
        res.status(200).json({
            message: `${result.deletedCount} topics deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get Topics by Chapter ID
export const getTopicsByChapter = async (req, res) => {
    try {
        const { chapterId } = req.params;
        const topics = await AcademicsTopic.find({ chapterId }).sort({ createdAt: -1 });
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
