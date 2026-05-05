import LeadManagement from "../../models/LeadManagement.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

/**
 * Deletes leads based on provided filters and user permissions.
 * This allows bulk deletion of all leads matching current view/filters.
 */
export const bulkDeleteLeadsByFilter = async (req, res) => {
    try {
        // Build the query using the same logic as getLeads
        const query = await buildLeadQuery(req.body.filters || {}, req.user);

        // Security check: Don't allow empty filter deletion (would delete everything)
        // Unless it's a superadmin and they really meant it? No, keep it safe.
        const filterCount = Object.keys(query).filter(k => k !== 'isCounseled').length;
        if (filterCount === 0 && !['superadmin', 'super admin'].includes(req.user.role?.toLowerCase()?.replace(/\s+/g, ''))) {
            return res.status(400).json({ message: "Cannot perform bulk delete without filters for security reasons." });
        }

        const result = await LeadManagement.deleteMany(query);

        res.status(200).json({
            message: `Successfully deleted ${result.deletedCount} leads matching the filters.`,
            deletedCount: result.deletedCount,
        });

    } catch (err) {
        console.error("Bulk filtered lead deletion error:", err);
        res.status(500).json({ message: "Server error during bulk deletion", error: err.message });
    }
};
