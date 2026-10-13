import CampaignLead from "../../models/CampaignLead.js";
import LeadManagement from "../../models/LeadManagement.js";
import Campaign from "../../models/Campaign.js";
import { cleanPhoneNumber, getPhoneVariants } from "../../utils/leadStudentMatcher.js";

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

        // Collect all non-empty primary & secondary phone numbers from unpushed leads
        const incomingPhones = new Set();
        unpushedLeads.forEach(lead => {
            if (lead.phoneNumber) incomingPhones.add(lead.phoneNumber);
            if (lead.secondPhoneNumber) incomingPhones.add(lead.secondPhoneNumber);
        });

        // Find existing leads in LeadManagement (All Leads) by phone variants
        const existingPhoneMap = new Map();
        if (incomingPhones.size > 0) {
            const variantList = getPhoneVariants(incomingPhones);
            const leadsWithPhones = await LeadManagement.find({
                $or: [
                    { phoneNumber: { $in: variantList } },
                    { secondPhoneNumber: { $in: variantList } }
                ]
            }, 'name phoneNumber secondPhoneNumber').lean();

            const recordPhone = (phone, name) => {
                if (!phone) return;
                const pClean = cleanPhoneNumber(phone);
                if (!pClean) return;
                if (!existingPhoneMap.has(pClean)) {
                    existingPhoneMap.set(pClean, name || 'Existing Lead');
                }
            };

            leadsWithPhones.forEach(l => {
                recordPhone(l.phoneNumber, l.name);
                recordPhone(l.secondPhoneNumber, l.name);
            });
        }

        // Separate leads into duplicateLeads and validLeadsToPush
        const duplicateLeads = [];
        const validLeadsToPush = [];
        const seenInBatchMap = new Map(); // cleanPhone -> leadName (intra-batch deduplication)

        for (const lead of unpushedLeads) {
            let isDup = false;
            let dupReason = "";

            const cleanP = cleanPhoneNumber(lead.phoneNumber);
            const cleanSecP = cleanPhoneNumber(lead.secondPhoneNumber);

            // 1. Check primary phone against All Leads
            if (cleanP) {
                if (existingPhoneMap.has(cleanP)) {
                    isDup = true;
                    dupReason = `Phone number '${lead.phoneNumber}' already exists in All Leads (${existingPhoneMap.get(cleanP)}).`;
                } else if (seenInBatchMap.has(cleanP)) {
                    isDup = true;
                    dupReason = `Phone number '${lead.phoneNumber}' is duplicated among campaign leads.`;
                }
            }

            // 2. Check secondary phone against All Leads
            if (!isDup && cleanSecP) {
                if (existingPhoneMap.has(cleanSecP)) {
                    isDup = true;
                    dupReason = `Secondary phone '${lead.secondPhoneNumber}' already exists in All Leads (${existingPhoneMap.get(cleanSecP)}).`;
                } else if (seenInBatchMap.has(cleanSecP)) {
                    isDup = true;
                    dupReason = `Secondary phone '${lead.secondPhoneNumber}' is duplicated among campaign leads.`;
                }
            }

            if (isDup) {
                duplicateLeads.push({
                    lead,
                    reason: dupReason
                });
            } else {
                if (cleanP) seenInBatchMap.set(cleanP, lead.name);
                if (cleanSecP) seenInBatchMap.set(cleanSecP, lead.name);
                validLeadsToPush.push(lead);
            }
        }

        // Flag duplicate leads in CampaignLead so they are recorded as duplicate and will NOT be pushed
        if (duplicateLeads.length > 0) {
            const duplicateOps = duplicateLeads.map(d => ({
                updateOne: {
                    filter: { _id: d.lead._id },
                    update: {
                        $set: {
                            isDuplicate: true,
                            duplicateReason: d.reason
                        }
                    }
                }
            }));
            await CampaignLead.bulkWrite(duplicateOps);
        }

        // If no valid leads to push, return early
        if (validLeadsToPush.length === 0) {
            return res.status(200).json({
                message: `0 leads pushed. All ${duplicateLeads.length} lead(s) already exist in All Leads and were skipped as duplicates.`,
                count: 0,
                skippedCount: duplicateLeads.length,
                skippedDetails: duplicateLeads.map(d => ({
                    name: d.lead.name,
                    phoneNumber: d.lead.phoneNumber,
                    secondPhoneNumber: d.lead.secondPhoneNumber,
                    reason: d.reason
                }))
            });
        }

        // Map valid leads to LeadManagement schema structure
        const leadsToInsert = validLeadsToPush.map(lead => {
            const { _id, isPushed, isDuplicate, duplicateReason, pushedAt, createdAt, updatedAt, __v, ...rest } = lead;
            return {
                ...rest,
                campaign: campaignId,
                campaignFrom: campaign.adName, // Ensure campaign name is stored
                isPriority: true,
                assignedAt: new Date()
            };
        });

        // Insert into LeadManagement
        const insertedLeads = await LeadManagement.insertMany(leadsToInsert, { ordered: false });

        // Mark pushed leads in CampaignLead
        const pushedIds = validLeadsToPush.map(lead => lead._id);
        await CampaignLead.updateMany(
            { _id: { $in: pushedIds } },
            { $set: { isPushed: true, pushedAt: new Date(), isDuplicate: false, duplicateReason: "" } }
        );

        // Update campaign lead count in Campaign model
        await Campaign.findByIdAndUpdate(campaignId, {
            $inc: { leads: insertedLeads.length }
        });

        let message = `${insertedLeads.length} lead(s) successfully pushed to Lead Management.`;
        if (duplicateLeads.length > 0) {
            message += ` ${duplicateLeads.length} duplicate lead(s) already exist in All Leads and were skipped.`;
        }

        return res.status(200).json({
            message,
            count: insertedLeads.length,
            skippedCount: duplicateLeads.length,
            skippedDetails: duplicateLeads.map(d => ({
                name: d.lead.name,
                phoneNumber: d.lead.phoneNumber,
                secondPhoneNumber: d.lead.secondPhoneNumber,
                reason: d.reason
            }))
        });
    } catch (error) {
        console.error("Push campaign leads error:", error);
        return res.status(500).json({ message: "Server error during lead push.", error: error.message });
    }
};
