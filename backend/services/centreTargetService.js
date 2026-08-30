import CentreTarget from "../models/Sales/CentreTarget.js";
import CentreSchema from "../models/Master_data/Centre.js";
import Payment from "../models/Payment/Payment.js";
import Admission from "../models/Admission/Admission.js";

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
                    },
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
            },
            {
                $match: {
                    billId: { $regex: /^PATH/i },
                    $or: [
                        { status: { $in: ["PAID", "PARTIAL"] } },
                        {
                            paymentMethod: "CHEQUE",
                            status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
                        }
                    ],
                    effectiveCentre: { $regex: new RegExp(`^${(centreName || "").trim()}$`, 'i') },
                    effectiveDate: { $gte: startOfMonth, $lte: endOfTargetMonth }
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
                    },
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
            },
            {
                $match: {
                    billId: { $regex: /^PATH/i },
                    $or: [
                        { status: { $in: ["PAID", "PARTIAL"] } },
                        {
                            paymentMethod: "CHEQUE",
                            status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
                        }
                    ],
                    effectiveCentre: { $regex: new RegExp(`^${(centreName || "").trim()}$`, 'i') },
                    effectiveDate: { $gte: startOfFY, $lte: endOfTarget }
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

        // Construct exact month boundary matches
        const dateMatches = selectedMonths.map(month => {
            const monthIndex = monthNames.indexOf(month);
            const calYear = monthIndex >= 3 ? fyStartYear : fyEndYear;
            
            return {
                effectiveDate: {
                    $gte: new Date(calYear, monthIndex, 1),
                    $lte: new Date(calYear, monthIndex + 1, 0, 23, 59, 59, 999)
                }
            };
        });

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
                    },
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
            },
            {
                $match: {
                    billId: { $regex: /^PATH/i },
                    $or: [
                        { status: { $in: ["PAID", "PARTIAL"] } },
                        {
                            paymentMethod: "CHEQUE",
                            status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
                        }
                    ],
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
                    },
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
            },
            {
                $match: {
                    billId: { $regex: /^PATH/i },
                    $or: [
                        { status: { $in: ["PAID", "PARTIAL"] } },
                        {
                            paymentMethod: "CHEQUE",
                            status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
                        }
                    ],
                    effectiveCentre: { $in: regexes },
                    effectiveDate: { $gte: startDate, $lte: endDate }
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
