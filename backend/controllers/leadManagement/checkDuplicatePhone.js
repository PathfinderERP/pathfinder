import LeadManagement from "../../models/LeadManagement.js";
import CampaignLead from "../../models/CampaignLead.js";

import { isNameMatch } from "../../utils/leadStudentMatcher.js";

export const checkDuplicatePhone = async (req, res) => {
    try {
        const { phone, name, excludeLeadId } = req.query;
        const result = { taken: false, name: "" };

        if (phone && phone.trim() !== "") {
            const cleanPhone = phone.trim();
            
            // Check LeadManagement
            const queryLead = {
                $or: [{ phoneNumber: cleanPhone }, { secondPhoneNumber: cleanPhone }],
                ...(excludeLeadId ? { _id: { $ne: excludeLeadId } } : {})
            };
            const existingLeads = await LeadManagement.find(queryLead).select("name phoneNumber").lean();
            if (existingLeads.length > 0) {
                const matchedLead = name 
                    ? existingLeads.find(l => isNameMatch(name, l.name))
                    : existingLeads[0];
                if (matchedLead) {
                    result.taken = true;
                    result.name = matchedLead.name || "Existing Lead";
                    return res.status(200).json(result);
                }
            }

            // Check CampaignLead
            const queryCampaign = {
                $or: [{ phoneNumber: cleanPhone }, { secondPhoneNumber: cleanPhone }],
                ...(excludeLeadId ? { _id: { $ne: excludeLeadId } } : {})
            };
            const existingCampaigns = await CampaignLead.find(queryCampaign).select("name phoneNumber").lean();
            if (existingCampaigns.length > 0) {
                const matchedCampaign = name
                    ? existingCampaigns.find(c => isNameMatch(name, c.name))
                    : existingCampaigns[0];
                if (matchedCampaign) {
                    result.taken = true;
                    result.name = matchedCampaign.name || "Existing Campaign Lead";
                    return res.status(200).json(result);
                }
            }
        }

        res.status(200).json(result);
    } catch (error) {
        console.error("Check duplicate phone error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
