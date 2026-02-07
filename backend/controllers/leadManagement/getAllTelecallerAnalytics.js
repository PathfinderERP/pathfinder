import LeadManagement from "../../models/LeadManagement.js";

export const getAllTelecallerAnalytics = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        // Build follow-up filter
        const followUpFilter = {};
        if (fromDate || toDate) {
            followUpFilter["followUps.date"] = {};
            if (fromDate) followUpFilter["followUps.date"].$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                followUpFilter["followUps.date"].$lte = end;
            }
        }

        // Aggregate to get calls count per telecaller
        const performanceData = await LeadManagement.aggregate([
            { $unwind: "$followUps" },
            { $match: followUpFilter },
            {
                $group: {
                    _id: "$leadResponsibility",
                    calls: { $sum: 1 },
                    hotLeads: {
                        $sum: {
                            $cond: [
                                { $in: ["$leadType", ["HOT LEAD", "ADMISSION TAKEN"]] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    name: "$_id",
                    calls: 1,
                    hotLeads: 1,
                    _id: 0
                }
            },
            { $sort: { calls: -1 } }
        ]);

        res.status(200).json(performanceData);
    } catch (error) {
        console.error("Error fetching all telecaller analytics:", error);
        res.status(500).json({ message: "Server error fetching summary analytics" });
    }
};
