import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";
import Payment from "../../models/Payment/Payment.js";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

/**
 * Fetches daily payment totals for a given centre between startDate and endDate.
 * Returns an array grouped by day-of-month.
 */
const getDailyAchievedForCentre = async (centreName, startDate, endDate) => {
    try {
        const result = await Payment.aggregate([
            {
                $lookup: {
                    from: "admissions",
                    localField: "admission",
                    foreignField: "_id",
                    as: "admissionInfoNormal"
                }
            },
            {
                $lookup: {
                    from: "boardcourseadmissions",
                    localField: "admission",
                    foreignField: "_id",
                    as: "admissionInfoBoard"
                }
            },
            {
                $addFields: {
                    admissionDetails: {
                        $ifNull: [
                            { $arrayElemAt: ["$admissionInfoNormal", 0] },
                            { $arrayElemAt: ["$admissionInfoBoard", 0] }
                        ]
                    }
                }
            },
            { $unwind: "$admissionDetails" },
            {
                $match: {
                    "admissionDetails.centre": centreName,
                    billId: { $exists: true, $nin: [null, "", "-"] },
                    $or: [
                        { status: { $in: ["PAID", "PARTIAL", "PENDING_CLEARANCE", "REJECTED"] } },
                        { paymentMethod: { $exists: true } },
                        { paidAmount: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    effectiveDate: { $ifNull: ["$receivedDate", "$paidDate", "$createdAt"] },
                    revenueBase: {
                        $cond: [
                            { $gt: ["$courseFee", 0] },
                            "$courseFee",
                            { $divide: ["$paidAmount", 1.18] }
                        ]
                    }
                }
            },
            {
                $match: {
                    effectiveDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$effectiveDate" },
                        month: { $month: "$effectiveDate" },
                        day: { $dayOfMonth: "$effectiveDate" },
                        method: "$paymentMethod"
                    },
                    totalWithGST: { $sum: "$paidAmount" },
                    totalExclGST: { $sum: "$revenueBase" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]);
        return result;
    } catch (err) {
        console.error("getDailyAchievedForCentre error:", err);
        return [];
    }
};

/**
 * Build REAL calendar weeks (Mon → Sun) for a given month/year.
 *
 * Each week's `days` is always exactly 7 slots (Mon=col0 … Sun=col6).
 * Slots outside this month have isEmpty=true (padding cells).
 * `actualDays` = count of real days from this month in the week.
 *
 * Example – May 2026 (starts Friday):
 *   Week 1: [_, _, _, _, 1(Fri), 2(Sat), 3(Sun)]   → actualDays=3
 *   Week 2: [4, 5, 6, 7, 8, 9, 10]                 → actualDays=7
 *   …
 */
const buildWeeks = (year, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    // JS getDay(): 0=Sun, 1=Mon … 6=Sat  →  convert to Mon-based: Mon=0 … Sun=6
    const firstDowJS = new Date(year, monthIndex, 1).getDay();
    const firstMonOffset = (firstDowJS + 6) % 7; // Mon=0, Tue=1 … Sun=6

    const jsDay  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const colHdr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const weeks = [];
    let day = 1;
    let weekNum = 1;

    while (day <= daysInMonth) {
        const days = [];
        const startOffset = weekNum === 1 ? firstMonOffset : 0;

        // Leading empty padding for week 1
        for (let i = 0; i < startOffset; i++) {
            days.push({
                day: null, dayName: null,
                colName: colHdr[i],
                isWeekend: colHdr[i] === "Sat" || colHdr[i] === "Sun",
                isEmpty: true
            });
        }

        // Fill real days until Sunday (col 6) or end of month
        while (day <= daysInMonth && days.length < 7) {
            const date   = new Date(year, monthIndex, day);
            const dow    = date.getDay();
            const colIdx = days.length;
            days.push({
                day,
                dayName: jsDay[dow],
                colName: colHdr[colIdx],
                isWeekend: dow === 0 || dow === 6,
                isEmpty: false
            });
            day++;
        }

        // Trailing empty padding
        while (days.length < 7) {
            days.push({
                day: null, dayName: null,
                colName: colHdr[days.length],
                isWeekend: colHdr[days.length] === "Sat" || colHdr[days.length] === "Sun",
                isEmpty: true
            });
        }

        const actualDays = days.filter(d => !d.isEmpty).length;
        const startDay   = days.find(d => !d.isEmpty)?.day ?? null;
        const endDay     = [...days].reverse().find(d => !d.isEmpty)?.day ?? null;

        weeks.push({ weekNumber: weekNum, startDay, endDay, actualDays, days });
        weekNum++;
    }

    return weeks;
};

// GET /sales/weekly-target
export const getWeeklyTarget = async (req, res) => {
    try {
        const { month, year, centre, days: filterDays, paymentMethods, selectedDates } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: "Month and year are required" });
        }

        const monthIndex = monthNames.indexOf(month);
        if (monthIndex === -1) {
            return res.status(400).json({ message: "Invalid month name" });
        }

        const parsedYear  = parseInt(year, 10);
        const daysInMonth = new Date(parsedYear, monthIndex + 1, 0).getDate();
        const weeks       = buildWeeks(parsedYear, monthIndex);
        const numberOfWeeks = weeks.length;

        // --- Centre Access Control ---
        let allowedCentreIds = [];
        if (req.user.role !== "superAdmin") {
            allowedCentreIds = (req.user.centres || []).map(c => (c._id ? c._id.toString() : c.toString()));
        }

        let centreQuery = {};
        if (centre) {
            const requestedIds = centre.split(",").filter(Boolean);
            if (req.user.role !== "superAdmin") {
                const finalIds = requestedIds.filter(id => allowedCentreIds.includes(id));
                centreQuery = { _id: { $in: finalIds.length > 0 ? finalIds : ["__NONE__"] } };
            } else {
                centreQuery = { _id: { $in: requestedIds } };
            }
        } else {
            centreQuery = {
                centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] }
            };
            if (req.user.role !== "superAdmin") {
                centreQuery._id = { $in: allowedCentreIds.length > 0 ? allowedCentreIds : ["__NONE__"] };
            }
        }

        const centres = await Centre.find(centreQuery).sort({ centreName: 1 });

        const startOfMonth = new Date(parsedYear, monthIndex, 1);
        const endOfMonth   = new Date(parsedYear, monthIndex + 1, 0, 23, 59, 59, 999);

        // --- Process each centre ---
        const results = await Promise.all(
            centres.map(async (c) => {
                const targetRecord = await CentreTarget.findOne({
                    centre: c._id,
                    year: parsedYear,
                    month: month
                });

                const monthlyTargetExclGST = targetRecord ? targetRecord.targetAmount : 0;
                const monthlyTargetWithGST = monthlyTargetExclGST * 1.18;

                // Fetch all daily data for the month
                const dailyRaw = await getDailyAchievedForCentre(c.centreName, startOfMonth, endOfMonth);

                // Process filters: paymentMethods
                const methodList = paymentMethods ? paymentMethods.split(",") : null;
                const dateList = selectedDates ? selectedDates.split(",").map(Number) : null;
                const dayNameList = filterDays ? filterDays.split(",") : null;

                // day-keyed lookup map
                const dayMap = {};
                const methodBreakdown = {};

                dailyRaw.forEach(d => {
                    const dDay = d._id.day;
                    const dMethod = d._id.method || "OTHER";

                    // Global method breakdown (before day/date filters if we want overall analysis, 
                    // or after filters if we want specific analysis. User said "everything should work on the basis of the filters")
                    
                    // Filter check
                    if (methodList && !methodList.includes(dMethod)) return;
                    if (dateList && !dateList.includes(dDay)) return;

                    if (!dayMap[dDay]) dayMap[dDay] = { withGST: 0, exclGST: 0, methods: {} };
                    dayMap[dDay].withGST += d.totalWithGST || 0;
                    dayMap[dDay].exclGST += d.totalExclGST || 0;
                    
                    if (!dayMap[dDay].methods[dMethod]) dayMap[dDay].methods[dMethod] = 0;
                    dayMap[dDay].methods[dMethod] += d.totalWithGST || 0;

                    if (!methodBreakdown[dMethod]) methodBreakdown[dMethod] = 0;
                    methodBreakdown[dMethod] += d.totalWithGST || 0;
                });

                // Build per-week data — sequential loop so weekend deficit can carry forward
                const weekData = [];
                let carryoverToNextWeek = 0; // weekend deficit that rolls into next week's weekends

                for (const week of weeks) {
                    // Proportional target for this calendar week
                    const baseWeeklyTargetExclGST = daysInMonth > 0
                        ? (week.actualDays / daysInMonth) * monthlyTargetExclGST
                        : 0;

                    const overrideVal = targetRecord?.weeklyTargetsOverride?.[week.weekNumber];
                    const weeklyTargetExclGST = overrideVal !== undefined && overrideVal !== null
                        ? overrideVal
                        : baseWeeklyTargetExclGST;

                    const weeklyTargetWithGST = weeklyTargetExclGST * 1.18;

                    let weekTotalWithGST    = 0;
                    let weekTotalExclGST    = 0;
                    let weekendTotalWithGST = 0;
                    let weekendTotalExclGST = 0;
                    let weekendTargetWithGST = 0;
                    let weekdayTotalWithGST  = 0;

                    // ── Day composition flags ─────────────────────────────────────────
                    const actualWeekdayCount = week.days.filter(
                        d => !d.isEmpty && !['Sat', 'Sun'].includes(d.colName)
                    ).length;
                    const hasSat = week.days.some(d => !d.isEmpty && d.colName === 'Sat');
                    const hasSun = week.days.some(d => !d.isEmpty && d.colName === 'Sun');
                    const hasWeekdays = actualWeekdayCount > 0;
                    const hasWeekend  = hasSat || hasSun;

                    // 50/50 split — if partial week only has one type, give it 100%
                    const weekdayShare = hasWeekdays && hasWeekend ? 0.5 : (hasWeekdays ? 1.0 : 0.0);
                    const weekendShare = 1.0 - weekdayShare;

                    const perWeekdayTarget = actualWeekdayCount > 0
                        ? (weekdayShare * weeklyTargetWithGST) / actualWeekdayCount
                        : 0;

                    // Base weekend target (from this week's proportional share)
                    const baseWeekendTarget = weekendShare * weeklyTargetWithGST;

                    // Previous week's weekend deficit is added into this week's weekend
                    const prevWeekCarryover = carryoverToNextWeek;
                    const totalWeekendPool  = baseWeekendTarget + prevWeekCarryover;

                    // ── PASS 1: Weekday deficits ──────────────────────────────────────
                    let totalWeekdayDeficit = 0;
                    week.days.forEach(d => {
                        if (d.isEmpty || d.isWeekend || (dayNameList && !dayNameList.includes(d.colName))) return;
                        const achieved = dayMap[d.day] || { withGST: 0, exclGST: 0 };
                        totalWeekdayDeficit += Math.max(0, perWeekdayTarget - achieved.withGST);
                    });

                    // Total weekend pool = base + prev-week carryover + this-week weekday deficit
                    const totalAdjustedWeekendPool = totalWeekendPool + totalWeekdayDeficit;

                    // Split adjusted pool into Sat / Sun (40/60)
                    let satTarget = 0, sunTarget = 0;
                    if (hasSat && hasSun) {
                        satTarget = totalAdjustedWeekendPool * 0.40;
                        sunTarget = totalAdjustedWeekendPool * 0.60;
                    } else if (hasSat) {
                        satTarget = totalAdjustedWeekendPool;
                    } else if (hasSun) {
                        sunTarget = totalAdjustedWeekendPool;
                    }

                    // For display: carryover portion per day (from prev week)
                    const carryoverToSat = hasSat ? prevWeekCarryover * (hasSun ? 0.40 : 1.0) : 0;
                    const carryoverToSun = hasSun ? prevWeekCarryover * (hasSat ? 0.60 : 1.0) : 0;

                    // For display: this-week weekday deficit portion per day
                    const deficitToSat = hasSat ? totalWeekdayDeficit * (hasSun ? 0.40 : 1.0) : 0;
                    const deficitToSun = hasSun ? totalWeekdayDeficit * (hasSat ? 0.60 : 1.0) : 0;

                    // Base sat/sun targets before any adjustments
                    const baseSatTarget = hasSat ? baseWeekendTarget * (hasSun ? 0.40 : 1.0) : 0;
                    const baseSunTarget = hasSun ? baseWeekendTarget * (hasSat ? 0.60 : 1.0) : 0;

                    // ── PASS 2: Build day objects ─────────────────────────────────────
                    const days = week.days.map(d => {
                        let baseTargetWithGST;
                        let adjustedTargetWithGST;
                        let deficitAddedToWeekend = 0;
                        let carryoverFromPrevWeek  = 0;

                        if (d.colName === 'Sat') {
                            baseTargetWithGST      = baseSatTarget;
                            adjustedTargetWithGST  = satTarget;
                            deficitAddedToWeekend  = deficitToSat;
                            carryoverFromPrevWeek  = carryoverToSat;
                        } else if (d.colName === 'Sun') {
                            baseTargetWithGST      = baseSunTarget;
                            adjustedTargetWithGST  = sunTarget;
                            deficitAddedToWeekend  = deficitToSun;
                            carryoverFromPrevWeek  = carryoverToSun;
                        } else {
                            baseTargetWithGST      = perWeekdayTarget;
                            adjustedTargetWithGST  = perWeekdayTarget;
                        }

                        if (d.isEmpty) {
                            return {
                                ...d,
                                achievedWithGST: 0, achievedExclGST: 0,
                                targetWithGST: adjustedTargetWithGST,
                                baseTargetWithGST, deficit: 0,
                                deficitAddedToWeekend: 0, carryoverFromPrevWeek: 0
                            };
                        }

                        const isDayFiltered = dayNameList && !dayNameList.includes(d.colName);
                        if (isDayFiltered) {
                            return {
                                ...d, isHidden: true,
                                achievedWithGST: 0, achievedExclGST: 0,
                                targetWithGST: adjustedTargetWithGST,
                                baseTargetWithGST, deficit: 0,
                                deficitAddedToWeekend: 0, carryoverFromPrevWeek: 0
                            };
                        }

                        const achieved  = dayMap[d.day] || { withGST: 0, exclGST: 0 };
                        const isBlurred = dateList && !dateList.includes(d.day);
                        const dayDeficit = d.isWeekend
                            ? 0
                            : Math.max(0, perWeekdayTarget - achieved.withGST);

                        weekTotalWithGST += achieved.withGST;
                        weekTotalExclGST += achieved.exclGST;

                        if (d.isWeekend) {
                            weekendTotalWithGST  += achieved.withGST;
                            weekendTotalExclGST  += achieved.exclGST;
                            weekendTargetWithGST += adjustedTargetWithGST;
                        } else {
                            weekdayTotalWithGST += achieved.withGST;
                        }

                        return {
                            day: d.day,
                            dayName: d.dayName,
                            colName: d.colName,
                            isWeekend: d.isWeekend,
                            isEmpty: false,
                            isBlurred,
                            achievedWithGST: achieved.withGST,
                            achievedExclGST: achieved.exclGST,
                            targetWithGST: adjustedTargetWithGST,  // adjusted total target
                            baseTargetWithGST,                      // original share before adjustments
                            deficit: dayDeficit,                    // weekday shortfall (for weekday cells)
                            deficitAddedToWeekend,                  // weekday deficit rolled into this weekend cell
                            carryoverFromPrevWeek                   // prev-week weekend deficit carried into this cell
                        };
                    });

                    // ── Compute weekend deficit to carry to next week ─────────────────
                    const totalWeekendAchieved = weekendTotalWithGST;
                    const totalAdjustedWeekendTarget = satTarget + sunTarget;
                    const weekendDeficit = Math.max(0, totalAdjustedWeekendTarget - totalWeekendAchieved);
                    carryoverToNextWeek = weekendDeficit; // will be picked up by next iteration

                    const weekAchievementPct = weeklyTargetWithGST > 0
                        ? parseFloat(((weekTotalWithGST / weeklyTargetWithGST) * 100).toFixed(1))
                        : 0;

                    weekData.push({
                        weekNumber: week.weekNumber,
                        startDay: week.startDay,
                        endDay: week.endDay,
                        actualDays: week.actualDays,
                        daysInMonth,
                        weeklyTargetExclGST,
                        weeklyTargetWithGST,
                        weekendTargetWithGST,
                        weekTotalWithGST,
                        weekTotalExclGST,
                        weekendTotalWithGST,
                        weekendTotalExclGST,
                        weekdayTotalWithGST,
                        weekAchievementPct,
                        weekendCarryoverIn: prevWeekCarryover,  // carried in from previous week
                        weekendCarryoverOut: weekendDeficit,    // will carry out to next week

                        days
                    });
                } // end for (const week of weeks)

                const totalAchievedWithGST = weekData.reduce((s, w) => s + w.weekTotalWithGST, 0);
                const totalAchievedExclGST = weekData.reduce((s, w) => s + w.weekTotalExclGST, 0);
                const totalWeekendWithGST  = weekData.reduce((s, w) => s + w.weekendTotalWithGST, 0);
                const overallPct = monthlyTargetWithGST > 0
                    ? parseFloat(((totalAchievedWithGST / monthlyTargetWithGST) * 100).toFixed(1))
                    : 0;

                return {
                    centreId: c._id,
                    centreName: c.centreName,
                    status: c.status,
                    monthlyTargetExclGST,
                    monthlyTargetWithGST,
                    daysInMonth,
                    numberOfWeeks,
                    totalAchievedWithGST,
                    totalAchievedExclGST,
                    totalWeekendWithGST,
                    overallPct,
                    methodBreakdown,
                    weeks: weekData
                };
            })
        );

        res.status(200).json({
            month,
            year: parsedYear,
            daysInMonth,
            numberOfWeeks,
            centres: results
        });
    } catch (error) {
        console.error("getWeeklyTarget Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * Build FIXED 7-day week periods for a given month/year.
 * Week 1: days 1-7
 * Week 2: days 8-14
 * Week 3: days 15-21
 * Week 4: days 22-28
 * Week 5: days 29-end (only if daysInMonth > 28)
 */
const buildFixedWeeks = (year, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const periods = [
        { weekNumber: 1, start: 1,  end: 7  },
        { weekNumber: 2, start: 8,  end: 14 },
        { weekNumber: 3, start: 15, end: 21 },
        { weekNumber: 4, start: 22, end: 28 },
    ];

    if (daysInMonth > 28) {
        periods.push({ weekNumber: 5, start: 29, end: daysInMonth });
    }

    return periods
        .filter(p => p.start <= daysInMonth)
        .map(p => {
            const actualEnd = Math.min(p.end, daysInMonth);
            const days = [];
            for (let d = p.start; d <= actualEnd; d++) {
                const date = new Date(year, monthIndex, d);
                const dow  = date.getDay(); // 0=Sun … 6=Sat
                days.push({
                    day:       d,
                    dayName:   dayNames[dow],
                    isWeekend: dow === 0 || dow === 6,
                    isEmpty:   false
                });
            }
            return {
                weekNumber: p.weekNumber,
                startDay:   p.start,
                endDay:     actualEnd,
                actualDays: days.length,
                days
            };
        });
};

// GET /sales/final-weekend-target
export const getFinalWeekendTarget = async (req, res) => {
    try {
        const { month, year, centre } = req.query;

        if (!month || !year) {
            return res.status(400).json({ message: "Month and year are required" });
        }

        const monthIndex = monthNames.indexOf(month);
        if (monthIndex === -1) {
            return res.status(400).json({ message: "Invalid month name" });
        }

        const parsedYear  = parseInt(year, 10);
        const daysInMonth = new Date(parsedYear, monthIndex + 1, 0).getDate();
        const fixedWeeks  = buildFixedWeeks(parsedYear, monthIndex);

        // --- Centre Access Control ---
        let allowedCentreIds = [];
        if (req.user.role !== "superAdmin") {
            allowedCentreIds = (req.user.centres || []).map(c =>
                c._id ? c._id.toString() : c.toString()
            );
        }

        let centreQuery = {};
        if (centre) {
            const requestedIds = centre.split(",").filter(Boolean);
            if (req.user.role !== "superAdmin") {
                const finalIds = requestedIds.filter(id => allowedCentreIds.includes(id));
                centreQuery = { _id: { $in: finalIds.length > 0 ? finalIds : ["__NONE__"] } };
            } else {
                centreQuery = { _id: { $in: requestedIds } };
            }
        } else {
            centreQuery = {
                centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] }
            };
            if (req.user.role !== "superAdmin") {
                centreQuery._id = { $in: allowedCentreIds.length > 0 ? allowedCentreIds : ["__NONE__"] };
            }
        }

        const centres      = await Centre.find(centreQuery).sort({ centreName: 1 });
        const startOfMonth = new Date(parsedYear, monthIndex, 1);
        const endOfMonth   = new Date(parsedYear, monthIndex + 1, 0, 23, 59, 59, 999);

        const results = await Promise.all(
            centres.map(async (c) => {
                const targetRecord = await CentreTarget.findOne({
                    centre: c._id,
                    year:   parsedYear,
                    month:  month
                });

                const monthlyTargetExclGST = targetRecord ? targetRecord.targetAmount : 0;

                // Fetch raw daily totals for the month
                const dailyRaw = await getDailyAchievedForCentre(
                    c.centreName, startOfMonth, endOfMonth
                );

                // Build day-keyed map: { dayNum -> { exclGST } }
                const dayMap = {};
                dailyRaw.forEach(d => {
                    const dDay = d._id.day;
                    if (!dayMap[dDay]) dayMap[dDay] = { exclGST: 0 };
                    dayMap[dDay].exclGST += d.totalExclGST || 0;
                });

                let totalAchievedExclGST = 0;
                let totalWeekendExclGST  = 0;
                let carryoverShortfall = 0;

                const weekData = [];
                for (const week of fixedWeeks) {
                    // Proportional target for this week's days
                    const basePhaseTarget = daysInMonth > 0
                        ? (week.actualDays / daysInMonth) * monthlyTargetExclGST
                        : 0;

                    // Add weekly shortfall from previous week
                    let phaseTarget = basePhaseTarget + carryoverShortfall;

                    const overrideVal = targetRecord?.weeklyTargetsOverride?.[week.weekNumber];
                    if (overrideVal !== undefined && overrideVal !== null) {
                        phaseTarget = overrideVal;
                    }

                    const workingTarget    = phaseTarget * 0.35;
                    const baseWeekendTarget = phaseTarget * 0.65;

                    let phaseAchieved   = 0;
                    let weekendAchieved = 0;
                    let workingAchieved = 0;
                    let satAchieved     = 0;
                    let sunAchieved     = 0;

                    week.days.forEach(d => {
                        const achieved = dayMap[d.day]?.exclGST || 0;
                        phaseAchieved += achieved;
                        if (d.isWeekend) {
                            weekendAchieved += achieved;
                            if (d.dayName === 'Sat') satAchieved += achieved;
                            if (d.dayName === 'Sun') sunAchieved += achieved;
                        }
                        else {
                            workingAchieved += achieved;
                        }
                    });

                    totalAchievedExclGST += phaseAchieved;
                    totalWeekendExclGST  += weekendAchieved;

                    const workingDeficit        = Math.max(0, workingTarget - workingAchieved);
                    const adjustedWeekendTarget = baseWeekendTarget;
                    
                    const satTarget = adjustedWeekendTarget * 0.35;
                    const sunTarget = adjustedWeekendTarget * 0.65;
                    const satDeficit = Math.max(0, satTarget - satAchieved);
                    const sunDeficit = Math.max(0, sunTarget - sunAchieved);

                    const weekendDeficit        = Math.max(0, adjustedWeekendTarget - weekendAchieved);
                    
                    // The weekly shortfall of this week:
                    const phaseShortfall = Math.max(0, phaseTarget - phaseAchieved);
                    carryoverShortfall = phaseShortfall;

                    const pct = phaseTarget > 0
                        ? parseFloat(((phaseAchieved / phaseTarget) * 100).toFixed(1))
                        : 0;

                    weekData.push({
                        weekNumber:             week.weekNumber,
                        startDay:               week.startDay,
                        endDay:                 week.endDay,
                        actualDays:             week.actualDays,
                        phaseTarget,
                        workingTarget,
                        baseWeekendTarget,
                        workingAchieved,
                        workingDeficit,
                        weekendAchieved,
                        adjustedWeekendTarget,
                        weekendDeficit,
                        satTarget,
                        satAchieved,
                        satDeficit,
                        sunTarget,
                        sunAchieved,
                        sunDeficit,
                        phaseAchieved,
                        pct
                    });
                }

                return {
                    centreId:              c._id,
                    centreName:            c.centreName,
                    status:                c.status,
                    monthlyTargetExclGST,
                    daysInMonth,
                    numberOfWeeks:         fixedWeeks.length,
                    totalAchievedExclGST,
                    totalWeekendExclGST,
                    overallPct: monthlyTargetExclGST > 0
                        ? parseFloat(((totalAchievedExclGST / monthlyTargetExclGST) * 100).toFixed(1))
                        : 0,
                    weeks: weekData
                };
            })
        );

        res.status(200).json({
            month,
            year:         parsedYear,
            daysInMonth,
            numberOfWeeks: fixedWeeks.length,
            centres:       results
        });
    } catch (error) {
        console.error("getFinalWeekendTarget Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// POST /sales/weekly-target/override
export const overrideWeeklyTarget = async (req, res) => {
    try {
        const userRoleLower = req.user?.role?.toLowerCase()?.replace(/\s+/g, '') || "";
        if (userRoleLower !== "superadmin" && userRoleLower !== "zonalmanager") {
            return res.status(403).json({ message: "Access denied. Only Super Admin and Zonal Manager can edit weekly targets." });
        }

        const { centreId, year, month, weekNumber, target } = req.body;

        if (!centreId || !year || !month || !weekNumber || target === undefined) {
            return res.status(400).json({ message: "Missing required fields: centreId, year, month, weekNumber, target" });
        }

        const targetRecord = await CentreTarget.findOne({
            centre: centreId,
            year: parseInt(year, 10),
            month: month
        });

        if (!targetRecord) {
            return res.status(404).json({ message: "Centre target record not found. Configure monthly target first." });
        }

        if (!targetRecord.weeklyTargetsOverride) {
            targetRecord.weeklyTargetsOverride = {};
        }

        targetRecord.weeklyTargetsOverride = {
            ...targetRecord.weeklyTargetsOverride,
            [weekNumber]: parseFloat(target)
        };

        targetRecord.markModified("weeklyTargetsOverride");
        await targetRecord.save();

        res.status(200).json({ message: "Weekly target updated successfully", weeklyTargetsOverride: targetRecord.weeklyTargetsOverride });
    } catch (error) {
        console.error("overrideWeeklyTarget Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
