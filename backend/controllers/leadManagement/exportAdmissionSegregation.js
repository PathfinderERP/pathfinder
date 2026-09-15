import LeadManagement from "../../models/LeadManagement.js";
import Student from "../../models/Students.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import XLSX from "xlsx";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

export const exportAdmissionSegregation = async (req, res) => {
    try {
        // Build base query (same as getConversionDetails, without counselled restriction)
        const queryParams = { ...req.query };
        delete queryParams.followUpStatus;
        const baseQuery = await buildLeadQuery(queryParams, req.user);
        delete baseQuery.isCounseled;
        if (baseQuery.$and) {
            baseQuery.$and = baseQuery.$and.filter(c => !c.hasOwnProperty('isCounseled'));
        }

        // --- Gather all admitted phone numbers (same logic as getConversionDetails) ---
        const [
            normalStudentIds,
            boardStudentIds,
            directEnrolledMobiles,
            directEnrolledWhatsapp,
            boardAdmittedMobiles,
        ] = await Promise.all([
            Admission.distinct("student"),
            BoardCourseAdmission.distinct("studentId"),
            Student.find({ isEnrolled: true }).distinct("studentsDetails.mobileNum"),
            Student.find({ isEnrolled: true }).distinct("studentsDetails.whatsappNumber"),
            BoardCourseAdmission.distinct("mobileNum"),
        ]);

        const allAdmittedStudentIds = [...new Set([...normalStudentIds, ...boardStudentIds])];

        const admittedStudentsFromDetails = await Student.find({
            _id: { $in: allAdmittedStudentIds }
        }).select("studentsDetails.mobileNum studentsDetails.whatsappNumber").lean();

        const phonesFromDetails = admittedStudentsFromDetails
            .flatMap(s => (s.studentsDetails || []).flatMap(d => [d.mobileNum, d.whatsappNumber]))
            .filter(Boolean);

        const allAdmittedPhoneNumbers = [...new Set([
            ...directEnrolledMobiles,
            ...directEnrolledWhatsapp,
            ...boardAdmittedMobiles,
            ...phonesFromDetails
        ])].filter(Boolean);

        // --- Build admitted leads query ---
        const admittedCondition = [
            { phoneNumber: { $in: allAdmittedPhoneNumbers } },
            { secondPhoneNumber: { $in: allAdmittedPhoneNumbers } }
        ];

        const admittedQuery = JSON.parse(JSON.stringify(baseQuery)); // deep clone
        admittedQuery.$and = admittedQuery.$and || [];
        if (admittedQuery.$or) {
            admittedQuery.$and.push({ $or: admittedQuery.$or });
            delete admittedQuery.$or;
        }
        admittedQuery.$and.push({ $or: admittedCondition });

        // --- Fetch all admitted leads ---
        const allAdmittedLeads = await LeadManagement.find(admittedQuery)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse boardName')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

        // --- Categorize into uploaded vs manual ---
        const isUploadedSource = (lead) =>
            lead.isBulkUpload === true ||
            (lead.campaign != null) ||
            (lead.campaignFrom && lead.campaignFrom !== "") ||
            /bulk|import|excel|campaign|facebook|meta|google|ad|online|landing|upload/i.test(lead.source || "");

        const uploadedLeads = allAdmittedLeads.filter(l => isUploadedSource(l));
        const manualLeads = allAdmittedLeads.filter(l => !isUploadedSource(l));

        // Helper to format lead row
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : "N/A";
        const fmtDateTime = (d) => d ? `${new Date(d).toLocaleDateString('en-GB')} ${new Date(d).toLocaleTimeString('en-GB')}` : "N/A";

        const buildRow = (lead, index, entryMode) => ({
            "Sl No.": index + 1,
            "Entry Mode": entryMode,
            "Name": lead.name || "N/A",
            "Email": lead.email || "N/A",
            "Phone": lead.phoneNumber || "N/A",
            "Second Phone": lead.secondPhoneNumber || "N/A",
            "School": lead.schoolName || "N/A",
            "Class": lead.className?.name || "N/A",
            "Board": lead.board?.boardName || lead.board?.boardCourse || "N/A",
            "Centre": lead.centre?.centreName || "N/A",
            "Course": lead.course?.courseName || lead.courseText || "N/A",
            "Lead Type": lead.leadType || "N/A",
            "Source": lead.source || "N/A",
            "Telecaller": lead.leadResponsibility || "N/A",
            "Marketing By": lead.marketingBy || "N/A",
            "Last Feedback": lead.followUps?.length > 0
                ? lead.followUps[lead.followUps.length - 1].feedback : "Not Contacted",
            "Last Remarks": lead.followUps?.length > 0
                ? lead.followUps[lead.followUps.length - 1].remarks || "N/A" : "N/A",
            "Last Follow-up": fmtDate(lead.lastFollowUpDate),
            "Next Follow-up": fmtDate(lead.nextFollowUpDate),
            "Assigned At": fmtDateTime(lead.assignedAt || lead.createdAt),
            "Created At": fmtDate(lead.createdAt),
        });

        // ─── Sheet 1: Count Summary ───────────────────────────────────────────
        const summaryData = [
            { "Category": "Total Admitted Leads",    "Count": allAdmittedLeads.length, "Remarks": "All admitted leads matching current filters" },
            { "Category": "",                         "Count": "",                       "Remarks": "" },
            { "Category": "Uploaded (Excel / Digital)", "Count": uploadedLeads.length,  "Remarks": "Leads imported via bulk-upload, campaign, or digital source" },
            { "Category": "Manual Entry",             "Count": manualLeads.length,       "Remarks": "Leads added manually through the Add Lead form" },
        ];

        // ─── Sheet 2: All Admitted Leads (Detailed) ───────────────────────────
        const allDetailedRows = [
            ...uploadedLeads.map((l, i) => buildRow(l, i, "Uploaded (Excel)")),
            ...manualLeads.map((l, i) => buildRow(l, i, "Manual Entry")),
        ];
        // Re-number after combining
        allDetailedRows.forEach((r, i) => { r["Sl No."] = i + 1; });

        // ─── Sheet 3: Uploaded Leads Only ─────────────────────────────────────
        const uploadedRows = uploadedLeads.map((l, i) => buildRow(l, i, "Uploaded (Excel)"));

        // ─── Sheet 4: Manual Leads Only ───────────────────────────────────────
        const manualRows = manualLeads.map((l, i) => buildRow(l, i, "Manual Entry"));

        // ─── Build Workbook ───────────────────────────────────────────────────
        const wb = XLSX.utils.book_new();

        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 55 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary (Count)");

        const wsAll = XLSX.utils.json_to_sheet(allDetailedRows.length > 0 ? allDetailedRows : [{ "Note": "No admitted leads found for the selected filters." }]);
        XLSX.utils.book_append_sheet(wb, wsAll, "All Admitted Leads");

        const wsUploaded = XLSX.utils.json_to_sheet(uploadedRows.length > 0 ? uploadedRows : [{ "Note": "No uploaded/digital-source admitted leads found." }]);
        XLSX.utils.book_append_sheet(wb, wsUploaded, "Uploaded Data");

        const wsManual = XLSX.utils.json_to_sheet(manualRows.length > 0 ? manualRows : [{ "Note": "No manually-added admitted leads found." }]);
        XLSX.utils.book_append_sheet(wb, wsManual, "Manual Entry");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const dateStr = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Admission_Segregation_${dateStr}.xlsx`);
        res.send(buffer);

    } catch (err) {
        console.error("Admission segregation export error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
