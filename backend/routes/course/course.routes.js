import express from "express";
import { createCourse } from "../../controllers/course/createCourse.js";
import { getCourses } from "../../controllers/course/getCourses.js";
import { getCourseById } from "../../controllers/course/getCourseById.js";
import { updateCourse } from "../../controllers/course/updateCourse.js";
import { deleteCourse } from "../../controllers/course/deleteCourse.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// All course routes require "Course Management" permission
router.post("/create", requirePermission("Course Management"), createCourse);
router.get("/", requirePermission("Course Management"), getCourses);
router.get("/:id", requirePermission("Course Management"), getCourseById);
router.put("/:id", requirePermission("Course Management"), updateCourse);
router.delete("/:id", requirePermission("Course Management"), deleteCourse);

export default router;
