import Department from "../../models/Master_data/Department.js";

export const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find();
        res.status(200).json(departments);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
