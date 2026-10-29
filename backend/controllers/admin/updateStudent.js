import Student from "../../models/Students.js";
import mongoose from "mongoose";
import Admission from "../../models/Admission/Admission.js";
import { clearCachePattern, deleteCache } from "../../utils/redisCache.js";
import { resolveCanonicalCentreName } from "../../services/admissionCentreSyncService.js";

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

        // If personal details were sent at root level rather than nested under studentsDetails, map to studentsDetails.0
        if (!cleanedData.studentsDetails) {
            if (cleanedData.studentName) {
                cleanedData['studentsDetails.0.studentName'] = cleanedData.studentName;
                delete cleanedData.studentName;
            }
            if (cleanedData.mobileNum || cleanedData.phoneNumber) {
                cleanedData['studentsDetails.0.mobileNum'] = cleanedData.mobileNum || cleanedData.phoneNumber;
                delete cleanedData.mobileNum;
                delete cleanedData.phoneNumber;
            }
            if (cleanedData.studentEmail || cleanedData.email) {
                cleanedData['studentsDetails.0.studentEmail'] = cleanedData.studentEmail || cleanedData.email;
                delete cleanedData.studentEmail;
                delete cleanedData.email;
            }
            if (cleanedData.whatsappNumber) {
                cleanedData['studentsDetails.0.whatsappNumber'] = cleanedData.whatsappNumber;
                delete cleanedData.whatsappNumber;
            }
            if (cleanedData.address) {
                cleanedData['studentsDetails.0.address'] = cleanedData.address;
                delete cleanedData.address;
            }
        }

        const student = await Student.findByIdAndUpdate(
            studentId,
            { $set: cleanedData },
            { new: true, runValidators: true }
        ).populate('updatedByUserId', 'name role');

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // If counselledBy is updated and contains a valid ObjectId, sync it to normal student counselling
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

        // If centre is updated, synchronize normal Admissions and student profile
        const updatedCentre = cleanedData.studentsDetails?.[0]?.centre || cleanedData.centre;
        if (updatedCentre) {
            try {
                const canonical = await resolveCanonicalCentreName(updatedCentre);
                if (canonical) {
                    await Admission.updateMany(
                        { student: studentId },
                        { $set: { centre: canonical } }
                    );
                    await Student.updateOne(
                        { _id: studentId },
                        { $set: { "studentsDetails.0.centre": canonical, centre: canonical } }
                    );
                }
            } catch (centreSyncErr) {
                console.error("Error syncing student centre in updateStudent:", centreSyncErr);
            }
        }

        // Note: BoardCourseAdmission documents are kept independent from normal student updates.

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
