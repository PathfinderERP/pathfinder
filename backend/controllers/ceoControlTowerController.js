import Admission from "../models/Admission/Admission.js";
import LeadManagement from "../models/LeadManagement.js";
import Student from "../models/Students.js";
import Employee from "../models/HR/Employee.js";
import EmployeeAttendance from "../models/Attendance/EmployeeAttendance.js";
import User from "../models/User.js";
import Department from "../models/Master_data/Department.js";
import Designation from "../models/Master_data/Designation.js";
import Centre from "../models/Master_data/Centre.js";
import Sources from "../models/Master_data/Sources.js";
import mongoose from "mongoose";

/**
 * Get Comprehensive CEO Analytics with Advanced Filtering
 */
export const getCEOAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, centre } = req.query;

        let dateFilter = {};
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: end
                }
            };
        }

        const admissionDateFilter = startDate && endDate ? (() => {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return {
                admissionDate: {
                    $gte: new Date(startDate),
                    $lte: end
                }
            };
        })() : {};

        let centreFilter = {};
        let employeeCentreFilter = {};
        if (centre && centre !== 'ALL') {
            const centres = centre.split(',');
            centreFilter = { centre: { $in: centres } };
            employeeCentreFilter = { centerArray: { $in: centres } };
        }

        // Fetch Master Data for Workforce Distribution
        const [allDepartments, allDesignations, allCentres] = await Promise.all([
            Department.find({}).select("departmentName").lean(),
            Designation.find({}).select("name").lean(),
            Centre.find({}).select("centreName").lean()
        ]);

        // 1. Workforce Analytics
        const [
            totalEmployees,
            deptDistributionRaw,
            designationDistributionRaw,
            centreDistributionRaw,
            attendanceToday
        ] = await Promise.all([
            Employee.countDocuments({ status: "Active", ...employeeCentreFilter }),
            // Department Distribution
            Employee.aggregate([
                { $match: { status: "Active", ...employeeCentreFilter } },
                {
                    $lookup: {
                        from: "departments",
                        localField: "department",
                        foreignField: "_id",
                        as: "deptInfo"
                    }
                },
                { $unwind: { path: "$deptInfo", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$deptInfo.departmentName", count: { $sum: 1 } } }
            ]),
            // Designation Distribution
            Employee.aggregate([
                { $match: { status: "Active", ...employeeCentreFilter } },
                {
                    $lookup: {
                        from: "designations",
                        localField: "designation",
                        foreignField: "_id",
                        as: "desigInfo"
                    }
                },
                { $unwind: { path: "$desigInfo", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$desigInfo.name", count: { $sum: 1 } } }
            ]),
            // Centre Distribution
            Employee.aggregate([
                { $match: { status: "Active", ...employeeCentreFilter } },
                {
                    $lookup: {
                        from: "centreschemas",
                        localField: "primaryCentre",
                        foreignField: "_id",
                        as: "centreInfo"
                    }
                },
                { $unwind: { path: "$centreInfo", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$centreInfo.centreName", count: { $sum: 1 } } }
            ]),
            // Attendance
            EmployeeAttendance.aggregate([
                {
                    $match: {
                        date: {
                            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                            $lte: new Date(new Date().setHours(23, 59, 59, 999))
                        },
                        status: "Present"
                    }
                },
                {
                    $lookup: {
                        from: "employees",
                        localField: "employeeId",
                        foreignField: "_id", // FIXED: link to _id (ObjectId), not employeeId (String)
                        as: "emp"
                    }
                },
                { $unwind: "$emp" },
                { $match: { "emp.status": "Active", ...employeeCentreFilter } },
                { $count: "count" }
            ])
        ]);

        // Format Distributions
        const formatDistribution = (masterList, rawData, nameKey) => {
            return masterList.map(item => {
                const found = rawData.find(d => d._id === item[nameKey]);
                return {
                    name: item[nameKey],
                    count: found ? found.count : 0
                };
            }).sort((a, b) => b.count - a.count);
        };

        const deptDistribution = formatDistribution(allDepartments, deptDistributionRaw, "departmentName");
        const designationDistribution = formatDistribution(allDesignations, designationDistributionRaw, "name");
        const centreDistribution = formatDistribution(allCentres, centreDistributionRaw, "centreName");

        const attendanceCount = attendanceToday[0]?.count || 0;

        // 2. Core Business KPIs & Trends
        const [
            revenueStats,
            dailyTrend,
            registrationTrend,
            transactionStats,
            leadStats,
            leadSourceStats,
            counselorPerformance,
            telecallerPerformance
        ] = await Promise.all([
            // Total Revenue & Admissions
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                { $group: { _id: null, totalRevenue: { $sum: "$totalPaidAmount" }, count: { $sum: 1 } } }
            ]),
            // Daily Admission Trend
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
                        count: { $sum: 1 },
                        revenue: { $sum: "$totalPaidAmount" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),
            // Daily Registration Trend
            Student.aggregate([
                { $match: { ...dateFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),
            // Transaction Method Distribution
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                {
                    $project: {
                        payments: {
                            $concatArrays: [
                                [{ method: "$downPaymentMethod", amount: "$downPayment", status: "$downPaymentStatus" }],
                                {
                                    $map: {
                                        input: "$paymentBreakdown",
                                        as: "p",
                                        in: { method: "$$p.paymentMethod", amount: "$$p.paidAmount", status: "$$p.status" }
                                    }
                                }
                            ]
                        }
                    }
                },
                { $unwind: "$payments" },
                { $match: { "payments.status": "PAID" } },
                { $group: { _id: "$payments.method", count: { $sum: 1 }, amount: { $sum: "$payments.amount" } } }
            ]),
            // Lead Status Breakdown
            LeadManagement.aggregate([
                { $match: { ...dateFilter } },
                { $group: { _id: "$leadType", count: { $sum: 1 } } }
            ]),
            // Lead Source Breakdown
            LeadManagement.aggregate([
                { $match: { ...dateFilter } },
                { $group: { _id: "$source", count: { $sum: 1 } } }
            ]),
            // Counselor (Sales) Performance
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                { $group: { _id: "$createdBy", count: { $sum: 1 }, revenue: { $sum: "$totalPaidAmount" } } },
                { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userInfo" } },
                { $unwind: "$userInfo" },
                { $project: { name: "$userInfo.name", count: 1, revenue: 1 } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            // Telecaller Performance
            LeadManagement.aggregate([
                { $match: { ...dateFilter } },
                { $group: { _id: "$leadResponsibility", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        // 3. Student Demographics
        const [studentGender, studentState, studentBoard, studentDept, studentCourse, boardCourseAnalysis, normalCourseAnalysis, boardSubjectAnalysis] = await Promise.all([
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "s" } },
                { $unwind: "$s" },
                { $unwind: "$s.studentsDetails" },
                { $group: { _id: "$s.studentsDetails.gender", count: { $sum: 1 } } }
            ]),
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "s" } },
                { $unwind: "$s" },
                { $unwind: "$s.studentsDetails" },
                { $group: { _id: "$s.studentsDetails.state", count: { $sum: 1 } } }
            ]),
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "s" } },
                { $unwind: "$s" },
                { $unwind: "$s.studentsDetails" },
                { $group: { _id: "$s.studentsDetails.board", count: { $sum: 1 } } }
            ]),
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                { $lookup: { from: "departments", localField: "department", foreignField: "_id", as: "d" } },
                { $unwind: { path: "$d", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$d.departmentName", count: { $sum: 1 } } }
            ]),
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter, ...centreFilter } },
                { $lookup: { from: "courses", localField: "course", foreignField: "_id", as: "c" } },
                { $unwind: { path: "$c", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$c.courseName", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', admissionType: "BOARD", ...admissionDateFilter, ...centreFilter } },
                { $lookup: { from: "boards", localField: "board", foreignField: "_id", as: "b" } },
                { $unwind: { path: "$b", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$b.name", count: { $sum: 1 }, revenue: { $sum: "$totalPaidAmount" } } },
                { $sort: { count: -1 } }
            ]),
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', admissionType: "NORMAL", ...admissionDateFilter, ...centreFilter } },
                { $lookup: { from: "courses", localField: "course", foreignField: "_id", as: "c" } },
                { $unwind: { path: "$c", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$c.courseName", count: { $sum: 1 }, revenue: { $sum: "$totalPaidAmount" } } },
                { $sort: { count: -1 } }
            ]),
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE', admissionType: "BOARD", ...admissionDateFilter, ...centreFilter } },
                { $unwind: "$selectedSubjects" },
                { $group: { _id: "$selectedSubjects.name", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        // 4. Centre Performance
        const centrePerformance = await Admission.aggregate([
            { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter } },
            { $group: { _id: "$centre", revenue: { $sum: "$totalPaidAmount" }, count: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
            { $limit: 20 }
        ]);

        // Combined Conversion Trend
        const allDates = [...new Set([...dailyTrend.map(d => d._id), ...registrationTrend.map(r => r._id)])].sort();
        const conversionTrend = allDates.map(date => {
            const adm = dailyTrend.find(d => d._id === date) || { count: 0, revenue: 0 };
            const reg = registrationTrend.find(r => r._id === date) || { count: 0 };
            return {
                date,
                admissions: adm.count,
                registrations: reg.count,
                revenue: adm.revenue
            };
        });

        const rev = revenueStats[0] || { totalRevenue: 0, count: 0 };

        res.status(200).json({
            success: true,
            data: {
                workforce: {
                    totalEmployees,
                    attendanceToday: attendanceCount,
                    presenceRate: totalEmployees > 0 ? ((attendanceCount / totalEmployees) * 100).toFixed(1) : 0,
                    departments: deptDistribution,
                    designations: designationDistribution,
                    centres: centreDistribution
                },
                sales: {
                    totalRevenue: rev.totalRevenue,
                    totalAdmissions: rev.count,
                    leadStats: leadStats.map(l => ({ type: l._id || "Other", count: l.count })),
                    leadSourceStats: leadSourceStats.map(l => ({ name: l._id || "Other", count: l.count })),
                    conversionTrend,
                    transactionStats: transactionStats.map(t => ({ name: t._id || "Other", count: t.count, amount: t.amount })),
                    centrePerformance: centrePerformance.map(c => ({ name: c._id || "Unknown", revenue: c.revenue, count: c.count })),
                    counselorStats: counselorPerformance,
                    telecallerStats: telecallerPerformance.map(t => ({ name: t._id || "Unknown", count: t.count }))
                },
                students: {
                    gender: studentGender.map(g => ({ name: g._id || "N/A", count: g.count })),
                    state: studentState.map(s => ({ name: s._id || "N/A", count: s.count })),
                    board: studentBoard.map(b => ({ name: b._id || "N/A", count: b.count })),
                    department: studentDept.map(d => ({ name: d._id || "N/A", count: d.count })),
                    course: studentCourse.map(c => ({ name: c._id || "N/A", count: c.count }))
                },
                academics: {
                    boardCourse: boardCourseAnalysis.map(b => ({ name: b._id || "Unknown Board", count: b.count, revenue: b.revenue })),
                    normalCourse: normalCourseAnalysis.map(c => ({ name: c._id || "Unknown Course", count: c.count, revenue: c.revenue })),
                    boardSubjects: boardSubjectAnalysis.map(s => ({ name: s._id || "Unknown Subject", count: s.count }))
                }
            }
        });

    } catch (error) {
        console.error("CEO Analytics Controller Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

/**
 * Get Detailed Employee Attendance Analytics for CEO Dashboard
 */
export const getCEOAttendanceAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, centre, department, designation, period } = req.query;

        // Date Filters
        const dateFilter = {};
        if (startDate && endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.date = {
                $gte: new Date(startDate),
                $lte: end
            };
        }

        // Aggregation Pipeline
        const pipeline = [
            { $match: dateFilter },
            {
                $lookup: {
                    from: "employees",
                    localField: "employeeId",
                    foreignField: "_id", // FIXED: link to _id (ObjectId)
                    as: "emp"
                }
            },
            { $unwind: "$emp" },
            { $match: { "emp.status": "Active" } },
        ];

        // Multi-select handling for Centre
        if (centre && centre !== 'ALL') {
            const centres = centre.split(',');
            pipeline.push({ $match: { "emp.centerArray": { $in: centres } } });
        }

        // Lookup Department & Designation
        if (department || designation) {
            pipeline.push(
                {
                    $lookup: {
                        from: "departments",
                        localField: "emp.department",
                        foreignField: "_id",
                        as: "emp.deptInfo"
                    }
                },
                { $unwind: { path: "$emp.deptInfo", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "designations",
                        localField: "emp.designation",
                        foreignField: "_id",
                        as: "emp.desigInfo"
                    }
                },
                { $unwind: { path: "$emp.desigInfo", preserveNullAndEmptyArrays: true } }
            );

            // Multi-select handling for Department/Designation
            if (department && department !== 'ALL') {
                const depts = department.split(',');
                pipeline.push({ $match: { "emp.deptInfo.departmentName": { $in: depts } } });
            }
            if (designation && designation !== 'ALL') {
                const desigs = designation.split(',');
                pipeline.push({ $match: { "emp.desigInfo.name": { $in: desigs } } });
            }
        }

        // Grouping by Period
        let dateFormat = "%Y-%m-%d"; // Default 'day'
        if (period === 'week') dateFormat = "%Y-%U";
        else if (period === 'month') dateFormat = "%Y-%m";
        else if (period === 'year') dateFormat = "%Y";

        pipeline.push({
            $group: {
                _id: { $dateToString: { format: dateFormat, date: "$date" } },
                present: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
                absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
                late: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
                halfDay: { $sum: { $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0] } },
                totalRecords: { $sum: 1 }
            }
        });

        pipeline.push({ $sort: { "_id": 1 } });

        const trends = await EmployeeAttendance.aggregate(pipeline);

        res.status(200).json({
            success: true,
            data: trends
        });

    } catch (error) {
        console.error("Attendance Analytics Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * Get Single Employee Performance Analytics
 */
export const getEmployeePerformance = async (req, res) => {
    try {
        const { employeeId, startDate, endDate } = req.query;

        if (!employeeId) return res.status(400).json({ success: false, message: "Employee ID required" });

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // 1. Fetch Employee Details
        const employee = await Employee.findOne({ employeeId: employeeId })
            .populate('department', 'departmentName')
            .populate('designation', 'name')
            .populate('primaryCentre', 'centreName')
            .lean();

        if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

        // 2. Fetch Attendance Records
        const attendanceRecords = await EmployeeAttendance.find({
            employeeId: employee._id, // FIXED: Use ObjectId (_id)
            ...dateFilter
        }).sort({ date: 1 }).lean();

        // 3. Process Stats
        const stats = {
            present: 0,
            absent: 0,
            late: 0,
            halfDay: 0,
            totalDays: attendanceRecords.length
        };

        const timeline = attendanceRecords.map(record => {
            if (record.status === 'Present') stats.present++;
            if (record.status === 'Absent') stats.absent++;
            if (record.status === 'Late') stats.late++;
            if (record.status === 'Half Day') stats.halfDay++;

            return {
                date: record.date.toISOString().split('T')[0],
                status: record.status,
                punchIn: record.punchIn || null,
                punchOut: record.punchOut || null
            };
        });

        res.status(200).json({
            success: true,
            data: {
                employee: {
                    name: employee.employeeName, // Correct field name
                    id: employee.employeeId,
                    department: employee.department?.departmentName || "N/A",
                    designation: employee.designation?.name || "N/A",
                    centre: employee.primaryCentre?.centreName || "N/A",
                    image: employee.employeeImage
                },
                stats,
                timeline
            }
        });

    } catch (error) {
        console.error("Employee Performance Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * Search Employees for CEO Dashboard
 */
export const searchEmployees = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json({ success: true, data: [] });

        const employees = await Employee.find({
            status: "Active",
            $or: [
                { employeeName: { $regex: query, $options: "i" } },
                { employeeId: { $regex: query, $options: "i" } }
            ]
        })
            .select("employeeName employeeId employeeImage")
            .limit(10)
            .lean();

        res.json({ success: true, data: employees });
    } catch (error) {
        console.error("Search Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * Get Comprehensive Lead Analytics for CEO Dashboard
 */
export const getCEOLeadAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, centre, leadType, source, createdBy, leadResponsibility } = req.query;

        let match = {};

        // Date range (createdAt)
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match.createdAt = { $gte: start, $lte: end };
        }

        // Centre filtering (multi-select)
        if (centre && centre !== 'ALL') {
            const centresList = centre.split(',').filter(Boolean).map(c => {
                try {
                    return new mongoose.Types.ObjectId(c.trim());
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
            if (centresList.length > 0) {
                match.centre = { $in: centresList };
            }
        }

        // Lead Type (Status) filtering (multi-select)
        if (leadType && leadType !== 'ALL') {
            const typesList = leadType.split(',').filter(Boolean).map(t => t.trim());
            if (typesList.length > 0) {
                match.leadType = { $in: typesList };
            }
        }

        // Source filtering (multi-select)
        if (source && source !== 'ALL') {
            const sourcesList = source.split(',').filter(Boolean).map(s => s.trim());
            if (sourcesList.length > 0) {
                match.source = { $in: sourcesList };
            }
        }

        // Created By filtering (multi-select)
        if (createdBy && createdBy !== 'ALL') {
            const creatorsList = createdBy.split(',').filter(Boolean).map(c => {
                try {
                    return new mongoose.Types.ObjectId(c.trim());
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
            if (creatorsList.length > 0) {
                match.createdBy = { $in: creatorsList };
            }
        }

        // Lead Responsibility filtering (multi-select)
        if (leadResponsibility && leadResponsibility !== 'ALL') {
            const respList = leadResponsibility.split(',').filter(Boolean).map(r => r.trim());
            if (respList.length > 0) {
                match.leadResponsibility = { $in: respList };
            }
        }

        // Fetch filter metadata in parallel
        const [allCentres, allSources, allUsers, distinctResponsibilities] = await Promise.all([
            Centre.find({}).select("centreName").lean(),
            Sources.find({}).select("sourceName").lean(),
            User.find({}).select("name email").lean(),
            LeadManagement.distinct("leadResponsibility")
        ]);

        // Aggregate 1: Overall Lead counts & status counts
        const [totalLeads, statusStats] = await Promise.all([
            LeadManagement.countDocuments(match),
            LeadManagement.aggregate([
                { $match: match },
                { $group: { _id: "$leadType", count: { $sum: 1 } } }
            ])
        ]);

        // Normalize status counts
        const leadStatuses = ["HOT LEAD", "WARM LEAD", "COLD LEAD", "NEUTRAL LEAD", "INVALID LEAD"];
        const statusMap = leadStatuses.reduce((acc, status) => {
            acc[status] = 0;
            return acc;
        }, {});
        statusStats.forEach(item => {
            const statusKey = item._id || "NEUTRAL LEAD";
            statusMap[statusKey] = item.count;
        });

        // Aggregate 2: Who uploaded most data
        const uploadRank = await LeadManagement.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$createdBy",
                    count: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $gt: ["$campaign", null] },
                                        { $eq: ["$source", "Campaign"] },
                                        { $eq: ["$source", "Excel"] },
                                        { $eq: ["$source", "Bulk Upload"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $match: { count: { $gt: 0 } } },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userInfo" } },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ["$userInfo.name", "Unknown"] },
                    email: { $ifNull: ["$userInfo.email", "N/A"] },
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Aggregate 3: Who added most data (manually)
        const addedRank = await LeadManagement.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$createdBy",
                    count: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: [{ $ifNull: ["$campaign", null] }, null] },
                                        { $ne: ["$source", "Campaign"] },
                                        { $ne: ["$source", "Excel"] },
                                        { $ne: ["$source", "Bulk Upload"] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $match: { count: { $gt: 0 } } },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "userInfo" } },
            { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ["$userInfo.name", "Unknown"] },
                    email: { $ifNull: ["$userInfo.email", "N/A"] },
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Aggregate 4: Telecaller status breakdown (who has more hot, cold, warm, invalid, neutral)
        const typeLeaderboard = await LeadManagement.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$leadResponsibility",
                    hotCount: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                    warmCount: { $sum: { $cond: [{ $eq: ["$leadType", "WARM LEAD"] }, 1, 0] } },
                    coldCount: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                    neutralCount: { $sum: { $cond: [{ $eq: ["$leadType", "NEUTRAL LEAD"] }, 1, 0] } },
                    invalidCount: { $sum: { $cond: [{ $eq: ["$leadType", "INVALID LEAD"] }, 1, 0] } },
                    totalCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: { $ifNull: ["$_id", "Unassigned"] },
                    hotCount: 1,
                    warmCount: 1,
                    coldCount: 1,
                    neutralCount: 1,
                    invalidCount: 1,
                    totalCount: 1
                }
            },
            { $sort: { totalCount: -1 } }
        ]);

        // Aggregate 5: Who added most follow-ups
        let followupMatch = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            followupMatch["followUps.date"] = { $gte: start, $lte: end };
        }
        if (centre && centre !== 'ALL') {
            const centresList = centre.split(',').filter(Boolean).map(c => {
                try {
                    return new mongoose.Types.ObjectId(c.trim());
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
            if (centresList.length > 0) {
                followupMatch.centre = { $in: centresList };
            }
        }

        // Build the post-unwind match for followUp date filtering
        const followupPostUnwindMatch = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            followupPostUnwindMatch["followUps.date"] = { $gte: start, $lte: end };
        }

        const followupDocMatch = {};
        if (followupMatch.centre) followupDocMatch.centre = followupMatch.centre;

        const followupRank = await LeadManagement.aggregate([
            { $match: followupDocMatch },
            { $unwind: "$followUps" },
            ...(Object.keys(followupPostUnwindMatch).length > 0 ? [{ $match: followupPostUnwindMatch }] : []),
            {
                $group: {
                    _id: "$followUps.updatedBy",
                    count: { $sum: 1 }
                }
            },
            { $match: { _id: { $nin: [null, ""] } } },
            {
                $project: {
                    name: { $ifNull: ["$_id", "Unknown"] },
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Aggregate 6: Who is adding students in the next follow up dates
        const nextFollowUpRank = await LeadManagement.aggregate([
            {
                $match: {
                    ...match,
                    nextFollowUpDate: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: "$leadResponsibility",
                    count: { $sum: 1 },
                    leads: {
                        $push: {
                            name: "$name",
                            phoneNumber: "$phoneNumber",
                            nextFollowUpDate: "$nextFollowUpDate",
                            leadType: "$leadType"
                        }
                    }
                }
            },
            {
                $project: {
                    name: { $ifNull: ["$_id", "Unassigned"] },
                    count: 1,
                    leads: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Upcoming day-by-day follow-up schedules
        const nextFollowUpSchedule = await LeadManagement.aggregate([
            {
                $match: {
                    ...match,
                    nextFollowUpDate: { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$nextFollowUpDate" } },
                        responsible: "$leadResponsibility"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    date: "$_id.date",
                    responsible: { $ifNull: ["$_id.responsible", "Unassigned"] },
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { date: 1, count: -1 } }
        ]);

        // Unify performance: Overall combined leaderboard ranking
        const combinedMap = {};
        const normalizeName = (name) => (name || "").trim().toLowerCase();

        const getUser = (name, email = "N/A", userId = null) => {
            const key = normalizeName(name);
            if (!key) return null;
            if (!combinedMap[key]) {
                combinedMap[key] = {
                    name: name || "Unknown",
                    email: email,
                    userId: userId,
                    uploads: 0,
                    added: 0,
                    hotCount: 0,
                    warmCount: 0,
                    coldCount: 0,
                    neutralCount: 0,
                    invalidCount: 0,
                    followUps: 0,
                    nextFollowUps: 0,
                    score: 0
                };
            }
            return combinedMap[key];
        };

        // Populate uploads
        uploadRank.forEach(item => {
            const u = getUser(item.name, item.email, item._id);
            if (u) u.uploads = item.count;
        });

        // Populate manual creations
        addedRank.forEach(item => {
            const u = getUser(item.name, item.email, item._id);
            if (u) u.added = item.count;
        });

        // Populate status totals
        typeLeaderboard.forEach(item => {
            const u = getUser(item.name);
            if (u) {
                u.hotCount = item.hotCount;
                u.warmCount = item.warmCount;
                u.coldCount = item.coldCount;
                u.neutralCount = item.neutralCount;
                u.invalidCount = item.invalidCount;
            }
        });

        // Populate follow-ups added
        followupRank.forEach(item => {
            const u = getUser(item.name);
            if (u) u.followUps = item.count;
        });

        // Populate next follow-ups scheduled
        nextFollowUpRank.forEach(item => {
            const u = getUser(item.name);
            if (u) u.nextFollowUps = item.count;
        });

        // Calculate combined score
        Object.values(combinedMap).forEach(user => {
            // Formula: uploads*1 + added*2 + hot*5 + warm*3 + neutral*1 - invalid*2 + followUps*2 + nextFollowUps*2
            user.score = (user.uploads * 1) + 
                         (user.added * 2) + 
                         (user.hotCount * 5) + 
                         (user.warmCount * 3) + 
                         (user.neutralCount * 1) + 
                         (user.invalidCount * -2) + 
                         (user.followUps * 2) + 
                         (user.nextFollowUps * 2);
        });

        // Exclude unassigned/unknown and sort by score
        const overallLeaderboard = Object.values(combinedMap)
            .filter(u => u.name.toLowerCase() !== "unassigned" && u.name.toLowerCase() !== "unknown")
            .sort((a, b) => b.score - a.score)
            .map((u, idx) => ({
                rank: idx + 1,
                ...u
            }));

        res.status(200).json({
            success: true,
            filters: {
                centres: allCentres,
                sources: allSources,
                users: allUsers,
                responsibilities: distinctResponsibilities.filter(Boolean)
            },
            data: {
                totalLeads,
                statusBreakdown: statusMap,
                uploadRank,
                addedRank,
                typeLeaderboard,
                followupRank,
                nextFollowUpRank,
                nextFollowUpSchedule,
                overallLeaderboard
            }
        });

    } catch (error) {
        console.error("CEO Lead Analytics Controller Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};