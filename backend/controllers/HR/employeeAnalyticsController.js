import Employee from "../../models/HR/Employee.js";
import Department from "../../models/Master_data/Department.js";
import Designation from "../../models/Master_data/Designation.js";
import Centre from "../../models/Master_data/Centre.js";

// Get employee analytics for dashboard
export const getEmployeeAnalytics = async (req, res) => {
    try {
        const userRole = (req.user.role || "").toLowerCase();
        const isFullAccess = ['superadmin', 'super admin', 'admin'].includes(userRole);
        const userCentres = req.user.centres || [];

        // Data Isolation Match Stage
        const matchStage = !isFullAccess ? {
            $match: {
                user: { $exists: true, $ne: null }, // Only employees with linked user accounts
                $or: [
                    { primaryCentre: { $in: userCentres } },
                    { centres: { $in: userCentres } }
                ]
            }
        } : {
            $match: {
                user: { $exists: true, $ne: null } // Only employees with linked user accounts
            }
        };

        // Handle case where user has no centres assigned and is not superAdmin
        if (!isFullAccess && userCentres.length === 0) {
            matchStage.$match = { _id: null }; // Force no results
        }

        // Total employees count (filtered) - only those with user accounts
        const totalEmployees = await Employee.countDocuments(matchStage.$match);

        // Total Master Data counts (global)
        const totalDepartments = await Department.countDocuments();
        const totalCentres = await Centre.countDocuments();

        // Active vs Inactive breakdown
        const statusBreakdown = await Employee.aggregate([
            matchStage,
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Department-wise distribution
        const departmentDistribution = await Employee.aggregate([
            matchStage,
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
            matchStage,
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
            matchStage,
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
            matchStage,
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
                    dateOfJoining: { $gte: twelveMonthsAgo },
                    ...matchStage.$match
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


        // Gender distribution - Case Insensitive
        const genderDistribution = await Employee.aggregate([
            matchStage,
            {
                $group: {
                    _id: { $toLower: "$gender" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    gender: "$_id",
                    count: 1
                }
            }
        ]);
        // Normalize gender labels back to proper case for consistency if needed, or handle in frontend
        const normalizedGenderDist = genderDistribution.map(g => ({
            _id: g.gender ? g.gender.charAt(0).toUpperCase() + g.gender.slice(1) : "Unknown",
            count: g.count
        }));

        // Average salary by department
        const avgSalaryByDept = await Employee.aggregate([
            matchStage,
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

        // City distribution - Case Insensitive & No Limit
        const cityDistribution = await Employee.aggregate([
            matchStage,
            {
                $group: {
                    _id: { $toLower: "$city" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        const normalizedCityDist = cityDistribution.map(c => ({
            _id: c._id ? c._id.toUpperCase() : "UNKNOWN", // Convert to uppercase for display
            count: c.count
        }));


        // State distribution - Case Insensitive
        const stateDistribution = await Employee.aggregate([
            matchStage,
            {
                $group: {
                    _id: { $toLower: "$state" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        const normalizedStateDist = stateDistribution.map(s => ({
            _id: s._id ? s._id.toUpperCase() : "UNKNOWN",
            count: s.count
        }));

        // teacher vs staff breakdown logic
        const teacherStaffEmployment = await Employee.aggregate([
            matchStage,
            {
                $project: {
                    isTeacher: { $regexMatch: { input: "$employeeId", regex: /^TCH/i } },
                    typeOfEmployment: 1
                }
            },
            {
                $group: {
                    _id: { isTeacher: "$isTeacher", employment: "$typeOfEmployment" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const teachersCount = await Employee.countDocuments({
            employeeId: { $regex: /^TCH/i },
            ...matchStage.$match
        });
        const staffCount = await Employee.countDocuments({
            employeeId: { $not: /^TCH/i },
            ...matchStage.$match
        });

        res.status(200).json({
            totalEmployees,
            totalDepartments,
            totalCentres,
            teachersCount,
            staffCount,
            statusBreakdown,
            departmentDistribution,
            designationDistribution,
            centreDistribution,
            employmentTypeDistribution,
            teacherStaffEmployment,
            monthlyJoiningTrend,
            genderDistribution: normalizedGenderDist,
            avgSalaryByDept,
            cityDistribution: normalizedCityDist,
            stateDistribution: normalizedStateDist
        });
    } catch (error) {
        console.error("Error fetching employee analytics:", error);
        res.status(500).json({ message: "Error fetching analytics", error: error.message });
    }
};
