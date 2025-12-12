import CentreTarget from "../../models/Sales/CentreTarget.js";
import Centre from "../../models/Master_data/Centre.js";

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
        if (financialYear) query.financialYear = financialYear;

        // Centre Filter
        if (centreIds) {
            const ids = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            if (ids.length > 0) {
                query.centre = { $in: ids };
            }
        }

        // Time Filter Logic
        if (viewMode === "Monthly") {
            if (year) query.year = parseInt(year);
            if (month) query.month = month;
        } else if (viewMode === "Quarterly") {
            // For Quarter, we need to match multiple months.
            // Usually Financial Year Q1 = Apr, May, Jun.
            // If we rely on stored 'month' field:
            if (quarter) {
                const months = getQuarterMonths(quarter);
                query.month = { $in: months };
            }
            // Year handling for quarters is tricky (Jan-Mar is Year+1 of FY start)
            // But existing data has `financialYear`. So mostly we rely on `financialYear` + `months`.
            // If `year` is strictly passed, it might filter incorrectly for Q4 (which is next calendar year).
            // So for Quarterly/Yearly, relying on `financialYear` is safer if data is consistent.
        } else if (viewMode === "Yearly") {
            // Just financialYear filter is enough usually.
        }

        const targets = await CentreTarget.find(query)
            .populate({ path: 'centre', select: 'centreName' });

        // Aggregation per Centre
        // We want to return: [{ centreName, target, achieved }]
        // If multiple records per centre (e.g. Quarterly view has 3 months), sum them up.

        const aggregated = {}; // centreId -> { centreName, target, achieved }

        targets.forEach(t => {
            if (!t.centre) return;
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

            aggregated[cId].target += (t.targetAmount || 0);
            aggregated[cId].achieved += (t.achievedAmount || 0);
        });

        const result = Object.values(aggregated);

        // Sort? Maybe by Target descending?
        result.sort((a, b) => b.target - a.target);

        res.status(200).json({ data: result });

    } catch (error) {
        console.error("Error in Target Analysis:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
