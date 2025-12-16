import express from "express";
import { createTeacher, getAllTeachers, updateTeacher, deleteTeacher } from "../../controllers/Academics/teacherController.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { requireSuperAdmin } from "../../middleware/requireSuperAdmin.js";

const verifyToken = authMiddleware; // Alias default export to verifyToken

const router = express.Router();

router.post("/create", verifyToken, createTeacher); // Restricted to authenticated users, maybe admins?
router.put("/update/:id", verifyToken, updateTeacher);
router.delete("/delete/:id", verifyToken, deleteTeacher);
router.get("/list", verifyToken, getAllTeachers);

export default router;
