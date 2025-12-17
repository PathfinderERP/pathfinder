import Session from "../../models/Master_data/Session.js";

// Create Session
export const createSession = async (req, res) => {
    try {
        const { sessionName } = req.body;
        if (!sessionName) return res.status(400).json({ message: "Session name is required" });

        const newSession = new Session({ sessionName });
        await newSession.save();
        res.status(201).json({ message: "Session created successfully", session: newSession });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Sessions
export const getSessions = async (req, res) => {
    try {
        const sessions = await Session.find();
        res.status(200).json(sessions);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Session
export const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionName } = req.body;
        const updatedSession = await Session.findByIdAndUpdate(id, { sessionName }, { new: true });
        if (!updatedSession) return res.status(404).json({ message: "Session not found" });
        res.status(200).json({ message: "Session updated", session: updatedSession });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Session
export const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSession = await Session.findByIdAndDelete(id);
        if (!deletedSession) return res.status(404).json({ message: "Session not found" });
        res.status(200).json({ message: "Session deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
