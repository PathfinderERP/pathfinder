import CampaignLead from "../../models/CampaignLead.js";
import LeadManagement from "../../models/LeadManagement.js";
import Campaign from "../../models/Campaign.js";
import mongoose from "mongoose";
import Class from "../../models/Master_data/Class.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import Sources from "../../models/Master_data/Sources.js";

/**
 * POST /lead-management/bulk-upload
 * Body: { leads: [...], campaignId?: string }
 *
 * leadResponsibility is automatically set to the logged-in user's name.
 * createdBy is set to the logged-in user's _id.
 * If campaignId is provided and valid, it is linked to every lead via the campaign field.
 */
export const bulkUploadLeads = async (req, res) => {
    try {
        const { leads, campaignId } = req.body;

        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ message: "No lead data provided." });
        }

        const uploaderName = req.user?.name || req.user?.email || "Unknown";
        const uploaderId   = req.user?.id;

        // Fetch all master data for resolution
        const [allClasses, allCentres, allCourses, allBoards, allSources] = await Promise.all([
            Class.find().lean(),
            CentreSchema.find().lean(),
            Course.find().lean(),
            Boards.find().lean(),
            Sources.find().lean()
        ]);

        // Validate campaignId if provided
        let resolvedCampaignId = null;
        let campaignName = null;
        if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
            const campaignExists = await Campaign.findById(campaignId).lean();
            if (campaignExists) {
                resolvedCampaignId = campaignId;
                campaignName = campaignExists.adName;
            }
        }

        const prepared = leads.map((row) => {
            const doc = {
                name:               (row.name || "").trim(),
                email:              row.email || "",
                phoneNumber:        row.phoneNumber ? String(row.phoneNumber).trim() : "",
                secondPhoneNumber:  row.secondPhoneNumber ? String(row.secondPhoneNumber).trim() : "",
                schoolName:         row.schoolName || "",
                targetExam:         row.targetExam || "",
                leadResponsibility: uploaderName,
                createdBy:          uploaderId,
                marketingBy:        uploaderName,
                assignedAt:         new Date(),
            };

            // Link to campaign if valid
            if (resolvedCampaignId) {
                doc.campaign = resolvedCampaignId;
                doc.campaignFrom = campaignName;
            }

            // 1. Class resolution
            if (row.className) {
                if (mongoose.Types.ObjectId.isValid(row.className)) {
                    doc.className = row.className;
                } else {
                    const matchedClass = allClasses.find(c => c.name && c.name.toLowerCase().trim() === String(row.className).toLowerCase().trim());
                    if (matchedClass) doc.className = matchedClass._id;
                }
            }

            // 2. Centre resolution
            if (row.centre) {
                if (mongoose.Types.ObjectId.isValid(row.centre)) {
                    doc.centre = row.centre;
                } else {
                    const matchedCentre = allCentres.find(c => (c.centreName || c.name || "").toLowerCase().trim() === String(row.centre).toLowerCase().trim());
                    if (matchedCentre) doc.centre = matchedCentre._id;
                }
            }

            // 3. Board resolution
            if (row.board) {
                if (mongoose.Types.ObjectId.isValid(row.board)) {
                    doc.board = row.board;
                } else {
                    const matchedBoard = allBoards.find(b => (b.boardName || b.boardCourse || b.name || "").toLowerCase().trim() === String(row.board).toLowerCase().trim());
                    if (matchedBoard) doc.board = matchedBoard._id;
                }
            }

            // 4. Source resolution (String matching against Sources master data sourceName)
            if (row.source) {
                const matchedSource = allSources.find(s => s.sourceName && s.sourceName.toLowerCase().trim() === String(row.source).toLowerCase().trim());
                if (matchedSource) {
                    doc.source = matchedSource.sourceName;
                }
            } else {
                // If not provided at all, default fallback "Campaign" if it is in master data
                const campaignSourceExists = allSources.some(s => s.sourceName && s.sourceName.toLowerCase().trim() === "campaign");
                if (campaignSourceExists) doc.source = "Campaign";
            }

            // 5. Lead Type resolution (String matching against valid enum values)
            if (row.leadType) {
                const normalizedLeadType = String(row.leadType).toUpperCase().trim();
                const validLeadTypes = ['HOT LEAD', 'WARM LEAD', 'COLD LEAD', 'NEUTRAL LEAD', 'INVALID LEAD'];
                if (validLeadTypes.includes(normalizedLeadType)) {
                    doc.leadType = normalizedLeadType;
                }
            }

            // Course mapping (Directly map ObjectId if valid, or store raw string text)
            if (row.course) {
                if (mongoose.Types.ObjectId.isValid(row.course)) {
                    doc.course = row.course;
                } else if (typeof row.course === 'string' && row.course.trim()) {
                    doc.courseText = row.course.trim();
                }
            }

            return doc;
        });

        // Filter out rows missing the mandatory `name` or `schoolName` field
        const valid   = prepared.filter(r => r.name && r.schoolName);
        const skipped = prepared.length - valid.length;

        if (valid.length === 0) {
            return res.status(400).json({ message: "All rows are missing the required 'name' and 'schoolName' fields." });
        }

        let inserted;
        if (resolvedCampaignId) {
            inserted = await CampaignLead.insertMany(valid, { ordered: false });
        } else {
            inserted = await LeadManagement.insertMany(valid, { ordered: false });
        }

        return res.status(201).json({
            message:    `${inserted.length} lead(s) uploaded successfully.`,
            total:      inserted.length,
            skipped,
            uploadedBy: uploaderName,
            campaign:   resolvedCampaignId || null,
        });
    } catch (err) {
        console.error("Bulk upload error:", err);
        return res.status(500).json({ message: "Server error during bulk upload.", error: err.message });
    }
};
