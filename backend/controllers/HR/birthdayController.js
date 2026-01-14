import Employee from "../../models/HR/Employee.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";

// @desc    Get all active employees for birthday list
// @route   GET /api/hr/birthdays
// @access  Private
export const getBirthdayList = async (req, res) => {
    try {
        const employees = await Employee.find({ status: "Active" })
            .select("name dateOfBirth profileImage department designation primaryCentre email")
            .populate("department", "departmentName")
            .populate("designation", "name title")
            .populate("primaryCentre", "centreName location");

        // Process images with signed URLs
        const employeesWithImages = await Promise.all(employees.map(async (emp) => {
            const empObj = emp.toObject();
            if (empObj.profileImage) {
                empObj.profileImage = await getSignedFileUrl(empObj.profileImage);
            }
            return empObj;
        }));

        res.status(200).json(employeesWithImages);
    } catch (error) {
        console.error("Error fetching birthday list:", error);
        res.status(500).json({ message: "Server Error" });
    }
};
