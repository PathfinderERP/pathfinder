import Course from "../../models/Master_data/Courses.js";

export const deleteMultipleCourses = async (req, res) => {
    try {
        const { ids } = req.body;

        // Extra safety check for SuperAdmin role
        if (req.user.role?.toLowerCase() !== "superadmin" && req.user.role?.toLowerCase() !== "super admin") {
            return res.status(403).json({ message: "Access denied. Only SuperAdmins can perform multiple course deletion." });
        }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {

            return res.status(400).json({ message: "No course IDs provided" });
        }

        const result = await Course.deleteMany({ _id: { $in: ids } });

        res.status(200).json({ 
            message: `${result.deletedCount} courses deleted successfully`,
            deletedCount: result.deletedCount 
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
