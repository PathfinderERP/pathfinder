import Class from "../../models/Master_data/Class.js";

export const deleteClass = async (req, res) => {
    try {
        const classRemoved = await Class.findByIdAndDelete(req.params.id);

        if (!classRemoved) return res.status(404).json({ message: "Class not found" });

        res.status(200).json({ message: "Class deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
