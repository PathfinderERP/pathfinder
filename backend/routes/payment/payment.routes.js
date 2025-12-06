import express from "express";
import { generateBill, getBillById, getBillsByAdmission } from "../../controllers/Payment/generateBill.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Generate bill for a specific installment payment
router.post("/generate-bill/:admissionId/:installmentNumber", requireGranularPermission("finance", "bills", "create"), generateBill);

// Get bill by bill ID
router.get("/bill/:billId", requireAuth, getBillById);

// Get all bills for an admission
router.get("/bills/:admissionId", requireAuth, getBillsByAdmission);

export default router;
