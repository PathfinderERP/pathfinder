import express from "express";
import { logStudentServiceCall, getStudentServiceHistory } from "../controllers/studentServiceCallController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, logStudentServiceCall);
router.get("/history", protect, getStudentServiceHistory);

export default router;
