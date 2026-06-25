import LeadManagement from "../../models/LeadManagement.js";
import CampaignLead from "../../models/CampaignLead.js";

export const checkDuplicatePhone = async (req, res) => {
    try {
        const { phone, excludeLeadId } = req.query;
        const result = { taken: false, name: "" };

        if (phone && phone.trim() !== "") {
            const cleanPhone = phone.trim();
            
            // Check LeadManagement
            const queryLead = {
                $or: [{ phoneNumber: cleanPhone }, { secondPhoneNumber: cleanPhone }],
                ...(excludeLeadId ? { _id: { $ne: excludeLeadId } } : {})
            };
            const existingLead = await LeadManagement.findOne(queryLead).select("name phoneNumber").lean();
            if (existingLead) {
                result.taken = true;
                result.name = existingLead.name || "Existing Lead";
                return res.status(200).json(result);
            }

            // Check CampaignLead
            const queryCampaign = {
                $or: [{ phoneNumber: cleanPhone }, { secondPhoneNumber: cleanPhone }],
                ...(excludeLeadId ? { _id: { $ne: excludeLeadId } } : {})
            };
            const existingCampaign = await CampaignLead.findOne(queryCampaign).select("name phoneNumber").lean();
            if (existingCampaign) {
                result.taken = true;
                result.name = existingCampaign.name || "Existing Campaign Lead";
                return res.status(200).json(result);
            }
        }

        res.status(200).json(result);
    } catch (error) {
        console.error("Check duplicate phone error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
