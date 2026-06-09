import CentreSchema from "../../models/Master_data/Centre.js";
import Student from "../../models/Students.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";

export const updateCentre = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Fetch old centre first
        const oldCentre = await CentreSchema.findById(id);
        if (!oldCentre) {
            return res.status(404).json({ message: "Centre not found" });
        }
        
        const oldName = oldCentre.centreName;
        const newName = updates.centreName;

        // Ensure locations array is correctly updated (mongoose handles array replacement by default for direct assignment)
        const updatedCentre = await CentreSchema.findByIdAndUpdate(id, updates, { new: true });

        // If centre name actually changed, cascade the update
        if (newName && oldName && oldName !== newName) {
            // Update Students where centre is stored as String in studentsDetails array
            await Student.updateMany(
                { "studentsDetails.centre": oldName },
                { $set: { "studentsDetails.$[elem].centre": newName } },
                { arrayFilters: [{ "elem.centre": oldName }] }
            );

            // Update BoardCourseAdmission where centre is stored as String
            await BoardCourseAdmission.updateMany(
                { centre: oldName },
                { $set: { centre: newName } }
            );
        }

        res.status(200).json({
            message: "Centre updated successfully",
            centre: updatedCentre,
        });

    } catch (err) {
        console.error("Centre update error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
