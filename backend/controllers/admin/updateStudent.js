import Student from "../../models/Students.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Boards from "../../models/Master_data/Boards.js";
import { clearCachePattern, deleteCache } from "../../utils/redisCache.js";

export const updateStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        const updateData = req.body;

        // Helper to recursively clean empty strings to null
        const cleanEmptyStrings = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(item => cleanEmptyStrings(item));
            } else if (typeof obj === 'object' && obj !== null) {
                const newObj = {};
                for (const key in obj) {
                    newObj[key] = cleanEmptyStrings(obj[key]);
                }
                return newObj;
            } else if (obj === "") {
                return null;
            }
            return obj;
        };

        const cleanedData = cleanEmptyStrings(updateData);
        
        // Add auditing metadata
        cleanedData.updatedBy = req.user?.name || "System";
        cleanedData.updatedByUserId = req.user?._id;

        const student = await Student.findByIdAndUpdate(
            studentId,
            { $set: cleanedData },
            { new: true, runValidators: true }
        ).populate('updatedByUserId', 'name role');

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Synchronize changes to BoardCourseAdmission documents
        try {
            const boardAdmissions = await BoardCourseAdmission.find({ studentId: student._id });
            if (boardAdmissions.length > 0) {
                const details = student.studentsDetails?.[0] || {};
                const exam = student.examSchema?.[0] || {};
                const sessionCourse = student.sessionExamCourse?.[0] || {};

                for (const admission of boardAdmissions) {
                    if (details.studentName) admission.studentName = details.studentName;
                    if (details.mobileNum) admission.mobileNum = details.mobileNum;
                    if (details.centre) admission.centre = details.centre;
                    if (details.programme) admission.programme = details.programme;
                    if (exam.class) admission.lastClass = exam.class;
                    if (sessionCourse.session) admission.academicSession = sessionCourse.session;

                    if (details.board) {
                        const boardDoc = await Boards.findOne({
                            $or: [
                                { boardName: { $regex: new RegExp(`^${details.board.trim()}$`, "i") } },
                                { boardCourse: { $regex: new RegExp(`^${details.board.trim()}$`, "i") } }
                            ]
                        });
                        if (boardDoc) {
                            admission.boardId = boardDoc._id;
                        }
                    }

                    const board = await Boards.findById(admission.boardId);
                    if (board) {
                        admission.boardCourseName = `${board.boardCourse} Class ${admission.lastClass || ''} ${admission.programme || ''} ${admission.academicSession || ''}`;
                    }

                    await admission.save();
                }
            }
        } catch (syncErr) {
            console.error("Error syncing BoardCourseAdmission in updateStudent:", syncErr);
        }

        // Invalidate Redis Caches
        try {
            await clearCachePattern("admissions:list:*");
            await deleteCache(`student:report:${studentId}`);
        } catch (cacheErr) {
            console.error("Error clearing cache in updateStudent:", cacheErr);
        }

        res.status(200).json({
            message: "Student updated successfully",
            student
        });
    } catch (error) {
        console.error("Error updating student:", error);

        // Handle specific Mongoose validation or cast errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", error: error.message });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "Invalid ID format", error: error.message });
        }

        res.status(500).json({ message: "Server error", error: error.message });
    }
};
