import Department from "../../models/Master_data/Department.js";

export const getDepartmentById = async (req, res) => {
    try {
        const dept = await Department.findById(req.params.id);
        if (!dept) return res.status(404).json({ message: "Department not found" });

        res.status(200).json(dept);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
