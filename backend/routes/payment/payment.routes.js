import express from "express";
import { generateBill, getBillById, getBillsByAdmission } from "../../controllers/Payment/generateBill.js";
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Generate bill for a specific installment payment
router.post("/generate-bill/:admissionId/:installmentNumber", requireNormalOrSuper, generateBill);

// Get bill by bill ID
router.get("/bill/:billId", requireNormalOrSuper, getBillById);

// Get all bills for an admission
router.get("/bills/:admissionId", requireNormalOrSuper, getBillsByAdmission);

export default router;
