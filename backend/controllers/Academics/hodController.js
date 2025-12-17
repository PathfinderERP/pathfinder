import User from "../../models/User.js";

// Get All HODs
export const getAllHODs = async (req, res) => {
    try {
        const hods = await User.find({
            role: "teacher",
            $or: [
                { isDeptHod: true },
                { isBoardHod: true },
                { isSubjectHod: true }
            ]
        })
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json(hods);
    } catch (error) {
        console.error("Get HODs Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
