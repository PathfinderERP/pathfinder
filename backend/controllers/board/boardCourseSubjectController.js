import BoardCourseSubject from "../../models/Master_data/BoardCourseSubject.js";

export const getByBoardAndClass = async (req, res) => {
    try {
        const { boardId, classId } = req.query;
        if (!boardId || !classId) {
            return res.status(400).json({ message: "boardId and classId are required" });
        }
        const entry = await BoardCourseSubject.findOne({ boardId, classId })
            .populate("boardId")
            .populate("classId")
            .populate("subjects.subjectId");
        if (!entry) return res.status(200).json(null); // No config found
        res.status(200).json(entry);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createBoardCourseSubject = async (req, res) => {
    try {
        const { boardId, classId, subjects } = req.body;

        const newEntry = new BoardCourseSubject({
            boardId,
            classId,
            subjects
        });

        await newEntry.save();
        res.status(201).json({ message: "Board Course Subject created successfully", data: newEntry });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "This Board and Class combination already exists" });
        }
        res.status(500).json({ message: error.message });
    }
};

export const getAllBoardCourseSubjects = async (req, res) => {
    try {
        const data = await BoardCourseSubject.find()
            .populate("boardId")
            .populate("classId")
            .populate("subjects.subjectId");
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateBoardCourseSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { boardId, classId, subjects } = req.body;

        const updated = await BoardCourseSubject.findByIdAndUpdate(
            id,
            { boardId, classId, subjects },
            { new: true, runValidators: true }
        ).populate("boardId").populate("classId").populate("subjects.subjectId");

        if (!updated) {
            return res.status(404).json({ message: "Entry not found" });
        }

        res.status(200).json({ message: "Board Course Subject updated successfully", data: updated });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "This Board and Class combination already exists" });
        }
        res.status(500).json({ message: error.message });
    }
};

export const deleteBoardCourseSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await BoardCourseSubject.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Entry not found" });
        }

        res.status(200).json({ message: "Board Course Subject deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
