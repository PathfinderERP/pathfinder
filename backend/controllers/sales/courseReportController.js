
import Admission from "../../models/Admission/Admission.js";
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
        const [courseStats, centreStats, detailedStats] = await Promise.all([
            // 1. Course Aggregation
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
            ])
        ]);

        // Process Course Data
        const totalEnrollments = courseStats.reduce((acc, curr) => acc + curr.count, 0);
        const totalRevenue = courseStats.reduce((acc, curr) => acc + curr.revenue, 0);

        const courseData = courseStats.map(item => ({
            name: item.courseName,
            value: item.count,
            revenue: item.revenue,
            percent: totalEnrollments > 0 ? ((item.count / totalEnrollments) * 100).toFixed(2) : 0,
            revenuePercent: totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(2) : 0
        }));

        // Process Centre Data (Need to map IDs to Names)
        const allCentres = await Centre.find({}, 'centreName _id');
        const centreMap = {};
        allCentres.forEach(c => {
            centreMap[c._id.toString()] = c.centreName;
        });

        const centreData = centreStats.map(item => ({
            name: centreMap[item._id] || item._id, // Fallback to ID if name not found
            enrollment: item.count,
            revenue: item.revenue
        })).sort((a, b) => b.revenue - a.revenue);

        // Process Detailed Report for Excel
        const detailedReport = detailedStats.map(item => ({
            courseName: item.courseName,
            centreName: centreMap[item.centre] || item.centre,
            count: item.count,
            percent: totalEnrollments > 0 ? ((item.count / totalEnrollments) * 100).toFixed(2) : 0,
            revenue: item.revenue
        }));

        console.log("Calculated Course Data:", JSON.stringify(courseData, null, 2));

        res.status(200).json({
            data: courseData,
            centreData: centreData,
            detailedReport: detailedReport,
            total: totalEnrollments,
            totalRevenue // Optional if needed on frontend
        });

    } catch (error) {
        console.error("Error in Course Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
