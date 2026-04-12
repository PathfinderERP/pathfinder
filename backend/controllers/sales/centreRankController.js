import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";
import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";

import mongoose from "mongoose";

export const getCentreRankings = async (req, res) => {
    try {
        const { financialYear, year, month, months, startDate, endDate, centreIds, viewMode, search } = req.query;

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

        const toObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);

        if (centreIds) {
            const requestedIds = typeof centreIds === 'string' ? centreIds.split(',') : [centreIds];
            const validRequestedIds = requestedIds.filter(id => id && id.trim());

            if (req.user.role !== 'superAdmin') {
                const finalIds = validRequestedIds.filter(id => allowedCentreIds.includes(id));
                query.centre = { $in: finalIds.length > 0 ? finalIds.map(toObjectId) : ["__NONE__"] };
            } else if (validRequestedIds.length > 0) {
                query.centre = { $in: validRequestedIds.map(toObjectId) };
            }
        } else if (req.user.role !== 'superAdmin') {
            query.centre = { $in: allowedCentreIds.length > 0 ? allowedCentreIds.map(toObjectId) : ["__NONE__"] };
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
            if (financialYear) {
                query.financialYear = financialYear;
            } else if (!year && !month && !months) {
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
                if (months) {
                     query.month = { $in: months.split(',') };
                } else if (month) {
                     query.month = month;
                } else {
                     query.month = { $not: /,|YEARLY/ };
                }
            } else if (month) {
                 query.month = month;
            }

            if (year && !isNaN(parseInt(year))) query.year = parseInt(year);
        }

        // --- Determine Date Range for Exact Payment Retrieval ---
        let paymentStartDate, paymentEndDate;
        const now = new Date();

        if (startDate && endDate) {
            paymentStartDate = new Date(startDate);
            paymentEndDate = new Date(endDate);
            paymentEndDate.setHours(23, 59, 59, 999);
        } else if (financialYear || viewMode === "Yearly") {
            const fy = financialYear || (year ? `${year}-${parseInt(year) + 1}` : `${now.getFullYear()}-${now.getFullYear() + 1}`);
            const [startYear] = fy.split('-').map(Number);
            paymentStartDate = new Date(startYear, 3, 1); // April 1st
            paymentEndDate = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // March 31st
        } else if (viewMode === "Monthly") {
            const targetYear = year ? parseInt(year) : now.getFullYear();
            const targetMonthName = month || monthNames[now.getMonth()];
            const monthIndex = monthNames.indexOf(targetMonthName);
            paymentStartDate = new Date(targetYear, monthIndex, 1);
            paymentEndDate = new Date(targetYear, monthIndex + 1, 0, 23, 59, 59, 999);
        } else if (viewMode === "Quarterly" && month) {
            const targetYear = year ? parseInt(year) : now.getFullYear();
            const mArray = month.split(',');
            const startMonthIdx = monthNames.indexOf(mArray[0]);
            const endMonthIdx = monthNames.indexOf(mArray[mArray.length - 1]);
            paymentStartDate = new Date(targetYear, startMonthIdx, 1);
            paymentEndDate = new Date(targetYear, endMonthIdx + 1, 0, 23, 59, 59, 999);
        }

        // --- Fetch Exact Achieved Amount from Payments ---
        const paymentMatch = {
            paidAmount: { $gt: 0 },
            status: { $in: ["PAID", "PARTIAL"] }
        };

        if (paymentStartDate && paymentEndDate) {
            paymentMatch.$expr = {
                $and: [
                    { $gte: [{ $ifNull: ["$receivedDate", "$paidDate"] }, paymentStartDate] },
                    { $lte: [{ $ifNull: ["$receivedDate", "$paidDate"] }, paymentEndDate] }
                ]
            };
        }

        const paymentStats = await Payment.aggregate([
            { $match: paymentMatch },
            {
                $lookup: {
                    from: "admissions",
                    localField: "admission",
                    foreignField: "_id",
                    as: "adm"
                }
            },
            {
                $lookup: {
                    from: "boardcourseadmissions",
                    localField: "admission",
                    foreignField: "_id",
                    as: "badm"
                }
            },
            {
                $project: {
                    paidAmount: 1,
                    centreName: {
                        $ifNull: [
                            { $arrayElemAt: ["$adm.centre", 0] },
                            { $arrayElemAt: ["$badm.centre", 0] }
                        ]
                    }
                }
            },
            { $group: { _id: "$centreName", totalPaid: { $sum: "$paidAmount" } } }
        ]);

        const paymentMap = {};
        paymentStats.forEach(s => {
            if (s._id) paymentMap[s._id.trim().toUpperCase()] = s.totalPaid;
        });

        // 1. Fetch performance for selected period
        // Always aggregate by centre to prevent duplicate rows if multiple entries exist
        let targets = await CentreTarget.aggregate([
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

        // 2. comparison logic (Only for Monthly view without startDate/endDate and ONLY single month is being queried directly for comparison)
        const isMonthlyComparison = !startDate && !endDate && viewMode === "Monthly" && month && !months;
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

            const prevStart = new Date(prevYear, monthNames.indexOf(prevMonthName), 1);
            const prevEnd = new Date(prevYear, monthNames.indexOf(prevMonthName) + 1, 0, 23, 59, 59, 999);

            // Fetch Previous Month Targets
            const prevTargets = await CentreTarget.find({
                year: prevYear,
                month: prevMonthName
            }).populate("centre", "centreName");

            const targetMap = {};
            prevTargets.forEach(t => {
                const cName = t.centre?.centreName?.trim().toUpperCase();
                if (cName) targetMap[cName] = (targetMap[cName] || 0) + t.targetAmount;
            });

            // Fetch Previous Month Payments
            const prevPaymentStats = await Payment.aggregate([
                {
                    $match: {
                        paidAmount: { $gt: 0 },
                        status: { $in: ["PAID", "PARTIAL"] },
                        $expr: {
                            $and: [
                                { $gte: [{ $ifNull: ["$receivedDate", "$paidDate"] }, prevStart] },
                                { $lte: [{ $ifNull: ["$receivedDate", "$paidDate"] }, prevEnd] }
                            ]
                        }
                    }
                },
                {
                    $lookup: { from: "admissions", localField: "admission", foreignField: "_id", as: "adm" }
                },
                {
                    $lookup: { from: "boardcourseadmissions", localField: "admission", foreignField: "_id", as: "badm" }
                },
                {
                    $project: {
                        paidAmount: 1,
                        centreName: {
                            $ifNull: [
                                { $arrayElemAt: ["$adm.centre", 0] },
                                { $arrayElemAt: ["$badm.centre", 0] }
                            ]
                        }
                    }
                },
                { $group: { _id: "$centreName", totalPaid: { $sum: "$paidAmount" } } }
            ]);

            const prevPaymentMap = {};
            prevPaymentStats.forEach(s => {
                if (s._id) prevPaymentMap[s._id.trim().toUpperCase()] = s.totalPaid;
            });

            const prevRankList = prevTargets.map(t => {
                const cName = t.centre?.centreName?.trim().toUpperCase();
                const target = targetMap[cName] || 0;
                const achieved = prevPaymentMap[cName] || 0;
                return {
                    centreId: t.centre?._id?.toString(),
                    achievementPct: target > 0 ? (achieved / target) * 100 : 0
                };
            });

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

        // 3. BEST ACHIEVEMENT (Stored/Aggregate from CentreTarget for performance)
        // Note: For extreme accuracy, this would need to aggregate all historical transactions,
        // which is deferred for performance reasons unless explicitly requested to be recalculated.
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
            const cName = (centerObj.centreName || "").trim().toUpperCase();

            const targetAmt = t.targetAmount || 0;
            // Use exact payment data if available, otherwise fallback to target's achieved amount
            const achievedAmt = paymentMap[cName] !== undefined ? paymentMap[cName] : (t.achievedAmount || 0);

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

        // 5. Apply Search Filter
        if (search) {
            const searchLower = search.toLowerCase();
            rankData = rankData.filter(r => 
                r.centreName.toLowerCase().includes(searchLower)
            );
        }

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
