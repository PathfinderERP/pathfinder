import Department from "../../models/Master_data/Department.js";

export const createDepartment = async (req, res) => {
    try {
        const { departmentName, description } = req.body;

        const dept = new Department({ departmentName, description });
        await dept.save();

        res.status(201).json({ message: "Department created", data: dept });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
