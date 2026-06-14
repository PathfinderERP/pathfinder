import LeadManagement from "../../models/LeadManagement.js";

export const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Handle empty strings for ObjectId fields
        if (!updateData.className) delete updateData.className;
        if (!updateData.centre) delete updateData.centre;
        if (!updateData.course) {
            delete updateData.course;
        } else {
            updateData.courseText = ""; // Clear courseText if we map to a master course
        }
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
            { 
                isWalkIn: true, 
                source: "Walk In",
                walkInDate: new Date(),
                walkInBy: req.user.id || req.user._id
            },
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

export const toggleLeadPriority = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user is SuperAdmin or Zonal Manager
        const userRole = req.user.role?.toLowerCase()?.replace(/\s+/g, '') || '';
        const allowedRoles = ['superadmin', 'zonalmanager'];
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

