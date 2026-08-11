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
        } else {
            let targetCentres;
            if (req.user.role !== 'superAdmin') {
                targetCentres = await Centre.find({ _id: { $in: req.user.centres || [] }, status: { $ne: "deactive" }, centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] } }).select("_id");
            } else {
                targetCentres = await Centre.find({ status: { $ne: "deactive" }, centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] } }).select("_id");
            }
            const targetIds = targetCentres.map(c => c._id);
            query.centre = { $in: targetIds.length > 0 ? targetIds.map(toObjectId) : [new mongoose.Types.ObjectId()] };
        }

        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();
        const defaultFyStart = curMonth >= 3 ? curYear : curYear - 1;
        const defaultFinancialYear = `${defaultFyStart}-${defaultFyStart + 1}`;
        const targetFinancialYear = financialYear || defaultFinancialYear;
        const [fyStartYear] = targetFinancialYear.split('-').map(Number);

        let paymentStartDate, paymentEndDate;

        if (viewMode === "Custom" && startDate && endDate) {
            paymentStartDate = new Date(startDate);
            paymentEndDate = new Date(endDate);
            paymentEndDate.setHours(23, 59, 59, 999);

            const monthsInRange = [];
            let current = new Date(paymentStartDate.getFullYear(), paymentStartDate.getMonth(), 1);
            while (current <= paymentEndDate) {
                monthsInRange.push(monthNames[current.getMonth()]);
                current.setMonth(current.getMonth() + 1);
            }
            if (monthsInRange.length > 0) {
                query.month = { $in: [...new Set(monthsInRange)] };
            }
            query.financialYear = targetFinancialYear;
        } else if (viewMode === "Quarterly") {
            const quarterMap = {
                Q1: { months: ["April", "May", "June"], s: [fyStartYear, 3, 1], e: [fyStartYear, 5, 30] },
                Q2: { months: ["July", "August", "September"], s: [fyStartYear, 6, 1], e: [fyStartYear, 8, 30] },
                Q3: { months: ["October", "November", "December"], s: [fyStartYear, 9, 1], e: [fyStartYear, 11, 31] },
                Q4: { months: ["January", "February", "March"], s: [fyStartYear + 1, 0, 1], e: [fyStartYear + 1, 2, 31] }
            };

            const selQuarter = req.query.quarter;
            if (selQuarter && quarterMap[selQuarter]) {
                const qInfo = quarterMap[selQuarter];
                query.month = { $in: qInfo.months };
                paymentStartDate = new Date(...qInfo.s);
                paymentEndDate = new Date(...qInfo.e, 23, 59, 59, 999);
            } else {
                paymentStartDate = new Date(fyStartYear, 3, 1);
                paymentEndDate = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
            }
            query.financialYear = targetFinancialYear;
        } else if (viewMode === "Yearly") {
            query.financialYear = targetFinancialYear;
            paymentStartDate = new Date(fyStartYear, 3, 1);
            paymentEndDate = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
        } else {
            // Monthly view
            const targetYear = year ? parseInt(year) : curYear;
            query.year = targetYear;

            if (months) {
                const monthList = months.split(',').map(m => m.trim());
                query.month = { $in: monthList };

                const monthIndices = monthList.map(m => monthNames.indexOf(m)).filter(i => i >= 0);
                if (monthIndices.length > 0) {
                    const minIdx = Math.min(...monthIndices);
                    const maxIdx = Math.max(...monthIndices);
                    paymentStartDate = new Date(targetYear, minIdx, 1);
                    paymentEndDate = new Date(targetYear, maxIdx + 1, 0, 23, 59, 59, 999);
                }
            } else if (month) {
                query.month = month;
                const monthIndex = monthNames.indexOf(month);
                if (monthIndex >= 0) {
                    paymentStartDate = new Date(targetYear, monthIndex, 1);
                    paymentEndDate = new Date(targetYear, monthIndex + 1, 0, 23, 59, 59, 999);
                }
            } else {
                const targetMonthName = monthNames[now.getMonth()];
                query.month = targetMonthName;
                const monthIndex = monthNames.indexOf(targetMonthName);
                if (monthIndex >= 0) {
                    paymentStartDate = new Date(targetYear, monthIndex, 1);
                    paymentEndDate = new Date(targetYear, monthIndex + 1, 0, 23, 59, 59, 999);
                }
            }
        }

        // --- Fetch Exact Achieved Amount from Payments (mirrors transaction list logic) ---
        const paymentMatch = {
            billId: { $regex: /^PATH/i },
            paidAmount: { $gt: 0 },
            $or: [
                { status: { $in: ["PAID", "PARTIAL"] } },
                {
                    paymentMethod: "CHEQUE",
                    status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
                }
            ]
        };

        // Build pipeline dynamically: add effectiveDate then filter by date range
        const paymentPipeline = [
            { $match: paymentMatch },
            {
                // Use same date priority as transaction list: paidDate → receivedDate → createdAt
                $addFields: {
                    effectiveDate: { $ifNull: [{ $toDate: "$paidDate" }, { $toDate: "$receivedDate" }, "$createdAt"] }
                }
            }
        ];

        if (paymentStartDate && paymentEndDate) {
            paymentPipeline.push({
                $match: { effectiveDate: { $gte: paymentStartDate, $lte: paymentEndDate } }
            });
        }

        paymentPipeline.push(
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
                    courseFee: 1,
                    centreName: {
                        $ifNull: [
                            { $arrayElemAt: ["$adm.centre", 0] },
                            { $arrayElemAt: ["$badm.centre", 0] }
                        ]
                    }
                }
            },
            {
                // revenueBase = courseFee (without GST if set) else paidAmount/1.18
                $addFields: {
                    revenueBase: {
                        $cond: [
                            { $gt: ["$courseFee", 0] },
                            "$courseFee",
                            { $divide: ["$paidAmount", 1.18] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$centreName",
                    totalRevenue: { $sum: "$revenueBase" }   // without-GST amount matching transaction list
                }
            }
        );

        const paymentStats = await Payment.aggregate(paymentPipeline);

        const paymentMap = {};
        paymentStats.forEach(s => {
            if (s._id) paymentMap[s._id.trim().toUpperCase()] = s.totalRevenue;
        });

        // 1. Fetch performance for selected period
        // Always aggregate by centre to prevent duplicate rows if multiple entries exist
        let targets = await CentreTarget.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$centre",
                    targetAmount: { $sum: "$targetAmount" },
                    achievedAmount: { $sum: "$achievedAmount" },
                    achievedAmountExclGST: { $sum: "$achievedAmountExclGST" }
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
            { $unwind: "$centre" },
            { $match: { "centre.status": { $ne: "deactive" } } }
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
            }).populate({
                path: "centre",
                match: { status: { $ne: "deactive" } }
            });

            const filteredPrevTargets = prevTargets.filter(t => t.centre);

            const targetMap = {};
            filteredPrevTargets.forEach(t => {
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
                        courseFee: 1,
                        centreName: {
                            $ifNull: [
                                { $arrayElemAt: ["$adm.centre", 0] },
                                { $arrayElemAt: ["$badm.centre", 0] }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        revenueBase: {
                            $cond: [
                                { $gt: ["$courseFee", 0] },
                                "$courseFee",
                                { $divide: ["$paidAmount", 1.18] }
                            ]
                        }
                    }
                },
                { $group: { _id: "$centreName", totalPaid: { $sum: "$revenueBase" } } }
            ]);

            const prevPaymentMap = {};
            prevPaymentStats.forEach(s => {
                if (s._id) prevPaymentMap[s._id.trim().toUpperCase()] = s.totalPaid;
            });

            const prevRankList = filteredPrevTargets.map(t => {
                const cName = t.centre?.centreName?.trim().toUpperCase();
                const target = targetMap[cName] || 0;
                const achieved = prevPaymentMap[cName] !== undefined ? prevPaymentMap[cName] : (t.achievedAmountExclGST || 0);
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
                $lookup: {
                    from: "centreschemas",
                    localField: "centre",
                    foreignField: "_id",
                    as: "centreData"
                }
            },
            { $unwind: "$centreData" },
            { $match: { "centreData.status": { $ne: "deactive" } } },
            {
                $addFields: {
                    pct: {
                        $cond: [{ $gt: ["$targetAmount", 0] }, { $multiply: [{ $divide: ["$achievedAmountExclGST", "$targetAmount"] }, 100] }, 0]
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
        // Both targetAmt and achievedAmt are WITHOUT GST so % = revenueBase / targetAmount × 100
        // This matches the transaction list which shows without-GST amounts.
        let rankData = targets.map(t => {
            const centerObj = t.centre || {};
            const centerId = (centerObj._id || t._id).toString();
            const cName = (centerObj.centreName || "").trim().toUpperCase();

            // targetAmount in CentreTarget is stored without GST
            const targetAmt = t.targetAmount || 0;
            // Use exact payment revenueBase (without GST) if available, else fallback
            const achievedAmt = paymentMap[cName] !== undefined ? paymentMap[cName] : (t.achievedAmountExclGST || 0);

            const achievementPct = targetAmt > 0 ? (achievedAmt / targetAmt) * 100 : 0;
            const prev = prevDataMap[centerId] || { achievementPct: 0, rank: null };
            const best = bestMap[centerId] || achievementPct;

            return {
                centreId: centerId,
                centreName: centerObj.centreName || "Unknown",
                target: targetAmt,     // without GST — matches transaction list
                achieved: achievedAmt, // without GST — matches transaction list
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
