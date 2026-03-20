import express from "express";
import {
    createBoardCourseSubject,
    getAllBoardCourseSubjects,
    updateBoardCourseSubject,
    deleteBoardCourseSubject,
    getByBoardAndClass
} from "../../controllers/board/boardCourseSubjectController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getAllBoardCourseSubjects);
router.get("/by-board-class", requireAuth, getByBoardAndClass);
router.post("/", requireGranularPermission("masterData", "boardCourse", "create"), createBoardCourseSubject);
router.put("/:id", requireGranularPermission("masterData", "boardCourse", "edit"), updateBoardCourseSubject);
router.delete("/:id", requireGranularPermission("masterData", "boardCourse", "delete"), deleteBoardCourseSubject);

export default router;
