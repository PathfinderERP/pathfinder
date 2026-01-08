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

        if (req.user.role !== 'superAdmin') {
            const allowedCentreIds = req.user.centres || [];
            if (allowedCentreIds.length > 0) {
                query.centres = { $in: allowedCentreIds };
            } else {
                return res.status(200).json([]);
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
