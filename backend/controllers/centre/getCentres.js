import CentreSchema from "../../models/Master_data/Centre.js";

export const getCentres = async (req, res) => {
    try {
        const user = req.user;
        const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin";

        // SuperAdmins see all centres
        // Other users only see centres they are assigned to
        let query = {};

        if (!isSuperAdmin) {
            const userCentres = user.centres || [];
            if (userCentres.length > 0) {
                // Filter to only show centres the user is assigned to
                query._id = { $in: userCentres };
            } else {
                // If user has no centres assigned, return empty array
                return res.status(200).json([]);
            }
        }

        const centres = await CentreSchema.find(query);
        res.status(200).json(centres);
    } catch (err) {
        console.error("Error fetching centres:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getCentreById = async (req, res) => {
    try {
        const { id } = req.params;
        const centre = await CentreSchema.findById(id);

        if (!centre) {
            return res.status(404).json({ message: "Centre not found" });
        }

        res.status(200).json(centre);
    } catch (err) {
        console.error("Error fetching centre:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
