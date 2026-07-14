import Student from "../../models/Students.js";
import mongoose from "mongoose";
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

        // If counselledBy is updated and contains a valid ObjectId, sync it to BoardCourseCounselling
        if (cleanedData.counselledBy && mongoose.Types.ObjectId.isValid(cleanedData.counselledBy)) {
            try {
                const BoardCourseCounselling = (await import("../../models/Admission/BoardCourseCounselling.js")).default;
                await BoardCourseCounselling.findOneAndUpdate(
                    { studentId: studentId },
                    { counselledBy: cleanedData.counselledBy }
                );
            } catch (counsErr) {
                console.error("Error syncing BoardCourseCounselling in updateStudent:", counsErr);
            }
        }

        // Synchronize changes to BoardCourseAdmission documents
        try {
            const boardAdmissions = await BoardCourseAdmission.find({ studentId: student._id });
            if (boardAdmissions.length > 0) {
                const details = student.studentsDetails?.[0] || {};
                const exam = student.examSchema?.[0] || {};
                const sessionCourse = student.sessionExamCourse?.[0] || {};
 
                for (const admission of boardAdmissions) {
                    const updateFields = {};
                    if (details.studentName) updateFields.studentName = details.studentName;
                    if (details.mobileNum) updateFields.mobileNum = details.mobileNum;
                    if (details.centre) updateFields.centre = details.centre;
                    if (details.programme) updateFields.programme = details.programme;
                    if (exam.class) updateFields.lastClass = exam.class;
                    if (sessionCourse.session) updateFields.academicSession = sessionCourse.session;
 
                    if (details.board) {
                         const boardDoc = await Boards.findOne({
                             $or: [
                                 { boardName: { $regex: new RegExp(`^${details.board.trim()}$`, "i") } },
                                 { boardCourse: { $regex: new RegExp(`^${details.board.trim()}$`, "i") } }
                             ]
                         });
                         if (boardDoc) {
                             updateFields.boardId = boardDoc._id;
                         }
                    }
 
                    const board = await Boards.findById(updateFields.boardId || admission.boardId);
                    if (board) {
                        updateFields.boardCourseName = `${board.boardCourse} Class ${updateFields.lastClass || admission.lastClass || ''} ${updateFields.programme || admission.programme || ''} ${updateFields.academicSession || admission.academicSession || ''}`;
                    }

                    if (!admission.department && student.department) {
                        updateFields.department = student.department;
                    }
 
                    await BoardCourseAdmission.updateOne({ _id: admission._id }, { $set: updateFields });
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
