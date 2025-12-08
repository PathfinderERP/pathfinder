import Sources from "../../models/Master_data/Sources.js";

export const deleteSource = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedSource = await Sources.findByIdAndDelete(id);

        if (!deletedSource) {
            return res.status(404).json({ message: "Source not found" });
        }

        res.status(200).json({
            message: "Source deleted successfully",
            source: deletedSource,
        });

    } catch (err) {
        console.error("Source deletion error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
