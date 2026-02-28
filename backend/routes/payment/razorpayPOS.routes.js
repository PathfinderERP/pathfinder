import express from "express";
import { 
    initiatePOSPayment, 
    checkPOSPaymentStatus, 
    cancelPOSPayment 
} from "../../controllers/Payment/razorpayPOSController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

// All POS routes should be protected
router.use(protect);

router.post("/initiate", initiatePOSPayment);
router.get("/status/:p2pRequestId", checkPOSPaymentStatus);
router.post("/cancel", cancelPOSPayment);

export default router;
