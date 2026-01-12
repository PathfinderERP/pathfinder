
import Admission from "../../models/Admission/Admission.js";
import LeadManagement from "../../models/LeadManagement.js";
import Course from "../../models/Master_data/Courses.js";
import Centre from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getCourseReport = async (req, res) => {
    try {
        const {
            year,
            startDate,
            endDate,
            centreIds,
            courseIds,
            examTagId,
            session // e.g., "2025-2027"
        } = req.query;

        console.log("Course Report Query:", req.query);

        let matchStage = {};

        // 1. Date Filter (Range or Year)
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchStage.admissionDate = { $gte: start, $lte: end };
        } else if (year) {
            const targetYear = parseInt(year);
            if (!isNaN(targetYear)) {
                const startOfYear = new Date(targetYear, 0, 1);
                const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
                matchStage.admissionDate = { $gte: startOfYear, $lte: endOfYear };
            }
        }

        // 2. Session Filter
        if (session) {
            matchStage.academicSession = session;
        }

        // 3. Centre Filter (Resolve IDs to Names)
        let allowedCentreNames = [];
        if (req.user.role !== 'superAdmin') {
            const userCentres = await Centre.find({ _id: { $in: req.user.centres || [] } }).select("centreName");
            allowedCentreNames = userCentres.map(c => c.centreName);
        }

        if (centreIds) {
            const rawIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));

            if (validIds.length > 0) {
                const requestedCentres = await Centre.find({ _id: { $in: validIds } }).select("centreName");
                const requestedNames = requestedCentres.map(c => c.centreName);

                if (req.user.role !== 'superAdmin') {
                    const finalNames = requestedNames.filter(name => allowedCentreNames.includes(name));
                    matchStage.centre = { $in: finalNames.length > 0 ? finalNames : ["__NO_MATCH__"] };
                } else if (requestedNames.length > 0) {
                    matchStage.centre = { $in: requestedNames };
                }
            }
        } else if (req.user.role !== 'superAdmin') {
            matchStage.centre = { $in: allowedCentreNames.length > 0 ? allowedCentreNames : ["__NO_MATCH__"] };
        }

        // 4. Course Filter (New: Implement with ObjectId casting)
        if (courseIds) {
            const rawIds = typeof courseIds === 'string' ? courseIds.split(',') : courseIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));

            if (objectIds.length > 0) {
                matchStage.course = { $in: objectIds };
            }
        }

        // 5. Exam Tag Filter (Fix: Explicit ObjectId)
        if (examTagId && mongoose.Types.ObjectId.isValid(examTagId)) {
            matchStage.examTag = new mongoose.Types.ObjectId(examTagId);
        }

        // Parallel Aggregation
        const [courseStats, centreStats, detailedStats, leadStats, trendStats] = await Promise.all([
            // 1. Course Aggregation (Pie Chart)
            Admission.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$course",
                        count: { $sum: 1 },
                        revenue: { $sum: "$totalFees" }
                    }
                },
                {
                    $lookup: {
                        from: "courses",
                        localField: "_id",
                        foreignField: "_id",
                        as: "courseInfo"
                    }
                },
                { $unwind: "$courseInfo" },
                {
                    $project: {
                        courseName: "$courseInfo.courseName",
                        count: 1,
                        revenue: 1
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // 2. Centre Aggregation
            Admission.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$centre",
                        count: { $sum: 1 },
                        revenue: { $sum: "$totalFees" }
                    }
                }
            ]),

            // 3. Detailed Aggregation (Course + Centre) for Excel
            Admission.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: { course: "$course", centre: "$centre" },
                        count: { $sum: 1 },
                        revenue: { $sum: "$totalFees" }
                    }
                },
                {
                    $lookup: {
                        from: "courses",
                        localField: "_id.course",
                        foreignField: "_id",
                        as: "courseInfo"
                    }
                },
                { $unwind: "$courseInfo" },
                {
                    $project: {
                        courseName: "$courseInfo.courseName",
                        centre: "$_id.centre",
                        count: 1,
                        revenue: 1
                    }
                },
                { $sort: { courseName: 1, count: -1 } }
            ]),

            // 4. Lead Aggregation (Counselling) per Course
            LeadManagement.aggregate([
                {
                    $match: {
                        leadType: { $in: ['HOT LEAD', 'COLD LEAD'] },
                        ...(matchStage.course ? { course: matchStage.course } : {}),
                        ...(matchStage.centre ? { centre: matchStage.centre } : {})
                    }
                },
                {
                    $group: {
                        _id: "$course",
                        counsellingCount: { $sum: 1 }
                    }
                }
            ]),

            // 5. Trend Aggregation (New)
            (async () => {
                const reportType = req.query.reportType || 'monthly';
                if (reportType === 'daily') {
                    return Admission.aggregate([
                        { $match: matchStage },
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
                                count: { $sum: 1 },
                                revenue: { $sum: "$totalFees" }
                            }
                        },
                        { $sort: { "_id": 1 } }
                    ]);
                } else {
                    return Admission.aggregate([
                        { $match: matchStage },
                        {
                            $group: {
                                _id: { $month: "$admissionDate" },
                                count: { $sum: 1 },
                                revenue: { $sum: "$totalFees" }
                            }
                        },
                        { $sort: { "_id": 1 } }
                    ]);
                }
            })()
        ]);

        // Process Course Data
        const totalEnrollments = courseStats.reduce((acc, curr) => acc + curr.count, 0);
        const totalRevenue = courseStats.reduce((acc, curr) => acc + curr.revenue, 0);

        const courseData = courseStats.map(item => {
            const leads = leadStats.find(l => l._id?.toString() === item._id?.toString());
            return {
                name: item.courseName,
                value: item.count,
                admitted: item.count,
                counselling: leads ? leads.counsellingCount : 0,
                revenue: item.revenue,
                percent: totalEnrollments > 0 ? ((item.count / totalEnrollments) * 100).toFixed(2) : 0,
                revenuePercent: totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(2) : 0
            };
        });

        // Process Centre Data
        const allCentres = await Centre.find({}, 'centreName _id');
        const centreMap = {};
        allCentres.forEach(c => {
            centreMap[c._id.toString()] = c.centreName;
        });

        const centreDataStats = centreStats.map(item => ({
            name: centreMap[item._id] || item._id,
            enrollment: item.count,
            revenue: item.revenue
        })).sort((a, b) => b.revenue - a.revenue);

        // Process Trend Data
        const reportType = req.query.reportType || 'monthly';
        let trendData = [];
        if (reportType === 'daily') {
            trendData = trendStats.map(t => ({
                date: t._id,
                count: t.count,
                revenue: t.revenue
            }));
        } else {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            trendData = trendStats.map(t => ({
                month: monthNames[t._id - 1],
                count: t.count,
                revenue: t.revenue
            }));
        }

        const detailedReportData = detailedStats.map(item => ({
            courseName: item.courseName,
            centreName: centreMap[item.centre] || item.centre,
            count: item.count,
            percent: totalEnrollments > 0 ? ((item.count / totalEnrollments) * 100).toFixed(2) : 0,
            revenue: item.revenue
        }));

        res.status(200).json({
            data: courseData,
            centreData: centreDataStats,
            detailedReport: detailedReportData,
            trend: trendData,
            total: totalEnrollments,
            totalRevenue
        });

    } catch (error) {
        console.error("Error in Course Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
