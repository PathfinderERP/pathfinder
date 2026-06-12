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
                    warmLeads: { $sum: { $cond: [{ $eq: ["$leadType", "WARM LEAD"] }, 1, 0] } },
                    coldLeads: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                    neutralLeads: { $sum: { $cond: [{ $eq: ["$leadType", "NEUTRAL LEAD"] }, 1, 0] } },
                    invalidLeads: { $sum: { $cond: [{ $eq: ["$leadType", "INVALID LEAD"] }, 1, 0] } }
                }
            }
        ]);

        const summary = summaryArr[0] || { totalLeads: 0, hotLeads: 0, warmLeads: 0, coldLeads: 0, neutralLeads: 0, invalidLeads: 0 };

        // Telecaller Performance Aggregation (using baseQuery - respects current leadType filter)
        const aggregatedTelecallers = await LeadManagement.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: {
                        name: "$leadResponsibility",
                        centre: "$centre"
                    },
                    totalLeads: { $sum: 1 },
                    hotLeads: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                    warmLeads: { $sum: { $cond: [{ $eq: ["$leadType", "WARM LEAD"] }, 1, 0] } },
                    coldLeads: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                    neutralLeads: { $sum: { $cond: [{ $eq: ["$leadType", "NEUTRAL LEAD"] }, 1, 0] } },
                    invalidLeads: { $sum: { $cond: [{ $eq: ["$leadType", "INVALID LEAD"] }, 1, 0] } },
                    totalFollowUps: { $sum: { $size: { $ifNull: ["$followUps", []] } } }
                }
            }
        ]);

        // Resolve aggregated performance back to telecaller names (with centre name if duplicate)
        const activeUsers = await User.find({ isActive: true }).populate('centres');
        const telecallersMap = new Map();

        for (const item of aggregatedTelecallers) {
            const rawName = item._id?.name || "OPERATIVE_ANONYMOUS";
            const centreId = item._id?.centre;

            // Find matching active users by name
            const matchingUsers = activeUsers.filter(u => u.name?.trim()?.toLowerCase() === rawName.trim().toLowerCase());
            
            let displayName = rawName;
            if (matchingUsers.length > 1) {
                // Duplicate active user name exists! Match by centre.
                const matchingUser = matchingUsers.find(u => {
                    const uCentres = (u.centres || []).map(c => (c._id || c).toString());
                    return centreId && uCentres.includes(centreId.toString());
                });

                if (matchingUser) {
                    const centreDoc = matchingUser.centres?.find(c => c._id.toString() === centreId.toString());
                    const centreName = centreDoc ? (centreDoc.centreName || centreDoc.name) : "Unknown Centre";
                    displayName = `${matchingUser.name} (${centreName})`;
                } else if (centreId) {
                    const CentreSchema = (await import("../../models/Master_data/Centre.js")).default;
                    const centreDoc = await CentreSchema.findById(centreId).select('centreName');
                    if (centreDoc) {
                        displayName = `${rawName} (${centreDoc.centreName})`;
                    }
                }
            }

            if (telecallersMap.has(displayName)) {
                const existing = telecallersMap.get(displayName);
                existing.totalLeads += item.totalLeads;
                existing.hotLeads += item.hotLeads;
                existing.warmLeads += item.warmLeads;
                existing.coldLeads += item.coldLeads;
                existing.neutralLeads += item.neutralLeads;
                existing.invalidLeads = (existing.invalidLeads || 0) + item.invalidLeads;
                existing.totalFollowUps += item.totalFollowUps;
            } else {
                telecallersMap.set(displayName, {
                    _id: displayName,
                    totalLeads: item.totalLeads,
                    hotLeads: item.hotLeads,
                    warmLeads: item.warmLeads,
                    coldLeads: item.coldLeads,
                    neutralLeads: item.neutralLeads,
                    invalidLeads: item.invalidLeads,
                    totalFollowUps: item.totalFollowUps
                });
            }
        }

        const telecallers = Array.from(telecallersMap.values()).sort((a, b) => b.totalLeads - a.totalLeads);

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

