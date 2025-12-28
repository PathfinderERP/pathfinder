import express from "express";
import {
    createTraining,
    getHRTrainings,
    getMyTrainings,
    deleteTraining,
    updateTraining
} from "../../controllers/HR/trainingController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Roles allowed: ${roles.join(", ")}` });
        }
        next();
    };
};

// HR Routes
router.post("/", authMiddleware, authorize("superAdmin", "admin", "hr"), upload.array("files", 10), createTraining);
router.get("/hr-list", authMiddleware, authorize("superAdmin", "admin", "hr"), getHRTrainings);
router.put("/:id", authMiddleware, authorize("superAdmin", "admin", "hr"), upload.array("files", 10), updateTraining);
router.delete("/:id", authMiddleware, authorize("superAdmin", "admin", "hr"), deleteTraining);

// Employee Routes
router.get("/my-training", authMiddleware, getMyTrainings);

export default router;
