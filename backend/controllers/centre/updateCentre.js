import CentreSchema from "../../models/Master_data/Centre.js";

export const updateCentre = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Ensure locations array is correctly updated (mongoose handles array replacement by default for direct assignment)
        const updatedCentre = await CentreSchema.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedCentre) {
            return res.status(404).json({ message: "Centre not found" });
        }

        res.status(200).json({
            message: "Centre updated successfully",
            centre: updatedCentre,
        });

    } catch (err) {
        console.error("Centre update error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
