import express from "express";
import { createAdmission } from "../../controllers/Admission/createAdmission.js";
import { getAdmissions } from "../../controllers/Admission/getAdmissions.js";
import { getAdmissionById } from "../../controllers/Admission/getAdmissionById.js";
import { updateAdmission } from "../../controllers/Admission/updateAdmission.js";
import { deleteAdmission } from "../../controllers/Admission/deleteAdmission.js";
import { updatePaymentInstallment } from "../../controllers/Admission/updatePaymentInstallment.js";
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", requireNormalOrSuper, createAdmission);
router.get("/", requireNormalOrSuper, getAdmissions);
router.get("/:id", requireNormalOrSuper, getAdmissionById);
router.put("/:id", requireNormalOrSuper, updateAdmission);
router.delete("/:id", requireNormalOrSuper, deleteAdmission);
router.put("/:admissionId/payment/:installmentNumber", requireNormalOrSuper, updatePaymentInstallment);

export default router;
