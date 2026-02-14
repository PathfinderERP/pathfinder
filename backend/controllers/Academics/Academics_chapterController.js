import AcademicsChapter from "../../models/Academics/Academics_chapter.js";
import AcademicsSubject from "../../models/Academics/Academics_subject.js";
import AcademicsClass from "../../models/Academics/Academics_class.js";

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

// Get All Chapters with Pagination, Search and Filters
export const getAllChapters = async (req, res) => {
    try {
        const { page, limit, search = "", classId = "", subjectId = "" } = req.query;

        const query = {};
        if (search) {
            query.chapterName = { $regex: search, $options: "i" };
        }
        if (subjectId) {
            query.subjectId = subjectId;
        }

        // First find subjects matching classId if classId is provided
        if (classId && !subjectId) {
            const subjectsInClass = await AcademicsSubject.find({ classId }).select('_id');
            const subjectIds = subjectsInClass.map(s => s._id);
            query.subjectId = { $in: subjectIds };
        }

        // If no pagination parameters, return all matching chapters as an array (backward compatibility)
        if (!page && !limit) {
            const chapters = await AcademicsChapter.find(query)
                .populate({
                    path: 'subjectId',
                    select: 'subjectName classId',
                    populate: { path: 'classId', select: 'className' }
                })
                .sort({ createdAt: -1 });
            return res.status(200).json(chapters);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const chapters = await AcademicsChapter.find(query)
            .populate({
                path: 'subjectId',
                select: 'subjectName classId',
                populate: { path: 'classId', select: 'className' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await AcademicsChapter.countDocuments(query);

        res.status(200).json({
            chapters,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete Multiple Chapters
export const deleteMultipleChapters = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No IDs provided" });
        }

        const result = await AcademicsChapter.deleteMany({ _id: { $in: ids } });
        res.status(200).json({
            message: `${result.deletedCount} chapters deleted successfully`,
            deletedCount: result.deletedCount
        });
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

// Bulk Import Chapters
export const bulkImportChapters = async (req, res) => {
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

        // Cache to minimize DB calls during this request
        const classCache = {};
        const subjectCache = {};

        for (const row of importData) {
            try {
                // Expecting normalized keys from frontend
                const { chapterName, className, subjectName } = row;

                if (!chapterName || !className || !subjectName) {
                    results.failedCount++;
                    results.errors.push({ row, error: "Missing required fields (Chapter, Class, Subject)" });
                    continue;
                }

                const normClassName = String(className).trim();
                const normSubjectName = String(subjectName).trim();
                const normChapterName = String(chapterName).trim();

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
                const subjectKey = `${normClassName}_${normSubjectName}`.toLowerCase();
                let subjectId = subjectCache[subjectKey];

                if (!subjectId) {
                    let subjectDoc = await AcademicsSubject.findOne({
                        subjectName: { $regex: new RegExp(`^${normSubjectName}$`, "i") },
                        classId: classId
                    });

                    if (!subjectDoc) {
                        subjectDoc = new AcademicsSubject({
                            subjectName: normSubjectName,
                            classId: classId
                        });
                        await subjectDoc.save();
                    }
                    subjectId = subjectDoc._id;
                    subjectCache[subjectKey] = subjectId;
                }

                // 3. Check Duplicate Chapter
                const existing = await AcademicsChapter.findOne({
                    chapterName: { $regex: new RegExp(`^${normChapterName}$`, "i") },
                    subjectId: subjectId
                });

                if (existing) {
                    // Skip duplicate
                    // results.errors.push({ row, error: "Chapter already exists" });
                    continue;
                }

                // 4. Create Chapter
                const newChapter = new AcademicsChapter({
                    chapterName: normChapterName,
                    subjectId: subjectId
                });

                await newChapter.save();
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
