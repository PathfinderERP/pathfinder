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

        const isUploadedSource = (lead) =>
            lead.isBulkUpload === true ||
            (lead.campaign != null) ||
            (lead.campaignFrom && lead.campaignFrom !== "") ||
            /bulk|import|excel|campaign|facebook|meta|google|ad|online|landing|upload/i.test(lead.source || "");

        const fmtDate = (d) => {
            if (!d) return "N/A";
            const dt = new Date(d);
            return isNaN(dt.getTime()) ? "N/A" : dt.toLocaleDateString('en-GB');
        };

        const fmtDateTime = (d) => {
            if (!d) return "N/A";
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return "N/A";
            return `${dt.toLocaleDateString('en-GB')} ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        };

        const fmtTime = (d) => {
            if (!d) return "N/A";
            const dt = new Date(d);
            return isNaN(dt.getTime()) ? "N/A" : dt.toLocaleTimeString('en-GB');
        };

        const callHistoryRows = [];
        let callSeq = 1;

        // Prepare data for Excel matching the exact columns in the UI table plus Entry Mode and Call Histories
        const data = leads.map((lead, index) => {
            const followUps = Array.isArray(lead.followUps) ? lead.followUps : [];
            const totalCalls = followUps.length;
            const lastFollowUp = totalCalls > 0 ? followUps[totalCalls - 1] : null;

            const effectiveAssignedAt = lead.assignedAt || lead.createdAt;
            const entryMode = isUploadedSource(lead) ? "Uploaded Data" : "Manual Entry";

            // Multi-line numbered summary of all call remarks with date and caller
            const allRemarksText = totalCalls > 0
                ? followUps
                    .map((fu, i) => {
                        const dtStr = fmtDate(fu.date);
                        const byStr = fu.updatedBy ? ` - ${fu.updatedBy}` : '';
                        const remStr = fu.remarks && fu.remarks.trim() ? fu.remarks.trim() : (fu.feedback ? `[${fu.feedback}]` : 'No remarks');
                        return `Call ${i + 1}${dtStr !== 'N/A' ? ` (${dtStr}${byStr})` : ''}: ${remStr}`;
                    })
                    .join('\n')
                : (lead.remarks || "N/A");

            // Multi-line summary of all feedback recorded
            const allFeedbackText = totalCalls > 0
                ? followUps
                    .map((fu, i) => {
                        const dtStr = fmtDate(fu.date);
                        const byStr = fu.updatedBy ? ` (${fu.updatedBy})` : '';
                        return `Call ${i + 1}${dtStr !== 'N/A' ? ` [${dtStr}]` : ''}: ${fu.feedback || 'N/A'}${byStr}`;
                    })
                    .join('\n')
                : "Not Contacted";

            // Comprehensive call audit log
            const fullCallLog = totalCalls > 0
                ? followUps
                    .map((fu, i) => {
                        const dtStr = fmtDateTime(fu.date);
                        const caller = fu.updatedBy ? ` | By: ${fu.updatedBy}` : '';
                        const dur = fu.callDuration ? ` | Dur: ${fu.callDuration}` : '';
                        const st = fu.status ? ` | Status: ${fu.status}` : '';
                        const nextDt = fu.nextFollowUpDate ? ` | Next: ${fmtDate(fu.nextFollowUpDate)}` : '';
                        return `[Call ${i + 1}/${totalCalls}] ${dtStr}${caller}${dur}${st}\n  Feedback: ${fu.feedback || 'N/A'}\n  Remarks: ${fu.remarks || 'None'}${nextDt}`;
                    })
                    .join('\n---\n')
                : "No call records";

            // Populate individual call row for Sheet 2 ("Call & Follow-Up History")
            followUps.forEach((fu, callIdx) => {
                callHistoryRows.push({
                    "Sl No.": callSeq++,
                    "Lead Name": lead.name || "N/A",
                    "Mobile No": lead.phoneNumber || "N/A",
                    "Second Mobile No": lead.secondPhoneNumber || "N/A",
                    "Centre": lead.centre?.centreName || "N/A",
                    "Course Name": lead.course?.courseName || lead.courseText || "N/A",
                    "Class": lead.className?.name || "N/A",
                    "Board": lead.board?.boardName || lead.board?.boardCourse || "N/A",
                    "Current Lead Status": lead.leadType || "N/A",
                    "Call Number": `Call ${callIdx + 1} of ${totalCalls}`,
                    "Call Date & Time": fmtDateTime(fu.date),
                    "Caller / Handled By": fu.updatedBy || "N/A",
                    "Feedback": fu.feedback || "N/A",
                    "Remarks": fu.remarks || "N/A",
                    "Call Duration": fu.callDuration || "N/A",
                    "Lead Status At Call": fu.status || "N/A",
                    "Next Scheduled Follow-up": fmtDate(fu.nextFollowUpDate),
                    "Lead Owner / Responsibility": lead.leadResponsibility || "N/A"
                });
            });

            return {
                "Sl No.": index + 1,
                "Entry Mode": entryMode,
                "Assigned At": fmtDateTime(effectiveAssignedAt),
                "Uploaded At": fmtDateTime(lead.createdAt),
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
                "Walk In Date": lead.walkInDate ? fmtDate(lead.walkInDate) : "N/A",
                "Status": lead.leadType || "N/A",
                "Owner": lead.leadResponsibility || "N/A",
                "Target Source": lead.source || "N/A",
                "Campaign From": lead.campaignFrom || lead.campaign?.adName || "N/A",
                "Marketing By": lead.marketingBy || "N/A",
                "Total Calls": totalCalls,
                "Last Feedback": lastFollowUp ? (lastFollowUp.feedback || "N/A") : "Not Contacted",
                "Remarks": lastFollowUp ? (lastFollowUp.remarks || "N/A") : (lead.remarks || "N/A"),
                "Last Caller": lastFollowUp ? (lastFollowUp.updatedBy || "N/A") : "N/A",
                "All Remarks (Call History)": allRemarksText,
                "All Feedback History": allFeedbackText,
                "Full Call History Log": fullCallLog,
                "Initial Lead Remarks": lead.remarks || "N/A",
                "Last Call Start Time": lastFollowUp && lastFollowUp.callStartTime ? fmtTime(lastFollowUp.callStartTime) : "N/A",
                "Last Call End Time": lastFollowUp && lastFollowUp.callEndTime ? fmtTime(lastFollowUp.callEndTime) : "N/A",
                "Last Call Duration": lastFollowUp ? (lastFollowUp.callDuration || "N/A") : "N/A",
                "Last Follow-up": fmtDate(lead.lastFollowUpDate),
                "Next Follow-up": fmtDate(lead.nextFollowUpDate),
                "Uploaded By": lead.createdBy?.name || "N/A",
                "Created At": fmtDate(lead.createdAt)
            };
        });

        const wb = XLSX.utils.book_new();

        // Sheet 1: Leads
        const wsLeads = XLSX.utils.json_to_sheet(data);
        if (data.length > 0) {
            wsLeads['!cols'] = Object.keys(data[0]).map(key => {
                let maxLen = key.length;
                for (let i = 0; i < Math.min(data.length, 100); i++) {
                    const val = data[i][key];
                    const len = val !== null && val !== undefined ? String(val).length : 0;
                    if (len > maxLen) maxLen = len;
                }
                return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
            });
        }
        XLSX.utils.book_append_sheet(wb, wsLeads, "Leads");

        // Sheet 2: Call & Follow-Up History (one row per call)
        if (callHistoryRows.length > 0) {
            const wsCalls = XLSX.utils.json_to_sheet(callHistoryRows);
            wsCalls['!cols'] = Object.keys(callHistoryRows[0]).map(key => {
                let maxLen = key.length;
                for (let i = 0; i < Math.min(callHistoryRows.length, 100); i++) {
                    const val = callHistoryRows[i][key];
                    const len = val !== null && val !== undefined ? String(val).length : 0;
                    if (len > maxLen) maxLen = len;
                }
                return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
            });
            XLSX.utils.book_append_sheet(wb, wsCalls, "Call & Follow-Up History");
        }

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Leads_Report.xlsx');
        res.send(buffer);

    } catch (err) {
        console.error("Excel export error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
