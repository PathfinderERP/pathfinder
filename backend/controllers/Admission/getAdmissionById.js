import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";

export const getAdmissionById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try Normal Admission collection
        let admission = await Admission.findById(id)
            .populate({
                path: 'student',
                populate: [
                    { path: 'batches' }
                ]
            })
            // .populate('course') // Handled manually below
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
            // Manual Course Population
            const Course = (await import("../../models/Master_data/Courses.js")).default;
            const admissionObj = admission.toObject();
            
            if (admissionObj.course) {
                const courseRecord = await Course.findById(admissionObj.course).lean();
                if (courseRecord) {
                    admissionObj.course = courseRecord;
                } else {
                    // Keep the ID as a string if course not found
                    admissionObj.course = admissionObj.course.toString();
                }
            }
            return res.status(200).json(admissionObj);
        }

        // Try Board Course Admission collection (Structured)
        let boardAdmission = await BoardCourseAdmission.findById(id)
            .populate({
                path: 'studentId',
                populate: [
                    { path: 'batches' }
                ]
            })
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
