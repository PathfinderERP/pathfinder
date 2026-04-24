import Department from "../../models/Master_data/Department.js";

export const createDepartment = async (req, res) => {
    try {
        const { departmentName, description, showInAdmission } = req.body;

        const dept = new Department({ 
            departmentName, 
            description, 
            showInAdmission: showInAdmission !== undefined ? showInAdmission : true 
        });
        await dept.save();

        res.status(201).json({ message: "Department created", data: dept });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
