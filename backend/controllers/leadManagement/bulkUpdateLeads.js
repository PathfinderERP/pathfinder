import LeadManagement from "../../models/LeadManagement.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

export const bulkUpdateLeads = async (req, res) => {
    try {
        const { ids, filters, updateData } = req.body;

        let query = {};
        if (ids && Array.isArray(ids) && ids.length > 0) {
            query = { _id: { $in: ids } };
        } else if (filters) {
            query = await buildLeadQuery(filters, req.user);
        } else {
            return res.status(400).json({ message: "No lead selection or filters provided" });
        }

        const dataToUpdate = {};
        
        // Only include fields that are explicitly provided and not null/undefined
        const fields = [
            'name', 'email', 'phoneNumber', 'schoolName', 'className', 'centre',
            'course', 'board', 'source', 'targetExam', 'leadType', 'leadResponsibility', 'isCounseled', 'isPriority', 'feedback'
        ];

        fields.forEach(field => {
            if (updateData[field] !== undefined && updateData[field] !== null && updateData[field] !== "") {
                if (field === 'isPriority') {
                    dataToUpdate[field] = updateData[field] === "true" || updateData[field] === true;
                } else {
                    dataToUpdate[field] = updateData[field];
                }
            }
        });

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: "No valid fields provided for update" });
        }

        const leads = await LeadManagement.find(query);
        if (leads.length === 0) {
            return res.status(404).json({ message: "No leads found matching the criteria" });
        }

        let updatedCount = 0;

        for (const lead of leads) {
            // Apply fields
            Object.keys(dataToUpdate).forEach(field => {
                if (field === 'feedback') {
                    // Handled separately below
                    return;
                }
                lead[field] = dataToUpdate[field];
            });

            if (dataToUpdate.leadResponsibility) {
                lead.assignedAt = new Date();
            }

            if (dataToUpdate.feedback) {
                const newFollowUp = {
                    date: new Date(),
                    feedback: dataToUpdate.feedback,
                    remarks: "Bulk updated feedback",
                    updatedBy: req.user?.name || 'System',
                    status: lead.leadType || 'NEUTRAL LEAD'
                };
                lead.followUps.push(newFollowUp);
                lead.lastFollowUpDate = newFollowUp.date;
            }

            await lead.save();
            updatedCount++;
        }

        res.status(200).json({
            message: `Successfully updated ${updatedCount} selected leads.`,
            updatedCount
        });
    } catch (err) {
        console.error("Bulk update leads error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
