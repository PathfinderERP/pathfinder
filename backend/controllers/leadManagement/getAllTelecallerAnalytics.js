import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getAllTelecallerAnalytics = async (req, res) => {
    try {
        const { fromDate, toDate, period = 'daily', centre, leadResponsibility } = req.query;

        // Date calculation
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const startOfYesterday = new Date(startOfDay.getTime() - 86400000);
        const endOfYesterday = new Date(endOfDay.getTime() - 86400000);
        const oldestHistoryDate = new Date(startOfDay.getTime() - 10 * 24 * 60 * 60 * 1000);
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

        let startDate = startOfDay;
        let endDate = endOfDay;
        let prevStartDate = startOfYesterday;
        let prevEndDate = endOfYesterday;

        if (period === 'weekly') {
            const tempDate = new Date(startOfDay);
            const day = tempDate.getDay();
            const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1);
            startDate = new Date(tempDate.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
            endDate = endOfDay;

            prevStartDate = new Date(startDate.getTime() - 7 * 86400000);
            prevEndDate = new Date(startDate.getTime() - 1);
        } else if (period === 'monthly') {
            startDate = startOfThisMonth;
            endDate = endOfDay;
            prevStartDate = startOfLastMonth;
            prevEndDate = endOfLastMonth;
        }

        if (fromDate) {
            startDate = new Date(fromDate);
            startDate.setHours(0, 0, 0, 0);
            // If custom range, previous period is the same duration before startDate
            if (toDate) {
                const rangeDiff = new Date(toDate).getTime() - startDate.getTime();
                prevStartDate = new Date(startDate.getTime() - rangeDiff - 1000);
                prevEndDate = new Date(startDate.getTime() - 1000);
            }
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

        // 2. Aggregate Data
        // Performance for history uses a 10-day buffer to ensure we catch enough data for UTC alignment
        const [historyAgg, statsAgg, admissionAgg, counselledAgg, trendsAgg] = await Promise.all([
            LeadManagement.aggregate([
                { $unwind: "$followUps" },
                { $match: { "followUps.date": { $gte: oldestHistoryDate } } },
                {
                    $group: {
                        _id: {
                            user: { $trim: { input: "$followUps.updatedBy" } },
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$followUps.date", timezone: "Asia/Kolkata" } }
                        },
                        count: { $sum: 1 }
                    }
                }
            ]),
            LeadManagement.aggregate([
                { $unwind: "$followUps" },
                { $match: { "followUps.date": { $gte: startOfLastMonth } } },
                {
                    $facet: {
                        current: [
                            { $match: { "followUps.date": { $gte: startDate, $lte: endDate } } },
                            { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
                        ],
                        previous: [
                            { $match: { "followUps.date": { $gte: prevStartDate, $lte: prevEndDate } } },
                            { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
                        ],
                        hot: [
                            { $match: { "followUps.status": "HOT LEAD" } },
                            { $group: { _id: { user: { $trim: { input: "$followUps.updatedBy" } }, lead: "$_id" } } },
                            { $group: { _id: "$_id.user", count: { $sum: 1 } } }
                        ],
                        today: [
                            { $match: { "followUps.date": { $gte: startOfDay, $lte: endOfDay } } },
                            { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
                        ],
                        yesterday: [
                            { $match: { "followUps.date": { $gte: startOfYesterday, $lte: endOfYesterday } } },
                            { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
                        ],
                        thisMonth: [
                            { $match: { "followUps.date": { $gte: startOfThisMonth, $lte: endDate } } },
                            { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
                        ],
                        lastMonth: [
                            { $match: { "followUps.date": { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
                            { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
                        ]
                    }
                }
            ]),
            Admission.aggregate([
                { $match: { admissionDate: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ]),
            LeadManagement.aggregate([
                { $match: { isCounseled: true, updatedAt: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: "$leadResponsibility", count: { $sum: 1 } } }
            ]),
            LeadManagement.aggregate([
                { $unwind: "$followUps" },
                { $match: { "followUps.date": { $gte: startOfYear } } },
                { $group: { _id: { $month: "$followUps.date" }, calls: { $sum: 1 } } }
            ])
        ]);

        const normalize = (val) => String(val || '').trim().toLowerCase();

        const perfMap = {};
        const getPerf = (idOrName) => {
            const key = normalize(idOrName);
            if (!perfMap[key]) perfMap[key] = { history: {}, current: 0, prev: 0, hot: 0, today: 0, yesterday: 0, counselled: 0, thisMonth: 0, lastMonth: 0 };
            return perfMap[key];
        };

        if (historyAgg) {
            historyAgg.forEach(h => {
                if (h._id && h._id.user) {
                    const p = getPerf(h._id.user);
                    p.history[h._id.date] = (p.history[h._id.date] || 0) + h.count;
                }
            });
        }

        if (statsAgg && statsAgg[0]) {
            const s0 = statsAgg[0];
            if (s0.current) s0.current.forEach(s => { if (s._id) getPerf(s._id).current += s.count; });
            if (s0.previous) s0.previous.forEach(s => { if (s._id) getPerf(s._id).prev += s.count; });
            if (s0.hot) s0.hot.forEach(s => { if (s._id) getPerf(s._id).hot += s.count; });
            if (s0.today) s0.today.forEach(s => { if (s._id) getPerf(s._id).today += s.count; });
            if (s0.yesterday) s0.yesterday.forEach(s => { if (s._id) getPerf(s._id).yesterday += s.count; });
            if (s0.thisMonth) s0.thisMonth.forEach(s => { if (s._id) getPerf(s._id).thisMonth += s.count; });
            if (s0.lastMonth) s0.lastMonth.forEach(s => { if (s._id) getPerf(s._id).lastMonth += s.count; });
        }

        if (counselledAgg) {
            counselledAgg.forEach(c => { if (c._id) getPerf(c._id).counselled += c.count; });
        }

        const admissionCounts = {};
        if (admissionAgg) {
            admissionAgg.forEach(a => {
                if (a._id) admissionCounts[a._id.toString()] = a.count;
            });
        }

        // Generate day list for the last 5 days
        const last5DaysList = [];
        for (let i = 0; i < 5; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            last5DaysList.push(`${year}-${month}-${day}`);
        }

        const finalTelecallers = await Promise.all(telecallers.map(async (u) => {
            const nameKey = normalize(u.name);
            const idKey = normalize(u._id);

            // Merge data from both name and ID variations
            const namePerf = perfMap[nameKey] || { history: {}, current: 0, prev: 0, hot: 0 };
            const idPerf = perfMap[idKey] || { history: {}, current: 0, prev: 0, hot: 0 };

            const todayStr = last5DaysList[0];
            const yesterdayStr = last5DaysList[1];

            const combinedHistory = { ...namePerf.history, ...idPerf.history };
            const currentCalls = namePerf.current + idPerf.current;
            const prevCalls = namePerf.prev + idPerf.prev;
            const hotLeads = namePerf.hot + idPerf.hot;
            const admissions = admissionCounts[u._id.toString()] || 0;
            const todayCalls = combinedHistory[todayStr] || 0;
            const yesterdayCalls = combinedHistory[yesterdayStr] || 0;
            const thisMonthCalls = namePerf.thisMonth + idPerf.thisMonth;
            const lastMonthCalls = namePerf.lastMonth + idPerf.lastMonth;
            const counselledCount = namePerf.counselled + idPerf.counselled;

            let totalPoints = 0;
            const resetDate = u.performanceResetDate ? new Date(u.performanceResetDate) : null;

            const isCounsellor = u.role?.toLowerCase() === 'counsellor';
            const callTarget = isCounsellor ? 30 : 50;
            const admissionTarget = isCounsellor ? 5 : 0; // 5 per week for counsellors

            const history5Days = last5DaysList.map(dateStr => {
                const dayDate = new Date(dateStr);
                let count = combinedHistory[dateStr] || 0;
                if (resetDate) {
                    const normalizedResetDate = new Date(resetDate);
                    normalizedResetDate.setHours(0, 0, 0, 0);
                    if (dayDate < normalizedResetDate) {
                        count = 0;
                    }
                }

                const targetForDay = callTarget;
                const points = Math.min(12, Number(((count / targetForDay) * 12).toFixed(2)));
                const bonusPoints = count > targetForDay ? Number(((count - targetForDay) * 0.24).toFixed(2)) : 0;
                totalPoints += points + bonusPoints;
                return { date: dateStr, count, met: count >= targetForDay, points, bonusPoints };
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
                todayCalls,
                yesterdayCalls,
                thisMonthCalls,
                lastMonthCalls,
                counselledCount,
                admissions,
                hotLeads: hotLeads + admissions,
                conversions: hotLeads + admissions,
                targets: {
                    dailyCalls: callTarget,
                    weeklyAdmissions: admissionTarget
                },
                taskProgress: {
                    completed: Math.round(totalPoints),
                    total: 60,
                    percent: Math.min(100, Math.round((totalPoints / 60) * 100)),
                    history5Days,
                    dailyCalls: currentCalls
                }
            };
        }));

        // Trends calculation
        const admissionTrends = await Admission.aggregate([
            { $match: { admissionDate: { $gte: startOfYear } } },
            { $group: { _id: { $month: "$admissionDate" }, count: { $sum: 1 } } }
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trends = months.map((m, i) => {
            const monthIndex = i + 1;
            const monthCalls = trendsAgg.find(t => t._id === monthIndex)?.calls || 0;
            const monthAdmissions = admissionTrends.find(t => t._id === monthIndex)?.count || 0;
            return {
                month: m,
                leads: 0, // Not tracked per month in this view currently
                calls: monthCalls,
                admissions: monthAdmissions
            };
        });

        res.json({ performance: finalTelecallers, trends, admissionDetail: { bySource: [], byCenter: [] } });

    } catch (error) {
        console.error("Critical Analytics Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
