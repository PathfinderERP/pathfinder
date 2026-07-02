import LeadManagement from "../../models/LeadManagement.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

export const cleanDuplicates = async (req, res) => {
    try {
        const filters = req.body.filters || {};
        const matchQuery = await buildLeadQuery(filters, req.user);
        
        // Ensure phoneNumber exists and is not empty
        matchQuery.phoneNumber = { $exists: true, $ne: "" };

        // Aggregate to find duplicate phone numbers
        const duplicates = await LeadManagement.aggregate([
            { $match: matchQuery },
            { $sort: { createdAt: -1 } }, // Keep the newest lead
            {
                $group: {
                    _id: "$phoneNumber",
                    leadIds: { $push: "$_id" },
                    count: { $sum: 1 }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);

        const deleteIds = [];
        duplicates.forEach(doc => {
            // keep index 0 (the newest lead), delete the rest
            const duplicatesToDelete = doc.leadIds.slice(1);
            deleteIds.push(...duplicatesToDelete);
        });

        let deletedCount = 0;
        if (deleteIds.length > 0) {
            const result = await LeadManagement.deleteMany({ _id: { $in: deleteIds } });
            deletedCount = result.deletedCount;
        }

        res.status(200).json({
            message: "Duplicates cleaned successfully",
            checkedNumbers: duplicates.length,
            deletedCount
        });

    } catch (err) {
        console.error("Clean duplicates error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
