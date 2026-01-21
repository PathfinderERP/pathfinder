import express from "express";
import { getAllCheques, cancelCheque } from "../../controllers/Finance/chequeController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all cheques (with filters)
router.get("/all", getAllCheques);

// Cancel a cheque payment
router.put("/cancel/:paymentId", cancelCheque);

export default router;
