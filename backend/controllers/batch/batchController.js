import Batch from "../../models/Master_data/Batch.js";

// Create Batch
export const createBatch = async (req, res) => {
    try {
        const { batchName } = req.body;
        if (!batchName) return res.status(400).json({ message: "Batch name is required" });

        const newBatch = new Batch({ batchName });
        await newBatch.save();
        res.status(201).json({ message: "Batch created successfully", batch: newBatch });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get All Batches
export const getBatches = async (req, res) => {
    try {
        const batches = await Batch.find();
        res.status(200).json(batches);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Batch
export const updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { batchName } = req.body;
        const updatedBatch = await Batch.findByIdAndUpdate(id, { batchName }, { new: true });
        if (!updatedBatch) return res.status(404).json({ message: "Batch not found" });
        res.status(200).json({ message: "Batch updated", batch: updatedBatch });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Batch
export const deleteBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBatch = await Batch.findByIdAndDelete(id);
        if (!deletedBatch) return res.status(404).json({ message: "Batch not found" });
        res.status(200).json({ message: "Batch deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
