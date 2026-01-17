import Admission from "../models/Admission/Admission.js";
import LeadManagement from "../models/LeadManagement.js";
import Student from "../models/Students.js";
import Employee from "../models/HR/Employee.js";
import EmployeeAttendance from "../models/Attendance/EmployeeAttendance.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/**
 * Get Comprehensive CEO Analytics with Advanced Filtering
 */
export const getCEOAnalytics = async (req, res) => {
    try {
        const { startDate, endDate, centre } = req.query;

        // Base filters
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        const admissionDateFilter = startDate && endDate ? {
            admissionDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        } : {};

        let centreFilter = {};
        let employeeCentreFilter = {};
        if (centre && centre !== 'ALL') {
            centreFilter = { centre: centre };
            employeeCentreFilter = { centerArray: centre }; // Match strings in centerArray
        }

        // 1. Workforce Analytics (Filter-friendly)
        const [totalEmployees, deptDistribution, attendanceToday] = await Promise.all([
            Employee.countDocuments({ status: "Active", ...employeeCentreFilter }),
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
                        foreignField: "employeeId",
                        as: "emp"
                    }
                },
                { $unwind: "$emp" },
                { $match: { "emp.status": "Active", ...employeeCentreFilter } },
                { $count: "count" }
            ])
        ]);

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
            // Transaction Method Distribution (Realized Payments Only)
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

        // 3. Student Demographics (Filterable)
        const [studentGender, studentState, studentBoard, studentDept, studentCourse] = await Promise.all([
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
            ])
        ]);

        // 4. Centre Performance (Global Comparison)
        const centrePerformance = await Admission.aggregate([
            { $match: { admissionStatus: 'ACTIVE', ...admissionDateFilter } },
            { $group: { _id: "$centre", revenue: { $sum: "$totalPaidAmount" }, count: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
            { $limit: 20 }
        ]);

        // Combined Conversion Trend (Registrations vs Admissions)
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
                    attendanceToday,
                    presenceRate: totalEmployees > 0 ? ((attendanceToday / totalEmployees) * 100).toFixed(1) : 0,
                    departments: deptDistribution.map(d => ({ name: d._id || "Other", count: d.count }))
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
                }
            }
        });

    } catch (error) {
        console.error("CEO Analytics Controller Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
