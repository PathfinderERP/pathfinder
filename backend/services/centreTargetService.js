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
export const calculateCentreTargetAchieved = async (centreName, month, year) => {
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

        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfTargetMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

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
                        { paymentMethod: "CHEQUE" },
                        { paidAmount: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    effectiveDate: { $ifNull: ["$receivedDate", "$paidDate", "$createdAt"] },
                    revenueBase: { $cond: [{ $gt: ["$courseFee", 0] }, "$courseFee", { $divide: ["$paidAmount", 1.18] }] }
                }
            },
            {
                $match: {
                    "effectiveDate": { $gte: startOfMonth, $lte: endOfTargetMonth }
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
                        { paymentMethod: "CHEQUE" },
                        { paidAmount: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    effectiveDate: { $ifNull: ["$receivedDate", "$paidDate", "$createdAt"] },
                    revenueBase: { $cond: [{ $gt: ["$courseFee", 0] }, "$courseFee", { $divide: ["$paidAmount", 1.18] }] }
                }
            },
            {
                $match: {
                    "effectiveDate": { $gte: startOfFY, $lte: endOfTarget }
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
            // In Indian FY, Apr-Dec (3-11) fall in fyStartYear. Jan-Mar (0-2) fall in fyEndYear.
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
                        { paymentMethod: "CHEQUE" },
                        { paidAmount: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    effectiveDate: { $ifNull: ["$receivedDate", "$paidDate", "$createdAt"] },
                    revenueBase: { $cond: [{ $gt: ["$courseFee", 0] }, "$courseFee", { $divide: ["$paidAmount", 1.18] }] }
                }
            },
            {
                $match: {
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
 * 
 * @param {string} centreName - The name of the centre (as stored in Admission key)
 * @param {Date} paymentDate - The date of the payment to determine which month/year to update
 */
export const updateCentreTargetAchieved = async (centreName, paymentDateInput) => {
    try {
        if (!centreName) return;

        const paymentDate = new Date(paymentDateInput || Date.now());

        // 1. Determine Period Details
        const year = paymentDate.getFullYear();
        const monthIndex = paymentDate.getMonth(); // 0-11
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const month = monthNames[monthIndex];

        // Financial Year Calculation (e.g., April 2025 to March 2026 is FY 2025-2026)
        // If Month is Jan(0), Feb(1), Mar(2) -> FY is (Year-1)-(Year)
        // If Month is Apr(3) to Dec(11) -> FY is (Year)-(Year+1)
        let fyStart = year;
        let fyEnd = year + 1;
        if (monthIndex < 3) {
            fyStart = year - 1;
            fyEnd = year;
        }
        const financialYear = `${fyStart}-${fyEnd}`;

        // 2. Find Centre ObjectId
        const centreDoc = await CentreSchema.findOne({ centreName: centreName });
        if (!centreDoc) {
            console.warn(`Centre not found with name: ${centreName}`);
            return;
        }

        // 3. Find if a Target exists for this period
        // The user said "on the target achived section it will not be update , uit will just show the data of that centre achivedm"
        // This implies we should update the 'achievedAmount' on the CentreTarget record.

        const targetRecord = await CentreTarget.findOne({
            centre: centreDoc._id,
            year: year,
            month: month
        });

        if (!targetRecord) {
            // Note: If no target exists, we can't update 'achievedAmount' on it.
            // Requirement usually implies managing targets first.
            // We will log and skip if no target is set, OR we could create a placeholder.
            // Given the verified constraints, usually we only update if it exists.
            // However, to ensure data visibility, let's see. The UI shows rows from `CentreTarget`.
            // If we don't update, the data won't show.
            return;
        }

        // 4. Calculate Total Achieved (Cumulative from April 1st)
        const { totalWithGST, totalExclGST } = await calculateCentreTargetAchieved(centreName, month, year);

        // 5. Update Target Record
        targetRecord.achievedAmount = totalWithGST;
        targetRecord.achievedAmountWithGST = totalWithGST;
        targetRecord.achievedAmountExclGST = totalExclGST;
        await targetRecord.save();

    } catch (error) {
        console.error("Error updating centre target achievement:", error);
    }
};
