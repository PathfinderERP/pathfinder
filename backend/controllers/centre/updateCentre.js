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

        // Normalize centreCode if provided
        if (updates.centreCode !== undefined && updates.centreCode !== "") {
            const num = parseInt(updates.centreCode, 10);
            if (isNaN(num) || num < 1 || num > 99) {
                return res.status(400).json({ message: "2-Digit Code must be a number between 1 and 99." });
            }
            const normalizedCode = num < 10 ? `0${num}` : `${num}`;

            // Check uniqueness (exclude current centre from the check)
            const existing = await CentreSchema.findOne({ centreCode: normalizedCode, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ message: `Code ${normalizedCode} is already assigned to "${existing.centreName}".` });
            }
            updates.centreCode = normalizedCode;
        } else if (updates.centreCode === "") {
            // Allow clearing – backend will NOT auto-assign on update (pre-save only runs on .save())
            delete updates.centreCode;
        }

        // Ensure locations array is correctly updated
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
