import express from "express";
import authMiddleware, { requireNormalOrSuper } from "../../middleware/authMiddleware.js";
import {
    submitResignation,
    getMyResignationStatus,
    getAllResignationRequests,
    updateResignationDetails,
    deleteResignationRequest
} from "../../controllers/HR/resignationController.js";

const router = express.Router();

// Employee routes
router.post("/submit", authMiddleware, submitResignation);
router.get("/my-status", authMiddleware, getMyResignationStatus);

// HR routes
router.get("/all", authMiddleware, requireNormalOrSuper, getAllResignationRequests);
router.put("/update/:requestId", authMiddleware, requireNormalOrSuper, updateResignationDetails);
router.delete("/delete/:requestId", authMiddleware, requireNormalOrSuper, deleteResignationRequest);

export default router;
