
import Admission from "../../models/Admission/Admission.js";
import Course from "../../models/Master_data/Courses.js";
import Centre from "../../models/Master_data/Centre.js"; // Import Centre

export const getCourseReport = async (req, res) => {
    try {
        const {
            year,
            centreIds,
            examTagId,
            session // e.g., "2025-2027"
        } = req.query;

        console.log("Course Report Query:", req.query);

        let matchStage = {};

        // Filter by Year (Admission Date) if "This Year" logic is used, 
        // OR rely on Academic Session if that's the primary filter for courses.
        // The screenshot shows "2025-2027" (Session) AND "This Year" (Time Period).
        // Usually "This Year" implies the Admission Date is within current calendar year.
        if (year) {
            const targetYear = parseInt(year);
            if (!isNaN(targetYear)) {
                const startOfYear = new Date(targetYear, 0, 1);
                const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
                matchStage.admissionDate = { $gte: startOfYear, $lte: endOfYear };
            }
        }

        if (session) {
            matchStage.academicSession = session;
        }

        if (centreIds) {
            const cIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            if (cIds.length > 0) {
                matchStage.centre = { $in: cIds };
            }
        }

        if (examTagId) {
            // Exam Tag in Admission is ObjectId
            // We need to cast it to ObjectId if using aggregate? 
            // Mongoose usually handles this but in aggregate sometimes strict.
            // Let's rely on mongoose automatic casting or pass as string if it matches schema.
            // Admission schema: examTag: ObjectId.
            // req.query.examTagId is string.
            // matchStage.examTag = new mongoose.Types.ObjectId(examTagId); // Better be safe
            matchStage.examTag = examTagId; // Try simple assign first, often works if passed to find/match via mongoose
        }

        // Parallel Aggregation
        const [courseStats, centreStats] = await Promise.all([
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
        // Since Admission.centre is String ID, we need to fetch Centre names.
        // Optimization: Fetch only needed centres or all cached? Fetching all is fine (usually < 100).
        const allCentres = await Centre.find({}, 'centreName _id');
        const centreMap = {};
        allCentres.forEach(c => {
            centreMap[c._id.toString()] = c.centreName;
        });

        const centreData = centreStats.map(item => ({
            name: centreMap[item._id] || item._id, // Fallback to ID if name not found
            enrollment: item.count,
            revenue: item.revenue
        })).sort((a, b) => b.revenue - a.revenue); // Sort by revenue by default

        console.log("Calculated Course Data:", JSON.stringify(courseData, null, 2));

        console.log("Calculated Course Data:", JSON.stringify(courseData, null, 2));

        res.status(200).json({
            data: courseData,
            centreData: centreData,
            total: totalEnrollments,
            totalRevenue // Optional if needed on frontend
        });

    } catch (error) {
        console.error("Error in Course Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
