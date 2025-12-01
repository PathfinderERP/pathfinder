import Class from "../../models/Master_data/Class.js";

export const updateClass = async (req, res) => {
    try {
        const updatedClass = await Class.findByIdAndUpdate(
            req.params.id,
            { name: req.body.name },
            { new: true }
        );

        if (!updatedClass) return res.status(404).json({ message: "Class not found" });

        res.status(200).json({ message: "Class updated", updatedClass });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
