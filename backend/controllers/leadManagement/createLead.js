import LeadManagement from "../../models/LeadManagement.js";
import CampaignLead from "../../models/CampaignLead.js";

export const createLead = async (req, res) => {
    try {
        const {
            name,
            email,
            phoneNumber,
            secondPhoneNumber,
            schoolName,
            className,
            centre,
            course,
            courseText,
            source,
            targetExam,
            leadType,
            leadResponsibility,
            campaign
        } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Required fields are missing." });
        }

        // Phone number duplication check
        if (phoneNumber && secondPhoneNumber && phoneNumber.trim() === secondPhoneNumber.trim() && phoneNumber.trim() !== "") {
            return res.status(400).json({ message: "Primary and Secondary phone numbers cannot be the same." });
        }

        const checkPhoneNumber = async (phone) => {
            if (!phone || phone.trim() === "") return null;
            const cleanPhone = phone.trim();
            // Check in LeadManagement
            const matchLead = await LeadManagement.findOne({
                $or: [{ phoneNumber: cleanPhone }, { secondPhoneNumber: cleanPhone }]
            }).lean();
            if (matchLead) return matchLead;
            
            // Check in CampaignLead
            const matchCampaign = await CampaignLead.findOne({
                $or: [{ phoneNumber: cleanPhone }, { secondPhoneNumber: cleanPhone }]
            }).lean();
            return matchCampaign;
        };

        if (phoneNumber && phoneNumber.trim() !== "") {
            const dup = await checkPhoneNumber(phoneNumber);
            if (dup) {
                return res.status(400).json({ message: `A lead already exists with the phone number: ${phoneNumber.trim()}.` });
            }
        }

        if (secondPhoneNumber && secondPhoneNumber.trim() !== "") {
            const dup = await checkPhoneNumber(secondPhoneNumber);
            if (dup) {
                return res.status(400).json({ message: `A lead already exists with the secondary phone number: ${secondPhoneNumber.trim()}.` });
            }
        }

        const leadData = {
            name,
            email,
            phoneNumber,
            secondPhoneNumber,
            schoolName,
            source,
            isWalkIn: source && /^walk[- ]?in$/i.test(source) ? true : false,
            targetExam,
            leadType,
            leadResponsibility,
            createdBy: req.user.id,
            assignedAt: leadResponsibility ? new Date() : null
        };

        if (className) leadData.className = className;
        if (centre) leadData.centre = centre;
        if (course) leadData.course = course;
        if (courseText) leadData.courseText = courseText;
        if (req.body.board) leadData.board = req.body.board;
        if (campaign) leadData.campaign = campaign;

        const newLead = new LeadManagement(leadData);

        await newLead.save();

        // Populate references before sending response
        await newLead.populate(['className', 'centre', 'course', 'board', 'campaign']);

        res.status(201).json({
            message: "Lead created successfully",
            lead: newLead,
        });

    } catch (err) {
        console.error("Lead creation error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
