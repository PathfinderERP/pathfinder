import express from "express";
import {
    submitReimbursement,
    getMyReimbursements,
    getAllReimbursements,
    getReimbursementById,
    updateReimbursement,
    deleteReimbursement
} from "../../controllers/HR/reimbursementController.js";
import protect, { requireNormalOrSuper } from "../../middleware/authMiddleware.js";
import multer from "multer";
import fs from "fs";

const router = express.Router();

// Local Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "uploads/reimbursements";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
    }
});

const upload = multer({ storage: storage });

// Employee Routes
router.post("/submit", protect, upload.single("proof"), submitReimbursement);
router.get("/my", protect, getMyReimbursements);

// HR/Admin Routes
router.get("/all", protect, requireNormalOrSuper, getAllReimbursements);
router.get("/:id", protect, requireNormalOrSuper, getReimbursementById);
router.put("/:id", protect, requireNormalOrSuper, upload.single("proof"), updateReimbursement);
router.delete("/:id", protect, requireNormalOrSuper, deleteReimbursement);

export default router;
