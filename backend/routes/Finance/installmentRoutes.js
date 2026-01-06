import express from "express";
import { searchStudent, getStudentFinancialDetails, getFeeDueList, getAllAdmissions } from "../../controllers/Finance/installmentController.js";
import { getPendingCheques, clearCheque, rejectCheque } from "../../controllers/Finance/chequeController.js";
import { getFinancialAnalytics } from "../../controllers/Finance/getFinancialAnalytics.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Search for students
router.get("/search", searchStudent);

// Get all admissions with filters
router.get("/all-admissions", getAllAdmissions);

// Get detailed due list
router.get("/get-due-list", getFeeDueList);

// Financial Analytics
router.get("/analytics", getFinancialAnalytics);

// Cheque Management
router.get("/pending-cheques", getPendingCheques);
router.post("/clear-cheque/:paymentId", clearCheque);
router.post("/reject-cheque/:paymentId", rejectCheque);

// Get complete financial details for a student
router.get("/student/:studentId", getStudentFinancialDetails);

export default router;
