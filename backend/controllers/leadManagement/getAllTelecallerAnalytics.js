import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getAllTelecallerAnalytics = async (req, res) => {
    try {
        const { fromDate, toDate, period = 'daily', centre, leadResponsibility } = req.query;

        // Calculate date range based on period
        let startDate, endDate;
        const now = new Date();

        if (period === 'daily') {
            startDate = new Date(new Date().setHours(0, 0, 0, 0));
            endDate = new Date(new Date().setHours(23, 59, 59, 999));
        } else if (period === 'weekly') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        }

        // Override with custom dates if provided
        if (fromDate) {
            startDate = new Date(fromDate);
            startDate.setHours(0, 0, 0, 0);
        }
        if (toDate) {
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
        }

        // Base filters for LeadManagement
        const leadFilters = {};

        // Centre-based access control
        const user = req.user;
        const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin";
        let allowedCentreIds = [];

        if (!isSuperAdmin) {
            // Non-superadmins can only see data from their assigned centres
            allowedCentreIds = (user.centres || []).map(id => id.toString());

            if (allowedCentreIds.length === 0) {
                // User has no centres assigned, return empty data
                return res.json({
                    performance: [],
                    trends: [],
                    admissionDetail: { bySource: [], byCenter: [] }
                });
            }

            // Apply centre filter
            if (centre) {
                // If specific centres requested, ensure they're in user's allowed list
                const requestedCentres = Array.isArray(centre) ? centre : [centre];
                const validCentres = requestedCentres.filter(id =>
                    allowedCentreIds.includes(id.toString())
                );

                if (validCentres.length > 0) {
                    leadFilters.centre = {
                        $in: validCentres.map(id =>
                            mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
                        )
                    };
                } else {
                    // Requested centres not in user's allowed list, use all allowed centres
                    leadFilters.centre = {
                        $in: allowedCentreIds.map(id =>
                            mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
                        )
                    };
                }
            } else {
                // No specific centre requested, use all allowed centres
                leadFilters.centre = {
                    $in: allowedCentreIds.map(id =>
                        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
                    )
                };
            }
        } else {
            // SuperAdmin - apply centre filter only if specified
            if (centre) {
                const requestedCentres = Array.isArray(centre) ? centre : [centre];
                leadFilters.centre = {
                    $in: requestedCentres.map(id =>
                        mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
                    )
                };
            }
        }

        if (leadResponsibility) {
            leadFilters.leadResponsibility = { $regex: new RegExp(`^${leadResponsibility}$`, "i") };
        }

        // Map Center IDs to Names for filtering the Admission collection
        let centreNames = [];
        if (leadFilters.centre) {
            const centreIdsToFetch = leadFilters.centre.$in;
            const centreDocs = await CentreSchema.find({ _id: { $in: centreIdsToFetch } });
            centreNames = centreDocs.map(c => c.centreName);
        }

        // 1. Fetch all counselors/telecallers
        const telecallers = await User.find({
            role: { $in: ['telecaller', 'counsellor', 'centralizedTelecaller', 'marketing'] }
        });

        // Pre-calculate the last 5 days dates for aggregation
        const last5Days = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            last5Days.push({
                dateStr: d.toISOString().split('T')[0],
                start: new Date(d),
                end: new Date(new Date(d).setHours(23, 59, 59, 999))
            });
        }
        const oldestDate = last5Days[4].start;

        // Aggregate follow-ups for the last 5 days for all relevant users in one go
        const historyAgg = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            { $match: { "followUps.date": { $gte: oldestDate } } },
            {
                $group: {
                    _id: {
                        name: "$followUps.updatedBy",
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$followUps.date" } }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Helper to get count for a specific user and date from the aggregation result
        const getHistoryCount = (userName, dateStr) => {
            const entry = historyAgg.find(h =>
                h._id.name.toLowerCase() === userName.toLowerCase() &&
                h._id.date === dateStr
            );
            return entry ? entry.count : 0;
        };

        // Group telecallers by name to handle duplicates
        const nameGroups = {};
        telecallers.forEach(u => {
            const lowerName = u.name.trim().toLowerCase();
            if (!nameGroups[lowerName]) nameGroups[lowerName] = { ids: [], names: [], docs: [] };
            nameGroups[lowerName].ids.push(u._id);
            nameGroups[lowerName].names.push(u.name);
            nameGroups[lowerName].docs.push(u);
        });

        // 2. Fetch performance data for each unique counselor name
        const finalTelecallers = await Promise.all(Object.entries(nameGroups).map(async ([lowerName, group]) => {
            const user = group.docs[0]; // Representative doc

            // Performance aggregation
            const stats = await LeadManagement.aggregate([
                { $unwind: "$followUps" },
                {
                    $facet: {
                        calls: [
                            { $match: { "followUps.updatedBy": { $in: group.names }, "followUps.date": { $gte: startDate, $lte: endDate } } },
                            { $count: "count" }
                        ],
                        prevCalls: [
                            { $match: { "followUps.updatedBy": { $in: group.names }, "followUps.date": { $lt: startDate } } },
                            { $count: "count" }
                        ],
                        conversions: [
                            {
                                $match: {
                                    "followUps.updatedBy": { $in: group.names },
                                    "followUps.date": { $gte: startDate, $lte: endDate },
                                    "followUps.status": { $in: ["HOT LEAD", "ADMISSION TAKEN"] }
                                }
                            },
                            { $group: { _id: "$_id" } }, // Unique leads
                            { $count: "count" }
                        ],
                        hotLeads: [
                            {
                                $match: {
                                    "followUps.updatedBy": { $in: group.names },
                                    "followUps.status": { $in: ["HOT LEAD", "ADMISSION TAKEN"] }
                                }
                            },
                            { $group: { _id: "$_id" } }, // Unique leads
                            { $count: "count" }
                        ]
                    }
                }
            ]);

            const s = stats[0] || {};

            // Count actual admissions across all accounts for this name
            const actualAdmissionsCount = await Admission.countDocuments({
                createdBy: { $in: group.ids },
                createdAt: { $gte: startDate, $lte: endDate }
            });

            const currentCalls = s.calls[0]?.count || 0;
            const admissions = (s.conversions[0]?.count || 0) + actualAdmissionsCount;

            // Calculate 5-day history and points
            let totalPoints = 0;
            const history5Days = last5Days.map(day => {
                const count = getHistoryCount(user.name, day.dateStr);
                // 12 points if goal (50) met, else proportional
                const points = Math.min(12, Number(((count / 50) * 12).toFixed(2)));
                totalPoints += points;
                return {
                    date: day.dateStr,
                    count: count,
                    met: count >= 50,
                    points: points
                };
            }).reverse(); // Show oldest to newest (last 5 days)

            return {
                _id: user._id,
                userId: user._id, // Add userId for frontend reference
                name: user.name,
                role: user.role,
                mobNum: user.mobNum,
                redFlags: user.redFlags || 0,
                profileImage: user.profileImage || null,
                centres: (await CentreSchema.find({ _id: { $in: user.centres || [] } })).map(c => ({ _id: c._id, centreName: c.centreName })),
                currentCalls,
                previousCalls: s.prevCalls[0]?.count || 0,
                hotLeads: (s.hotLeads[0]?.count || 0) + actualAdmissionsCount,
                conversions: admissions,
                admissions: admissions,
                taskProgress: {
                    completed: Math.round(totalPoints),
                    total: 60, // 12 points * 5 days = 60 points max
                    percent: Math.min(100, Math.round((totalPoints / 60) * 100)),
                    history5Days: history5Days,
                    dailyCalls: currentCalls
                }
            };
        }));

        // 3. Overall Trends & Analysis
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);

        const [marketingTrends, admissionTrends, counsellingTrends] = await Promise.all([
            LeadManagement.aggregate([
                { $match: { ...leadFilters, createdAt: { $gte: startOfYear } } },
                {
                    $group: {
                        _id: { $month: "$createdAt" },
                        leads: { $sum: 1 },
                        leadConversions: {
                            $sum: { $cond: [{ $in: ["$leadType", ["ADMISSION TAKEN", "HOT LEAD"]] }, 1, 0] }
                        }
                    }
                }
            ]),
            Admission.aggregate([
                { $match: { ...(centreNames.length > 0 ? { centre: { $in: centreNames } } : {}), createdAt: { $gte: startOfYear } } },
                { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } }
            ]),
            LeadManagement.aggregate([
                { $unwind: "$followUps" },
                { $match: { "followUps.date": { $gte: startOfYear } } },
                { $group: { _id: { $month: "$followUps.date" }, calls: { $sum: 1 } } }
            ])
        ]);

        const allMonthsTrends = months.map((month, index) => {
            const mTrend = marketingTrends.find(t => t._id === (index + 1)) || { leads: 0, leadConversions: 0 };
            const aTrend = admissionTrends.find(t => t._id === (index + 1)) || { count: 0 };
            const cTrend = counsellingTrends.find(t => t._id === (index + 1)) || { calls: 0 };
            return {
                month,
                leads: mTrend.leads,
                conversions: mTrend.leadConversions + aTrend.count,
                calls: cTrend.calls,
                admissions: mTrend.leadConversions + aTrend.count
            };
        });

        // 4. Source & Center Breakdown for Admissions
        const [leadAdmissions, directAdmissions] = await Promise.all([
            LeadManagement.find({ ...leadFilters, $or: [{ leadType: "ADMISSION TAKEN" }, { "followUps.status": "ADMISSION TAKEN" }], updatedAt: { $gte: startDate, $lte: endDate } }).select('source centre'),
            Admission.find({ ...(centreNames.length > 0 ? { centre: { $in: centreNames } } : {}), createdAt: { $gte: startDate, $lte: endDate } }).select('centre')
        ]);

        const sourceMap = {};
        const centerMap = {};

        leadAdmissions.forEach(l => {
            sourceMap[l.source || "Unknown"] = (sourceMap[l.source || "Unknown"] || 0) + 1;
        });
        [...leadAdmissions, ...directAdmissions].forEach(item => {
            centerMap[item.centre] = (centerMap[item.centre] || 0) + 1;
        });

        const bySource = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));
        if (directAdmissions.length > 0) bySource.push({ name: "Direct Admission", value: directAdmissions.length });

        const finalByCenter = await Promise.all(Object.entries(centerMap).map(async ([key, value]) => {
            if (mongoose.Types.ObjectId.isValid(key)) {
                const c = await CentreSchema.findById(key);
                return { name: c?.centreName || "Unknown", value };
            }
            return { name: key, value };
        }));

        res.json({
            performance: finalTelecallers,
            trends: allMonthsTrends,
            admissionDetail: {
                bySource,
                byCenter: finalByCenter
            }
        });

    } catch (error) {
        console.error("Error in getAllTelecallerAnalytics:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
