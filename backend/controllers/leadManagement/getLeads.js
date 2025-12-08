import LeadManagement from "../../models/LeadManagement.js";

export const getLeads = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build Filter
        const { search, leadType, source, centre, course, leadResponsibility } = req.query;
        const query = {};

        if (leadType) query.leadType = leadType;
        if (source) query.source = source;
        if (centre) query.centre = centre;
        if (course) query.course = course;
        if (leadResponsibility) query.leadResponsibility = leadResponsibility;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } },
                { schoolName: { $regex: search, $options: "i" } },
            ];
        }

        const totalLeads = await LeadManagement.countDocuments(query);

        const leads = await LeadManagement.find(query)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            message: "Leads fetched successfully",
            leads,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalLeads / limit),
                totalLeads,
                limit
            }
        });

    } catch (err) {
        console.error("Error fetching leads:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;

        const lead = await LeadManagement.findById(id)
            .populate('className', 'name')
            .populate('centre', 'centreName')
            .populate('course', 'courseName');

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.status(200).json({
            message: "Lead fetched successfully",
            lead,
        });

    } catch (err) {
        console.error("Error fetching lead:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
