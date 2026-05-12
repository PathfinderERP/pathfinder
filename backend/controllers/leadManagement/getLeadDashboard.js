import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

export const getLeadDashboardStats = async (req, res) => {
    try {
        // Build base query using centralized helper
        const baseQuery = await buildLeadQuery(req.query, req.user);

        // For summary counts, we ignore the leadType filter to show the distribution
        const summaryQuery = { ...baseQuery };
        delete summaryQuery.leadType;

        // Total Counts Aggregation (using summaryQuery)
        const summaryArr = await LeadManagement.aggregate([
            { $match: summaryQuery },
            {
                $group: {
                    _id: null,
                    totalLeads: { $sum: 1 },
                    hotLeads: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                    coldLeads: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                    negativeLeads: { $sum: { $cond: [{ $eq: ["$leadType", "NEGATIVE"] }, 1, 0] } }
                }
            }
        ]);

        const summary = summaryArr[0] || { totalLeads: 0, hotLeads: 0, coldLeads: 0, negativeLeads: 0 };

        // Telecaller Performance Aggregation (using baseQuery - respects current leadType filter)
        const telecallers = await LeadManagement.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: "$leadResponsibility",
                    totalLeads: { $sum: 1 },
                    hotLeads: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                    coldLeads: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                    negativeLeads: { $sum: { $cond: [{ $eq: ["$leadType", "NEGATIVE"] }, 1, 0] } },
                    totalFollowUps: { $sum: { $size: { $ifNull: ["$followUps", []] } } }
                }
            },
            { $sort: { totalLeads: -1 } }
        ]);

        // Next Calls (Upcoming follow-ups)
        const nextCalls = await LeadManagement.find({
            ...baseQuery,
            nextFollowUpDate: { $gte: new Date() }
        })
            .populate('course', 'courseName')
            .sort({ nextFollowUpDate: 1 })
            .limit(20);

        // Daily Leads Trend (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const dailyLeads = await LeadManagement.aggregate([
            {
                $match: {
                    ...baseQuery,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing dates with 0
        const filledDailyLeads = [];
        for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const found = dailyLeads.find(item => item._id === dateStr);
            filledDailyLeads.push({
                date: dateStr,
                count: found ? found.count : 0
            });
        }

        res.status(200).json({
            summary,
            telecallers,
            nextCalls,
            dailyLeads: filledDailyLeads
        });

    } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

