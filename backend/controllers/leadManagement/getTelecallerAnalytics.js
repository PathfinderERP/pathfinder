import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getTelecallerAnalytics = async (req, res) => {
    try {
        const { telecallerId } = req.params;
        const { fromDate, toDate, startTime, endTime } = req.query;
        const telecallerNameFromUrl = decodeURIComponent(telecallerId);

        // VERY IMPORTANT: Find all user IDs matching this name to handle duplicates
        const telecallers = await User.find({
            name: { $regex: new RegExp(`^${telecallerNameFromUrl}$`, "i") }
        });
        const telecallerIds = telecallers.map(u => u._id);
        const telecallerNames = telecallers.map(u => u.name);

        if (telecallerNames.length === 0) {
            // Fallback to the name from URL if no user found in DB (unlikely but possible for legacy data)
            telecallerNames.push(telecallerNameFromUrl);
        }

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
                        startMinutes - 330 // IST adjustment
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
            { $match: { leadResponsibility: { $in: telecallerNames } } },
            { $group: { _id: "$leadType", count: { $sum: 1 } } }
        ]);

        // 2. Feedback Analysis
        const feedbackAggregation = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            {
                $match: {
                    "followUps.updatedBy": { $in: telecallerNames },
                    ...followUpFilter,
                    ...timeMatch
                }
            },
            { $group: { _id: "$followUps.feedback", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // 3. Call Volume Analysis
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday); endOfYesterday.setHours(23, 59, 59, 999);
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); thirtyDaysAgo.setHours(0, 0, 0, 0);

        const callStats = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            { $match: { "followUps.updatedBy": { $in: telecallerNames } } },
            {
                $facet: {
                    today: [{ $match: { "followUps.date": { $gte: today, $lt: tomorrow } } }, { $count: "count" }],
                    yesterday: [{ $match: { "followUps.date": { $gte: yesterday, $lte: endOfYesterday } } }, { $count: "count" }],
                    last7Days: [{ $match: { "followUps.date": { $gte: new Date(Date.now() - 7 * 86400000) } } }, { $count: "count" }],
                    last30Days: [{ $match: { "followUps.date": { $gte: thirtyDaysAgo } } }, { $count: "count" }],
                    trend: [
                        { $match: { "followUps.date": { $gte: thirtyDaysAgo } } },
                        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$followUps.date" } }, count: { $sum: 1 } } },
                        { $sort: { _id: 1 } }
                    ],
                    filtered: [{ $match: { ...followUpFilter, ...timeMatch } }, { $count: "count" }]
                }
            }
        ]);

        const calls = callStats[0] || { today: [], yesterday: [], last7Days: [], last30Days: [], trend: [] };

        // 4. Performance Metrics (CONVERSION IS KEY HERE)
        const totalAssigned = await LeadManagement.countDocuments({ leadResponsibility: { $in: telecallerNames } });
        const uncontactedCount = await LeadManagement.countDocuments({ leadResponsibility: { $in: telecallerNames }, followUps: { $size: 0 } });

        const followUpMetrics = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            { $match: { "followUps.updatedBy": { $in: telecallerNames } } },
            {
                $facet: {
                    totalFollowUps: [{ $count: "count" }],
                    hotLeadsAchieved: [
                        { $match: { "followUps.status": { $in: ["HOT LEAD", "ADMISSION TAKEN"] } } },
                        { $group: { _id: "$_id" } }, // Unique leads
                        { $count: "count" }
                    ]
                }
            }
        ]);

        const hotLeadsTotal = followUpMetrics[0]?.hotLeadsAchieved[0]?.count || 0;
        const totalFollowUpCount = followUpMetrics[0]?.totalFollowUps[0]?.count || 0;

        // COUNT ACTUAL ADMISSIONS (DIRECT & ENROLLMENT)
        const actualAdmissionsCount = await Admission.countDocuments({
            createdBy: { $in: telecallerIds },
            createdAt: { $gte: fromDate ? new Date(fromDate) : thirtyDaysAgo, $lte: toDate ? new Date(toDate) : new Date() }
        });

        const accuracy = totalAssigned > 0 ? Math.round(((hotLeadsTotal + actualAdmissionsCount) / totalAssigned) * 100) : 0;

        // 5. Detailed Admission Analysis for Charts
        const admissionFilter = {
            leadResponsibility: { $in: telecallerNames },
            $or: [{ leadType: "ADMISSION TAKEN" }, { "followUps.status": "ADMISSION TAKEN" }]
        };

        const [leadAdmissionsRaw, directAdmissionsRaw] = await Promise.all([
            LeadManagement.find(admissionFilter),
            Admission.find({
                createdBy: { $in: telecallerIds },
                createdAt: { $gte: fromDate ? new Date(fromDate) : thirtyDaysAgo, $lte: toDate ? new Date(toDate) : new Date() }
            })
        ]);

        const sourceMap = {};
        const centerMap = {};
        const trendMap = {};

        // Helper to populate trendMap for last 30 days with 0s
        for (let i = 0; i <= 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            trendMap[d.toISOString().split('T')[0]] = 0;
        }

        leadAdmissionsRaw.forEach(l => {
            sourceMap[l.source || "Unknown"] = (sourceMap[l.source || "Unknown"] || 0) + 1;
            centerMap[l.centre] = (centerMap[l.centre] || 0) + 1;
            const d = l.updatedAt.toISOString().split('T')[0];
            trendMap[d] = (trendMap[d] || 0) + 1;
        });

        directAdmissionsRaw.forEach(a => {
            sourceMap["Direct Admission"] = (sourceMap["Direct Admission"] || 0) + 1;
            centerMap[a.centre] = (centerMap[a.centre] || 0) + 1;
            const d = a.createdAt.toISOString().split('T')[0];
            trendMap[d] = (trendMap[d] || 0) + 1;
        });

        const bySource = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
        const byCenter = await Promise.all(Object.entries(centerMap).map(async ([key, value]) => {
            if (mongoose.Types.ObjectId.isValid(key)) {
                const c = await CentreSchema.findById(key);
                return { name: c?.centreName || "Unknown", value };
            }
            return { name: key, value };
        }));
        const trend = Object.entries(trendMap).sort().map(([date, admissions]) => ({ date, admissions }));

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
            },
            admissionDetail: {
                bySource,
                byCenter,
                trend
            }
        };

        res.status(200).json(analytics);

    } catch (error) {
        console.error("Error fetching telecaller analytics:", error);
        res.status(500).json({ message: "Server error fetching analytics" });
    }
};
