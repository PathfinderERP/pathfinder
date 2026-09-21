import mongoose from "mongoose";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";
import Student from "../models/Students.js";
import Payment from "../models/Payment/Payment.js";
import Centre from "../models/Master_data/Centre.js";
import { clearCachePattern, deleteCache } from "../utils/redisCache.js";
import { updateCentreTargetAchieved } from "./centreTargetService.js";

/**
 * Resolves the canonical centre name from the Centre collection if available.
 * Handles ObjectIds, trimmed casing, and regex matching.
 */
export const resolveCanonicalCentreName = async (centreInput) => {
    if (!centreInput) return "";
    const str = String(centreInput).trim();

    try {
        if (mongoose.Types.ObjectId.isValid(str)) {
            const centreDoc = await Centre.findById(str).select("centreName");
            if (centreDoc && centreDoc.centreName) {
                return centreDoc.centreName.trim();
            }
        }

        const cleanRegex = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const centreDoc = await Centre.findOne({
            centreName: { $regex: new RegExp(`^\\s*${cleanRegex}\\s*$`, "i") }
        }).select("centreName");

        if (centreDoc && centreDoc.centreName) {
            return centreDoc.centreName.trim();
        }
    } catch (e) {
        console.error("Error resolving canonical centre name:", e);
    }

    return str;
};

/**
 * Synchronizes a student's centre across:
 * 1. Normal Admissions (Admission)
 * 2. Board Course Admissions (BoardCourseAdmission)
 * 3. Student profile (Students.studentsDetails[0].centre & Students.centre)
 * 4. LeadManagement & BoardCourseCounselling
 * 5. Payment records (transactions) - maintains existing paidDate, receivedDate, billId, amounts.
 * 6. Sales targets (CentreTarget) & Redis caches
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} [params.studentId]
 * @param {string|mongoose.Types.ObjectId} [params.admissionId]
 * @param {string} params.newCentre
 * @param {string} [params.modifiedBy]
 */
export const syncStudentCentre = async ({
    studentId,
    admissionId,
    newCentre,
    modifiedBy = "System"
}) => {
    try {
        if (!newCentre) return { success: false, message: "No new centre provided" };

        const canonicalCentre = await resolveCanonicalCentreName(newCentre);
        if (!canonicalCentre) return { success: false, message: "Invalid centre provided" };

        // 1. Resolve studentId if not provided
        let resolvedStudentId = studentId;
        if (!resolvedStudentId && admissionId) {
            const normalAdm = await Admission.findById(admissionId).select("student");
            if (normalAdm && normalAdm.student) {
                resolvedStudentId = normalAdm.student;
            } else {
                const boardAdm = await BoardCourseAdmission.findById(admissionId).select("studentId");
                if (boardAdm && boardAdm.studentId) {
                    resolvedStudentId = boardAdm.studentId;
                }
            }
        }

        // 2. Discover all admission IDs for this student (both normal and board)
        const admissionQuery = resolvedStudentId
            ? { student: resolvedStudentId }
            : (admissionId ? { _id: admissionId } : null);

        const boardAdmissionQuery = resolvedStudentId
            ? { studentId: resolvedStudentId }
            : (admissionId ? { _id: admissionId } : null);

        const [normalAdmissions, boardAdmissions] = await Promise.all([
            admissionQuery ? Admission.find(admissionQuery).select("_id centre") : [],
            boardAdmissionQuery ? BoardCourseAdmission.find(boardAdmissionQuery).select("_id centre") : []
        ]);

        const allAdmissionIds = [
            ...normalAdmissions.map(a => a._id),
            ...boardAdmissions.map(b => b._id)
        ];

        if (admissionId && !allAdmissionIds.some(id => id.toString() === admissionId.toString())) {
            allAdmissionIds.push(new mongoose.Types.ObjectId(admissionId));
        }

        // 3. Update normal Admission documents
        if (admissionQuery) {
            await Admission.updateMany(
                admissionQuery,
                { $set: { centre: canonicalCentre } }
            );
        }

        // 4. Update BoardCourseAdmission documents
        if (boardAdmissionQuery) {
            await BoardCourseAdmission.updateMany(
                boardAdmissionQuery,
                { $set: { centre: canonicalCentre } }
            );
        }

        // 5. Update Student profile if studentId resolved
        if (resolvedStudentId) {
            await Student.updateOne(
                { _id: resolvedStudentId },
                {
                    $set: {
                        "studentsDetails.0.centre": canonicalCentre,
                        centre: canonicalCentre,
                        updatedBy: modifiedBy
                    }
                }
            );

            // Synchronize LeadManagement & BoardCourseCounselling if existing
            try {
                const LeadManagement = (await import("../models/LeadManagement.js")).default;
                await LeadManagement.updateMany(
                    { studentId: resolvedStudentId },
                    { $set: { centre: canonicalCentre } }
                );
            } catch (e) {
                // non-critical
            }

            try {
                const BoardCourseCounselling = (await import("../models/Admission/BoardCourseCounselling.js")).default;
                await BoardCourseCounselling.updateMany(
                    { studentId: resolvedStudentId },
                    { $set: { centre: canonicalCentre } }
                );
            } catch (e) {
                // non-critical
            }
        }

        // 6. Synchronize Payment documents (keep existing paidDate, receivedDate, billId, etc. intact!)
        let updatedPaymentsCount = 0;
        if (allAdmissionIds.length > 0) {
            const payments = await Payment.find({
                admission: { $in: allAdmissionIds }
            }).select("_id centre paidDate receivedDate createdAt billId");

            if (payments.length > 0) {
                const oldCentres = new Set();
                const paymentDates = [];

                for (const p of payments) {
                    if (p.centre && p.centre.trim().toUpperCase() !== canonicalCentre.toUpperCase()) {
                        oldCentres.add(p.centre.trim());
                    }
                    paymentDates.push(p.paidDate || p.receivedDate || p.createdAt);
                }

                const paymentIds = payments.map(p => p._id);
                const updateResult = await Payment.updateMany(
                    { _id: { $in: paymentIds } },
                    { $set: { centre: canonicalCentre } }
                );
                updatedPaymentsCount = updateResult.modifiedCount || payments.length;

                // 7. Update target achievements for affected months/dates (both old and new centre)
                try {
                    for (const pDate of paymentDates) {
                        for (const oldC of oldCentres) {
                            await updateCentreTargetAchieved(oldC, pDate);
                        }
                        await updateCentreTargetAchieved(canonicalCentre, pDate);
                    }
                } catch (targetErr) {
                    console.error("Error updating centre target achievements during centre sync:", targetErr);
                }
            }
        }

        // 8. Invalidate Redis Caches
        try {
            await clearCachePattern("admissions:list:*");
            if (resolvedStudentId) {
                await deleteCache(`student:report:${resolvedStudentId}`);
            }
            await clearCachePattern("dailyCollection*");
            await clearCachePattern("transactions*");
            await clearCachePattern("sales*");
            await clearCachePattern("centreTarget*");
            await clearCachePattern("report*");
        } catch (cacheErr) {
            console.error("Error clearing caches during centre sync:", cacheErr);
        }

        return {
            success: true,
            canonicalCentre,
            updatedPaymentsCount,
            admissionsCount: allAdmissionIds.length
        };
    } catch (error) {
        console.error("syncStudentCentre Error:", error);
        return { success: false, error: error.message };
    }
};
