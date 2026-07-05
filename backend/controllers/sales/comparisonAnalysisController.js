import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";
import { calculateCentreTargetAchieved } from "../../services/centreTargetService.js";

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
        const { centreIds, months } = req.query;

        // 1. Get allowed centres based on permissions
        let allowedCentreIds = [];
        if (req.user.role !== 'superAdmin') {
            allowedCentreIds = (req.user.centres || []).map(id => id.toString());
        }

        let centreQuery = { status: { $ne: 'deactive' } };
        if (centreIds) {
            const requested = (typeof centreIds === 'string' ? centreIds.split(',') : centreIds).filter(Boolean);
            if (req.user.role !== 'superAdmin') {
                queryCentres = requested.filter(id => allowedCentreIds.includes(id));
                centreQuery._id = { $in: queryCentres };
            } else {
                centreQuery._id = { $in: requested };
            }
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
        });

        // 4. Construct response grid
        const data = [];

        for (const centre of centres) {
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

                // Calculate achievement dynamically for 2026-2027
                const year2627 = getYearForMonth("2026-2027", month);
                const achieved2627Result = await calculateCentreTargetAchieved(centre.centreName, month, year2627);

                // Update database cache for 2026-2027 target record if it exists and changed
                if (rec2627) {
                    if (rec2627.achievedAmountWithGST !== achieved2627Result.totalWithGST || 
                        rec2627.achievedAmountExclGST !== achieved2627Result.totalExclGST) {
                        await CentreTarget.updateOne(
                            { _id: rec2627._id },
                            { $set: { 
                                achievedAmount: achieved2627Result.totalWithGST,
                                achievedAmountWithGST: achieved2627Result.totalWithGST,
                                achievedAmountExclGST: achieved2627Result.totalExclGST 
                            }}
                        );
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
