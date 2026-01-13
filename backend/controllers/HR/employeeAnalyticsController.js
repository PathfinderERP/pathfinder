import Employee from "../../models/HR/Employee.js";
import Department from "../../models/Master_data/Department.js";
import Designation from "../../models/Master_data/Designation.js";
import Centre from "../../models/Master_data/Centre.js";

// Get employee analytics for dashboard
export const getEmployeeAnalytics = async (req, res) => {
    try {
        // Total employees count
        const totalEmployees = await Employee.countDocuments();

        // Total Master Data counts
        const totalDepartments = await Department.countDocuments();
        const totalCentres = await Centre.countDocuments();

        // Active vs Inactive breakdown
        const statusBreakdown = await Employee.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Department-wise distribution
        const departmentDistribution = await Employee.aggregate([
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "deptInfo"
                }
            },
            { $unwind: { path: "$deptInfo", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$deptInfo.departmentName",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Designation-wise distribution
        const designationDistribution = await Employee.aggregate([
            {
                $lookup: {
                    from: "designations",
                    localField: "designation",
                    foreignField: "_id",
                    as: "desigInfo"
                }
            },
            { $unwind: { path: "$desigInfo", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$desigInfo.name",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Centre-wise distribution
        const centreDistribution = await Employee.aggregate([
            {
                $lookup: {
                    from: "centreschemas",
                    localField: "primaryCentre",
                    foreignField: "_id",
                    as: "centreInfo"
                }
            },
            { $unwind: { path: "$centreInfo", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$centreInfo.centreName",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Employment type distribution
        const employmentTypeDistribution = await Employee.aggregate([
            {
                $group: {
                    _id: "$typeOfEmployment",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Monthly joining trend (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyJoiningTrend = await Employee.aggregate([
            {
                $match: {
                    dateOfJoining: { $gte: twelveMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$dateOfJoining" },
                        month: { $month: "$dateOfJoining" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Gender distribution
        const genderDistribution = await Employee.aggregate([
            {
                $group: {
                    _id: "$gender",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Average salary by department
        const avgSalaryByDept = await Employee.aggregate([
            {
                $lookup: {
                    from: "departments",
                    localField: "department",
                    foreignField: "_id",
                    as: "deptInfo"
                }
            },
            { $unwind: { path: "$deptInfo", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$deptInfo.departmentName",
                    avgSalary: { $avg: "$currentSalary" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { avgSalary: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            totalEmployees,
            totalDepartments,
            totalCentres,
            statusBreakdown,
            departmentDistribution,
            designationDistribution,
            centreDistribution,
            employmentTypeDistribution,
            monthlyJoiningTrend,
            genderDistribution,
            avgSalaryByDept
        });
    } catch (error) {
        console.error("Error fetching employee analytics:", error);
        res.status(500).json({ message: "Error fetching analytics", error: error.message });
    }
};
