import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";
import { calculateCentreTargetAchieved, calculateCentreTargetAchievedYearly, calculateCentreTargetAchievedMultiMonth, getBatchAchievedForCentres } from "../../services/centreTargetService.js";
import mongoose from "mongoose";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Create Target
export const createCentreTarget = async (req, res) => {
    try {
        const { centre, financialYear, year, month, targetAmount, achievedAmount } = req.body;

        // centre could be a single ID or an array of IDs. Deduplicate them.
        let centreIds = Array.isArray(centre) ? centre : [centre];
        centreIds = [...new Set(centreIds.map(id => id.toString()))];
        
        const groupId = centreIds.length > 1 ? new mongoose.Types.ObjectId().toString() : null;
        
        // Divide target amount if multiple centres are selected so the SUM matches the input
        const individualTargetAmount = targetAmount / centreIds.length;
        
        const createdTargets = [];
        const existingErrors = [];

        // Calculate correct calendar year based on financialYear and month
        let calculatedYear = Number(year);
        if (financialYear && month) {
            const parts = financialYear.split('-');
            if (parts.length === 2) {
                const startYear = parseInt(parts[0], 10);
                const endYear = parseInt(parts[1], 10);
                const firstHalfMonths = ["April", "May", "June", "July", "August", "September", "October", "November", "December"];
                
                if (month === "YEARLY" || month === "Annual") {
                    calculatedYear = startYear;
                } else if (month.includes(",")) {
                    const firstMonth = month.split(',')[0].trim();
                    calculatedYear = firstHalfMonths.includes(firstMonth) ? startYear : endYear;
                } else {
                    calculatedYear = firstHalfMonths.includes(month) ? startYear : endYear;
                }
            }
        }

        for (const centreId of centreIds) {
            // Check if target already exists for this centre-month-year
            const existing = await CentreTarget.findOne({ centre: centreId, year: calculatedYear, month });
            if (existing) {
                existingErrors.push(`Target already exists for centre ID: ${centreId}`);
                continue;
            }

            const newTarget = new CentreTarget({
                centre: centreId,
                financialYear,
                year: calculatedYear,
                month,
                targetAmount: individualTargetAmount,
                achievedAmount: Number(achievedAmount) || 0,
                achievedAmountWithGST: Number(achievedAmount) || 0,
                achievedAmountExclGST: (Number(achievedAmount) || 0) / 1.18,
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
        } else {
            let targetCentres;
            if (req.user.role !== 'superAdmin') {
                targetCentres = await Centre.find({ _id: { $in: req.user.centres || [] }, status: { $ne: "deactive" }, centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] } }).select("_id");
            } else {
                targetCentres = await Centre.find({ status: { $ne: "deactive" }, centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] } }).select("_id");
            }
            const targetIds = targetCentres.map(c => c._id);
            query.centre = { $in: targetIds.length > 0 ? targetIds : [new mongoose.Types.ObjectId()] };
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

        // Calculate achieved amounts in a single batch aggregation
        let globalMinDate = null;
        let globalMaxDate = null;
        const centreNamesSet = new Set();

        const updateGlobalRange = (start, end) => {
            if (!globalMinDate || start < globalMinDate) globalMinDate = start;
            if (!globalMaxDate || end > globalMaxDate) globalMaxDate = end;
        };

        targets.forEach(t => {
            if (!t.centre || !t.centre.centreName || t.financialYear === "2025-2026") return;
            
            centreNamesSet.add(t.centre.centreName);

            if (startDate && endDate) {
                updateGlobalRange(new Date(startDate), new Date(endDate));
            } else if (t.month === "YEARLY") {
                const parts = t.financialYear.split('-');
                if (parts.length === 2) {
                    const fyStartYear = parseInt(parts[0], 10);
                    const fyEndYear = parseInt(parts[1], 10);
                    const start = new Date(fyStartYear, 3, 1);
                    let end = new Date(fyEndYear, 2, 31, 23, 59, 59, 999);
                    const now = new Date();
                    if (now < end) end = now;
                    updateGlobalRange(start, end);
                }
            } else if (t.month && t.month.includes(",")) {
                const parts = t.financialYear.split('-');
                if (parts.length === 2) {
                    const fyStartYear = parseInt(parts[0], 10);
                    const fyEndYear = parseInt(parts[1], 10);
                    const selectedMonths = t.month.split(',').map(m => m.trim()).filter(m => monthNames.includes(m));
                    selectedMonths.forEach(mName => {
                        const mIndex = monthNames.indexOf(mName);
                        const calYear = mIndex >= 3 ? fyStartYear : fyEndYear;
                        updateGlobalRange(
                            new Date(calYear, mIndex, 1),
                            new Date(calYear, mIndex + 1, 0, 23, 59, 59, 999)
                        );
                    });
                }
            } else {
                const mIndex = monthNames.indexOf(t.month);
                if (mIndex !== -1) {
                    updateGlobalRange(
                        new Date(t.year, mIndex, 1),
                        new Date(t.year, mIndex + 1, 0, 23, 59, 59, 999)
                    );
                }
            }
        });

        const batchLookup = {};
        if (centreNamesSet.size > 0 && globalMinDate && globalMaxDate) {
            const rawAchievements = await getBatchAchievedForCentres(
                Array.from(centreNamesSet),
                globalMinDate,
                globalMaxDate
            );

            rawAchievements.forEach(r => {
                const cName = r._id.centre;
                const y = r._id.year;
                const m = r._id.month - 1; // 0-indexed
                const d = r._id.day;

                if (!batchLookup[cName]) batchLookup[cName] = {};
                const dateKey = new Date(y, m, d).getTime();
                batchLookup[cName][dateKey] = {
                    withGST: r.totalWithGST || 0,
                    exclGST: r.totalExclGST || 0
                };
            });
        }

        const calculateTargetFromLookup = (centreName, start, end, monthString = null) => {
            const lookup = batchLookup[centreName];
            if (!lookup) return { totalWithGST: 0, totalExclGST: 0 };
            
            let totalWithGST = 0;
            let totalExclGST = 0;
            const startTime = start.getTime();
            const endTime = end.getTime();
            
            const allowedMonths = monthString && monthString.includes(",") 
                ? monthString.split(",").map(m => m.trim().toLowerCase())
                : null;
            
            for (const timeStr of Object.keys(lookup)) {
                const time = Number(timeStr);
                if (time >= startTime && time <= endTime) {
                    if (allowedMonths) {
                        const dObj = new Date(time);
                        const mName = monthNames[dObj.getMonth()].toLowerCase();
                        if (!allowedMonths.includes(mName)) continue;
                    }
                    totalWithGST += lookup[timeStr].withGST;
                    totalExclGST += lookup[timeStr].exclGST;
                }
            }
            return { totalWithGST, totalExclGST };
        };

        const processedTargets = await Promise.all(targets.map(async (t) => {
            if (t.centre && t.centre.centreName) {
                if (t.financialYear === "2025-2026") {
                    return t.toObject();
                }
                
                let start, end;
                let monthString = null;

                if (startDate && endDate) {
                    start = new Date(startDate);
                    end = new Date(endDate);
                } else if (t.month === "YEARLY") {
                    const parts = t.financialYear.split('-');
                    if (parts.length === 2) {
                        const fyStartYear = parseInt(parts[0], 10);
                        const fyEndYear = parseInt(parts[1], 10);
                        start = new Date(fyStartYear, 3, 1);
                        end = new Date(fyEndYear, 2, 31, 23, 59, 59, 999);
                        const now = new Date();
                        if (now < end) end = now;
                    }
                } else if (t.month && t.month.includes(",")) {
                    const parts = t.financialYear.split('-');
                    if (parts.length === 2) {
                        const fyStartYear = parseInt(parts[0], 10);
                        const fyEndYear = parseInt(parts[1], 10);
                        monthString = t.month;
                        const selectedMonths = t.month.split(',').map(m => m.trim()).filter(m => monthNames.includes(m));
                        const mIndices = selectedMonths.map(m => monthNames.indexOf(m));
                        const years = mIndices.map(mIndex => mIndex >= 3 ? fyStartYear : fyEndYear);
                        const startYear = Math.min(...years);
                        const endYear = Math.max(...years);
                        const startMonthIndex = Math.min(...mIndices);
                        const endMonthIndex = Math.max(...mIndices);
                        
                        start = new Date(startYear, startMonthIndex, 1);
                        end = new Date(endYear, endMonthIndex + 1, 0, 23, 59, 59, 999);
                    }
                } else {
                    const mIndex = monthNames.indexOf(t.month);
                    if (mIndex !== -1) {
                        start = new Date(t.year, mIndex, 1);
                        end = new Date(t.year, mIndex + 1, 0, 23, 59, 59, 999);
                    }
                }

                let totalWithGST = 0, totalExclGST = 0;
                if (start && end) {
                    const res = calculateTargetFromLookup(t.centre.centreName, start, end, monthString);
                    totalWithGST = res.totalWithGST;
                    totalExclGST = res.totalExclGST;
                }
                
                const isCustomRange = !!(startDate && endDate);
                if (!isCustomRange && (totalWithGST !== t.achievedAmountWithGST || totalExclGST !== t.achievedAmountExclGST)) {
                    await CentreTarget.updateOne(
                        { _id: t._id },
                        { $set: { achievedAmount: totalWithGST, achievedAmountWithGST: totalWithGST, achievedAmountExclGST: totalExclGST } }
                    );
                }

                const targetObj = t.toObject();
                targetObj.achievedAmount = totalWithGST;
                targetObj.achievedAmountWithGST = totalWithGST;
                targetObj.achievedAmountExclGST = totalExclGST;
                return targetObj;
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
            const targetWithGST = g.targetAmount * 1.18;
            const achievementPercentage = targetWithGST > 0
                ? ((g.achievedAmountWithGST / targetWithGST) * 100).toFixed(1)
                : 0;
            return {
                ...g,
                targetAmountWithGST: targetWithGST,
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
        const updateData = { ...req.body };

        const target = await CentreTarget.findById(id);
        if (!target) return res.status(404).json({ message: "Target not found" });

        if (updateData.achievedAmount !== undefined) {
            updateData.achievedAmountWithGST = Number(updateData.achievedAmount) || 0;
            updateData.achievedAmountExclGST = (Number(updateData.achievedAmount) || 0) / 1.18;
        }

        // Calculate correct calendar year based on updated financialYear and month
        if (updateData.financialYear || updateData.month) {
            const financialYear = updateData.financialYear || target.financialYear;
            const month = updateData.month || target.month;
            
            if (financialYear && month) {
                const parts = financialYear.split('-');
                if (parts.length === 2) {
                    const startYear = parseInt(parts[0], 10);
                    const endYear = parseInt(parts[1], 10);
                    const firstHalfMonths = ["April", "May", "June", "July", "August", "September", "October", "November", "December"];
                    
                    if (month === "YEARLY" || month === "Annual") {
                        updateData.year = startYear;
                    } else if (month.includes(",")) {
                        const firstMonth = month.split(',')[0].trim();
                        updateData.year = firstHalfMonths.includes(firstMonth) ? startYear : endYear;
                    } else {
                        updateData.year = firstHalfMonths.includes(month) ? startYear : endYear;
                    }
                }
            }
        }

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

// Get Quarterly Full Report (Matrix of Centres x Quarters)
export const getQuarterlyFullReport = async (req, res) => {
    try {
        const { financialYear } = req.query;
        if (!financialYear) return res.status(400).json({ message: "Financial Year is required" });

        const centres = await Centre.find({
            status: { $not: /^deact/i },
            centreName: { $not: /phsps|franchise|rkm/i }
        }).sort({ centreName: 1 });
        
        const quarters = [
            { id: "q1", name: "Q1", months: ["April", "May", "June"], match: "April,May,June" },
            { id: "q2", name: "Q2", months: ["July", "August", "September"], match: "July,August,September" },
            { id: "q3", name: "Q3", months: ["October", "November", "December"], match: "October,November,December" },
            { id: "q4", name: "Q4", months: ["January", "February", "March"], match: "January,February,March" }
        ];

        const allTargets = await CentreTarget.find({ financialYear });

        const results = await Promise.all(centres.map(async (c) => {
            const row = {
                centreName: c.centreName,
                centreId: c._id,
                status: c.status,
                q1: { target: 0, achieved: 0 },
                q2: { target: 0, achieved: 0 },
                q3: { target: 0, achieved: 0 },
                q4: { target: 0, achieved: 0 },
                total: { target: 0, achieved: 0 }
            };

            for (const q of quarters) {
                // 1. Calculate Target
                const qTargetRec = allTargets.find(t => 
                    t.centre && t.centre.toString() === c._id.toString() && 
                    t.month === q.match
                );

                if (qTargetRec) {
                    row[q.id].target = qTargetRec.targetAmount;
                } else {
                    const monthlyTargets = allTargets.filter(t => 
                        t.centre && t.centre.toString() === c._id.toString() && 
                        q.months.includes(t.month)
                    );
                    row[q.id].target = monthlyTargets.reduce((sum, t) => sum + t.targetAmount, 0);
                }

                // 2. Calculate Achievement (Exact data)
                const multiResult = await calculateCentreTargetAchievedMultiMonth(c.centreName, q.match, financialYear);
                row[q.id].achieved = multiResult.totalWithGST;

                row.total.target += row[q.id].target;
                row.total.achieved += row[q.id].achieved;
            }

            return row;
        }));

        res.status(200).json({ data: results });
    } catch (error) {
        console.error("Quarterly Report Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
