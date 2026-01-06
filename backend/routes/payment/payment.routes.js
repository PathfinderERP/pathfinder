import express from "express";
import { generateBill, getBillById, getBillsByAdmission } from "../../controllers/Payment/generateBill.js";
import { requireAuth, requireGranularPermission, requireAnyGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Generate bill for a specific installment payment
router.post("/generate-bill/:admissionId/:installmentNumber", requireAnyGranularPermission([
    { module: "financeFees", section: "billGeneration", action: "create" },
    { module: "financeFees", section: "installmentPayment", action: "create" },
    { module: "financeFees", section: "installmentPayment", action: "edit" },
    { module: "admissions", section: "enrolledStudents", action: "edit" }
]), generateBill);

// Get bill by bill ID
router.get("/bill/:billId", requireAuth, getBillById);

// Get all bills for an admission
router.get("/bills/:admissionId", requireAuth, getBillsByAdmission);

export default router;
