import LeadManagement from "../../models/LeadManagement.js";
import mongoose from "mongoose";

export const getTelecallerAnalytics = async (req, res) => {
    try {
        const { telecallerId } = req.params;
        const { fromDate, toDate, startTime, endTime } = req.query;
        const telecallerName = decodeURIComponent(telecallerId);

        // Build follow-up filter
        const followUpFilter = {};
        if (fromDate || toDate) {
            followUpFilter["followUps.date"] = {};
            if (fromDate) followUpFilter["followUps.date"].$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                followUpFilter["followUps.date"].$lte = end;
            }
        }

        const buildTimeMatch = () => {
            if (!startTime && !endTime) return {};

            const match = { $and: [] };
            if (startTime) {
                const [h, m] = startTime.split(':').map(Number);
                const startMinutes = h * 60 + (m || 0);
                match.$and.push({
                    $gte: [
                        { $add: [{ $multiply: [{ $hour: "$followUps.date" }, 60] }, { $minute: "$followUps.date" }] },
                        startMinutes - 330 // Adjusting for IST (UTC+5:30) if stored in UTC
                    ]
                });
            }
            if (endTime) {
                const [h, m] = endTime.split(':').map(Number);
                const endMinutes = h * 60 + (m || 0);
                match.$and.push({
                    $lte: [
                        { $add: [{ $multiply: [{ $hour: "$followUps.date" }, 60] }, { $minute: "$followUps.date" }] },
                        endMinutes - 330
                    ]
                });
            }
            return { $expr: match };
        };

        const timeMatch = buildTimeMatch();

        // 1. Lead Status Distribution
        const statusAggregation = await LeadManagement.aggregate([
            { $match: { leadResponsibility: { $regex: new RegExp(`^${telecallerName}$`, "i") } } },
            {
                $group: {
                    _id: "$leadType",
                    count: { $sum: 1 }
                }
            }
        ]);

        // 2. Feedback Analysis (from FollowUps)
        const feedbackAggregation = await LeadManagement.aggregate([
            { $match: { leadResponsibility: { $regex: new RegExp(`^${telecallerName}$`, "i") } } },
            { $unwind: "$followUps" },
            {
                $match: {
                    ...followUpFilter,
                    ...timeMatch
                }
            },
            {
                $group: {
                    _id: "$followUps.feedback",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // 3. Call Volume Analysis (from FollowUps instead of Recordings)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const callStats = await LeadManagement.aggregate([
            { $match: { leadResponsibility: { $regex: new RegExp(`^${telecallerName}$`, "i") } } },
            { $unwind: "$followUps" },
            {
                $facet: {
                    today: [
                        { $match: { "followUps.date": { $gte: today, $lt: tomorrow } } },
                        { $count: "count" }
                    ],
                    yesterday: [
                        { $match: { "followUps.date": { $gte: yesterday, $lte: endOfYesterday } } },
                        { $count: "count" }
                    ],
                    last7Days: [
                        { $match: { "followUps.date": { $gte: sevenDaysAgo } } },
                        { $count: "count" }
                    ],
                    last30Days: [
                        { $match: { "followUps.date": { $gte: thirtyDaysAgo } } },
                        { $count: "count" }
                    ],
                    trend: [
                        { $match: { "followUps.date": { $gte: thirtyDaysAgo } } },
                        {
                            $group: {
                                _id: { $dateToString: { format: "%Y-%m-%d", date: "$followUps.date" } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    // New segment for filtered counts
                    filtered: [
                        {
                            $match: {
                                ...followUpFilter,
                                ...timeMatch
                            }
                        },
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const calls = callStats[0] || { today: [], yesterday: [], last7Days: [], last30Days: [], trend: [] };

        // 4. Calculate "Accuracy" or "Positive Response Rate"
        const totalAssigned = await LeadManagement.countDocuments({ leadResponsibility: { $regex: new RegExp(`^${telecallerName}$`, "i") } });

        // Uncontacted: Leads with empty followUps array
        const uncontactedCount = await LeadManagement.countDocuments({
            leadResponsibility: telecallerName,
            followUps: { $size: 0 }
        });

        // Converted counts
        const hotLeadsTotal = await LeadManagement.countDocuments({
            leadResponsibility: { $regex: new RegExp(`^${telecallerName}$`, "i") },
            leadType: { $in: ['HOT LEAD', 'ADMISSION TAKEN'] }
        });

        // Calculate total follow-ups count
        const totalFollowUps = await LeadManagement.aggregate([
            { $match: { leadResponsibility: { $regex: new RegExp(`^${telecallerName}$`, "i") } } },
            { $project: { followUpsCount: { $size: "$followUps" } } },
            { $group: { _id: null, total: { $sum: "$followUpsCount" } } }
        ]);

        const totalFollowUpCount = totalFollowUps[0]?.total || 0;

        // "Accuracy" as (Hot Leads / Total Assigned Leads) * 100
        const accuracy = totalAssigned > 0 ? Math.round((hotLeadsTotal / totalAssigned) * 100) : 0;

        const analytics = {
            leadStatus: statusAggregation.map(s => ({ name: s._id || 'Unassigned', value: s.count })),
            feedbackAnalysis: feedbackAggregation.map(f => ({ name: f._id || 'No Feedback', value: f.count })),
            calls: {
                today: calls.today[0]?.count || 0,
                yesterday: calls.yesterday[0]?.count || 0,
                last7Days: calls.last7Days[0]?.count || 0,
                last30Days: calls.last30Days[0]?.count || 0,
                filtered: calls.filtered[0]?.count || 0,
                trend: calls.trend.map(t => ({ date: t._id, calls: t.count }))
            },
            performance: {
                totalAssigned,
                called: totalAssigned - uncontactedCount,
                remaining: uncontactedCount,
                conversionRate: accuracy,
                totalFollowUps: totalFollowUpCount
            }
        };

        res.status(200).json(analytics);

    } catch (error) {
        console.error("Error fetching telecaller analytics:", error);
        res.status(500).json({ message: "Server error fetching analytics" });
    }
};
