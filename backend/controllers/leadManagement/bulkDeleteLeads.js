import LeadManagement from "../../models/LeadManagement.js";

export const bulkDeleteLeads = async (req, res) => {
    try {
        const { leadIds } = req.body;

        if (!Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ message: "Invalid or empty lead IDs array" });
        }

        const result = await LeadManagement.deleteMany({ _id: { $in: leadIds } });

        res.status(200).json({
            message: "Leads deleted successfully",
            deletedCount: result.deletedCount,
        });

    } catch (err) {
        console.error("Bulk lead deletion error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
