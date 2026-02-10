import CentreSchema from "../../models/Master_data/Centre.js";

export const getCentres = async (req, res) => {
    try {
        const user = req.user;
        const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin";

        // Note: Global centre filtering reverted to avoid breaking cross-centre features like Cash Transfer.
        // Data isolation is enforced at the record level (employees, leads, students etc).
        const query = {};

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
