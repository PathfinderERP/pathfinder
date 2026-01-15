import Admission from "../models/Admission/Admission.js";
import LeadManagement from "../models/LeadManagement.js";
import Employee from "../models/HR/Employee.js";
import EmployeeAttendance from "../models/Attendance/EmployeeAttendance.js";
import Centre from "../models/Master_data/Centre.js";
import mongoose from "mongoose";

/**
 * Get Comprehensive CEO Analytics
 */
export const getCEOAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Date filters
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            };
        }

        // 1. Workforce Analytics
        const [totalEmployees, deptDistribution, genderDistribution, attendanceToday] = await Promise.all([
            Employee.countDocuments({ status: "Active" }),
            Employee.aggregate([
                { $match: { status: "Active" } },
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
            Employee.aggregate([
                { $match: { status: "Active" } },
                { $group: { _id: "$gender", count: { $sum: 1 } } }
            ]),
            EmployeeAttendance.countDocuments({
                date: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date().setHours(23, 59, 59, 999))
                },
                status: "Present"
            })
        ]);

        // 2. Sales & Revenue Analytics
        const [revenueStats, admissionTrend, leadStats] = await Promise.all([
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE' } },
                { $group: { _id: null, totalRevenue: { $sum: "$totalPaidAmount" }, count: { $sum: 1 } } }
            ]),
            Admission.aggregate([
                { $match: { admissionStatus: 'ACTIVE' } },
                {
                    $group: {
                        _id: { $month: "$admissionDate" },
                        count: { $sum: 1 },
                        revenue: { $sum: "$totalPaidAmount" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),
            LeadManagement.aggregate([
                { $group: { _id: "$leadType", count: { $sum: 1 } } }
            ])
        ]);

        const rev = revenueStats[0] || { totalRevenue: 0, count: 0 };
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const trend = admissionTrend.map(t => ({
            month: monthNames[t._id - 1],
            count: t.count,
            revenue: t.revenue
        }));

        // 3. Centre Performance (Top 5)
        const centrePerformance = await Admission.aggregate([
            { $match: { admissionStatus: 'ACTIVE' } },
            { $group: { _id: "$centre", revenue: { $sum: "$totalPaidAmount" }, count: { $sum: 1 } } },
            { $sort: { revenue: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({
            success: true,
            data: {
                workforce: {
                    totalEmployees,
                    attendanceToday,
                    presenceRate: totalEmployees > 0 ? ((attendanceToday / totalEmployees) * 100).toFixed(1) : 0,
                    departments: deptDistribution.map(d => ({ name: d._id || "Other", count: d.count })),
                    gender: genderDistribution.map(g => ({ name: g._id || "Other", count: g.count }))
                },
                sales: {
                    totalRevenue: rev.totalRevenue,
                    totalAdmissions: rev.count,
                    leadStats: leadStats.map(l => ({ type: l._id || "Other", count: l.count })),
                    admissionTrend: trend,
                    centrePerformance: centrePerformance.map(c => ({ name: c._id, revenue: c.revenue, count: c.count }))
                }
            }
        });

    } catch (error) {
        console.error("CEO Analytics Controller Error:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};
