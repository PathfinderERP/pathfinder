import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";

export const getAdmissionById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try Normal Admission collection
        let admission = await Admission.findById(id)
            .populate('student')
            .populate('course')
            .populate({
                path: 'board',
                populate: {
                    path: 'subjects.subjectId'
                }
            })
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('createdBy', 'name');

        if (admission) {
            return res.status(200).json(admission);
        }

        // Try Board Course Admission collection (Structured)
        let boardAdmission = await BoardCourseAdmission.findById(id)
            .populate('studentId')
            .populate('boardId')
            .populate('selectedSubjects.subjectId')
            .populate('installments.subjects.subjectId')
            .populate('createdBy', 'name');

        if (boardAdmission) {
            // Map structured board to Admission-like format for frontend components
            const normalized = {
                ...boardAdmission.toObject(),
                student: boardAdmission.studentId, // Map studentId to student
                board: boardAdmission.boardId, // Map boardId to board
                admissionType: 'BOARD',
                registrationStatus: 'ENROLLED',
                totalFees: boardAdmission.totalExpectedAmount || 0,
                remainingAmount: (boardAdmission.totalExpectedAmount || 0) - (boardAdmission.totalPaidAmount || 0),
                paymentStatus: boardAdmission.status,
                course: { courseName: boardAdmission.boardCourseName || (boardAdmission.boardId ? boardAdmission.boardId.boardCourse : "Board Course") }
            };
            return res.status(200).json(normalized);
        }

        return res.status(404).json({ message: "Admission record not found in any collection." });
    } catch (err) {
        console.error("GET ADMISSION BY ID ERROR:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
