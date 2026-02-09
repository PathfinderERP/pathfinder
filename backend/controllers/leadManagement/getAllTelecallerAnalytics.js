import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";

export const getAllTelecallerAnalytics = async (req, res) => {
    try {
        const { fromDate, toDate, period = 'daily' } = req.query;

        // Calculate date range based on period
        let startDate, endDate;
        const now = new Date();

        if (period === 'daily') {
            // Today's data
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
        } else if (period === 'weekly') {
            // Last 7 days
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'monthly') {
            // Last 30 days
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        }

        // Override with custom dates if provided
        if (fromDate) startDate = new Date(fromDate);
        if (toDate) {
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
        }

        // Calculate previous period range
        let prevStartDate, prevEndDate;
        if (period === 'daily') {
            prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
            prevEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        } else if (period === 'weekly') {
            prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            prevEndDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (period === 'monthly') {
            prevStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            prevEndDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Aggregate to get calls count per telecaller
        const performanceData = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            {
                $match: {
                    $or: [
                        { "followUps.date": { $gte: startDate, $lte: endDate } },
                        { "followUps.date": { $gte: prevStartDate, $lte: prevEndDate } }
                    ]
                }
            },
            {
                $group: {
                    _id: "$leadResponsibility",
                    currentCalls: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ["$followUps.date", startDate] }, { $lte: ["$followUps.date", endDate] }] },
                                1,
                                0
                            ]
                        }
                    },
                    previousCalls: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ["$followUps.date", prevStartDate] }, { $lte: ["$followUps.date", prevEndDate] }] },
                                1,
                                0
                            ]
                        }
                    },
                    hotLeads: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $and: [{ $gte: ["$followUps.date", startDate] }, { $lte: ["$followUps.date", endDate] }] },
                                        { $in: ["$leadType", ["HOT LEAD", "ADMISSION TAKEN"]] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    name: "$_id",
                    calls: "$currentCalls",
                    currentCalls: 1,
                    previousCalls: 1,
                    hotLeads: 1,
                    _id: 0
                }
            },
            { $sort: { currentCalls: -1 } }
        ]);

        // Fetch all telecallers to ensure everyone is included, even with 0 activity
        const telecallers = await User.find({ role: { $regex: /telecaller/i } })
            .select('name profileImage centres redFlags mobNum role')
            .populate('centres', 'centreName');

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const enrichedData = await Promise.all(
            telecallers.map(async (user) => {
                // Find matching aggregation data
                const stats = performanceData.find(item => item.name === user.name) || {
                    calls: 0,
                    currentCalls: 0,
                    previousCalls: 0,
                    hotLeads: 0
                };

                // Task Progress Logic (Daily Goal: 50 Calls)
                const completedToday = await LeadManagement.countDocuments({
                    "followUps.updatedBy": user.name,
                    "followUps.date": { $gte: todayStart }
                });

                const targetGoal = 50;
                const progress = Math.min(Math.round((completedToday / targetGoal) * 100), 100);

                return {
                    name: user.name,
                    calls: stats.calls,
                    currentCalls: stats.currentCalls,
                    previousCalls: stats.previousCalls,
                    hotLeads: stats.hotLeads,
                    profileImage: user.profileImage || null,
                    centerCount: user.centres?.length || 0,
                    centers: user.centres?.map(c => c.centreName) || [],
                    redFlags: user.redFlags || 0,
                    mobNum: user.mobNum || null,
                    role: user.role || 'Telecaller',
                    taskProgress: {
                        total: targetGoal,
                        completed: completedToday,
                        percent: progress
                    },
                    userId: user._id || null
                };
            })
        );

        // Sort by current calls descending
        enrichedData.sort((a, b) => b.currentCalls - a.currentCalls);

        res.status(200).json(enrichedData);
    } catch (error) {
        console.error("Error fetching all telecaller analytics:", error);
        res.status(500).json({ message: "Server error fetching summary analytics" });
    }
};
