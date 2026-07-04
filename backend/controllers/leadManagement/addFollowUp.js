import LeadManagement from "../../models/LeadManagement.js";

export const addFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, feedback, remarks, nextFollowUpDate, updatedBy, callStartTime, callEndTime, callDuration, leadType, walkInDate } = req.body;
        console.log(`[AddFollowUp] ID: ${id}, LeadType: ${leadType}, Feedback: ${feedback}, WalkInDate: ${walkInDate}`);

        const lead = await LeadManagement.findById(id);
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        if (!feedback) {
            return res.status(400).json({ message: "Feedback is required" });
        }
        if (!leadType) {
            return res.status(400).json({ message: "Lead status is required" });
        }
        if (!["COLD LEAD", "INVALID LEAD"].includes(leadType) && !nextFollowUpDate) {
            return res.status(400).json({ message: "Next follow-up date is required" });
        }
        if (leadType === "HOT LEAD" && !walkInDate) {
            return res.status(400).json({ message: "Walk in date is required for hot leads" });
        }

        const newFollowUp = {
            date: date || new Date(),
            feedback,
            remarks,
            nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
            updatedBy: updatedBy || (req.user ? req.user.name : 'Unknown'),
            status: leadType, // Save the status at time of follow-up
            callStartTime,
            callEndTime,
            callDuration
        };

        lead.followUps.push(newFollowUp);

        // Update root fields
        lead.lastFollowUpDate = newFollowUp.date;
        if (leadType === "COLD LEAD") {
            lead.nextFollowUpDate = undefined;
        } else if (nextFollowUpDate) {
            lead.nextFollowUpDate = nextFollowUpDate;
        }

        // Update lead root status if provided
        if (leadType) {
            lead.leadType = leadType;
        }

        if (walkInDate) {
            lead.walkInDate = new Date(walkInDate);
            lead.isWalkIn = true;
            lead.walkInBy = req.user?._id || req.user?.id;
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