import LeadManagement from "../../models/LeadManagement.js";
import CampaignLead from "../../models/CampaignLead.js";
import Sources from "../../models/Master_data/Sources.js";
import { cleanPhoneNumber, isNameMatch } from "../../utils/leadStudentMatcher.js";

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

        // Validate source against Master Data sources
        if (!source || !source.trim()) {
            return res.status(400).json({ message: "Source is required." });
        }
        const allMasterSources = await Sources.find().select('sourceName').lean();
        const matchedSource = allMasterSources.find(s => s.sourceName && s.sourceName.toLowerCase().trim() === source.trim().toLowerCase());
        if (!matchedSource) {
            return res.status(400).json({ message: `Source '${source}' is invalid. It must match a source in the Master Data.` });
        }

        // Phone number duplication check
        const phoneStr = phoneNumber !== undefined && phoneNumber !== null ? String(phoneNumber).trim() : "";
        const secondPhoneStr = secondPhoneNumber !== undefined && secondPhoneNumber !== null && String(secondPhoneNumber).trim() !== "0" && String(secondPhoneNumber).trim() !== "0.0" ? String(secondPhoneNumber).trim() : "";

        if (phoneStr && secondPhoneStr && phoneStr === secondPhoneStr) {
            return res.status(400).json({ message: "Primary and Secondary phone numbers cannot be the same." });
        }

        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneStr || !phoneRegex.test(phoneStr)) {
            return res.status(400).json({ message: "enter the correct phone number" });
        }

        if (secondPhoneStr !== "" && !phoneRegex.test(secondPhoneStr)) {
            return res.status(400).json({ message: "enter the correct phone number" });
        }

        const checkDuplicateLead = async (phone, leadName) => {
            const cleanPhone = phone !== undefined && phone !== null ? String(phone).trim() : "";
            if (cleanPhone === "") return null;
            const p10 = cleanPhoneNumber(cleanPhone);

            // Check in LeadManagement
            const matchingLeads = await LeadManagement.find({
                $or: [
                    { phoneNumber: cleanPhone },
                    { secondPhoneNumber: cleanPhone },
                    ...(p10 ? [{ phoneNumber: p10 }, { secondPhoneNumber: p10 }] : [])
                ]
            }).select('name phoneNumber secondPhoneNumber').lean();

            for (const l of matchingLeads) {
                if (isNameMatch(leadName, l.name)) {
                    return l;
                }
            }
            
            // Check in CampaignLead
            const matchingCampaigns = await CampaignLead.find({
                $or: [
                    { phoneNumber: cleanPhone },
                    { secondPhoneNumber: cleanPhone },
                    ...(p10 ? [{ phoneNumber: p10 }, { secondPhoneNumber: p10 }] : [])
                ]
            }).select('name phoneNumber secondPhoneNumber').lean();

            for (const cl of matchingCampaigns) {
                if (isNameMatch(leadName, cl.name)) {
                    return cl;
                }
            }

            return null;
        };

        if (phoneStr !== "") {
            const dup = await checkDuplicateLead(phoneStr, name);
            if (dup) {
                return res.status(400).json({ message: `A lead already exists for '${name}' with phone number: ${phoneStr}.` });
            }
        }

        if (secondPhoneStr !== "") {
            const dup = await checkDuplicateLead(secondPhoneStr, name);
            if (dup) {
                return res.status(400).json({ message: `A lead already exists for '${name}' with secondary phone number: ${secondPhoneStr}.` });
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
            walkInDate: req.body.walkInDate ? new Date(req.body.walkInDate) : (source && /^walk[- ]?in$/i.test(source) ? new Date() : undefined),
            targetExam,
            leadType,
            leadResponsibility,
            createdBy: req.user.id,
            assignedAt: leadResponsibility ? new Date() : null,
            marks: req.body.marks !== undefined && req.body.marks !== "" ? parseFloat(req.body.marks) : undefined
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
