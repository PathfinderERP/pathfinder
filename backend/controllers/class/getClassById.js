import Class from "../../models/Master_data/Class.js";

export const getClassById = async (req, res) => {
    try {
        const classData = await Class.findById(req.params.id);
        
        if (!classData) {
            return res.status(404).json({ message: "Class not found" });
        }
        
        res.status(200).json(classData);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
