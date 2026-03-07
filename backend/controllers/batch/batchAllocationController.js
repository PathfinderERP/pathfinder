import Student from "../../models/Students.js";
import Batch from "../../models/Master_data/Batch.js";

/**
 * POST /batch/assign
 * Body: { studentIds: [...], batchId: "..." }
 * Assigns a batch to one or more students (bulk).
 * Does NOT add duplicates.
 */
export const assignBatch = async (req, res) => {
    try {
        const { studentIds, batchId, batchIds } = req.body;

        const finalBatchIds = batchIds || (batchId ? [batchId] : []);

        if (finalBatchIds.length === 0 || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: "batchIds (array) and studentIds (array) are required" });
        }

        const batches = await Batch.find({ _id: { $in: finalBatchIds } });
        if (batches.length === 0) return res.status(404).json({ message: "No valid batches found" });

        // Add all batchIds to each student's batches array if not already present
        const result = await Student.updateMany(
            { _id: { $in: studentIds } },
            { $addToSet: { batches: { $each: finalBatchIds } } }
        );

        res.status(200).json({
            message: `${finalBatchIds.length} batch(es) assigned to ${result.modifiedCount} student(s)`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("assignBatch error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * PUT /batch/remove/:studentId
 * Body: { batchId: "..." }
 * Removes a specific batch from a student.
 */
export const removeBatch = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { batchId } = req.body;

        if (!batchId) return res.status(400).json({ message: "batchId is required" });

        const student = await Student.findByIdAndUpdate(
            studentId,
            { $pull: { batches: batchId } },
            { new: true }
        ).populate("batches", "batchName");

        if (!student) return res.status(404).json({ message: "Student not found" });

        res.status(200).json({
            message: "Batch removed successfully",
            batches: student.batches
        });
    } catch (error) {
        console.error("removeBatch error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
