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
        } else if (req.user.role !== "superAdmin") {
            centreQuery = {
                _id: { $in: allowedCentreIds.length > 0 ? allowedCentreIds : ["__NONE__"] }
            };
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

                // Build per-week data — target proportional to actualDays / daysInMonth
                const weekData = weeks.map(week => {
                    // Proportional target for this calendar week
                    const weeklyTargetExclGST = daysInMonth > 0
                        ? (week.actualDays / daysInMonth) * monthlyTargetExclGST
                        : 0;
                    const weeklyTargetWithGST = weeklyTargetExclGST * 1.18;

                    let weekTotalWithGST  = 0;
                    let weekTotalExclGST  = 0;
                    let weekendTotalWithGST = 0;
                    let weekendTotalExclGST = 0;
                    let weekTargetWithGST = 0;
                    let weekendTargetWithGST = 0;
                    let weekdayTotalWithGST = 0;

                    const days = week.days.map(d => {
                        const dailyTargetWithGST = (monthlyTargetWithGST / daysInMonth);
                        if (d.isEmpty) {
                            return {
                                ...d,
                                achievedWithGST: 0,
                                achievedExclGST: 0,
                                targetWithGST: dailyTargetWithGST
                            };
                        }
                        const isDayFiltered = dayNameList && !dayNameList.includes(d.colName);
                        if (isDayFiltered) {
                             return { ...d, isHidden: true, achievedWithGST: 0, achievedExclGST: 0, targetWithGST: dailyTargetWithGST };
                        }

                        const achieved = dayMap[d.day] || { withGST: 0, exclGST: 0 };
                        
                        // If specifically selected dates, blur others? The user said "others will be blur" 
                        // so we pass isBlurred flag.
                        const isBlurred = dateList && !dateList.includes(d.day);

                        weekTotalWithGST  += achieved.withGST;
                        weekTotalExclGST  += achieved.exclGST;

                        if (d.isWeekend) {
                            weekendTotalWithGST += achieved.withGST;
                            weekendTotalExclGST += achieved.exclGST;
                            weekendTargetWithGST += dailyTargetWithGST;
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
                            targetWithGST: dailyTargetWithGST
                        };
                    });

                    const weekAchievementPct = weeklyTargetWithGST > 0
                        ? parseFloat(((weekTotalWithGST / weeklyTargetWithGST) * 100).toFixed(1))
                        : 0;

                    return {
                        weekNumber: week.weekNumber,
                        startDay: week.startDay,
                        endDay: week.endDay,
                        actualDays: week.actualDays,
                        daysInMonth, // Added for UI
                        weeklyTargetExclGST,
                        weeklyTargetWithGST,
                        weekendTargetWithGST,
                        weekTotalWithGST,
                        weekTotalExclGST,
                        weekendTotalWithGST,
                        weekendTotalExclGST,
                        weekdayTotalWithGST,
                        weekAchievementPct,
                        days
                    };
                });

                const totalAchievedWithGST = weekData.reduce((s, w) => s + w.weekTotalWithGST, 0);
                const totalAchievedExclGST = weekData.reduce((s, w) => s + w.weekTotalExclGST, 0);
                const totalWeekendWithGST  = weekData.reduce((s, w) => s + w.weekendTotalWithGST, 0);
                const overallPct = monthlyTargetWithGST > 0
                    ? parseFloat(((totalAchievedWithGST / monthlyTargetWithGST) * 100).toFixed(1))
                    : 0;

                return {
                    centreId: c._id,
                    centreName: c.centreName,
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
