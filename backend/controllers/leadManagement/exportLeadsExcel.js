import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import XLSX from "xlsx";
import mongoose from "mongoose";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

export const exportLeadsExcel = async (req, res) => {
    try {
        const { search, centre, course, leadResponsibility, fromDate, toDate, leadType, board, className } = req.query;

        // Build base query
        const query = await buildLeadQuery(req.query, req.user);

        const sortOption = query.nextFollowUpDate ? { nextFollowUpDate: 1 } : { createdAt: -1 };

        const leads = await LeadManagement.find(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardName boardCourse')
            .sort(sortOption);

        // Prepare data for Excel
        const data = leads.map((lead, index) => ({
            "Sl No.": index + 1,
            "Name": lead.name,
            "Email": lead.email,
            "Phone": lead.phoneNumber,
            "Second Phone Number": lead.secondPhoneNumber || "N/A",
            "School": lead.schoolName || "N/A",
            "Class": lead.className?.name || "N/A",
            "Board": lead.board?.boardName || lead.board?.boardCourse || "N/A",
            "Centre": lead.centre?.centreName || "N/A",
            "Course": lead.course?.courseName || lead.courseText || "N/A",
            "Marks": lead.marks !== undefined && lead.marks !== null ? lead.marks : "N/A",
            "Walk In Date": lead.walkInDate ? new Date(lead.walkInDate).toLocaleDateString('en-GB') : "N/A",
            "Lead Type": lead.leadType || "N/A",
            "Source": lead.source || "N/A",
            "Telecaller": lead.leadResponsibility || "N/A",
            "Marketing By": lead.marketingBy || "N/A",
            "Assigned At": `${new Date(lead.assignedAt || lead.createdAt).toLocaleDateString('en-GB')} ${new Date(lead.assignedAt || lead.createdAt).toLocaleTimeString('en-GB')}`,
            "Last Feedback": lead.followUps && lead.followUps.length > 0 ? lead.followUps[lead.followUps.length - 1].feedback : "Not Contacted",
            "Remarks": lead.followUps && lead.followUps.length > 0 ? lead.followUps[lead.followUps.length - 1].remarks || "N/A" : "N/A",
            "Last Call Start Time": lead.followUps && lead.followUps.length > 0 && lead.followUps[lead.followUps.length - 1].callStartTime ? new Date(lead.followUps[lead.followUps.length - 1].callStartTime).toLocaleTimeString('en-GB') : "N/A",
            "Last Call End Time": lead.followUps && lead.followUps.length > 0 && lead.followUps[lead.followUps.length - 1].callEndTime ? new Date(lead.followUps[lead.followUps.length - 1].callEndTime).toLocaleTimeString('en-GB') : "N/A",
            "Last Call Duration": lead.followUps && lead.followUps.length > 0 ? lead.followUps[lead.followUps.length - 1].callDuration || "N/A" : "N/A",
            "Last Follow-up": lead.lastFollowUpDate ? new Date(lead.lastFollowUpDate).toLocaleDateString('en-GB') : "N/A",
            "Next Follow-up": lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB') : "N/A",
            "Created At": new Date(lead.createdAt).toLocaleDateString('en-GB')
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Leads");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Leads_Report.xlsx');
        res.send(buffer);

    } catch (err) {
        console.error("Excel export error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
