import Admission from "../models/Admission/Admission.js";
import LeadManagement from "../models/LeadManagement.js";
import Student from "../models/Students.js";
import Employee from "../models/HR/Employee.js";
import EmployeeAttendance from "../models/Attendance/EmployeeAttendance.js";
import User from "../models/User.js";
import Department from "../models/Master_data/Department.js";
import Designation from "../models/Master_data/Designation.js";
import Centre from "../models/Master_data/Centre.js";
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