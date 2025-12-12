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
        const monthIndex = monthNames.indexOf(month);

        if (monthIndex === -1) return 0;

        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

        const result = await Payment.aggregate([
            {
                $lookup: {
                    from: "admissions", // Collection name (usually lowercase plural)
                    localField: "admission",
                    foreignField: "_id",
                    as: "admissionDetails"
                }
            },
            { $unwind: "$admissionDetails" },
            {
                $match: {
                    "admissionDetails.centre": centreName,
                    "status": "PAID",
                    "paidDate": { $gte: startOfMonth, $lte: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalAchieved: { $sum: "$paidAmount" }
                }
            }
        ]);

        return result.length > 0 ? result[0].totalAchieved : 0;
    } catch (error) {
        console.error("Error calculating target achieved:", error);
        return 0;
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

        console.log(`Updating Target for: ${centreName} | ${month} ${year} (${financialYear})`);

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
            console.log("No Sales Target found for this period. Skipping update.");
            return;
        }

        // 4. Calculate Total Achieved for this Month/Year using the new reusable function
        const totalAchieved = await calculateCentreTargetAchieved(centreName, month, year);

        // 5. Update Target Record
        targetRecord.achievedAmount = totalAchieved;
        await targetRecord.save();

        console.log(`Updated Target Achievement for ${centreName} (${month} ${year}): ${totalAchieved}`);

    } catch (error) {
        console.error("Error updating centre target achievement:", error);
    }
};
