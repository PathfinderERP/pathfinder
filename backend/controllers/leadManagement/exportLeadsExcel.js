import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import XLSX from "xlsx";
import mongoose from "mongoose";

export const exportLeadsExcel = async (req, res) => {
    try {
        const { search, centre, course, leadResponsibility, fromDate, toDate, leadType } = req.query;

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
            query.centre = mongoose.Types.ObjectId.isValid(centre) ? new mongoose.Types.ObjectId(centre) : centre;
        }
        if (course) {
            query.course = mongoose.Types.ObjectId.isValid(course) ? new mongoose.Types.ObjectId(course) : course;
        }
        if (leadResponsibility) query.leadResponsibility = { $regex: leadResponsibility, $options: "i" };
        if (leadType) query.leadType = leadType;
        if (req.query.feedback) {
            query.followUps = {
                $elemMatch: { feedback: { $regex: req.query.feedback, $options: "i" } }
            };
        }

        // Access Control
        if (req.user.role !== 'superAdmin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (!userDoc) return res.status(401).json({ message: "User not found" });

            if (userDoc.role === 'telecaller') {
                query.leadResponsibility = userDoc.name;
            }

            const userCentreIds = userDoc.centres || [];
            if (userCentreIds.length === 0) {
                return res.status(200).json({ message: "No data available" });
            }

            if (centre) {
                if (!userCentreIds.map(c => c.toString()).includes(centre)) {
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
            .sort({ createdAt: -1 });

        // Prepare data for Excel
        const data = leads.map((lead, index) => ({
            "Sl No.": index + 1,
            "Name": lead.name,
            "Email": lead.email,
            "Phone": lead.phoneNumber,
            "School": lead.schoolName,
            "Class": lead.className?.name || "N/A",
            "Centre": lead.centre?.centreName || "N/A",
            "Course": lead.course?.courseName || "N/A",
            "Lead Type": lead.leadType || "N/A",
            "Source": lead.source || "N/A",
            "Telecaller": lead.leadResponsibility || "N/A",
            "Last Feedback": lead.followUps && lead.followUps.length > 0 ? lead.followUps[lead.followUps.length - 1].feedback : "N/A",
            "Remarks": lead.followUps && lead.followUps.length > 0 ? lead.followUps[lead.followUps.length - 1].remarks || "N/A" : "N/A",
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
