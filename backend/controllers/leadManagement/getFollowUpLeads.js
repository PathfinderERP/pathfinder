import LeadManagement from "../../models/LeadManagement.js";
export const getFollowUpLeads = async (req, res) => {
    try {
        const { centreId } = req.query;
        const leads = await LeadManagement.find({
            centreId,
            followUpDate: { $gte: new Date() },
            status: "Follow Up"
        });
        res.json(leads);
    } catch (err) {
        console.error("Error fetching follow-up leads:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};