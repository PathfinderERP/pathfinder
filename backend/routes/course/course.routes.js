import express from "express";
import { createCourse } from "../../controllers/course/createCourse.js";
import { getCourses } from "../../controllers/course/getCourses.js";
import { getCourseById } from "../../controllers/course/getCourseById.js";
import { updateCourse } from "../../controllers/course/updateCourse.js";
import { deleteCourse } from "../../controllers/course/deleteCourse.js";
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Course Routes
router.post("/create", requireNormalOrSuper, createCourse);
router.get("/", requireNormalOrSuper, getCourses);
router.get("/:id", requireNormalOrSuper, getCourseById);
router.put("/:id", requireNormalOrSuper, updateCourse);
router.delete("/:id", requireNormalOrSuper, deleteCourse);

export default router;  
