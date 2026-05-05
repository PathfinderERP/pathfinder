import LeadManagement from "../../models/LeadManagement.js";
import FollowUpFeedback from "../../models/Master_data/FollowUpFeedback.js";

export const bulkContactedLeads = async (req, res) => {
    try {
        const { leads } = req.body; // Array of { phoneNumber, email, feedback, remarks, nextFollowUpDate, leadType }

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ message: "No leads provided." });
        }

        // Fetch all valid feedback options from master data
        const feedbackMaster = await FollowUpFeedback.find({}).lean();
        const validFeedbacks = feedbackMaster.map(f => f.name.toLowerCase().trim());

        const results = {
            success: [],
            failed: []
        };

        for (const item of leads) {
            try {
                const {
                    name,
                    email,
                    phoneNumber,
                    schoolName,
                    className,
                    centre,
                    course,
                    board,
                    source,
                    targetExam,
                    leadType,
                    leadResponsibility,
                    feedback,
                    remarks,
                    nextFollowUpDate
                } = item;

                // Validate feedback against master data (case-insensitive)
                if (feedback && !validFeedbacks.includes(feedback.toLowerCase().trim())) {
                    results.failed.push({
                        identifier: phoneNumber || email || name,
                        reason: `Feedback '${feedback}' does not match any master data feedback option`
                    });
                    continue;
                }

                // Find lead by phone or email
                let lead = null;
                if (phoneNumber) {
                    lead = await LeadManagement.findOne({ phoneNumber: phoneNumber.toString().trim() });
                }
                if (!lead && email) {
                    lead = await LeadManagement.findOne({ email: email.toString().trim().toLowerCase() });
                }

                if (!lead) {
                    // Create new lead if it doesn't exist
                    const leadData = {
                        name,
                        email,
                        phoneNumber,
                        schoolName,
                        source,
                        targetExam,
                        leadType: leadType || "COLD LEAD",
                        leadResponsibility,
                        createdBy: req.user.id,
                        assignedAt: leadResponsibility ? new Date() : null
                    };

                    if (className) leadData.className = className;
                    if (centre) leadData.centre = centre;
                    if (course) leadData.course = course;
                    if (board) leadData.board = board;

                    lead = new LeadManagement(leadData);
                } else {
                    // Update existing lead details if provided
                    if (name) lead.name = name;
                    if (schoolName) lead.schoolName = schoolName;
                    if (className) lead.className = className;
                    if (centre) lead.centre = centre;
                    if (course) lead.course = course;
                    if (board) lead.board = board;
                    if (source) lead.source = source;
                    if (targetExam) lead.targetExam = targetExam;
                    if (leadResponsibility) {
                        lead.leadResponsibility = leadResponsibility;
                        if (!lead.assignedAt) lead.assignedAt = new Date();
                    }
                    if (leadType) lead.leadType = leadType.toUpperCase();
                }

                // Build follow-up entry
                // If remarks is present → contacted; if not → pending (no follow-up added)
                if (remarks && remarks.toString().trim().length > 0) {
                    // Find the correctly-cased feedback from master data
                    const matchedFeedback = feedbackMaster.find(
                        f => f.name.toLowerCase().trim() === (feedback || '').toLowerCase().trim()
                    );

                    const newFollowUp = {
                        date: new Date(),
                        feedback: matchedFeedback ? matchedFeedback.name : (feedback || ''),
                        remarks: remarks.toString().trim(),
                        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
                        updatedBy: req.user ? req.user.name : 'Bulk Import',
                        status: leadType ? leadType.toUpperCase() : lead.leadType
                    };

                    lead.followUps.push(newFollowUp);
                    lead.lastFollowUpDate = new Date();
                    if (nextFollowUpDate) lead.nextFollowUpDate = new Date(nextFollowUpDate);
                }

                await lead.save();

                results.success.push({
                    identifier: phoneNumber || email || name,
                    name: lead.name,
                    contacted: !!(remarks && remarks.toString().trim().length > 0)
                });

            } catch (err) {
                console.error("bulkContactedLeads row error:", err);
                results.failed.push({
                    identifier: item.phoneNumber || item.email || item.name,
                    reason: err.message
                });
            }
        }

        return res.status(200).json({
            message: `Bulk update complete. ${results.success.length} updated, ${results.failed.length} failed.`,
            results
        });

    } catch (err) {
        console.error("bulkContactedLeads error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
