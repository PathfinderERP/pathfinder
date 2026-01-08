import express from "express";
import { createTeacher, getAllTeachers, updateTeacher, deleteTeacher, getTeacherById } from "../../controllers/Academics/teacherController.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.post("/create", requireGranularPermission("academics", "teachers", "create"), createTeacher);
router.put("/update/:id", requireGranularPermission("academics", "teachers", "edit"), updateTeacher);
router.delete("/delete/:id", requireGranularPermission("academics", "teachers", "delete"), deleteTeacher);
router.get("/list", requireGranularPermission("academics", "teachers", "view"), getAllTeachers);
router.get("/fetch/:id", requireGranularPermission("academics", "teachers", "view"), getTeacherById);

export default router;
