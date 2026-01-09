import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";

export const getCentreRankings = async (req, res) => {
    try {
        const { financialYear, year, month, startDate, endDate, centreIds } = req.query;

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        let query = {};

        // Handle Centre Filtering
        let allowedCentreIds = [];
        if (req.user.role !== 'superAdmin') {
            allowedCentreIds = (req.user.centres || []).map(id => id.toString());
        }

        if (centreIds) {
            const requestedIds = typeof centreIds === 'string' ? centreIds.split(',') : [centreIds];
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
            if (financialYear) query.financialYear = financialYear;
            if (year && !isNaN(parseInt(year))) query.year = parseInt(year);
            if (month) query.month = month;
        }

        // 1. Fetch performance for selected period
        let targets;
        const isMultiMonth = (startDate && endDate) || (!month && financialYear); // Custom range or Yearly view

        if (isMultiMonth) {
            // Aggregate totals for Custom/Yearly range
            targets = await CentreTarget.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: "$centre",
                        targetAmount: { $sum: "$targetAmount" },
                        achievedAmount: { $sum: "$achievedAmount" }
                    }
                },
                {
                    $lookup: {
                        from: "centreschemas",
                        localField: "_id",
                        foreignField: "_id",
                        as: "centre"
                    }
                },
                { $unwind: "$centre" }
            ]);
        } else {
            targets = await CentreTarget.find(query)
                .populate({ path: 'centre', select: 'centreName' });
        }

        // 2. comparison logic (Only for Monthly view without startDate/endDate)
        const isMonthlyComparison = !startDate && !endDate && month;
        const prevDataMap = {};

        if (isMonthlyComparison) {
            const currentMonthIndex = monthNames.indexOf(month);
            let prevMonthName = "";
            let prevYear = parseInt(year);

            if (currentMonthIndex === 0) {
                prevMonthName = "December";
                prevYear = prevYear - 1;
            } else if (currentMonthIndex > 0) {
                prevMonthName = monthNames[currentMonthIndex - 1];
            }

            const prevQuery = {
                year: prevYear,
                month: prevMonthName
            };

            const prevTargets = await CentreTarget.find(prevQuery);
            let prevRankList = prevTargets.map(t => ({
                centreId: t.centre?._id?.toString() || t.centre?.toString(),
                achievementPct: t.targetAmount > 0 ? (t.achievedAmount / t.targetAmount) * 100 : 0
            }));
            prevRankList.sort((a, b) => b.achievementPct - a.achievementPct);

            prevRankList.forEach((item, index) => {
                if (item.centreId) {
                    prevDataMap[item.centreId] = {
                        achievementPct: item.achievementPct,
                        rank: index + 1
                    };
                }
            });
        }

        // 3. BEST ACHIEVEMENT (Aggregation)
        const bestStats = await CentreTarget.aggregate([
            {
                $addFields: {
                    pct: {
                        $cond: [{ $gt: ["$targetAmount", 0] }, { $multiply: [{ $divide: ["$achievedAmount", "$targetAmount"] }, 100] }, 0]
                    }
                }
            },
            {
                $group: {
                    _id: "$centre",
                    bestPct: { $max: "$pct" }
                }
            }
        ]);
        const bestMap = {};
        bestStats.forEach(s => {
            if (s._id) bestMap[s._id.toString()] = s.bestPct;
        });

        // 4. Calculate achievement percentage and format data
        let rankData = targets.map(t => {
            const centerObj = t.centre || {};
            const centerId = (centerObj._id || t._id).toString();

            const targetAmt = t.targetAmount || 0;
            const achievedAmt = t.achievedAmount || 0;

            const achievementPct = targetAmt > 0 ? (achievedAmt / targetAmt) * 100 : 0;
            const prev = prevDataMap[centerId] || { achievementPct: 0, rank: null };
            const best = bestMap[centerId] || achievementPct;

            return {
                centreId: centerId,
                centreName: centerObj.centreName || "Unknown",
                target: targetAmt,
                achieved: achievedAmt,
                achievementPercentage: parseFloat(achievementPct.toFixed(1)),
                lastMonthPercentage: parseFloat(prev.achievementPct.toFixed(1)),
                lastMonthRank: prev.rank || "-",
                bestAchievementPercentage: parseFloat(Math.max(best, achievementPct).toFixed(1))
            };
        });

        // Sort by achievement percentage descending to determine rank
        rankData.sort((a, b) => b.achievementPercentage - a.achievementPercentage);

        // Assign Rank and Calculate Growth/Rank Change
        rankData = rankData.map((item, index) => {
            const currentRank = index + 1;
            const rankChange = item.lastMonthRank !== "-" ? (item.lastMonthRank - currentRank) : 0;

            return {
                ...item,
                rank: currentRank,
                rankChange: rankChange,
                growth: (item.achievementPercentage - item.lastMonthPercentage).toFixed(1)
            };
        });

        res.status(200).json({ rankings: rankData });

    } catch (error) {
        console.error("Error calculating rankings:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
