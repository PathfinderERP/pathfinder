import express from "express";
import { searchStudent, getStudentFinancialDetails, getFeeDueList } from "../../controllers/Finance/installmentController.js";
import { getPendingCheques, clearCheque, rejectCheque } from "../../controllers/Finance/chequeController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Search for students
router.get("/search", searchStudent);

// Get detailed due list
router.get("/get-due-list", getFeeDueList);

// Cheque Management
router.get("/pending-cheques", getPendingCheques);
router.post("/clear-cheque/:paymentId", clearCheque);
router.post("/reject-cheque/:paymentId", rejectCheque);

// Get complete financial details for a student
router.get("/student/:studentId", getStudentFinancialDetails);

export default router;
