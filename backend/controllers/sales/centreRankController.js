import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";

export const getCentreRankings = async (req, res) => {
    try {
        const { financialYear, year, month } = req.query;

        let query = {};
        if (financialYear) query.financialYear = financialYear;
        // Ensure year is treated as number but check for valid input
        if (year && !isNaN(parseInt(year))) query.year = parseInt(year);
        if (month) query.month = month;

        console.log("Ranking Query:", query); // Debug log

        // Fetch targets for the selected period
        const targets = await CentreTarget.find(query)
            .populate({ path: 'centre', select: 'centreName' });

        // 2. Fetch targets for the previous month (for comparison)
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
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
            month: prevMonthName,
            // Financial year might differ if crossing Apr/Mar boundary, simplify by relying on Year/Month
        };
        // We need previous month data for ALL centres to rank them and find the specific centre's prev rank
        const prevTargets = await CentreTarget.find(prevQuery);

        // Map previous data for quick lookup
        const prevDataMap = {}; // centreId -> { achievementPct, rank }

        // Calculate Previous Ranks
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

        // 3. BEST ACHIEVEMENT (Aggregation)
        // Find max achieved % for each centre across all time
        // This is expensive, maybe we optimize later or store 'best' in Centre model.
        // For now, let's just use current vs last month basics, or fetch all targets group by centre max.

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


        // Calculate achievement percentage and format data
        let rankData = targets.map(t => {
            const achievementPct = t.targetAmount > 0
                ? (t.achievedAmount / t.targetAmount) * 100
                : 0;

            const cId = t.centre?._id?.toString();
            const prev = prevDataMap[cId] || { achievementPct: 0, rank: null };
            const best = bestMap[cId] || achievementPct;

            return {
                centreId: t.centre?._id,
                centreName: t.centre?.centreName || "Unknown",
                target: t.targetAmount,
                achieved: t.achievedAmount,
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
            const rankChange = item.lastMonthRank !== "-" ? (item.lastMonthRank - currentRank) : 0; // Positive means moved up (e.g. 5 -> 2 = +3)

            return {
                ...item,
                rank: currentRank,
                rankChange: rankChange, // +ve is good (rank decreased number wise)
                growth: (item.achievementPercentage - item.lastMonthPercentage).toFixed(1)
            };
        });

        // Filter by user's allocated centres if not superAdmin
        if (req.user.role !== 'superAdmin') {
            const allowedCentreIds = (req.user.centres || []).map(id => id.toString());
            rankData = rankData.filter(item => allowedCentreIds.includes(item.centreId.toString()));
        }

        res.status(200).json({ rankings: rankData });

    } catch (error) {
        console.error("Error calculating rankings:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
