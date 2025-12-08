import Sources from "../../models/Master_data/Sources.js";

export const updateSource = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedSource = await Sources.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedSource) {
            return res.status(404).json({ message: "Source not found" });
        }

        res.status(200).json({
            message: "Source updated successfully",
            source: updatedSource,
        });

    } catch (err) {
        console.error("Source update error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
