import express from "express";
import { createAdmission } from "../../controllers/Admission/createAdmission.js";
import { getAdmissions } from "../../controllers/Admission/getAdmissions.js";
import { getAdmissionById } from "../../controllers/Admission/getAdmissionById.js";
import { updateAdmission } from "../../controllers/Admission/updateAdmission.js";
import { deleteAdmission } from "../../controllers/Admission/deleteAdmission.js";
import { updatePaymentInstallment } from "../../controllers/Admission/updatePaymentInstallment.js";
import { toggleStudentStatus } from "../../controllers/Admission/toggleStudentStatus.js";
import { requireAuth, requireGranularPermission, requireAnyGranularPermission } from "../../middleware/permissionMiddleware.js";

import { searchAdmission, transferCourse } from "../../controllers/Admission/courseTransfer.js";
import { generateMonthlyBill, getMonthlyBreakdown, updateBoardSubjects } from "../../controllers/Admission/generateMonthlyBill.js";

import { getStudentSections, allotSection } from "../../controllers/Admission/sectionAllotmentController.js";
import { divideRemainingInstallments } from "../../controllers/Admission/divideRemainingInstallments.js";
import { manualFeeAdjustment } from "../../controllers/Admission/manualFeeAdjustment.js";
import { updateEnrollmentNumber } from "../../controllers/Admission/updateEnrollmentNumber.js";
import { permanentlyDeleteStudent } from "../../controllers/Admission/permanentlyDeleteStudent.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/", requireAuth, getAdmissions);
router.get("/section-allotment", requireGranularPermission("admissions", "sectionAllotment", "view"), getStudentSections); // Section Allotment List
router.get("/search", requireAuth, searchAdmission); // New Search Route
router.get("/:id", requireAuth, getAdmissionById);

// Write routes - Require granular permissions
router.post("/create", requireGranularPermission("admissions", "enrolledStudents", "create"), createAdmission);
router.put("/section-allotment/:admissionId", requireGranularPermission("admissions", "sectionAllotment", "edit"), allotSection); // Update Allotment
router.post("/transfer", requireGranularPermission("admissions", "enrolledStudents", "edit"), transferCourse); // New Transfer Route
router.put("/:id", requireGranularPermission("admissions", "enrolledStudents", "edit"), updateAdmission);
router.delete("/:id", requireGranularPermission("admissions", "enrolledStudents", "delete"), deleteAdmission);
router.put("/:admissionId/payment/:installmentNumber", requireAnyGranularPermission([
    { module: "admissions", section: "enrolledStudents", action: "edit" },
    { module: "financeFees", section: "installmentPayment", action: "create" },
    { module: "financeFees", section: "installmentPayment", action: "edit" }
]), updatePaymentInstallment);

router.put("/:admissionId/board-subjects", requireGranularPermission("admissions", "enrolledStudents", "edit"), updateBoardSubjects);
router.post("/:admissionId/monthly-bill", requireGranularPermission("admissions", "enrolledStudents", "edit"), generateMonthlyBill);
router.get("/:admissionId/monthly-breakdown", requireAuth, getMonthlyBreakdown);

router.put("/student/:studentId/status", requireGranularPermission("admissions", "enrolledStudents", "deactivate"), toggleStudentStatus);
router.put("/:admissionId/divide-installments", requireGranularPermission("admissions", "enrolledStudents", "edit"), divideRemainingInstallments);
router.put("/:id/manual-adjustment", requireAuth, manualFeeAdjustment);
router.put("/:id/enrollment-number", requireGranularPermission("admissions", "enrolledStudents", "edit"), updateEnrollmentNumber);
router.delete("/student/:studentId/permanent", requireGranularPermission("admissions", "enrolledStudents", "delete"), permanentlyDeleteStudent);

export default router;
