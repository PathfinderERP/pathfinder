import express from "express";
import {
    createBoard,
    getAllBoards,
    updateBoard,
    deleteBoard,
} from "../../controllers/board/boardController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getAllBoards);
router.post("/", requireGranularPermission("masterData", "board", "create"), createBoard);
router.put("/:id", requireGranularPermission("masterData", "board", "edit"), updateBoard);
router.delete("/:id", requireGranularPermission("masterData", "board", "delete"), deleteBoard);

export default router;
