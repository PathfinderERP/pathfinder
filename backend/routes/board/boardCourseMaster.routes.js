import express from "express";
import {
    createBoardCourseMaster,
    getAllBoardCourseMasters,
    updateBoardCourseMaster,
    deleteBoardCourseMaster
} from "../../controllers/board/boardCourseMasterController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getAllBoardCourseMasters);
router.post("/", requireGranularPermission("masterData", "boardCourse", "create"), createBoardCourseMaster);
router.put("/:id", requireGranularPermission("masterData", "boardCourse", "edit"), updateBoardCourseMaster);
router.delete("/:id", requireGranularPermission("masterData", "boardCourse", "delete"), deleteBoardCourseMaster);

export default router;
