import StudentFollowUp from "../../models/StudentFollowUp.js";
import PMOStudent from "../../models/PMOStudent.js";
import PNTSEStudent from "../../models/PNTSEStudent.js";

/**
 * POST /api/follow-up/
 * Body: { studentId, studentType, feedback, notes, nextFollowUpDate?, callDuration? }
 * Creates a new follow-up call log entry.
 */
export const addFollowUp = async (req, res) => {
    try {
        const { studentId, studentType, feedback, notes, nextFollowUpDate, callDuration } = req.body;
        const calledBy = req.user._id;

        if (!studentId || !studentType || !feedback) {
            return res.status(400).json({
                success: false,
                message: "studentId, studentType, and feedback are required.",
            });
        }

        if (!["PMO", "PNTSE"].includes(studentType)) {
            return res.status(400).json({
                success: false,
                message: "studentType must be 'PMO' or 'PNTSE'.",
            });
        }

        // Verify student exists
        const StudentModel = studentType === "PMO" ? PMOStudent : PNTSEStudent;
        const student = await StudentModel.findById(studentId).lean();
        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found." });
        }

        const followUp = await StudentFollowUp.create({
            studentId,
            studentType,
            centre: student.centre || null,
            calledBy,
            feedback,
            notes: notes || "",
            callDuration: callDuration != null ? Number(callDuration) : null,
            nextFollowUpDate: nextFollowUpDate || null,
            callDate: new Date(),
        });

        const populated = await StudentFollowUp.findById(followUp._id)
            .populate("calledBy", "name email role")
            .lean();

        return res.status(201).json({ success: true, followUp: populated });
    } catch (err) {
        console.error("addFollowUp error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

/**
 * GET /api/follow-up/:studentType/:studentId
 * Returns all follow-up entries for a student, sorted newest first.
 */
export const getFollowUps = async (req, res) => {
    try {
        const { studentType, studentId } = req.params;

        if (!["PMO", "PNTSE"].includes(studentType)) {
            return res.status(400).json({
                success: false,
                message: "studentType must be 'PMO' or 'PNTSE'.",
            });
        }

        const followUps = await StudentFollowUp.find({ studentId, studentType })
            .populate("calledBy", "name email role")
            .sort({ callDate: -1 })
            .lean();

        return res.status(200).json({ success: true, followUps });
    } catch (err) {
        console.error("getFollowUps error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

/**
 * DELETE /api/follow-up/:id
 * Deletes a specific follow-up entry (superadmin only guard on route level).
 */
export const deleteFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await StudentFollowUp.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Entry not found." });
        }
        return res.status(200).json({ success: true, message: "Follow-up deleted." });
    } catch (err) {
        console.error("deleteFollowUp error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};
