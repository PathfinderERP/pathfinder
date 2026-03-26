import express from "express";
import { 
    initiateSMSPayment, 
    checkSMSPaymentStatus, 
    razorpayWebhookHandler 
} from "../../controllers/Payment/razorpaySMSController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

// Public webhook route (must be before protect middleware)
router.post("/webhook", razorpayWebhookHandler);

// Protected routes for administrative actions
router.post("/initiate", protect, initiateSMSPayment);
router.get("/status/:paymentLinkId", protect, checkSMSPaymentStatus);

export default router;
