import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

/**
 * Returns detailed admission records for leads matching the given filters + leadType.
 * Used by the "Converted to Admitted" click popup in the Conversion Report page.
 *
 * Query params:
 *   - All standard lead filters (fromDate, toDate, centre, leadResponsibility, source)
 *   - leadType  → optional — filter to a specific lead type row (e.g. "HOT LEAD")
 */
export const getAdmittedLeadDetails = async (req, res) => {
    try {
        const queryParams = { ...req.query };
        queryParams.includeInvalid = true;
        const { leadType } = queryParams;

        // Guard: require at least one date boundary
        if (!queryParams.fromDate && !queryParams.toDate) {
            return res.status(400).json({
                success: false,
                message: "Please select a date range before fetching admitted lead details."
            });
        }

        const baseMatch = await buildLeadQuery(queryParams, req.user);

        // Add leadType filter if provided
        if (leadType) baseMatch.leadType = leadType;


        // Step 1: Fetch leads (only phone + leadType needed for matching)
        const leads = await LeadManagement.find(baseMatch, {
            _id: 1,
            leadName: 1,
            leadType: 1,
            phoneNumber: 1,
            secondPhoneNumber: 1,
            centre: 1
        }).lean();

        if (leads.length === 0) {
            return res.status(200).json({ success: true, admittedLeads: [] });
        }

        // Step 2: Collect unique phone numbers
        const phoneSet = new Set();
        const phoneToLead = new Map(); // phone → lead doc
        for (const lead of leads) {
            if (lead.phoneNumber) {
                const p = lead.phoneNumber.trim();
                phoneSet.add(p);
                if (!phoneToLead.has(p)) phoneToLead.set(p, lead);
            }
            if (lead.secondPhoneNumber) {
                const p = lead.secondPhoneNumber.trim();
                phoneSet.add(p);
                if (!phoneToLead.has(p)) phoneToLead.set(p, lead);
            }
        }
        const allPhones = [...phoneSet];

        // Step 3: Batch-fetch matching students
        const matchedStudents = await Student.find(
            { "studentsDetails.mobileNum": { $in: allPhones } },
            { _id: 1, "studentsDetails.mobileNum": 1, "studentsDetails.studentName": 1 }
        ).lean();

        // Build studentId → { studentId, phones[], leadDoc }
        const studentIdToInfo = new Map();
        for (const student of matchedStudents) {
            const phones = (student.studentsDetails || [])
                .map(d => (d.mobileNum || "").trim())
                .filter(Boolean);
            const studentName = (student.studentsDetails?.[0]?.studentName) || "";
            let matchedLead = null;
            for (const phone of phones) {
                if (phoneToLead.has(phone)) {
                    matchedLead = phoneToLead.get(phone);
                    break;
                }
            }
            if (matchedLead) {
                studentIdToInfo.set(student._id.toString(), {
                    studentId: student._id,
                    studentName,
                    lead: matchedLead
                });
            }
        }

        const studentIds = [...studentIdToInfo.keys()];
        if (studentIds.length === 0) {
            return res.status(200).json({ success: true, admittedLeads: [] });
        }

        // Step 4: Fetch admission details for matched students (both normal + board)
        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find(
                { student: { $in: studentIds } },
                {
                    student: 1,
                    admissionNumber: 1,
                    admissionDate: 1,
                    academicSession: 1,
                    centre: 1,
                    downPayment: 1,   // First payment without GST
                    baseFees: 1,
                    course: 1,
                    class: 1,
                    examTag: 1,
                    createdBy: 1
                }
            )
                .populate("course", "courseName")
                .populate("class", "name")          // Class model field is 'name'
                .populate("examTag", "name")         // ExamTag model field is 'name'
                .populate("createdBy", "name")
                .lean(),

            BoardCourseAdmission.find(
                { studentId: { $in: studentIds } },
                {
                    studentId: 1,
                    admissionNumber: 1,
                    admissionDate: 1,
                    academicSession: 1,
                    centre: 1,
                    admissionFee: 1,
                    boardId: 1,
                    lastClass: 1,
                    createdBy: 1,
                    // Only fetch the first installment to get first paid amount
                    installments: { $slice: 1 }
                }
            )
                .populate("boardId", "boardCourse")  // Boards model field is 'boardCourse'
                .populate("createdBy", "name")
                .lean()
        ]);

        // Step 5: Build response rows
        const result = [];
        const addedStudentIds = new Set();

        for (const adm of normalAdmissions) {
            const sid = adm.student?.toString();
            if (!sid || !studentIdToInfo.has(sid)) continue;
            const info = studentIdToInfo.get(sid);
            addedStudentIds.add(sid);
            result.push({
                leadName: info.lead.leadName || info.studentName || "—",
                leadType: info.lead.leadType || "—",
                centre: adm.centre || info.lead.centre || "—",
                admissionNumber: adm.admissionNumber || "—",
                class: adm.class?.name || "—",           // Class.name
                course: adm.course?.courseName || "—",
                examTag: adm.examTag?.name || "—",        // ExamTag.name
                session: adm.academicSession || "—",
                admissionAmount: adm.downPayment ?? 0,    // Down payment (without GST)
                admittedBy: adm.createdBy?.name || "—",
                admissionDate: adm.admissionDate || null,
                type: "NORMAL"
            });
        }

        for (const adm of boardAdmissions) {
            const sid = adm.studentId?.toString();
            if (!sid || !studentIdToInfo.has(sid)) continue;
            const info = studentIdToInfo.get(sid);
            addedStudentIds.add(sid);

            // First paid amount = paidAmount of the first installment (month 1)
            // Falls back to admissionFee if no installments exist yet
            const firstInstallment = (adm.installments || [])[0];
            const firstPaidAmount = firstInstallment?.paidAmount ?? adm.admissionFee ?? 0;

            result.push({
                leadName: info.lead.leadName || info.studentName || "—",
                leadType: info.lead.leadType || "—",
                centre: adm.centre || info.lead.centre || "—",
                admissionNumber: adm.admissionNumber || "—",
                class: adm.lastClass || "—",
                course: adm.boardId?.boardCourse || "Board Course",
                examTag: "—",
                session: adm.academicSession || "—",
                admissionAmount: firstPaidAmount,   // First month's paid amount (NCRP down payment)
                admittedBy: adm.createdBy?.name || "—",
                admissionDate: adm.admissionDate || null,
                type: "BOARD"
            });
        }

        return res.status(200).json({ success: true, admittedLeads: result });

    } catch (err) {
        console.error("Admitted lead details error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error fetching admitted lead details",
            error: err.message
        });
    }
};
