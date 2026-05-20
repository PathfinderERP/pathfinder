import LeadManagement from "../../models/LeadManagement.js";

export const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Handle empty strings for ObjectId fields
        if (!updateData.className) delete updateData.className;
        if (!updateData.centre) delete updateData.centre;
        if (!updateData.course) delete updateData.course;
        if (!updateData.board) delete updateData.board;

        // If leadResponsibility is being updated, set assignedAt
        if (updateData.leadResponsibility) {
            updateData.assignedAt = new Date();
        }

        // If source is being updated, set isWalkIn flag
        if (updateData.source !== undefined) {
            updateData.isWalkIn = updateData.source && /^walk[- ]?in$/i.test(updateData.source) ? true : false;
        }

        const updatedLead = await LeadManagement.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate(['className', 'centre', 'course', 'board']);

        if (!updatedLead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.status(200).json({
            message: "Lead updated successfully",
            lead: updatedLead,
        });

    } catch (err) {
        console.error("Lead update error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const tagWalkIn = async (req, res) => {
    try {
        const { id } = req.params;

        const updatedLead = await LeadManagement.findByIdAndUpdate(
            id,
            { isWalkIn: true, source: "Walk In" },
            { new: true }
        ).populate(['className', 'centre', 'course', 'board']);

        if (!updatedLead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.status(200).json({
            message: "Lead tagged as Walk-In successfully",
            lead: updatedLead
        });
    } catch (err) {
        console.error("Tag walk-in error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
