import Sources from "../../models/Master_data/Sources.js";

export const createSource = async (req, res) => {
    try {
        const {
            sourceName,
            source,
            subSource,
            sourceType
        } = req.body;

        if (!sourceName || !source || !subSource) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        const newSource = new Sources({
            sourceName,
            source,
            subSource,
            sourceType
        });

        await newSource.save();

        res.status(201).json({
            message: "Source created successfully",
            source: newSource,
        });

    } catch (err) {
        console.error("Source creation error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
