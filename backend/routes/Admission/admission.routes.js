import express from "express";
import { createAdmission } from "../../controllers/Admission/createAdmission.js";
import { getAdmissions } from "../../controllers/Admission/getAdmissions.js";
import { getAdmissionById } from "../../controllers/Admission/getAdmissionById.js";
import { updateAdmission } from "../../controllers/Admission/updateAdmission.js";
import { deleteAdmission } from "../../controllers/Admission/deleteAdmission.js";
import { updatePaymentInstallment } from "../../controllers/Admission/updatePaymentInstallment.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/", requireAuth, getAdmissions);
router.get("/:id", requireAuth, getAdmissionById);

// Write routes - Require granular permissions
router.post("/create", requireGranularPermission("admissions", "enrolledStudents", "create"), createAdmission);
router.put("/:id", requireGranularPermission("admissions", "enrolledStudents", "edit"), updateAdmission);
router.delete("/:id", requireGranularPermission("admissions", "enrolledStudents", "delete"), deleteAdmission);
router.put("/:admissionId/payment/:installmentNumber", requireGranularPermission("admissions", "enrolledStudents", "edit"), updatePaymentInstallment);

export default router;
