import LeadManagement from "../../models/LeadManagement.js";

export const deleteLead = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedLead = await LeadManagement.findByIdAndDelete(id);

        if (!deletedLead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.status(200).json({
            message: "Lead deleted successfully",
            lead: deletedLead,
        });

    } catch (err) {
        console.error("Lead deletion error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
