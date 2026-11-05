import CentreTarget from "../models/Sales/CentreTarget.js";
import CentreSchema from "../models/Master_data/Centre.js";
import Payment from "../models/Payment/Payment.js";
import Admission from "../models/Admission/Admission.js";

/**
 * Common pipeline stages that build revenueBase and effectiveCentre.
 * Applies early indexed/preliminary $match before $lookup stages to optimize performance.
 */
const buildRevenueBasePipeline = (minDate, maxDate) => [
    {
        $match: {
            billId: { $regex: /^PATH/i },
            status: { $in: ["PAID", "PARTIAL"] },
            $or: [
                { paidDate: { $gte: minDate, $lte: maxDate } },
                { chequeDate: { $gte: minDate, $lte: maxDate } },
                { receivedDate: { $gte: minDate, $lte: maxDate } },
                { createdAt: { $gte: minDate, $lte: maxDate } }
            ]
        }
    },
    {
        $addFields: {
            effectiveDate: {
                $ifNull: [
                    { $toDate: "$paidDate" },
                    { $toDate: "$chequeDate" },
                    { $toDate: "$receivedDate" },
                    "$createdAt"
                ]
            }
        }
    },
    {
        $match: {
            effectiveDate: { $gte: minDate, $lte: maxDate }
        }
    },
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
        $lookup: {
            from: "pntsestudents",
            localField: "admission",
            foreignField: "_id",
            as: "admissionInfoPntse"
        }
    },
    {
        $lookup: {
            from: "pmostudents",
            localField: "admission",
            foreignField: "_id",
            as: "admissionInfoPmo"
        }
    },
    {
        $addFields: {
            admissionDetails: {
                $ifNull: [
                    { $arrayElemAt: ["$admissionInfoNormal", 0] },
                    { $arrayElemAt: ["$admissionInfoBoard", 0] },
                    { $arrayElemAt: ["$admissionInfoPntse", 0] },
                    { $arrayElemAt: ["$admissionInfoPmo", 0] }
                ]
            }
        }
    },
    { $unwind: { path: "$admissionDetails", preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: "centreschemas",
            localField: "admissionDetails.centre",
            foreignField: "_id",
            as: "pntseCentreInfo"
        }
    },
    {
        $addFields: {
            effectiveCentre: {
                $ifNull: [
                    "$centre",
                    { $arrayElemAt: ["$pntseCentreInfo.centreName", 0] },
                    "$admissionDetails.centre"
                ]
            }
        }
    },
    {
        $addFields: {
            revenueBase: {
                $cond: {
                    if: { $regexMatch: { input: { $ifNull: ["$effectiveCentre", ""] }, regex: "phsps", options: "i" } },
                    then: "$paidAmount",
                    else: {
                        $cond: {
                            if: { $and: [{ $ne: ["$courseFee", null] }, { $gt: ["$courseFee", 0] }] },
                            then: "$courseFee",
                            else: {
                                $cond: {
                                    if: { $and: [{ $eq: ["$cgst", 0] }, { $eq: ["$sgst", 0] }] },
                                    then: "$paidAmount",
                                    else: { $divide: ["$paidAmount", 1.18] }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
];

/**
 * Calculates the total 'Target Achieved' for a specific Centre and Month.
 * 
 * @param {string} centreName - The name of the centre
 * @param {string} month - The month name (e.g. "December")
 * @param {number} year - The year (e.g. 2025)
 * @returns {number} The total achieved amount
 */
export const calculateCentreTargetAchieved = async (centreName, month, year, customStartDate = null, customEndDate = null) => {
    try {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const cleanMonth = (month || "").trim();
        const monthIndex = monthNames.indexOf(cleanMonth);

        if (monthIndex === -1) return { totalWithGST: 0, totalExclGST: 0 };

        // Check if the requested month/year is in the future
        const today = new Date();
        const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
        const parsedYear = parseInt(year, 10);
        const startOfRequestedMonth = new Date(parsedYear, monthIndex, 1).getTime();

        if (startOfRequestedMonth > startOfCurrentMonth) {
            return { totalWithGST: 0, totalExclGST: 0 };
        }

        let startOfMonth = new Date(year, monthIndex, 1);
        let endOfTargetMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        // If custom range is provided, clip the month boundaries safely in local coordinates
        if (typeof customStartDate === 'string' && customStartDate.includes('-')) {
            const parts = customStartDate.split('-');
            if (parts.length === 3) {
                const s = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 0, 0, 0, 0);
                if (s > startOfMonth) startOfMonth = s;
            }
        } else if (customStartDate) {
            const s = new Date(customStartDate);
            if (s > startOfMonth) startOfMonth = s;
        }

        if (typeof customEndDate === 'string' && customEndDate.includes('-')) {
            const parts = customEndDate.split('-');
            if (parts.length === 3) {
                const e = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 23, 59, 59, 999);
                if (e < endOfTargetMonth) endOfTargetMonth = e;
            }
        } else if (customEndDate) {
            const e = new Date(customEndDate);
            e.setHours(23, 59, 59, 999);
            if (e < endOfTargetMonth) endOfTargetMonth = e;
        }

        const result = await Payment.aggregate([
            ...buildRevenueBasePipeline(startOfMonth, endOfTargetMonth),
            {
                $match: {
                    effectiveCentre: { $regex: new RegExp(`^${(centreName || "").trim()}$`, 'i') }
                }
            },
            {
                $group: {
                    _id: null,
                    totalWithGST: { $sum: "$paidAmount" },
                    totalExclGST: { $sum: "$revenueBase" }
                }
            }
        ]);

        const totalWithGST = result.length > 0 ? result[0].totalWithGST : 0;
        const totalExclGST = result.length > 0 ? result[0].totalExclGST : 0;

        return { totalWithGST, totalExclGST };
    } catch (error) {
        console.error("Error calculating cumulative target achieved:", error);
        return { totalWithGST: 0, totalExclGST: 0 };
    }
};

/**
 * Calculates the total 'Target Achieved' for a specific Centre and Financial Year (Yearly View).
 * Calculated from April 1st of the start year until the minimum of (March 31st end year, current date).
 */
export const calculateCentreTargetAchievedYearly = async (centreName, financialYear) => {
    try {
        if (!financialYear || typeof financialYear !== 'string') return { totalWithGST: 0, totalExclGST: 0 };
        const parts = financialYear.split('-');
        if (parts.length !== 2) return { totalWithGST: 0, totalExclGST: 0 };

        const fyStartYear = parseInt(parts[0], 10);
        const startOfFY = new Date(fyStartYear, 3, 1); // April 1st

        const fyEndYear = parseInt(parts[1], 10);
        let endOfTarget = new Date(fyEndYear, 2, 31, 23, 59, 59, 999); // March 31st

        const now = new Date();
        if (now < endOfTarget) {
            endOfTarget = now;
        }

        const result = await Payment.aggregate([
            ...buildRevenueBasePipeline(startOfFY, endOfTarget),
            {
                $match: {
                    effectiveCentre: { $regex: new RegExp(`^${(centreName || "").trim()}$`, 'i') }
                }
            },
            {
                $group: {
                    _id: null,
                    totalWithGST: { $sum: "$paidAmount" },
                    totalExclGST: { $sum: "$revenueBase" }
                }
            }
        ]);

        const totalWithGST = result.length > 0 ? result[0].totalWithGST : 0;
        const totalExclGST = result.length > 0 ? result[0].totalExclGST : 0;

        return { totalWithGST, totalExclGST };
    } catch (error) {
        console.error("Error calculating yearly target achieved:", error);
        return { totalWithGST: 0, totalExclGST: 0 };
    }
};

/**
 * Calculates the 'Target Achieved' dynamically for multiple discrete months (Quarterly/Custom combinations).
 * Resolves each month to its precise calendar year using the financialYear string to avoid ambiguity.
 */
export const calculateCentreTargetAchievedMultiMonth = async (centreName, monthString, financialYear) => {
    try {
        if (!monthString || typeof monthString !== 'string') return { totalWithGST: 0, totalExclGST: 0 };
        if (!financialYear || typeof financialYear !== 'string') return { totalWithGST: 0, totalExclGST: 0 };
        
        const parts = financialYear.split('-');
        if (parts.length !== 2) return { totalWithGST: 0, totalExclGST: 0 };

        const fyStartYear = parseInt(parts[0], 10);
        const fyEndYear = parseInt(parts[1], 10);

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        
        const selectedMonths = monthString.split(',').map(m => m.trim()).filter(m => monthNames.includes(m));
        if (selectedMonths.length === 0) return { totalWithGST: 0, totalExclGST: 0 };

        // Determine earliest start and latest end for boundary filtering
        let minStart = null;
        let maxEnd = null;

        const dateMatches = selectedMonths.map(month => {
            const monthIndex = monthNames.indexOf(month);
            const calYear = monthIndex >= 3 ? fyStartYear : fyEndYear;
            const startM = new Date(calYear, monthIndex, 1);
            const endM = new Date(calYear, monthIndex + 1, 0, 23, 59, 59, 999);

            if (!minStart || startM < minStart) minStart = startM;
            if (!maxEnd || endM > maxEnd) maxEnd = endM;
            
            return {
                effectiveDate: {
                    $gte: startM,
                    $lte: endM
                }
            };
        });

        const result = await Payment.aggregate([
            ...buildRevenueBasePipeline(minStart, maxEnd),
            {
                $match: {
                    effectiveCentre: { $regex: new RegExp(`^${(centreName || "").trim()}$`, 'i') },
                    $or: dateMatches
                }
            },
            {
                $group: {
                    _id: null,
                    totalWithGST: { $sum: "$paidAmount" },
                    totalExclGST: { $sum: "$revenueBase" }
                }
            }
        ]);

        const totalWithGST = result.length > 0 ? result[0].totalWithGST : 0;
        const totalExclGST = result.length > 0 ? result[0].totalExclGST : 0;

        return { totalWithGST, totalExclGST };
    } catch (error) {
        console.error("Error calculating multi-month target achieved:", error);
        return { totalWithGST: 0, totalExclGST: 0 };
    }
};

/**
 * Updates the 'Target Achieved' for a specific Centre and Month based on a payment date.
 */
export const updateCentreTargetAchieved = async (centreName, paymentDateInput) => {
    try {
        if (!centreName) return;

        const paymentDate = new Date(paymentDateInput || Date.now());
        const year = paymentDate.getFullYear();
        const monthIndex = paymentDate.getMonth();
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const month = monthNames[monthIndex];

        const centreDoc = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${centreName.trim()}$`, 'i') } });
        if (!centreDoc) return;

        const targetRecord = await CentreTarget.findOne({
            centre: centreDoc._id,
            year: year,
            month: month
        });

        if (!targetRecord) return;

        const { totalWithGST, totalExclGST } = await calculateCentreTargetAchieved(centreName, month, year);
        targetRecord.achievedAmount = totalWithGST;
        targetRecord.achievedAmountWithGST = totalWithGST;
        targetRecord.achievedAmountExclGST = totalExclGST;
        await targetRecord.save();

    } catch (error) {
        console.error("Error updating centre target achievement:", error);
    }
};

export const getBatchAchievedForCentres = async (centreNames, startDate, endDate) => {
    try {
        const regexes = (centreNames || []).filter(Boolean).map(n => new RegExp(`^${n.trim()}$`, 'i'));
        const result = await Payment.aggregate([
            ...buildRevenueBasePipeline(startDate, endDate),
            {
                $match: {
                    effectiveCentre: { $in: regexes }
                }
            },
            {
                $group: {
                    _id: {
                        centre: "$effectiveCentre",
                        year: { $year: { date: "$effectiveDate", timezone: "+05:30" } },
                        month: { $month: { date: "$effectiveDate", timezone: "+05:30" } },
                        day: { $dayOfMonth: { date: "$effectiveDate", timezone: "+05:30" } }
                    },
                    totalWithGST: { $sum: "$paidAmount" },
                    totalExclGST: { $sum: "$revenueBase" }
                }
            }
        ]);
        return result;
    } catch (err) {
        console.error("Error in getBatchAchievedForCentres service:", err);
        return [];
    }
};

/**
 * High-performance batch aggregation for all centres across a single date range.
 * Used for Day-wise comparison to fetch all centres in ONE single aggregation query (< 200ms).
 * Returns: { [CENTRE_NAME_UPPER]: { totalWithGST, totalExclGST } }
 */
export const getBatchAchievedForDateRange = async (startDateInput, endDateInput) => {
    try {
        let startOfDay;
        let endOfDay;

        if (typeof startDateInput === 'string' && startDateInput.includes('-')) {
            const parts = startDateInput.split('T')[0].split('-').map(Number);
            startOfDay = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        } else if (startDateInput instanceof Date) {
            startOfDay = new Date(startDateInput.getFullYear(), startDateInput.getMonth(), startDateInput.getDate(), 0, 0, 0, 0);
        } else {
            startOfDay = new Date(startDateInput);
            startOfDay.setHours(0, 0, 0, 0);
        }

        if (typeof endDateInput === 'string' && endDateInput.includes('-')) {
            const parts = endDateInput.split('T')[0].split('-').map(Number);
            endOfDay = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
        } else if (endDateInput instanceof Date) {
            endOfDay = new Date(endDateInput.getFullYear(), endDateInput.getMonth(), endDateInput.getDate(), 23, 59, 59, 999);
        } else {
            endOfDay = new Date(endDateInput);
            endOfDay.setHours(23, 59, 59, 999);
        }

        const result = await Payment.aggregate([
            ...buildRevenueBasePipeline(startOfDay, endOfDay),
            {
                $group: {
                    _id: {
                        $toUpper: {
                            $trim: {
                                input: { $ifNull: ["$effectiveCentre", ""] }
                            }
                        }
                    },
                    totalWithGST: { $sum: "$paidAmount" },
                    totalExclGST: { $sum: "$revenueBase" }
                }
            }
        ]);

        const map = {};
        for (const r of result) {
            if (r._id) {
                map[r._id] = {
                    totalWithGST: r.totalWithGST || 0,
                    totalExclGST: r.totalExclGST || 0
                };
            }
        }
        return map;
    } catch (err) {
        console.error("Error in getBatchAchievedForDateRange:", err);
        return {};
    }
};

/**
 * High-performance batch aggregation for all centres and multiple months in a financial year.
 * Used for Month-wise & Year-wise comparison to fetch all centres & all months in ONE single query (< 300ms).
 * Returns: { [`${CENTRE_UPPER}_${MONTH_UPPER}`]: { totalWithGST, totalExclGST } }
 */
export const getBatchAchievedForYearOrMonths = async (financialYear, targetMonths) => {
    try {
        if (!financialYear || typeof financialYear !== 'string') return {};
        const parts = financialYear.split('-');
        if (parts.length !== 2) return {};

        const fyStartYear = parseInt(parts[0], 10);
        const fyEndYear = parseInt(parts[1], 10);

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const monthNames1Based = [
            "", "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const validMonths = (targetMonths || []).filter(m => monthNames.includes(m));
        if (validMonths.length === 0) return {};

        const today = new Date();
        const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

        let minStart = null;
        let maxEnd = null;

        for (const m of validMonths) {
            const mIdx = monthNames.indexOf(m);
            const calYear = mIdx >= 3 ? fyStartYear : fyEndYear;
            const startOfReq = new Date(calYear, mIdx, 1);
            if (startOfReq.getTime() > startOfCurrentMonth) {
                // Future month, skip querying payment
                continue;
            }
            const endOfReq = new Date(calYear, mIdx + 1, 0, 23, 59, 59, 999);

            if (!minStart || startOfReq < minStart) minStart = startOfReq;
            if (!maxEnd || endOfReq > maxEnd) maxEnd = endOfReq;
        }

        if (!minStart || !maxEnd) {
            // All requested months are in future
            return {};
        }

        const result = await Payment.aggregate([
            ...buildRevenueBasePipeline(minStart, maxEnd),
            {
                $addFields: {
                    effMonth: { $month: { date: "$effectiveDate", timezone: "+05:30" } },
                    effYear: { $year: { date: "$effectiveDate", timezone: "+05:30" } },
                    cleanCentre: { $toUpper: { $trim: { input: { $ifNull: ["$effectiveCentre", ""] } } } }
                }
            },
            {
                $group: {
                    _id: {
                        centre: "$cleanCentre",
                        month: "$effMonth",
                        year: "$effYear"
                    },
                    totalWithGST: { $sum: "$paidAmount" },
                    totalExclGST: { $sum: "$revenueBase" }
                }
            }
        ]);

        const map = {};
        for (const r of result) {
            if (r._id?.centre && r._id?.month) {
                const mName = monthNames1Based[r._id.month];
                if (mName) {
                    const key = `${r._id.centre}_${mName.toUpperCase()}`;
                    map[key] = {
                        totalWithGST: r.totalWithGST || 0,
                        totalExclGST: r.totalExclGST || 0
                    };
                }
            }
        }
        return map;
    } catch (err) {
        console.error("Error in getBatchAchievedForYearOrMonths:", err);
        return {};
    }
};
