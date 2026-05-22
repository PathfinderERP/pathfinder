import LeadManagement from "../../models/LeadManagement.js";

export const bulkUpdateLeads = async (req, res) => {
    try {
        const { ids, updateData } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No lead IDs provided" });
        }

        const dataToUpdate = {};
        
        // Only include fields that are explicitly provided and not null/undefined
        const fields = [
            'name', 'email', 'phoneNumber', 'schoolName', 'className', 'centre',
            'course', 'board', 'source', 'targetExam', 'leadType', 'leadResponsibility', 'isCounseled'
        ];

        fields.forEach(field => {
            if (updateData[field] !== undefined && updateData[field] !== null && updateData[field] !== "") {
                dataToUpdate[field] = updateData[field];
            }
        });

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: "No valid fields provided for update" });
        }

        // If leadResponsibility is being updated, set assignedAt
        if (dataToUpdate.leadResponsibility) {
            dataToUpdate.assignedAt = new Date();
        }

        const result = await LeadManagement.updateMany(
            { _id: { $in: ids } },
            { $set: dataToUpdate }
        );

        res.status(200).json({
            message: `Successfully updated ${result.modifiedCount} of ${ids.length} selected leads.`,
            data: result
        });
    } catch (err) {
        console.error("Bulk update leads error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
