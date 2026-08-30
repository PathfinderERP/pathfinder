import express from "express";
import { generateBill, getBillById, getBillsByAdmission } from "../../controllers/Payment/generateBill.js";
import { initiatePosPayment, getPosPaymentStatus, cancelPosPayment } from "../../controllers/Payment/posController.js";
import { requireAuth, requireGranularPermission, requireAnyGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Generate bill for a specific installment payment
router.post("/generate-bill/:admissionId/:installmentNumber", requireAnyGranularPermission([
    { module: "financeFees", section: "billGeneration", action: "create" },
    { module: "financeFees", section: "installmentPayment", action: "create" },
    { module: "financeFees", section: "installmentPayment", action: "edit" },
    { module: "admissions", section: "enrolledStudents", action: "edit" },
    { module: "admissions", section: "boardCourseAdmission", action: "create" },
    { module: "admissions", section: "boardCourseAdmission", action: "edit" }
]), generateBill);

import { searchBill, updateBill } from "../../controllers/Payment/editBillController.js";

// Edit Bill Endpoints (must be defined before /bill/:billId to prevent collision)
router.get("/edit-bill/search", requireAuth, searchBill);
router.get("/edit-bill/search/:billNumber", requireAuth, searchBill);
router.put("/edit-bill/update/:paymentId", requireAuth, updateBill);
router.get("/bill/search", requireAuth, searchBill);
router.get("/bill/search/:billNumber", requireAuth, searchBill);
router.put("/bill/update/:paymentId", requireAuth, updateBill);

// Get bill by bill ID
router.get("/bill/:billId", requireAuth, getBillById);

// Get all bills for an admission
router.get("/bills/:admissionId", requireAuth, getBillsByAdmission);

// Razorpay POS Simulator Endpoints
router.post("/pos/initiate", requireAuth, initiatePosPayment);
router.get("/pos/status/:id", requireAuth, getPosPaymentStatus);
router.post("/pos/cancel", requireAuth, cancelPosPayment);

export default router;
