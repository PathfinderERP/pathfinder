import CampaignLead from "../../models/CampaignLead.js";
import Campaign from "../../models/Campaign.js";
import mongoose from "mongoose";

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
                source:             row.source || "Campaign",
                targetExam:         row.targetExam || "",
                leadType:           ["HOT LEAD","WARM LEAD","COLD LEAD","NEUTRAL LEAD","INVALID LEAD"].includes(row.leadType)
                                        ? row.leadType
                                        : undefined,
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

            // Only add ObjectId refs if they look valid
            if (row.className && mongoose.Types.ObjectId.isValid(row.className))
                doc.className = row.className;
            if (row.centre && mongoose.Types.ObjectId.isValid(row.centre))
                doc.centre = row.centre;
            // course: if it's a valid ObjectId, store as ref; otherwise store raw string in courseText
            if (row.course) {
                if (mongoose.Types.ObjectId.isValid(row.course))
                    doc.course = row.course;
                else if (typeof row.course === 'string' && row.course.trim())
                    doc.courseText = row.course.trim();
            }
            if (row.board && mongoose.Types.ObjectId.isValid(row.board))
                doc.board = row.board;

            return doc;
        });

        // Filter out rows missing the mandatory `name` or `schoolName` field
        const valid   = prepared.filter(r => r.name && r.schoolName);
        const skipped = prepared.length - valid.length;

        if (valid.length === 0) {
            return res.status(400).json({ message: "All rows are missing the required 'name' and 'schoolName' fields." });
        }

        const inserted = await CampaignLead.insertMany(valid, { ordered: false });

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
