import Script from "../../models/Master_data/Script.js";

// Create Script
export const createScript = async (req, res) => {
    try {
        const { scriptName } = req.body;
        if (!scriptName) return res.status(400).json({ message: "Script name is required" });

        const newScript = new Script({ scriptName });
        await newScript.save();
        res.status(201).json({ message: "Script created successfully", script: newScript });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Scripts
export const getScripts = async (req, res) => {
    try {
        const scripts = await Script.find();
        res.status(200).json(scripts);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Script
export const updateScript = async (req, res) => {
    try {
        const { id } = req.params;
        const { scriptName } = req.body;
        const updatedScript = await Script.findByIdAndUpdate(id, { scriptName }, { new: true });
        if (!updatedScript) return res.status(404).json({ message: "Script not found" });
        res.status(200).json({ message: "Script updated", script: updatedScript });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Script
export const deleteScript = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedScript = await Script.findByIdAndDelete(id);
        if (!deletedScript) return res.status(404).json({ message: "Script not found" });
        res.status(200).json({ message: "Script deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
