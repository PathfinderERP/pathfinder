import Employee from "../../models/HR/Employee.js";
import Department from "../../models/Master_data/Department.js";
import Designation from "../../models/Master_data/Designation.js";
import Centre from "../../models/Master_data/Centre.js";
import User from "../../models/User.js";

// Get employee analytics for dashboard
export const getEmployeeAnalytics = async (req, res) => {
    try {
        const userRole = (req.user.role || "").toLowerCase();
        const isFullAccess = ['superadmin', 'super admin', 'admin', 'hr'].includes(userRole);
        const userCentres = req.user.centres || [];
        const { tab, department, designation, centre, status, role } = req.query;
        const mongoose = (await import('mongoose')).default;

        // Data Isolation Match Stage
        let matchStageMatch = {
            ...(status && { status: { $in: status.split(",") } }),
            ...(department && { department: { $in: department.split(",").map(id => new mongoose.Types.ObjectId(id)) } }),
            ...(designation && { designation: { $in: designation.split(",").map(id => new mongoose.Types.ObjectId(id)) } }),
            ...(centre && { primaryCentre: { $in: centre.split(",").map(id => new mongoose.Types.ObjectId(id)) } }),
            ...(!isFullAccess ? {
                $and: [
                    {
                        $or: [
                            { primaryCentre: { $in: userCentres.map(id => new mongoose.Types.ObjectId(id)) } },
                            { centres: { $in: userCentres.map(id => new mongoose.Types.ObjectId(id)) } }
                        ]
                    }
                ]
            } : {})
        };

        // Role-based filtering via Tab
        if (tab) {
            let roleFilter = {};
            const hodFilter = {
                $or: [
                    { role: 'HOD' },
                    { isDeptHod: true },
                    { isBoardHod: true },
                    { isSubjectHod: true }
                ]
            };

            if (tab === 'teacher') {
                roleFilter = {
                    role: 'teacher',
                    isDeptHod: { $ne: true },
                    isBoardHod: { $ne: true },
                    isSubjectHod: { $ne: true }
                };
            } else if (tab === 'hod') {
                roleFilter = hodFilter;
            } else if (tab === 'staff') {
                // Staff = Not teacher, Not HOD (role or flags)
                // Note: Syncing with EmployeeList table logic (including superAdmin in staff tab if not explicitly filtered out)
                roleFilter = {
                    $and: [
                        { role: { $nin: ['teacher', 'HOD'] } },
                        { isDeptHod: { $ne: true } },
                        { isBoardHod: { $ne: true } },
                        { isSubjectHod: { $ne: true } }
                    ]
                };
            }

            const usersWithRole = await User.find(roleFilter).select('_id');
            const userIds = usersWithRole.map(u => u._id);

            if (!matchStageMatch.$and) matchStageMatch.$and = [];
            matchStageMatch.$and.push({ user: { $in: userIds } });
        } else {
            // Default: Only employees with linked user accounts if no tab specified
            if (!matchStageMatch.$and) matchStageMatch.$and = [];
            matchStageMatch.$and.push({ user: { $exists: true, $ne: null } });
        }

        const matchStage = { $match: matchStageMatch };

        // Handle case where user has no centres assigned and is not superAdmin
        if (!isFullAccess && userCentres.length === 0) {
            matchStage.$match = { _id: null }; // Force no results
        }

        // Total employees count (filtered) - only those with user accounts
        const totalEmployees = await Employee.countDocuments(matchStage.$match);

        // Dynamic Master Data counts based on filtered employees
        const filteredDepts = await Employee.distinct("department", matchStage.$match);
        const filteredCentres = await Employee.distinct("primaryCentre", matchStage.$match);

        const totalDepartments = filteredDepts.filter(d => d !== null).length;
        const totalCentres = filteredCentres.filter(c => c !== null).length;

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
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
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
                    _id: { $ifNull: ["$deptInfo.departmentName", "$userInfo.teacherDepartment", "Other"] },
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
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
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
                    _id: {
                        $ifNull: [
                            "$desigInfo.name",
                            { $ifNull: ["$userInfo.subject", "$userInfo.designation"] },
                            "General"
                        ]
                    },
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
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "centreschemas",
                    localField: "primaryCentre",
                    foreignField: "_id",
                    as: "primaryCentreInfo"
                }
            },
            { $unwind: { path: "$primaryCentreInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "centreschemas",
                    localField: "userInfo.centres",
                    foreignField: "_id",
                    as: "userCentresInfo"
                }
            },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$primaryCentreInfo.centreName",
                            { $arrayElemAt: ["$userCentresInfo.centreName", 0] },
                            "Unknown"
                        ]
                    },
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
