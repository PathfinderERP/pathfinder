import express from "express";
import { getAllCheques, cancelCheque, updateChequeStatus } from "../../controllers/Finance/chequeController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all cheques (with filters)
router.get("/all", getAllCheques);

// Cancel a cheque payment
router.put("/cancel/:paymentId", cancelCheque);

// Update status of a cheque
router.put("/update-status/:paymentId", updateChequeStatus);
router.post("/update-status/:paymentId", updateChequeStatus);

export default router;
