import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

/**
 * Lead Conversion Report
 *
 * Uses a multi-step approach instead of correlated $lookup pipelines to
 * avoid MongoNetworkTimeoutError on large datasets:
 *
 *  Step 1 — Fetch leads (only _id, leadType, phoneNumber, secondPhoneNumber)
 *  Step 2 — Batch-query students by phone numbers using $in (uses index)
 *  Step 3 — Batch-query admissions using $in on matched student IDs
 *  Step 4 — Cross-reference in memory and group by leadType
 */
export const getLeadConversionReport = async (req, res) => {
    try {
        const queryParams = { ...req.query };
        queryParams.includeInvalid = true;

        // Guard: require at least one date boundary to prevent full-collection scan timeouts
        if (!queryParams.fromDate && !queryParams.toDate) {
            return res.status(400).json({
                success: false,
                message: "Please select a date range to run the conversion report. Running without a date filter may cause timeouts on large datasets."
            });
        }

        const baseMatch = await buildLeadQuery(queryParams, req.user);

        // ── STEP 1: Fetch only the fields we need from leads ────────────────
        const leads = await LeadManagement.find(baseMatch, {
            leadType: 1,
            phoneNumber: 1,
            secondPhoneNumber: 1
        }).lean();

        if (leads.length === 0) {
            return res.status(200).json({ success: true, conversionStats: [] });
        }

        // ── STEP 2: Collect unique phone numbers ─────────────────────────────
        const phoneSet = new Set();
        for (const lead of leads) {
            if (lead.phoneNumber) phoneSet.add(lead.phoneNumber.trim());
            if (lead.secondPhoneNumber) phoneSet.add(lead.secondPhoneNumber.trim());
        }
        const allPhones = [...phoneSet];

        // ── STEP 3: Batch-fetch matching students ($in uses index) ───────────
        const matchedStudents = await Student.find(
            { "studentsDetails.mobileNum": { $in: allPhones } },
            { _id: 1, "studentsDetails.mobileNum": 1 }
        ).lean();

        // Build phone → studentId Set map for O(1) lead lookup
        const phoneToStudentIds = new Map(); // phone → Set<studentId>
        for (const student of matchedStudents) {
            const phones = (student.studentsDetails || [])
                .map(d => (d.mobileNum || "").trim())
                .filter(Boolean);
            for (const phone of phones) {
                if (!phoneToStudentIds.has(phone)) {
                    phoneToStudentIds.set(phone, new Set());
                }
                phoneToStudentIds.get(phone).add(student._id.toString());
            }
        }

        // Build Set of all matched student IDs
        const counselledStudentIds = new Set();
        for (const ids of phoneToStudentIds.values()) {
            for (const id of ids) counselledStudentIds.add(id);
        }
        const counselledIdsArray = [...counselledStudentIds];

        // ── STEP 4: Batch-fetch admissions for those student IDs ─────────────
        let admittedStudentIds = new Set();
        if (counselledIdsArray.length > 0) {
            const [normalAdmissions, boardAdmissions] = await Promise.all([
                Admission.distinct("student", { student: { $in: counselledIdsArray } }),
                BoardCourseAdmission.distinct("studentId", { studentId: { $in: counselledIdsArray } })
            ]);
            for (const id of normalAdmissions) admittedStudentIds.add(id.toString());
            for (const id of boardAdmissions) admittedStudentIds.add(id.toString());
        }

        // ── STEP 5: Cross-reference leads and group by leadType in memory ────
        const leadTypes = ["HOT LEAD", "WARM LEAD", "COLD LEAD", "NEUTRAL LEAD", "INVALID LEAD"];
        const groups = {};
        for (const type of leadTypes) {
            groups[type] = { total: 0, counselled: 0, admitted: 0 };
        }

        for (const lead of leads) {
            const type = lead.leadType || "NEUTRAL LEAD";
            if (!groups[type]) groups[type] = { total: 0, counselled: 0, admitted: 0 };
            groups[type].total++;

            // Check if this lead's phone matches a student (= counselled)
            const phones = [lead.phoneNumber, lead.secondPhoneNumber]
                .map(p => (p || "").trim())
                .filter(Boolean);

            let isCounselled = false;
            let isAdmitted = false;

            for (const phone of phones) {
                const sids = phoneToStudentIds.get(phone);
                if (sids) {
                    isCounselled = true;
                    for (const sid of sids) {
                        if (admittedStudentIds.has(sid)) {
                            isAdmitted = true;
                            break;
                        }
                    }
                }
                if (isAdmitted) break;
            }

            if (isCounselled) groups[type].counselled++;
            if (isAdmitted) groups[type].admitted++;
        }

        // Convert to array format matching the old schema (_id = leadType)
        const conversionStats = Object.entries(groups)
            .filter(([, v]) => v.total > 0)
            .map(([type, v]) => ({ _id: type, ...v }));

        return res.status(200).json({ success: true, conversionStats });

    } catch (err) {
        console.error("Conversion report error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error during conversion report generation",
            error: err.message
        });
    }
};
