import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";
import { calculateCentreTargetAchieved, calculateCentreTargetAchievedYearly, calculateCentreTargetAchievedMultiMonth } from "../../services/centreTargetService.js";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Create Target
export const createCentreTarget = async (req, res) => {
    try {
        const { centre, financialYear, year, month, targetAmount } = req.body;

        // Check if target already exists for this centre-month-year
        const existing = await CentreTarget.findOne({ centre, year, month });
        if (existing) {
            return res.status(400).json({ message: "Target already exists for this period" });
        }

        const newTarget = new CentreTarget({
            centre,
            financialYear,
            year,
            month,
            targetAmount,
            createdBy: req.user._id
        });

        await newTarget.save();
        res.status(201).json({ message: "Target created successfully", target: newTarget });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Targets with filtering and calculation
export const getCentreTargets = async (req, res) => {
    try {
        const { centre, financialYear, month, year, startDate, endDate, viewMode } = req.query;
        let query = {};

        let allowedCentreIds = [];
        if (req.user.role !== 'superAdmin') {
            allowedCentreIds = (req.user.centres || []).map(id => id.toString());
        }

        if (centre) {
            const requestedIds = typeof centre === 'string' ? centre.split(',') : [centre];
            const validRequestedIds = requestedIds.filter(id => id && id.trim());

            if (req.user.role !== 'superAdmin') {
                const finalIds = validRequestedIds.filter(id => allowedCentreIds.includes(id));
                query.centre = { $in: finalIds.length > 0 ? finalIds : ["__NONE__"] };
            } else if (validRequestedIds.length > 0) {
                query.centre = { $in: validRequestedIds };
            }
        } else if (req.user.role !== 'superAdmin') {
            query.centre = { $in: allowedCentreIds.length > 0 ? allowedCentreIds : ["__NONE__"] };
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const monthsInRange = [];
            let current = new Date(start.getFullYear(), start.getMonth(), 1);

            while (current <= end) {
                monthsInRange.push({
                    year: current.getFullYear(),
                    month: monthNames[current.getMonth()]
                });
                current.setMonth(current.getMonth() + 1);
            }

            if (monthsInRange.length > 0) {
                query.$or = monthsInRange;
            } else {
                query.year = -1; // No results
            }
        } else {
            if (financialYear) {
                query.financialYear = financialYear;
            } else if (!year && !month) {
                const now = new Date();
                const curMonth = now.getMonth();
                const curYear = now.getFullYear();
                const fyStart = curMonth >= 3 ? curYear : curYear - 1;
                query.financialYear = `${fyStart}-${fyStart + 1}`;
            }

            if (viewMode === "Yearly") {
                query.month = "YEARLY";
            } else if (viewMode === "Quarterly") {
                query.month = { $regex: /,/ };
            } else if (viewMode === "Monthly") {
                if (month) query.month = month;
                else query.month = { $not: /,|YEARLY/ };
            } else if (month) {
                 query.month = month;
            }

            if (year && !isNaN(parseInt(year))) query.year = parseInt(year);
        }

        const targets = await CentreTarget.find(query)
            .populate({ path: 'centre', select: 'centreName', model: 'CentreSchema' })
            .sort({ createdAt: -1 });

        // Calculate percentage and update real-time
        const results = await Promise.all(targets.map(async (t) => {
            if (t.centre && t.centre.centreName) {
                let totalWithGST, totalExclGST;
                
                if (t.month === "YEARLY") {
                    const yearlyResult = await calculateCentreTargetAchievedYearly(t.centre.centreName, t.financialYear);
                    totalWithGST = yearlyResult.totalWithGST;
                    totalExclGST = yearlyResult.totalExclGST;
                } else if (t.month && t.month.includes(",")) {
                    const multiResult = await calculateCentreTargetAchievedMultiMonth(t.centre.centreName, t.month, t.financialYear);
                    totalWithGST = multiResult.totalWithGST;
                    totalExclGST = multiResult.totalExclGST;
                } else {
                    const monthlyResult = await calculateCentreTargetAchieved(t.centre.centreName, t.month, t.year);
                    totalWithGST = monthlyResult.totalWithGST;
                    totalExclGST = monthlyResult.totalExclGST;
                }
                
                // Update if changed
                if (totalWithGST !== t.achievedAmountWithGST || totalExclGST !== t.achievedAmountExclGST) {
                    t.achievedAmount = totalWithGST;
                    t.achievedAmountWithGST = totalWithGST;
                    t.achievedAmountExclGST = totalExclGST;
                    await CentreTarget.updateOne(
                        { _id: t._id },
                        {
                            $set: {
                                achievedAmount: totalWithGST,
                                achievedAmountWithGST: totalWithGST,
                                achievedAmountExclGST: totalExclGST
                            }
                        }
                    );
                }
            }

            const achievementPercentage = t.targetAmount > 0
                ? ((t.achievedAmount / t.targetAmount) * 100).toFixed(1)
                : 0;
            return {
                ...t.toObject(),
                achievementPercentage
            };
        }));

        res.status(200).json({ targets: results });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Target
export const updateCentreTarget = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedTarget = await CentreTarget.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedTarget) return res.status(404).json({ message: "Target not found" });

        res.status(200).json({ message: "Target updated", target: updatedTarget });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Target
export const deleteCentreTarget = async (req, res) => {
    try {
        const { id } = req.params;
        await CentreTarget.findByIdAndDelete(id);
        res.status(200).json({ message: "Target deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
