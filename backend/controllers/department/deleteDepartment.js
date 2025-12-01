import Department from "../../models/Master_data/Department.js";

export const deleteDepartment = async (req, res) => {
    try {
        const deleted = await Department.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Department not found" });

        res.status(200).json({ message: "Department deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
