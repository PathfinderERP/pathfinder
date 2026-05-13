import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";
import { calculateCentreTargetAchieved, calculateCentreTargetAchievedYearly, calculateCentreTargetAchievedMultiMonth } from "../../services/centreTargetService.js";

// Helper for quarters
const getQuarterMonths = (quarter) => {
    switch (quarter) {
        case "Q1": return ["April", "May", "June"];
        case "Q2": return ["July", "August", "September"];
        case "Q3": return ["October", "November", "December"];
        case "Q4": return ["January", "February", "March"];
        default: return [];
    }
};

const calculateDateWiseTarget = (targetRec, customStart, customEnd) => {
    if (!customStart || !customEnd) return targetRec.targetAmount || 0;

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const cleanMonth = (targetRec.month || "").trim();
    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === cleanMonth.toLowerCase());
    if (monthIndex === -1) return targetRec.targetAmount || 0;

    const targetYear = parseInt(targetRec.year, 10);
    const monthStart = new Date(targetYear, monthIndex, 1);
    const monthEnd = new Date(targetYear, monthIndex + 1, 0); // Last day of month
    const totalDaysInMonth = monthEnd.getDate();

    // Parse customStart and customEnd safely assuming YYYY-MM-DD string format
    let rangeStart = new Date(customStart);
    let rangeEnd = new Date(customEnd);

    if (typeof customStart === 'string' && customStart.includes('-')) {
        const parts = customStart.split('-');
        if (parts.length === 3) {
            rangeStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
    }
    if (typeof customEnd === 'string' && customEnd.includes('-')) {
        const parts = customEnd.split('-');
        if (parts.length === 3) {
            rangeEnd = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
    }

    const overlapStart = new Date(Math.max(monthStart, rangeStart));
    const overlapEnd = new Date(Math.min(monthEnd, rangeEnd));

    if (overlapStart > overlapEnd) return 0;

    const overlappingDays = Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
    return ((targetRec.targetAmount || 0) / totalDaysInMonth) * overlappingDays;
};

export const getTargetAnalysis = async (req, res) => {
    try {
        const {
            viewMode, // "Monthly", "Quarterly", "Yearly"
            financialYear,
            year,
            month,
            quarter,
            centreIds // Comma separated IDs or array
        } = req.query;

        console.log("Target Analysis Query:", req.query);

        let query = {};
        if (financialYear && viewMode !== "Custom") query.financialYear = financialYear;

        // Centre Filter
        let allowedCentreIds = [];
        if (req.user.role !== 'superAdmin') {
            allowedCentreIds = (req.user.centres || []).map(id => id.toString());
        }

        if (centreIds) {
            const requestedIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            const validRequestedIds = requestedIds.filter(id => id && id.trim());

            if (req.user.role !== 'superAdmin') {
                // Intersect requested with allowed
                const finalIds = validRequestedIds.filter(id => allowedCentreIds.includes(id));
                query.centre = { $in: finalIds.length > 0 ? finalIds : ["__NONE__"] };
            } else if (validRequestedIds.length > 0) {
                query.centre = { $in: validRequestedIds };
            }
        } else if (req.user.role !== 'superAdmin') {
            // No specific centres requested, but user is restricted
            query.centre = { $in: allowedCentreIds.length > 0 ? allowedCentreIds : ["__NONE__"] };
        }

        // Time Filter Logic
        if (viewMode === "Monthly") {
            if (year) query.year = parseInt(year);
            if (month) query.month = month;
        } else if (viewMode === "Quarterly") {
            if (quarter) {
                const qMonths = getQuarterMonths(quarter);
                const qMatch = qMonths.join(",");
                query.$or = [
                    { month: { $in: qMonths } },
                    { month: qMatch }
                ];
            }
        } else if (viewMode === "Yearly") {
            // financialYear is already in query
        } else if (viewMode === "Custom") {
            const { startDate, endDate } = req.query;
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);

                const filterOr = [];
                const monthNames = [
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                ];

                let current = new Date(start.getFullYear(), start.getMonth(), 1);
                while (current <= end) {
                    filterOr.push({
                        month: monthNames[current.getMonth()],
                        year: current.getFullYear()
                    });
                    current.setMonth(current.getMonth() + 1);
                }

                if (filterOr.length > 0) {
                    query.$or = filterOr;
                }
            }
        }

        const targets = await CentreTarget.find(query)
            .populate({ path: 'centre', select: 'centreName' });

        // Aggregation per Centre
        const aggregated = {};

        for (const t of targets) {
            if (!t.centre) continue;
            const cId = t.centre._id.toString();
            const cName = t.centre.centreName;

            if (!aggregated[cId]) {
                aggregated[cId] = {
                    centreId: cId,
                    centreName: cName,
                    target: 0,
                    achieved: 0
                };
            }

            if (viewMode === "Custom" && req.query.startDate && req.query.endDate) {
                aggregated[cId].target += calculateDateWiseTarget(t, req.query.startDate, req.query.endDate);
            } else {
                aggregated[cId].target += (t.targetAmount || 0);
            }

            // Calculate Real-time Achievement for this target record
            let realTimeAchieved = 0;
            if (t.month === "YEARLY") {
                const res = await calculateCentreTargetAchievedYearly(cName, t.financialYear);
                realTimeAchieved = res.totalExclGST;
            } else if (t.month && t.month.includes(",")) {
                // Quarterly or specific multi-month
                const res = await calculateCentreTargetAchievedMultiMonth(cName, t.month, t.financialYear);
                realTimeAchieved = res.totalExclGST;
            } else {
                // Monthly
                const res = await calculateCentreTargetAchieved(cName, t.month, t.year, viewMode === "Custom" ? req.query.startDate : null, viewMode === "Custom" ? req.query.endDate : null);
                realTimeAchieved = res.totalExclGST;
            }

            aggregated[cId].achieved += realTimeAchieved;
        }

        const result = Object.values(aggregated);

        // Sort? Maybe by Target descending?
        result.sort((a, b) => b.target - a.target);

        res.status(200).json({ data: result });

    } catch (error) {
        console.error("Error in Target Analysis:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
