import mongoose from "mongoose";
import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";
import DailyTarget from "../../models/Sales/DailyTarget.js";
import { 
    calculateCentreTargetAchieved,
    getBatchAchievedForDateRange,
    getBatchAchievedForYearOrMonths
} from "../../services/centreTargetService.js";
import { getCentreDailyTargetsOnly } from "../../services/dailyCollectionService.js";

const standardMonths = [
    "April", "May", "June", "July", "August", "September", 
    "October", "November", "December", "January", "February", "March"
];

// Helper to determine calendar year based on month and financial year
const getYearForMonth = (financialYear, month) => {
    const parts = financialYear.split('-');
    const startYear = parseInt(parts[0], 10);
    const endYear = parseInt(parts[1], 10);
    
    const firstHalfMonths = ["April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (firstHalfMonths.includes(month)) {
        return startYear;
    } else {
        return endYear;
    }
};

export const getComparisonAnalysis = async (req, res) => {
    try {
        const { centreIds, zoneIds, months } = req.query;

        // 1. Get allowed centres based on permissions
        let allowedCentreIds = [];
        if (req.user.role !== 'superAdmin') {
            allowedCentreIds = (req.user.centres || []).map(id => id.toString());
        }

        let zoneCentreIds = null;
        if (zoneIds) {
            const Zone = mongoose.model("Zone");
            const rawZoneIds = typeof zoneIds === 'string' ? zoneIds.split(',') : zoneIds;
            const validZoneIds = rawZoneIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validZoneIds.length > 0) {
                const zoneDocs = await Zone.find({ _id: { $in: validZoneIds } }).select("centres").lean();
                zoneCentreIds = zoneDocs.flatMap(z => (z.centres || []).map(c => (c._id || c).toString()));
            }
        }

        let centreQuery = { status: { $ne: 'deactive' } };
        if (centreIds) {
            let requested = (typeof centreIds === 'string' ? centreIds.split(',') : centreIds).filter(Boolean);
            if (zoneCentreIds !== null) {
                requested = requested.filter(id => zoneCentreIds.includes(id));
            }
            if (req.user.role !== 'superAdmin') {
                const queryCentres = requested.filter(id => allowedCentreIds.includes(id));
                centreQuery._id = { $in: queryCentres.length > 0 ? queryCentres : [new mongoose.Types.ObjectId()] };
            } else {
                centreQuery._id = { $in: requested.length > 0 ? requested : [new mongoose.Types.ObjectId()] };
            }
        } else if (zoneCentreIds !== null) {
            let targetCentreIds = zoneCentreIds;
            if (req.user.role !== 'superAdmin') {
                targetCentreIds = targetCentreIds.filter(id => allowedCentreIds.includes(id));
            }
            centreQuery._id = { $in: targetCentreIds.length > 0 ? targetCentreIds : [new mongoose.Types.ObjectId()] };
        } else {
            // Exclude phsps, franchise, rkm by default
            centreQuery.centreName = { $nin: [/phsps/i, /franchise/i, /rkm/i] };
            if (req.user.role !== 'superAdmin') {
                centreQuery._id = { $in: allowedCentreIds };
            }
        }

        const centres = await Centre.find(centreQuery).sort({ centreName: 1 });

        // 2. Determine months to compare
        let targetMonths = standardMonths;
        if (months) {
            targetMonths = (typeof months === 'string' ? months.split(',') : months).filter(m => standardMonths.includes(m));
        }

        // 3. Fetch all target records for both financial years for these centres
        const targetRecords = await CentreTarget.find({
            centre: { $in: centres.map(c => c._id) },
            financialYear: { $in: ["2025-2026", "2026-2027"] },
            month: { $in: targetMonths }
        }).sort({ updatedAt: -1 }).lean();

        // 4. Batch calculate achievements for 2026-2027 for all requested months in ONE query
        const batchAchievedMap = await getBatchAchievedForYearOrMonths("2026-2027", targetMonths);

        // 5. Construct response grid and prepare bulk updates
        const data = [];
        const bulkUpdates = [];

        for (const centre of centres) {
            const centreKey = (centre.centreName || "").trim().toUpperCase();

            for (const month of targetMonths) {
                // Find 2025-2026 target record
                const rec2526 = targetRecords.find(t => 
                    t.centre.toString() === centre._id.toString() &&
                    t.financialYear === "2025-2026" &&
                    t.month === month
                );

                // Find 2026-2027 target record
                const rec2627 = targetRecords.find(t => 
                    t.centre.toString() === centre._id.toString() &&
                    t.financialYear === "2026-2027" &&
                    t.month === month
                );

                // Look up achievement from batch result
                const year2627 = getYearForMonth("2026-2027", month);
                const bucketKey = `${centreKey}_${month.trim().toUpperCase()}`;
                const achieved2627Result = batchAchievedMap[bucketKey] || { totalWithGST: 0, totalExclGST: 0 };

                // Queue background update for 2026-2027 target record if changed
                if (rec2627) {
                    if (rec2627.achievedAmountWithGST !== achieved2627Result.totalWithGST || 
                        rec2627.achievedAmountExclGST !== achieved2627Result.totalExclGST) {
                        bulkUpdates.push({
                            updateOne: {
                                filter: { _id: rec2627._id },
                                update: { $set: { 
                                    achievedAmount: achieved2627Result.totalWithGST,
                                    achievedAmountWithGST: achieved2627Result.totalWithGST,
                                    achievedAmountExclGST: achieved2627Result.totalExclGST 
                                }}
                            }
                        });
                    }
                }

                data.push({
                    centre: {
                        _id: centre._id,
                        centreName: centre.centreName
                    },
                    month,
                    // 2025-2026 Target and Achievement
                    target2526: rec2526 ? rec2526.targetAmount : 0,
                    achieved2526: rec2526 ? rec2526.achievedAmount : 0,
                    achievedWithGST2526: rec2526 ? (rec2526.achievedAmountWithGST || rec2526.achievedAmount) : 0,
                    achievedExclGST2526: rec2526 ? (rec2526.achievedAmountExclGST || (rec2526.achievedAmount / 1.18)) : 0,
                    targetId2526: rec2526 ? rec2526._id : null,
                    financialYear2526: rec2526 ? rec2526.financialYear : "2025-2026",
                    year2526: rec2526 ? rec2526.year : getYearForMonth("2025-2026", month),

                    // 2026-2027 Target and Achievement
                    target2627: rec2627 ? rec2627.targetAmount : 0,
                    achieved2627: achieved2627Result.totalWithGST,
                    achievedWithGST2627: achieved2627Result.totalWithGST,
                    achievedExclGST2627: achieved2627Result.totalExclGST,
                    targetId2627: rec2627 ? rec2627._id : null,
                    financialYear2627: rec2627 ? rec2627.financialYear : "2026-2027",
                    year2627: rec2627 ? rec2627.year : year2627
                });
            }
        }

        // Fire bulk updates asynchronously in background without blocking response
        if (bulkUpdates.length > 0) {
            CentreTarget.bulkWrite(bulkUpdates).catch(err => {
                console.error("Async bulkWrite error for CentreTarget:", err);
            });
        }

        res.status(200).json({ data });
    } catch (error) {
        console.error("Error in getComparisonAnalysis:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const saveComparisonManualData = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { centreId, month, targetAmount, achievedAmount }

        if (!Array.isArray(updates)) {
            return res.status(400).json({ message: "Invalid updates format. Expected array." });
        }

        const saved = [];

        for (const update of updates) {
            const { centreId, month, targetAmount, achievedAmount } = update;

            const year = getYearForMonth("2025-2026", month);

            // Find or create CentreTarget record for 2025-2026
            let record = await CentreTarget.findOne({
                centre: centreId,
                financialYear: "2025-2026",
                month,
                year
            });

            const parsedTarget = Number(targetAmount) || 0;
            const parsedAchieved = Number(achievedAmount) || 0;

            if (record) {
                record.targetAmount = parsedTarget;
                record.achievedAmount = parsedAchieved;
                record.achievedAmountWithGST = parsedAchieved;
                record.achievedAmountExclGST = parsedAchieved / 1.18;
                await record.save();
                saved.push(record);
            } else {
                record = new CentreTarget({
                    centre: centreId,
                    financialYear: "2025-2026",
                    year,
                    month,
                    targetAmount: parsedTarget,
                    achievedAmount: parsedAchieved,
                    achievedAmountWithGST: parsedAchieved,
                    achievedAmountExclGST: parsedAchieved / 1.18,
                    createdBy: req.user._id
                });
                await record.save();
                saved.push(record);
            }
        }

        res.status(200).json({ message: "Manual comparison targets and achievements saved successfully", data: saved });
    } catch (error) {
        console.error("Error in saveComparisonManualData:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * GET /sales/comparison-analysis/day-data
 * Returns per-centre for today:
 *   - currDayTarget  : today's actual DailyTarget.targetAmount (from daily tracking system)
 *   - currDayActual  : today's live achievement (via calculateCentreTargetAchieved)
 *   - prevYearMonthAchieved : last year same month achievement (for pro-rating display)
 *   - prevYearMonthTarget   : last year same month target
 *   - daysInMonth, todayDay : for pro-rating the previous year estimate in the frontend
 */
export const getDayWiseComparison = async (req, res) => {
    try {
        const { centreIds, zoneIds } = req.query;
        const startDateParam = req.query.startDate || req.query.fromDate || req.query.date;
        const endDateParam = req.query.endDate || req.query.toDate || req.query.date;

        const nowIST = new Date();
        const defaultISTStr = nowIST.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        const startISTStr = (startDateParam && typeof startDateParam === 'string' && startDateParam.trim())
            ? startDateParam.trim().split('T')[0]
            : defaultISTStr;
        const endISTStr = (endDateParam && typeof endDateParam === 'string' && endDateParam.trim())
            ? endDateParam.trim().split('T')[0]
            : startISTStr;

        const sDate = new Date(`${startISTStr}T12:00:00+05:30`);
        const eDate = new Date(`${endISTStr}T12:00:00+05:30`);
        const actualStart = sDate <= eDate ? startISTStr : endISTStr;
        const actualEnd = sDate <= eDate ? endISTStr : startISTStr;

        const startDateObj = new Date(`${actualStart}T12:00:00+05:30`);
        const endDateObj = new Date(`${actualEnd}T12:00:00+05:30`);

        const msPerDay = 24 * 60 * 60 * 1000;
        const daysInRange = Math.max(1, Math.round((new Date(actualEnd) - new Date(actualStart)) / msPerDay) + 1);

        const startDay = startDateObj.getDate();
        const endDay = endDateObj.getDate();
        const todayMonthName = startDateObj.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'long' });
        const todayYear = startDateObj.getFullYear();
        const daysInMonth = new Date(todayYear, startDateObj.getMonth() + 1, 0).getDate();

        // Build list of months covered by date range
        const monthsInRange = new Set();
        let curDate = new Date(startDateObj);
        while (curDate <= endDateObj) {
            monthsInRange.add(curDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'long' }));
            curDate.setDate(curDate.getDate() + 1);
        }
        const targetMonthsArray = Array.from(monthsInRange);

        // -- Build allowed centre list (same permission logic as getComparisonAnalysis) --
        let allowedCentreIds = [];
        if (req.user.role !== 'superAdmin') {
            allowedCentreIds = (req.user.centres || []).map(id => id.toString());
        }

        let centreQuery = { status: { $ne: 'deactive' } };
        if (centreIds) {
            let requested = (typeof centreIds === 'string' ? centreIds.split(',') : centreIds).filter(Boolean);
            if (req.user.role !== 'superAdmin') {
                requested = requested.filter(id => allowedCentreIds.includes(id));
            }
            centreQuery._id = { $in: requested.length > 0 ? requested : ['000000000000000000000000'] };
        } else if (zoneIds) {
            const Zone = (await import('../../models/Zone.js')).default;
            const rawZoneIds = typeof zoneIds === 'string' ? zoneIds.split(',') : zoneIds;
            const zoneDocs = await Zone.find({ _id: { $in: rawZoneIds } }).select('centres').lean();
            const zoneCIds = zoneDocs.flatMap(z => (z.centres || []).map(c => (c._id || c).toString()));
            let targetIds = zoneCIds;
            if (req.user.role !== 'superAdmin') targetIds = targetIds.filter(id => allowedCentreIds.includes(id));
            centreQuery._id = { $in: targetIds.length > 0 ? targetIds : ['000000000000000000000000'] };
            centreQuery.centreName = { $nin: [/phsps/i, /franchise/i, /rkm/i] };
        } else {
            centreQuery.centreName = { $nin: [/phsps/i, /franchise/i, /rkm/i] };
            if (req.user.role !== 'superAdmin') {
                centreQuery._id = { $in: allowedCentreIds };
            }
        }

        const centres = await Centre.find(centreQuery).sort({ centreName: 1 });

        // -- Fetch targets from Daily Collection module for this date range --
        let dailyCollectionTargets = {};
        try {
            dailyCollectionTargets = await getCentreDailyTargetsOnly({
                startDate: actualStart,
                endDate: actualEnd,
                date: actualEnd,
                centreIds
            });
        } catch (err) {
            console.error("Error fetching daily collection targets in getDayWiseComparison:", err);
        }

        // -- Fetch previous year's target and achievement from CentreTarget (FY 2025-2026) --
        const prevYearRecords = await CentreTarget.find({
            centre: { $in: centres.map(c => c._id) },
            financialYear: '2025-2026',
            month: { $in: targetMonthsArray }
        }).lean();

        const prevYearMap = {};
        prevYearRecords.forEach(r => {
            const cid = r.centre.toString();
            if (!prevYearMap[cid]) {
                prevYearMap[cid] = { target: 0, achievedExcl: 0 };
            }
            const hasAchieved = (r.achievedAmount && r.achievedAmount > 0);
            prevYearMap[cid].target += (r.targetAmount || 0);
            prevYearMap[cid].achievedExcl += (hasAchieved ? (r.achievedAmountExclGST || (r.achievedAmount / 1.18)) : 0);
        });

        // -- Fetch current year's month target from CentreTarget (FY 2026-2027) --
        const currYearRecords = await CentreTarget.find({
            centre: { $in: centres.map(c => c._id) },
            financialYear: '2026-2027',
            month: { $in: targetMonthsArray }
        }).lean();

        const currYearMap = {};
        currYearRecords.forEach(r => {
            const cid = r.centre.toString();
            if (!currYearMap[cid]) {
                currYearMap[cid] = { target: 0, achievedAmount: 0 };
            }
            currYearMap[cid].target += (r.targetAmount || 0);
            currYearMap[cid].achievedAmount += (r.achievedAmount || 0);
        });

        // -- Compute achievement for all centres across the date range in ONE fast batch aggregation --
        const batchAchievedDayMap = await getBatchAchievedForDateRange(actualStart, actualEnd);

        const data = [];
        for (const centre of centres) {
            const cid = centre._id.toString();

            const cleanName = (centre.centreName || "").trim().toLowerCase();
            const matchKey = Object.keys(dailyCollectionTargets).find(k => k.trim().toLowerCase() === cleanName);
            let currDayTarget = matchKey ? (dailyCollectionTargets[matchKey] || 0) : 0;

            const prev = prevYearMap[cid] || { target: 0, achievedExcl: 0 };
            const currMonth = currYearMap[cid] || { target: 0, achievedAmount: 0 };

            const centreKey = (centre.centreName || "").trim().toUpperCase();
            const achRes = batchAchievedDayMap[centreKey] || { totalWithGST: 0, totalExclGST: 0 };
            let currDayActual = achRes.totalExclGST || 0;

            if (currMonth.target === 0 && currMonth.achievedAmount === 0) {
                currDayTarget = 0;
                currDayActual = 0;
            }

            data.push({
                centre: { _id: centre._id, centreName: centre.centreName },
                todayDay: endDay,
                startDay,
                daysInMonth,
                daysInRange,
                monthName: todayMonthName,
                todayDateStr: actualEnd,
                startDateStr: actualStart,
                endDateStr: actualEnd,
                currDayTarget,
                currDayActual,
                prevYearMonthTarget: prev.target,
                prevYearMonthAchieved: prev.achievedExcl
            });
        }

        return res.status(200).json({
            data,
            daysInMonth,
            todayDay: endDay,
            startDay,
            daysInRange,
            monthName: todayMonthName,
            startDate: actualStart,
            endDate: actualEnd,
            date: actualEnd
        });
    } catch (error) {
        console.error('Error in getDayWiseComparison:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};