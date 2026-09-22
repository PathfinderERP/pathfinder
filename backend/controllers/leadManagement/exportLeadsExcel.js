import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import Campaign from "../../models/Campaign.js";
import XLSX from "xlsx";
import mongoose from "mongoose";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

export const exportLeadsExcel = async (req, res) => {
    try {
        // Build base query incorporating all filters, search terms, and date ranges
        const query = await buildLeadQuery(req.query, req.user);

        // If specific leads were selected via checkboxes, restrict export to those specific IDs
        if (req.query.selectedLeadIds) {
            const rawIds = Array.isArray(req.query.selectedLeadIds)
                ? req.query.selectedLeadIds
                : req.query.selectedLeadIds.split(',');
            const validObjectIds = rawIds
                .map(id => String(id).trim())
                .filter(id => mongoose.Types.ObjectId.isValid(id))
                .map(id => new mongoose.Types.ObjectId(id));
            if (validObjectIds.length > 0) {
                query._id = { $in: validObjectIds };
            }
        }

        let sortOption = {};
        if (req.query.sortBy) {
            const order = req.query.sortOrder === 'desc' ? -1 : 1;
            sortOption[req.query.sortBy] = order;
        } else {
            sortOption = query.nextFollowUpDate ? { nextFollowUpDate: 1 } : { isPriority: -1, createdAt: -1 };
        }

        const leads = await LeadManagement.find(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardName boardCourse')
            .populate('campaign', 'adName')
            .populate('createdBy', 'name')
            .sort(sortOption);

        // Prepare data for Excel matching the exact columns in the UI table
        const data = leads.map((lead, index) => {
            const lastFollowUp = lead.followUps && lead.followUps.length > 0
                ? lead.followUps[lead.followUps.length - 1]
                : null;

            const effectiveAssignedAt = lead.assignedAt || lead.createdAt;

            return {
                "Sl No.": index + 1,
                "Assigned At": effectiveAssignedAt
                    ? `${new Date(effectiveAssignedAt).toLocaleDateString('en-GB')} ${new Date(effectiveAssignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : "N/A",
                "Name": lead.name || "N/A",
                "Email": lead.email || "N/A",
                "Mobile No": lead.phoneNumber || "N/A",
                "Second Mobile No": lead.secondPhoneNumber || "N/A",
                "Centre": lead.centre?.centreName || "N/A",
                "Course Name": lead.course?.courseName || lead.courseText || "N/A",
                "Class": lead.className?.name || "N/A",
                "Board": lead.board?.boardName || lead.board?.boardCourse || "N/A",
                "School": lead.schoolName || "N/A",
                "Marks": lead.marks !== undefined && lead.marks !== null ? lead.marks : "N/A",
                "Walk In Date": lead.walkInDate ? new Date(lead.walkInDate).toLocaleDateString('en-GB') : "N/A",
                "Status": lead.leadType || "N/A",
                "Owner": lead.leadResponsibility || "N/A",
                "Target Source": lead.source || "N/A",
                "Campaign From": lead.campaignFrom || lead.campaign?.adName || "N/A",
                "Marketing By": lead.marketingBy || "N/A",
                "Last Feedback": lastFollowUp ? lastFollowUp.feedback : "Not Contacted",
                "Remarks": lastFollowUp ? (lastFollowUp.remarks || "N/A") : "N/A",
                "Last Call Start Time": lastFollowUp && lastFollowUp.callStartTime ? new Date(lastFollowUp.callStartTime).toLocaleTimeString('en-GB') : "N/A",
                "Last Call End Time": lastFollowUp && lastFollowUp.callEndTime ? new Date(lastFollowUp.callEndTime).toLocaleTimeString('en-GB') : "N/A",
                "Last Call Duration": lastFollowUp ? (lastFollowUp.callDuration || "N/A") : "N/A",
                "Last Follow-up": lead.lastFollowUpDate ? new Date(lead.lastFollowUpDate).toLocaleDateString('en-GB') : "N/A",
                "Next Follow-up": lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB') : "N/A",
                "Uploaded By": lead.createdBy?.name || "N/A",
                "Created At": lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB') : "N/A"
            };
        });

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
