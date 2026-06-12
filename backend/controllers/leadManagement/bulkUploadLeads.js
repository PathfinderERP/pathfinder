import LeadManagement from "../../models/LeadManagement.js";
import mongoose from "mongoose";

/**
 * POST /lead-management/bulk-upload
 * Body: { leads: [ { name, email, phoneNumber, secondPhoneNumber, schoolName, className,
 *                    centre, course, board, source, targetExam, leadType } ] }
 *
 * leadResponsibility is automatically set to the logged-in user's name.
 * createdBy is set to the logged-in user's _id.
 */
export const bulkUploadLeads = async (req, res) => {
    try {
        const { leads } = req.body;

        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ message: "No lead data provided." });
        }

        const uploaderName = req.user?.name || req.user?.email || "Unknown";
        const uploaderId   = req.user?.id;

        const prepared = leads.map((row) => {
            const doc = {
                name:               (row.name || "").trim(),
                email:              row.email || "",
                phoneNumber:        row.phoneNumber ? String(row.phoneNumber).trim() : "",
                secondPhoneNumber:  row.secondPhoneNumber ? String(row.secondPhoneNumber).trim() : "",
                schoolName:         row.schoolName || "",
                source:             row.source || "",
                targetExam:         row.targetExam || "",
                leadType:           ["HOT LEAD","WARM LEAD","COLD LEAD","NEUTRAL LEAD"].includes(row.leadType)
                                        ? row.leadType
                                        : undefined,
                // The uploader IS the lead responsibility person
                leadResponsibility: uploaderName,
                createdBy:          uploaderId,
                marketingBy:        uploaderName,
                assignedAt:         new Date(),
            };

            // Only add ObjectId refs if they look valid
            if (row.className && mongoose.Types.ObjectId.isValid(row.className))
                doc.className = row.className;
            if (row.centre && mongoose.Types.ObjectId.isValid(row.centre))
                doc.centre = row.centre;
            if (row.course && mongoose.Types.ObjectId.isValid(row.course))
                doc.course = row.course;
            if (row.board && mongoose.Types.ObjectId.isValid(row.board))
                doc.board = row.board;

            return doc;
        });

        // Filter out rows missing the mandatory `name` or `schoolName` field
        const valid   = prepared.filter(r => r.name && r.schoolName);
        const skipped = prepared.length - valid.length;

        if (valid.length === 0) {
            return res.status(400).json({ message: "All rows are missing the required 'name' field." });
        }

        const inserted = await LeadManagement.insertMany(valid, { ordered: false });

        return res.status(201).json({
            message:  `${inserted.length} lead(s) uploaded successfully.`,
            total:    inserted.length,
            skipped,
            uploadedBy: uploaderName,
        });
    } catch (err) {
        console.error("Bulk upload error:", err);
        return res.status(500).json({ message: "Server error during bulk upload.", error: err.message });
    }
};
