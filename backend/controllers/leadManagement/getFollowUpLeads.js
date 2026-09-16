import LeadManagement from "../../models/LeadManagement.js";
import { buildLeadQuery, splitCommasOutsideParens } from "../../utils/leadQueryHelper.js";

export const getFollowUpLeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Map frontend parameters to backend query helper expectations
        if (req.query.date) {
            req.query.scheduledDate = req.query.date;
        }
        if (req.query.centre) {
            req.query.centre = splitCommasOutsideParens(req.query.centre).filter(Boolean);
        }
        if (req.query.telecaller) {
            req.query.leadResponsibility = splitCommasOutsideParens(req.query.telecaller).filter(Boolean);
        }

        const query = await buildLeadQuery(req.query, req.user);
        
        // Ensure we only query leads that have a scheduled next follow-up date
        query.nextFollowUpDate = query.nextFollowUpDate || { $exists: true, $ne: null };

        const totalLeads = await LeadManagement.countDocuments(query);
        const leads = await LeadManagement.find(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .populate('board', 'boardCourse')
            .sort({ nextFollowUpDate: 1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            leads,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalLeads / limit),
                totalLeads,
                limit
            }
        });
    } catch (err) {
        console.error("Error fetching follow-up leads:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};