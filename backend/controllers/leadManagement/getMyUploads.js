import LeadManagement from "../../models/LeadManagement.js";

/**
 * GET /lead-management/my-uploads
 * Returns all leads uploaded (bulk or otherwise) by the logged-in user.
 * Sorted by newest first. Supports ?page=1&limit=50
 */
export const getMyUploads = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(200, parseInt(req.query.limit) || 50);
        const skip  = (page - 1) * limit;

        const [leads, total] = await Promise.all([
            LeadManagement.find({ createdBy: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("className",  "name className")
                .populate("centre",     "centreName centerName name")
                .populate("course",     "courseName name")
                .populate("board",      "name boardName")
                .select("name email phoneNumber secondPhoneNumber className centre course board source leadType leadResponsibility createdAt"),
            LeadManagement.countDocuments({ createdBy: userId }),
        ]);

        return res.status(200).json({
            leads,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error("getMyUploads error:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
};
