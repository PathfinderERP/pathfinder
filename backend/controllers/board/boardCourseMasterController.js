import BoardCourseMaster from "../../models/Master_data/BoardCourseMaster.js";

export const createBoardCourseMaster = async (req, res) => {
    try {
        const { boardName, className, subjects } = req.body;

        const newEntry = new BoardCourseMaster({
            boardName,
            className,
            subjects
        });

        await newEntry.save();
        res.status(201).json({ message: "Board Course Master created successfully", data: newEntry });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Combination of Board Name and Class already exists" });
        }
        res.status(500).json({ message: error.message });
    }
};

export const getAllBoardCourseMasters = async (req, res) => {
    try {
        const data = await BoardCourseMaster.find().populate("subjects.subjectId");
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateBoardCourseMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const { boardName, className, subjects } = req.body;

        const updated = await BoardCourseMaster.findByIdAndUpdate(
            id,
            { boardName, className, subjects },
            { new: true, runValidators: true }
        ).populate("subjects.subjectId");

        if (!updated) {
            return res.status(404).json({ message: "Board Course Master not found" });
        }

        res.status(200).json({ message: "Board Course Master updated successfully", data: updated });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Combination of Board Name and Class already exists" });
        }
        res.status(500).json({ message: error.message });
    }
};

export const deleteBoardCourseMaster = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await BoardCourseMaster.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ message: "Board Course Master not found" });
        }

        res.status(200).json({ message: "Board Course Master deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
