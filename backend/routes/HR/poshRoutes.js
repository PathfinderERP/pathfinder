import express from "express";
import { createComplaint, getComplaints, updateComplaint, getEmployeesForSelection } from "../../controllers/HR/poshController.js";
import protect from "../../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();

// Multer in Memory for R2 Upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/create", protect, upload.array("files", 5), createComplaint);
router.get("/list", protect, getComplaints);
router.put("/:id", protect, updateComplaint);
router.get("/employees", protect, getEmployeesForSelection);

export default router;
