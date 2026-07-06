import LeadManagement from "../../models/LeadManagement.js";

/**
 * GET /lead-management/my-uploads
 * Returns leads uploaded (bulk or otherwise).
 * Super Admins can see all, other users see their own.
 * Supports multi-select filtering on className, leadType, centre, course.
 * Sorted by newest first. Supports ?page=1&limit=50
 */
export const getMyUploads = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(200, parseInt(req.query.limit) || 50);
        const skip  = (page - 1) * limit;

        const query = { isBulkUpload: true };
        if (req.user?.role !== 'superAdmin') {
            query.createdBy = userId;
        }

        // Multi-select query filters
        if (req.query.className) {
            query.className = { $in: req.query.className.split(",") };
        }
        if (req.query.leadType) {
            query.leadType = { $in: req.query.leadType.split(",") };
        }
        if (req.query.centre) {
            query.centre = { $in: req.query.centre.split(",") };
        }
        if (req.query.course) {
            query.course = { $in: req.query.course.split(",") };
        }

        const [leads, total] = await Promise.all([
            LeadManagement.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("className",  "name className")
                .populate("centre",     "centreName centerName name")
                .populate("course",     "courseName name")
                .populate("board",      "name boardName")
                .populate("createdBy",  "name")
                .select("name email phoneNumber secondPhoneNumber className centre course courseText board source leadType leadResponsibility createdBy createdAt"),
            LeadManagement.countDocuments(query),
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
