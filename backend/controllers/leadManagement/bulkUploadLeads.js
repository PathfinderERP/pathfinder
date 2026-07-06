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

        // Validate sources against master data (case-insensitive, trimmed)
        const masterSourcesSet = new Set(
            allSources.map(s => s.sourceName?.trim().toLowerCase()).filter(Boolean)
        );

        const invalidSources = [];
        for (let i = 0; i < leads.length; i++) {
            const row = leads[i];
            // Only validate rows that aren't skipped (i.e. must have name and schoolName)
            if (!row.name || !row.schoolName) {
                continue;
            }
            const sourceStr = (row.source || "").trim();
            if (!sourceStr) {
                invalidSources.push({
                    row: i + 1,
                    name: row.name || "Unknown Name",
                    source: "",
                    reason: "Source is missing"
                });
            } else if (!masterSourcesSet.has(sourceStr.toLowerCase())) {
                invalidSources.push({
                    row: i + 1,
                    name: row.name || "Unknown Name",
                    source: row.source,
                    reason: `Source '${row.source}' is invalid`
                });
            }
        }

        if (invalidSources.length > 0) {
            return res.status(400).json({
                message: "Validation failed: Some leads contain sources that do not match the Master Data.",
                invalidSources
            });
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
                marks:              row.marks !== undefined && row.marks !== "" ? parseFloat(row.marks) : undefined,
                isBulkUpload:       true
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

            // Course mapping (Directly map ObjectId if valid, or resolve by name, or store raw string text)
            if (row.course) {
                if (mongoose.Types.ObjectId.isValid(row.course)) {
                    doc.course = row.course;
                } else {
                    const matchedCourse = allCourses.find(c => c.courseName && c.courseName.toLowerCase().trim() === String(row.course).toLowerCase().trim());
                    if (matchedCourse) {
                        doc.course = matchedCourse._id;
                    } else if (typeof row.course === 'string' && row.course.trim()) {
                        doc.courseText = row.course.trim();
                    }
                }
            }

            return doc;
        });

        // Collect all non-empty primary phone numbers from prepared data
        const incomingPhones = new Set();
        prepared.forEach(row => {
            if (row.phoneNumber) incomingPhones.add(row.phoneNumber);
        });

        // Find existing phone numbers in database (only checking the primary phoneNumber field)
        const existingPhones = new Set();
        if (incomingPhones.size > 0) {
            const phoneList = Array.from(incomingPhones);
            const [leadsWithPhones, campaignLeadsWithPhones] = await Promise.all([
                LeadManagement.find({
                    phoneNumber: { $in: phoneList }
                }, 'phoneNumber').lean(),
                CampaignLead.find({
                    phoneNumber: { $in: phoneList }
                }, 'phoneNumber').lean()
            ]);

            leadsWithPhones.forEach(l => {
                if (l.phoneNumber) existingPhones.add(l.phoneNumber.trim());
            });
            campaignLeadsWithPhones.forEach(l => {
                if (l.phoneNumber) existingPhones.add(l.phoneNumber.trim());
            });
        }

        // Filter valid leads and check for duplicates (both against DB and within the file)
        const valid = [];
        const seenPhonesInImport = new Set();
        const skippedDetails = [];
        let skipped = 0;

        for (let idx = 0; idx < prepared.length; idx++) {
            const row = prepared[idx];
            const originalRowIndex = idx + 1;

            if (!row.name || !row.schoolName) {
                const missing = [];
                if (!row.name) missing.push("Name");
                if (!row.schoolName) missing.push("School Name");
                skippedDetails.push({
                    row: originalRowIndex,
                    name: row.name || "Unknown Name",
                    reason: `Missing required field(s): ${missing.join(", ")}`
                });
                skipped++;
                continue;
            }

            const p = row.phoneNumber;
            let isDuplicate = false;
            let duplicateReason = "";

            if (p) {
                if (existingPhones.has(p)) {
                    isDuplicate = true;
                    duplicateReason = `Phone number '${p}' already exists in database.`;
                } else if (seenPhonesInImport.has(p)) {
                    isDuplicate = true;
                    duplicateReason = `Phone number '${p}' is duplicated within the uploaded file.`;
                }
            }

            if (isDuplicate) {
                skippedDetails.push({
                    row: originalRowIndex,
                    name: row.name,
                    reason: duplicateReason
                });
                skipped++;
                continue;
            }

            if (p) seenPhonesInImport.add(p);

            valid.push(row);
        }

        if (valid.length === 0) {
            return res.status(400).json({
                message: "All rows were skipped because they are missing required fields or contain duplicate phone numbers.",
                skippedDetails
            });
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
            skippedDetails,
            uploadedBy: uploaderName,
            campaign:   resolvedCampaignId || null,
        });
    } catch (err) {
        console.error("Bulk upload error:", err);
        return res.status(500).json({ message: "Server error during bulk upload.", error: err.message });
    }
};
