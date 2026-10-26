import CampaignLead from "../../models/CampaignLead.js";
import LeadManagement from "../../models/LeadManagement.js";
import Campaign from "../../models/Campaign.js";
import mongoose from "mongoose";
import Class from "../../models/Master_data/Class.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import Sources from "../../models/Master_data/Sources.js";
import User from "../../models/User.js";
import { cleanPhoneNumber, isNameMatch, getPhoneVariants } from "../../utils/leadStudentMatcher.js";

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
        const [allClasses, allCentres, allCourses, allBoards, allSources, allUsers] = await Promise.all([
            Class.find().lean(),
            CentreSchema.find().lean(),
            Course.find().lean(),
            Boards.find().lean(),
            Sources.find().lean(),
            User.find({ isActive: true }).select('name').lean()
        ]);

        const userByNameMap = {};
        allUsers.forEach(u => {
            if (u.name) {
                userByNameMap[u.name.toLowerCase().trim()] = u.name;
            }
        });

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
            // Only validate rows that aren't skipped (i.e. must have name)
            if (!row.name) {
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
            const excelResponsibility = row.leadResponsibility || row.leadResponse;
            let resolvedResponsibility = uploaderName;
            if (excelResponsibility && String(excelResponsibility).trim()) {
                const searchName = String(excelResponsibility).toLowerCase().trim();
                resolvedResponsibility = userByNameMap[searchName] || String(excelResponsibility).trim();
            }

            const doc = {
                name:               (row.name || "").trim(),
                email:              row.email || "",
                phoneNumber:        row.phoneNumber ? String(row.phoneNumber).trim() : "",
                secondPhoneNumber:  row.secondPhoneNumber && String(row.secondPhoneNumber).trim() !== "0" && String(row.secondPhoneNumber).trim() !== "0.0" ? String(row.secondPhoneNumber).trim() : "",
                schoolName:         row.schoolName || "",

                leadResponsibility: resolvedResponsibility,
                createdBy:          uploaderId,
                marketingBy:        uploaderName,
                assignedAt:         new Date(),
                marks:              row.marks !== undefined && row.marks !== "" ? parseFloat(row.marks) : undefined,
                isBulkUpload:       true,
                isPriority:         row.isPriority === true || row.isPriority === 'true' || String(row.isPriority || '').toLowerCase().trim() === 'true' || String(row.isPriority || '').toLowerCase().trim() === 'yes' || String(row.isPriority || '').toLowerCase().trim() === '1'
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


        // Collect all non-empty primary & secondary phone numbers from prepared data
        const incomingPhones = new Set();
        prepared.forEach(row => {
            if (row.phoneNumber) incomingPhones.add(row.phoneNumber);
            if (row.secondPhoneNumber) incomingPhones.add(row.secondPhoneNumber);
        });

        // Find existing leads in database by phone numbers
        // Map: cleanPhone -> { name, source }
        const existingPhoneMap = new Map();
        if (incomingPhones.size > 0) {
            const variantList = getPhoneVariants(incomingPhones);
            const [leadsWithPhones, campaignLeadsWithPhones] = await Promise.all([
                LeadManagement.find({
                    $or: [
                        { phoneNumber: { $in: variantList } },
                        { secondPhoneNumber: { $in: variantList } }
                    ]
                }, 'name phoneNumber secondPhoneNumber').lean(),
                resolvedCampaignId ? CampaignLead.find({
                    campaign: resolvedCampaignId,
                    $or: [
                        { phoneNumber: { $in: variantList } },
                        { secondPhoneNumber: { $in: variantList } }
                    ]
                }, 'name phoneNumber secondPhoneNumber').lean() : CampaignLead.find({
                    $or: [
                        { phoneNumber: { $in: variantList } },
                        { secondPhoneNumber: { $in: variantList } }
                    ]
                }, 'name phoneNumber secondPhoneNumber').lean()
            ]);

            const recordPhone = (phone, name, source) => {
                if (!phone) return;
                const pClean = cleanPhoneNumber(phone);
                if (!pClean) return;
                if (!existingPhoneMap.has(pClean)) {
                    existingPhoneMap.set(pClean, { name: name || 'Existing Lead', source });
                }
            };

            leadsWithPhones.forEach(l => {
                recordPhone(l.phoneNumber, l.name, 'All Leads');
                recordPhone(l.secondPhoneNumber, l.name, 'All Leads');
            });
            campaignLeadsWithPhones.forEach(l => {
                recordPhone(l.phoneNumber, l.name, resolvedCampaignId ? 'Campaign' : 'Campaign Leads');
                recordPhone(l.secondPhoneNumber, l.name, resolvedCampaignId ? 'Campaign' : 'Campaign Leads');
            });
        }

        // Filter valid leads and check for duplicates (both against DB and within the file)
        const valid = [];
        // Map: cleanPhone -> name seen in this import file
        const seenInImportMap = new Map();
        const skippedDetails = [];
        const duplicates = [];
        let skipped = 0;

        for (let idx = 0; idx < prepared.length; idx++) {
            const row = prepared[idx];
            const originalRowIndex = idx + 1;
            const rawRow = leads[idx] || {};

            if (!row.name) {
                const missing = [];
                if (!row.name) missing.push("Name");
                skippedDetails.push({
                    row: originalRowIndex,
                    name: row.name || "Unknown Name",
                    phoneNumber: row.phoneNumber || "",
                    secondPhoneNumber: row.secondPhoneNumber || "",
                    reason: `Missing required field(s): ${missing.join(", ")}`,
                    isDuplicate: false
                });
                skipped++;
                continue;
            }

            const p = row.phoneNumber;
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!p || !phoneRegex.test(p)) {
                skippedDetails.push({
                    row: originalRowIndex,
                    name: row.name,
                    phoneNumber: row.phoneNumber || "",
                    secondPhoneNumber: row.secondPhoneNumber || "",
                    reason: "enter the correct phone number",
                    isDuplicate: false
                });
                skipped++;
                continue;
            }

            if (row.secondPhoneNumber && !phoneRegex.test(row.secondPhoneNumber)) {
                skippedDetails.push({
                    row: originalRowIndex,
                    name: row.name,
                    phoneNumber: row.phoneNumber || "",
                    secondPhoneNumber: row.secondPhoneNumber || "",
                    reason: "enter the correct phone number",
                    isDuplicate: false
                });
                skipped++;
                continue;
            }

            let isDuplicate = false;
            let duplicateReason = "";
            let matchedWith = "";
            let duplicateType = "";

            const cleanP = cleanPhoneNumber(p);
            const cleanSecP = cleanPhoneNumber(row.secondPhoneNumber);

            // 1. Check primary phone
            if (cleanP) {
                if (existingPhoneMap.has(cleanP)) {
                    const match = existingPhoneMap.get(cleanP);
                    isDuplicate = true;
                    duplicateType = "Database Duplicate";
                    matchedWith = match.name;
                    duplicateReason = match.source === 'All Leads'
                        ? `Phone number '${p}' already exists in All Leads (${match.name}).`
                        : `Phone number '${p}' already exists in ${match.source} (${match.name}).`;
                } else if (seenInImportMap.has(cleanP)) {
                    isDuplicate = true;
                    duplicateType = "File Duplicate";
                    matchedWith = seenInImportMap.get(cleanP);
                    duplicateReason = `Phone number '${p}' is duplicated within the uploaded file.`;
                }
            }

            // 2. Check secondary phone
            if (!isDuplicate && cleanSecP) {
                if (existingPhoneMap.has(cleanSecP)) {
                    const match = existingPhoneMap.get(cleanSecP);
                    isDuplicate = true;
                    duplicateType = "Database Duplicate";
                    matchedWith = match.name;
                    duplicateReason = match.source === 'All Leads'
                        ? `Secondary phone '${row.secondPhoneNumber}' already exists in All Leads (${match.name}).`
                        : `Secondary phone '${row.secondPhoneNumber}' already exists in ${match.source} (${match.name}).`;
                } else if (seenInImportMap.has(cleanSecP)) {
                    isDuplicate = true;
                    duplicateType = "File Duplicate";
                    matchedWith = seenInImportMap.get(cleanSecP);
                    duplicateReason = `Secondary phone '${row.secondPhoneNumber}' is duplicated within the uploaded file.`;
                }
            }

            if (isDuplicate) {
                const centreName = rawRow.centre || (allCentres.find(c => c._id?.toString() === row.centre?.toString())?.centreName) || "";
                const courseName = rawRow.course || (allCourses.find(c => c._id?.toString() === row.course?.toString())?.courseName) || row.courseText || "";
                const className = rawRow.className || rawRow.Class || (allClasses.find(c => c._id?.toString() === row.className?.toString())?.name) || "";
                const boardName = rawRow.board || (allBoards.find(b => b._id?.toString() === row.board?.toString())?.boardName || b.boardCourse) || "";

                const dupItem = {
                    row: originalRowIndex,
                    name: row.name,
                    phoneNumber: row.phoneNumber,
                    secondPhoneNumber: row.secondPhoneNumber || "",
                    schoolName: row.schoolName || "",
                    centre: centreName,
                    course: courseName,
                    className: className,
                    board: boardName,
                    source: row.source || rawRow.source || "",
                    leadType: row.leadType || "",
                    reason: duplicateReason,
                    matchedWith: matchedWith || "",
                    duplicateType: duplicateType || "Database Duplicate",
                    isDuplicate: true
                };

                duplicates.push(dupItem);
                skippedDetails.push(dupItem);
                skipped++;
                continue;
            }

            if (cleanP) seenInImportMap.set(cleanP, row.name);
            if (cleanSecP) seenInImportMap.set(cleanSecP, row.name);

            valid.push(row);
        }

        if (valid.length === 0) {
            const phoneErrors = skippedDetails.filter(d => d.reason === "enter the correct phone number");
            if (phoneErrors.length > 0 && duplicates.length === 0) {
                return res.status(400).json({
                    message: "enter the correct phone number",
                    skippedDetails,
                    duplicates
                });
            }
            return res.status(400).json({
                message: duplicates.length > 0
                    ? `All ${duplicates.length} lead(s) were identified as duplicates and not uploaded.`
                    : "All rows were skipped because they are missing required fields or contain duplicate phone numbers.",
                skippedDetails,
                duplicates
            });
        }

        let inserted;
        if (resolvedCampaignId) {
            inserted = await CampaignLead.insertMany(valid, { ordered: false });
        } else {
            inserted = await LeadManagement.insertMany(valid, { ordered: false });
        }

        return res.status(201).json({
            message:    `${inserted.length} lead(s) uploaded successfully.` + (duplicates.length > 0 ? ` (${duplicates.length} duplicate(s) detected).` : ""),
            total:      inserted.length,
            skipped,
            skippedDetails,
            duplicates,
            uploadedBy: uploaderName,
            campaign:   resolvedCampaignId || null,
        });
    } catch (err) {
        console.error("Bulk upload error:", err);
        return res.status(500).json({ message: "Server error during bulk upload.", error: err.message });
    }
};
