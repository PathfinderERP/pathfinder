import express from "express";
import { createCourse } from "../../controllers/course/createCourse.js";
import { getCourses } from "../../controllers/course/getCourses.js";
import { getCourseById } from "../../controllers/course/getCourseById.js";
import { updateCourse } from "../../controllers/course/updateCourse.js";
import { deleteCourse } from "../../controllers/course/deleteCourse.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/", requireAuth, getCourses);
router.get("/:id", requireAuth, getCourseById);

// Write routes - Require granular permissions
router.post("/create", requireGranularPermission("masterData", "course", "create"), createCourse);
router.put("/:id", requireGranularPermission("masterData", "course", "edit"), updateCourse);
router.delete("/:id", requireGranularPermission("masterData", "course", "delete"), deleteCourse);

export default router;
