import Course from "../../models/Master_data/Courses.js";

export const bulkUpdateCourses = async (req, res) => {
    try {
        const { ids, updateData } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No course IDs provided for bulk update" });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "No update data provided" });
        }

        const cleanUpdateData = { ...updateData };

        // Clean up optional fields that might be empty strings from the frontend
        const optionalFields = ['class', 'courseType', 'programme'];
        optionalFields.forEach(field => {
            if (cleanUpdateData[field] === "") {
                cleanUpdateData[field] = null;
            }
        });

        // Ensure createdBy is never overwritten
        delete cleanUpdateData.createdBy;

        const result = await Course.updateMany(
            { _id: { $in: ids } },
            { $set: cleanUpdateData },
            { runValidators: true }
        );

        res.status(200).json({
            message: `Successfully updated ${result.modifiedCount} of ${ids.length} courses`,
            data: result
        });
    } catch (err) {
        console.error("Bulk course update error:", err);

        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: "Validation Error: " + messages.join(', ') });
        }

        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            return res.status(400).json({ message: "A course with this name already exists." });
        }

        // Handle casting errors
        if (err.name === 'CastError') {
            return res.status(400).json({ message: `Invalid data provided for field: ${err.path}` });
        }

        res.status(500).json({ message: "Server error during bulk course update", error: err.message });
    }
};
