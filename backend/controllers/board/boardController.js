import Boards from "../../models/Master_data/Boards.js";

export const createBoard = async (req, res) => {
    try {
        const { boardCourse, subjects, duration } = req.body;
        if (!boardCourse) {
            return res.status(400).json({ success: false, message: "Board/Course name is required" });
        }

        const existingBoard = await Boards.findOne({ boardCourse });
        if (existingBoard) {
            return res.status(400).json({ success: false, message: "Board/Course already exists" });
        }

        const newBoard = new Boards({ boardCourse, subjects, duration });
        await newBoard.save();

        res.status(201).json({ success: true, message: "Board created successfully", data: newBoard });
    } catch (error) {
        console.error("Error creating board:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const getAllBoards = async (req, res) => {
    try {
        const boards = await Boards.find({}).populate("subjects.subjectId");
        res.status(200).json(boards);
    } catch (error) {
        console.error("Error fetching boards:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const updateBoard = async (req, res) => {
    try {
        const { id } = req.params;
        const { boardCourse, subjects, duration } = req.body;

        const updatedBoard = await Boards.findByIdAndUpdate(
            id,
            { boardCourse, subjects, duration },
            { new: true }
        ).populate("subjects.subjectId");

        if (!updatedBoard) {
            return res.status(404).json({ success: false, message: "Board not found" });
        }

        res.status(200).json({ success: true, message: "Board updated successfully", data: updatedBoard });
    } catch (error) {
        console.error("Error updating board:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

export const deleteBoard = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBoard = await Boards.findByIdAndDelete(id);

        if (!deletedBoard) {
            return res.status(404).json({ success: false, message: "Board not found" });
        }

        res.status(200).json({ success: true, message: "Board deleted successfully" });
    } catch (error) {
        console.error("Error deleting board:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
