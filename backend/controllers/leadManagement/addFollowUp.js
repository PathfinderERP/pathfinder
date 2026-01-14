import LeadManagement from "../../models/LeadManagement.js";

export const addFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, feedback, remarks, nextFollowUpDate, updatedBy, callStartTime, callEndTime, callDuration } = req.body;

        const lead = await LeadManagement.findById(id);
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        const newFollowUp = {
            date: date || new Date(),
            feedback,
            remarks,
            nextFollowUpDate,
            updatedBy: updatedBy || (req.user ? req.user.name : 'Unknown'),
            callStartTime,
            callEndTime,
            callDuration
        };

        lead.followUps.push(newFollowUp);
        
        // Update root fields
        lead.lastFollowUpDate = newFollowUp.date;
        if (nextFollowUpDate) {
            lead.nextFollowUpDate = nextFollowUpDate;
        }

        await lead.save();

        res.status(200).json({
            message: "Follow-up added successfully",
            lead
        });

    } catch (err) {
        console.error("Add follow-up error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};