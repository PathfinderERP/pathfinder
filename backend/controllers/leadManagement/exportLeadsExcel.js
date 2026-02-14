import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import XLSX from "xlsx";
import mongoose from "mongoose";

export const exportLeadsExcel = async (req, res) => {
    try {
        const { search, centre, course, leadResponsibility, fromDate, toDate, leadType, board, className } = req.query;

        // Build base query
        const query = {};

        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } }
            ];
        }

        if (centre) {
            const centreIds = Array.isArray(centre) ? centre : [centre];
            query.centre = { $in: centreIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        }
        if (course) {
            const courseIds = Array.isArray(course) ? course : [course];
            query.course = { $in: courseIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        }
        if (leadResponsibility) {
            query.leadResponsibility = Array.isArray(leadResponsibility)
                ? { $in: leadResponsibility }
                : { $regex: leadResponsibility, $options: "i" };
        }
        if (board) {
            const boardIds = Array.isArray(board) ? board : [board];
            query.board = { $in: boardIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        }
        if (className) {
            const classIds = Array.isArray(className) ? className : [className];
            query.className = { $in: classIds.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        }
        if (leadType) {
            query.leadType = Array.isArray(leadType) ? { $in: leadType } : leadType;
        }
        if (req.query.feedback) {
            const feedbackArray = Array.isArray(req.query.feedback) ? req.query.feedback : [req.query.feedback];
            query.followUps = {
                $elemMatch: { feedback: { $in: feedbackArray } }
            };
        }

        // Access Control
        if (req.user.role !== 'superAdmin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (!userDoc) return res.status(401).json({ message: "User not found" });

            if (userDoc.role === 'telecaller') {
                const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                query.leadResponsibility = { $regex: new RegExp(`^${escapedName}$`, "i") };
            }

            const userCentreIds = userDoc.centres || [];
            if (userCentreIds.length === 0) {
                return res.status(200).json({ message: "No data available" });
            }

            if (centre) {
                const requestedCentres = Array.isArray(centre) ? centre : [centre];
                const allowedCentreStrings = userCentreIds.map(c => c.toString());

                const isAllowed = requestedCentres.every(c => allowedCentreStrings.includes(c));

                if (!isAllowed) {
                    return res.status(403).json({ message: "Access denied" });
                }
            } else {
                query.centre = { $in: userCentreIds };
            }
        }

        const leads = await LeadManagement.find(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardName boardCourse')
            .sort({ createdAt: -1 });

        // Prepare data for Excel
        const data = leads.map((lead, index) => ({
            "Sl No.": index + 1,
            "Name": lead.name,
            "Email": lead.email,
            "Phone": lead.phoneNumber,
            "School": lead.schoolName || "N/A",
            "Class": lead.className?.name || "N/A",
            "Board": lead.board?.boardName || lead.board?.boardCourse || "N/A",
            "Centre": lead.centre?.centreName || "N/A",
            "Course": lead.course?.courseName || "N/A",
            "Lead Type": lead.leadType || "N/A",
            "Source": lead.source || "N/A",
            "Telecaller": lead.leadResponsibility || "N/A",
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
