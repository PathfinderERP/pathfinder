import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getAllTelecallerAnalytics = async (req, res) => {
    try {
        const { fromDate, toDate, period = 'daily', centre, leadResponsibility } = req.query;

        // Date calculation
        let startDate, endDate;
        const now = new Date();

        if (period === 'daily') {
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
        } else if (period === 'weekly') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        } else {
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
        }

        if (fromDate) {
            startDate = new Date(fromDate);
            startDate.setHours(0, 0, 0, 0);
        }
        if (toDate) {
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
        }

        // Filters
        const leadFilters = {};
        const user = req.user;
        const isSuperAdmin = user.role?.toLowerCase() === "superadmin" || user.role?.toLowerCase() === "super admin";

        if (!isSuperAdmin) {
            const allowedCentreIds = (user.centres || []).map(id => id.toString());
            if (allowedCentreIds.length === 0) return res.json({ performance: [], trends: [], admissionDetail: { bySource: [], byCenter: [] } });

            if (centre) {
                const requested = Array.isArray(centre) ? centre : [centre];
                const valid = requested.filter(id => allowedCentreIds.includes(id.toString()));
                leadFilters.centre = { $in: (valid.length > 0 ? valid : allowedCentreIds).map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
            } else {
                leadFilters.centre = { $in: allowedCentreIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
            }
        } else if (centre) {
            const requested = Array.isArray(centre) ? centre : [centre];
            leadFilters.centre = { $in: requested.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        }

        if (leadResponsibility) {
            leadFilters.leadResponsibility = { $regex: new RegExp(`^${leadResponsibility}$`, "i") };
        }

        // 1. Fetch Users
        const telecallers = await User.find({
            role: { $in: ['telecaller', 'counsellor', 'centralizedTelecaller', 'marketing'] }
        });

        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 2. Aggregate Data
        // Performance for history uses a 10-day buffer to ensure we catch enough data for UTC alignment
        const oldestHistoryDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

        const [historyAgg, statsAgg, admissionAgg] = await Promise.all([
            LeadManagement.aggregate([
                { $unwind: "$followUps" },
                { $match: { "followUps.date": { $gte: oldestHistoryDate } } },
                {
                    $group: {
                        _id: {
                            user: { $trim: { input: "$followUps.updatedBy" } },
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$followUps.date" } }
                        },
                        count: { $sum: 1 }
                    }
                }
            ]),
            LeadManagement.aggregate([
                { $unwind: "$followUps" },
                { $match: { "followUps.date": { $gte: last30Days } } },
                {
                    $facet: {
                        current: [
                            { $match: { "followUps.date": { $gte: startDate, $lte: endDate } } },
                            { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
                        ],
                        previous: [
                            { $match: { "followUps.date": { $lt: startDate } } },
                            { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
                        ],
                        hot: [
                            { $match: { "followUps.status": { $in: ["HOT LEAD", "ADMISSION TAKEN"] } } },
                            { $group: { _id: { user: { $trim: { input: "$followUps.updatedBy" } }, lead: "$_id" } } },
                            { $group: { _id: "$_id.user", count: { $sum: 1 } } }
                        ]
                    }
                }
            ]),
            Admission.aggregate([
                { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ])
        ]);

        // Mapping Logic
        const normalize = (val) => String(val || '').trim().toLowerCase();

        // Build a lookup map for telecallers by all possible identifiers (name & id)
        const perfMap = {};
        const getPerf = (idOrName) => {
            const key = normalize(idOrName);
            if (!perfMap[key]) perfMap[key] = { history: {}, current: 0, prev: 0, hot: 0 };
            return perfMap[key];
        };

        historyAgg.forEach(h => {
            const p = getPerf(h._id.user);
            p.history[h._id.date] = (p.history[h._id.date] || 0) + h.count;
        });

        statsAgg[0].current.forEach(s => { getPerf(s._id).current += s.count; });
        statsAgg[0].previous.forEach(s => { getPerf(s._id).prev += s.count; });
        statsAgg[0].hot.forEach(s => { getPerf(s._id).hot += s.count; });

        const admissionCounts = {};
        admissionAgg.forEach(a => { admissionCounts[a._id.toString()] = a.count; });

        // Generate day list for the last 5 days
        const last5DaysList = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last5DaysList.push(d.toISOString().split('T')[0]);
        }

        const finalTelecallers = await Promise.all(telecallers.map(async (u) => {
            const nameKey = normalize(u.name);
            const idKey = normalize(u._id);

            // Merge data from both name and ID variations
            const namePerf = perfMap[nameKey] || { history: {}, current: 0, prev: 0, hot: 0 };
            const idPerf = perfMap[idKey] || { history: {}, current: 0, prev: 0, hot: 0 };

            const combinedHistory = { ...namePerf.history, ...idPerf.history };
            const currentCalls = namePerf.current + idPerf.current;
            const prevCalls = namePerf.prev + idPerf.prev;
            const hotLeads = namePerf.hot + idPerf.hot;
            const admissions = admissionCounts[u._id.toString()] || 0;

            let totalPoints = 0;
            const resetDate = u.performanceResetDate ? new Date(u.performanceResetDate) : null;

            const history5Days = last5DaysList.map(dateStr => {
                const dayDate = new Date(dateStr);
                // If resetDate is set and the day is before the reset, count is 0
                let count = combinedHistory[dateStr] || 0;
                if (resetDate) {
                    const normalizedResetDate = new Date(resetDate);
                    normalizedResetDate.setHours(0, 0, 0, 0);
                    if (dayDate < normalizedResetDate) {
                        count = 0;
                    }
                }

                const points = Math.min(12, Number(((count / 50) * 12).toFixed(2)));
                totalPoints += points;
                return { date: dateStr, count, met: count >= 50, points };
            }).reverse();

            return {
                _id: u._id,
                userId: u._id,
                name: u.name,
                role: u.role,
                mobNum: u.mobNum,
                redFlags: u.redFlags || 0,
                centres: (await CentreSchema.find({ _id: { $in: u.centres || [] } }).select('centreName')),
                currentCalls,
                previousCalls: prevCalls,
                hotLeads: hotLeads + admissions,
                conversions: hotLeads + admissions,
                taskProgress: {
                    completed: Math.round(totalPoints),
                    total: 60,
                    percent: Math.min(100, Math.round((totalPoints / 60) * 100)),
                    history5Days,
                    dailyCalls: currentCalls
                }
            };
        }));

        // Trends (simplified from previous logic)
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const [mTrends] = await Promise.all([
            LeadManagement.aggregate([
                { $match: { ...leadFilters, createdAt: { $gte: startOfYear } } },
                { $group: { _id: { $month: "$createdAt" }, leads: { $sum: 1 } } }
            ])
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trends = months.map((m, i) => ({ month: m, leads: mTrends.find(t => t._id === (i + 1))?.leads || 0, calls: 0, admissions: 0 }));

        res.json({ performance: finalTelecallers, trends, admissionDetail: { bySource: [], byCenter: [] } });

    } catch (error) {
        console.error("Critical Analytics Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
