import express from "express";
import multer from "multer";
import {
    initiateCashTransfer,
    getCashReceiveRequests,
    confirmCashReceived,
    getCashReport,
    getCentreTransferDetails,
    rejectCashTransfer
} from "../../controllers/Finance/cashController.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Multer Memory Storage Configuration for R2
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(file.originalname.toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname || mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images and PDFs are allowed!'));
        }
    }
});

router.get("/report", requireAuth, getCashReport);
router.get("/centre-details/:centreId", requireAuth, getCentreTransferDetails);
router.post("/transfer", requireAuth, upload.single('receipt'), initiateCashTransfer);
router.get("/receive-requests", requireAuth, getCashReceiveRequests);
router.post("/confirm-receive", requireAuth, confirmCashReceived);
router.post("/reject-transfer", requireAuth, rejectCashTransfer);

export default router;
