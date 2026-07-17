import LeadManagement from "../../models/LeadManagement.js";

export const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        const phoneRegex = /^[6-9]\d{9}$/;
        if (updateData.phoneNumber !== undefined) {
            const phoneStr = String(updateData.phoneNumber).trim();
            if (!phoneStr || !phoneRegex.test(phoneStr)) {
                return res.status(400).json({ message: "enter the correct phone number" });
            }
        }

        if (updateData.secondPhoneNumber !== undefined && updateData.secondPhoneNumber !== null) {
            const secondPhoneStr = String(updateData.secondPhoneNumber).trim();
            if (secondPhoneStr === "" || secondPhoneStr === "0" || secondPhoneStr === "0.0") {
                updateData.secondPhoneNumber = "";
            } else if (!phoneRegex.test(secondPhoneStr)) {
                return res.status(400).json({ message: "enter the correct phone number" });
            }
        }

        // Handle empty strings for ObjectId fields
        if (!updateData.className) delete updateData.className;
        if (!updateData.centre) delete updateData.centre;
        if (!updateData.course) {
            delete updateData.course;
        } else {
            updateData.courseText = ""; // Clear courseText if we map to a master course
        }
        if (!updateData.board) delete updateData.board;
        if (!updateData.campaign) {
            updateData.campaign = null;
        }

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
        ).populate(['className', 'centre', 'course', 'board', 'campaign']);

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

        const lead = await LeadManagement.findById(id);
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        if (lead.isWalkIn) {
            // Unmark as walk-in
            lead.isWalkIn = false;
            lead.walkInBy = undefined;
            if (lead.source === "Walk In") {
                lead.source = undefined;
            }
        } else {
            // Mark as walk-in
            lead.isWalkIn = true;
            lead.source = "Walk In";
            if (!lead.walkInDate) {
                lead.walkInDate = new Date();
            }
            lead.walkInBy = req.user.id || req.user._id;
        }

        await lead.save();
        await lead.populate(['className', 'centre', 'course', 'board']);

        res.status(200).json({
            message: lead.isWalkIn ? "Lead tagged as Walk-In successfully" : "Lead unmarked as Walk-In successfully",
            lead
        });
    } catch (err) {
        console.error("Tag walk-in error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const toggleLeadPriority = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user is SuperAdmin or Zonal Manager
        const userRole = req.user.role?.toLowerCase()?.replace(/\s+/g, '') || '';
        const allowedRoles = ['superadmin', 'zonalmanager', 'assistantzonalmanager'];
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Access denied. Only SuperAdmin or Zonal Manager can toggle lead priority." });
        }

        const lead = await LeadManagement.findById(id);
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        lead.isPriority = !lead.isPriority;
        await lead.save();

        const updatedLead = await LeadManagement.findById(id)
            .populate(['className', 'centre', 'course', 'board']);

        res.status(200).json({
            message: `Lead priority updated successfully`,
            lead: updatedLead
        });
    } catch (err) {
        console.error("Toggle lead priority error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

