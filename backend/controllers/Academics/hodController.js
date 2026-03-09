import User from "../../models/User.js";

// Get All HODs
export const getAllHODs = async (req, res) => {
    try {
        let query = {
            role: "teacher",
            $or: [
                { isDeptHod: true },
                { isBoardHod: true },
                { isSubjectHod: true }
            ]
        };

        const userRole = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const privilegedRoles = ["superadmin", "super admin", "admin", "centerincharge", "zonalmanager", "zonalhead", "hr", "class_coordinator", "rm", "hod"];
        const isPrivileged = privilegedRoles.includes(userRole);

        if (userRole !== "superadmin" && userRole !== "super admin" && userRole !== "hr") {
            if (isPrivileged) {
                const allowedCentreIds = req.user.centres || [];
                if (allowedCentreIds.length > 0) {
                    query.centres = { $in: allowedCentreIds };
                } else {
                    query._id = req.user.id;
                }
            } else {
                query._id = req.user.id;
            }
        }

        const hods = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json(hods);
    } catch (error) {
        console.error("Get HODs Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
