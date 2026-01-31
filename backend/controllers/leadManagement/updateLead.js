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
