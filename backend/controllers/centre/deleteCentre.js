import CentreSchema from "../../models/Master_data/Centre.js";

export const deleteCentre = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedCentre = await CentreSchema.findByIdAndDelete(id);

        if (!deletedCentre) {
            return res.status(404).json({ message: "Centre not found" });
        }

        res.status(200).json({ message: "Centre deleted successfully" });

    } catch (err) {
        console.error("Centre deletion error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
