import express from "express";
import { createTeacher, getAllTeachers, updateTeacher, deleteTeacher, getTeacherById } from "../../controllers/Academics/teacherController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const verifyToken = authMiddleware;
const router = express.Router();

router.post("/create", verifyToken, createTeacher);
router.put("/update/:id", verifyToken, updateTeacher);
router.delete("/delete/:id", verifyToken, deleteTeacher);
router.get("/list", verifyToken, getAllTeachers);
router.get("/fetch/:id", verifyToken, getTeacherById);

export default router;
