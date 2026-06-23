import CampaignLead from "../../models/CampaignLead.js";
import LeadManagement from "../../models/LeadManagement.js";
import Campaign from "../../models/Campaign.js";

export const pushCampaignLeads = async (req, res) => {
    try {
        const { campaignId } = req.body;
        if (!campaignId) {
            return res.status(400).json({ message: "Campaign ID is required." });
        }

        // Find campaign to get its name
        const campaign = await Campaign.findById(campaignId).lean();
        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        // Find all unpushed leads for this campaign
        const unpushedLeads = await CampaignLead.find({ campaign: campaignId, isPushed: false }).lean();
        if (unpushedLeads.length === 0) {
            return res.status(400).json({ message: "No unpushed leads found for this campaign." });
        }

        // Map them to LeadManagement schema structure
        const leadsToInsert = unpushedLeads.map(lead => {
            const { _id, isPushed, pushedAt, createdAt, updatedAt, __v, ...rest } = lead;
            return {
                ...rest,
                campaignFrom: campaign.adName, // Ensure campaign name is stored
                assignedAt: new Date()
            };
        });

        // Insert into LeadManagement
        const insertedLeads = await LeadManagement.insertMany(leadsToInsert, { ordered: false });

        // Mark them as pushed in CampaignLead
        const leadIds = unpushedLeads.map(lead => lead._id);
        await CampaignLead.updateMany(
            { _id: { $in: leadIds } },
            { $set: { isPushed: true, pushedAt: new Date() } }
        );

        // Update campaign lead count in Campaign model
        await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { leads: insertedLeads.length }
        });

        return res.status(200).json({
            message: `${insertedLeads.length} lead(s) successfully pushed to Lead Management.`,
            count: insertedLeads.length
        });
    } catch (error) {
        console.error("Push campaign leads error:", error);
        return res.status(500).json({ message: "Server error during lead push.", error: error.message });
    }
};
