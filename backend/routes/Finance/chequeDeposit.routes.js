import express from "express";
import multer from "multer";
import {
    validateChequeNumber,
    depositCheque,
    getChequeDepositHistory
} from "../../controllers/Finance/chequeDepositController.js";
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

// All routes require authentication
router.use(requireAuth);

router.get("/validate/:chequeNo", validateChequeNumber);
router.post("/deposit", upload.single('receipt'), depositCheque);
router.get("/history", getChequeDepositHistory);

export default router;
