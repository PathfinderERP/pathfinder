import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";
import { calculateCentreTargetAchieved, calculateCentreTargetAchievedYearly, calculateCentreTargetAchievedMultiMonth } from "../../services/centreTargetService.js";
import mongoose from "mongoose";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Create Target
export const createCentreTarget = async (req, res) => {
    try {
        // centre could be a single ID or an array of IDs. Deduplicate them.
        let centreIds = Array.isArray(centre) ? centre : [centre];
        centreIds = [...new Set(centreIds.map(id => id.toString()))];
        
        const groupId = centreIds.length > 1 ? new mongoose.Types.ObjectId().toString() : null;
        
        // Divide target amount if multiple centres are selected so the SUM matches the input
        const individualTargetAmount = targetAmount / centreIds.length;
        
        const createdTargets = [];
        const existingErrors = [];

        for (const centreId of centreIds) {
            // Check if target already exists for this centre-month-year
            const existing = await CentreTarget.findOne({ centre: centreId, year, month });
            if (existing) {
                existingErrors.push(`Target already exists for centre ID: ${centreId}`);
                continue;
            }

            const newTarget = new CentreTarget({
                centre: centreId,
                financialYear,
                year,
                month,
                targetAmount: individualTargetAmount,
                createdBy: req.user._id,
                groupId
            });

            await newTarget.save();
            createdTargets.push(newTarget);
        }

        if (createdTargets.length === 0 && existingErrors.length > 0) {
            return res.status(400).json({ 
                message: "Targets already exist for the selected centres", 
                errors: existingErrors 
            });
        }

        res.status(201).json({ 
            message: `${createdTargets.length} target(s) created successfully`, 
            targets: createdTargets,
            errors: existingErrors.length > 0 ? existingErrors : undefined
        });
    } catch (error) {
        console.error("Create Target Error:", error);
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

        // Calculate achieved amounts
        const processedTargets = await Promise.all(targets.map(async (t) => {
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
                
                if (totalWithGST !== t.achievedAmountWithGST || totalExclGST !== t.achievedAmountExclGST) {
                    t.achievedAmount = totalWithGST;
                    t.achievedAmountWithGST = totalWithGST;
                    t.achievedAmountExclGST = totalExclGST;
                    await CentreTarget.updateOne(
                        { _id: t._id },
                        { $set: { achievedAmount: totalWithGST, achievedAmountWithGST: totalWithGST, achievedAmountExclGST: totalExclGST } }
                    );
                }
            }
            return t.toObject();
        }));

        // --- Group Targets by groupId ---
        const groups = {};
        const combinedResults = [];

        processedTargets.forEach(t => {
            const gid = t.groupId || t._id.toString(); // Use ID if no groupId
            const cName = t.centre?.centreName || "Unknown";

            if (!groups[gid]) {
                groups[gid] = {
                    ...t,
                    _ids: [t._id],
                    seenCentres: new Set([cName]),
                    centre: {
                        ...t.centre,
                        centreName: cName
                    },
                    targetAmount: t.targetAmount,
                    achievedAmountWithGST: t.achievedAmountWithGST || 0,
                    achievedAmountExclGST: t.achievedAmountExclGST || 0
                };
            } else {
                // Combine
                groups[gid]._ids.push(t._id);
                
                // Add target amount always
                groups[gid].targetAmount += t.targetAmount;

                // Only add achievement if this centre hasn't been counted in this group yet
                if (!groups[gid].seenCentres.has(cName)) {
                    groups[gid].centre.centreName += ` + ${cName}`;
                    groups[gid].achievedAmountWithGST += (t.achievedAmountWithGST || 0);
                    groups[gid].achievedAmountExclGST += (t.achievedAmountExclGST || 0);
                    groups[gid].seenCentres.add(cName);
                }
            }
        });

        const finalResults = Object.values(groups).map(g => {
            const achievementPercentage = g.targetAmount > 0
                ? ((g.achievedAmountWithGST / g.targetAmount) * 100).toFixed(1)
                : 0;
            return {
                ...g,
                achievementPercentage
            };
        });

        res.status(200).json({ targets: finalResults });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Target
export const updateCentreTarget = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const target = await CentreTarget.findById(id);
        if (!target) return res.status(404).json({ message: "Target not found" });

        if (target.groupId) {
            // If updating targetAmount, divide it by group size
            if (updateData.targetAmount) {
                const groupCount = await CentreTarget.countDocuments({ groupId: target.groupId });
                updateData.targetAmount = updateData.targetAmount / groupCount;
            }
            // Update all in group
            await CentreTarget.updateMany({ groupId: target.groupId }, updateData);
            const updatedTargets = await CentreTarget.find({ groupId: target.groupId });
            return res.status(200).json({ message: "Group targets updated", targets: updatedTargets });
        } else {
            const updatedTarget = await CentreTarget.findByIdAndUpdate(id, updateData, { new: true });
            res.status(200).json({ message: "Target updated", target: updatedTarget });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete Target
export const deleteCentreTarget = async (req, res) => {
    try {
        const { id } = req.params;
        const target = await CentreTarget.findById(id);
        if (!target) return res.status(404).json({ message: "Target not found" });

        if (target.groupId) {
            await CentreTarget.deleteMany({ groupId: target.groupId });
            res.status(200).json({ message: "Group targets deleted" });
        } else {
            await CentreTarget.findByIdAndDelete(id);
            res.status(200).json({ message: "Target deleted" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
