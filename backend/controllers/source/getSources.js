import Sources from "../../models/Master_data/Sources.js";

export const getSources = async (req, res) => {
    try {
        const sources = await Sources.find().sort({ createdAt: -1 });

        res.status(200).json({
            message: "Sources fetched successfully",
            sources,
        });

    } catch (err) {
        console.error("Error fetching sources:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getSourceById = async (req, res) => {
    try {
        const { id } = req.params;

        const source = await Sources.findById(id);

        if (!source) {
            return res.status(404).json({ message: "Source not found" });
        }

        res.status(200).json({
            message: "Source fetched successfully",
            source,
        });

    } catch (err) {
        console.error("Error fetching source:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
