import Admission from "../../models/Admission/Admission.js";

export const deleteAdmission = async (req, res) => {
    try {
        const { id } = req.params;

        const admission = await Admission.findByIdAndDelete(id);

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        res.status(200).json({ message: "Admission deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
