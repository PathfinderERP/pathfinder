import Department from "../../models/Master_data/Department.js";

export const updateDepartment = async (req, res) => {
    try {
        const updated = await Department.findByIdAndUpdate(
            req.params.id,
            { departmentName: req.body.departmentName, description: req.body.description },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: "Department not found" });

        res.status(200).json({ message: "Department updated", updated });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
