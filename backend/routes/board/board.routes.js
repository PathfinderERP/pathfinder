import express from "express";
import {
    createBoard,
    getAllBoards,
    updateBoard,
    deleteBoard,
} from "../../controllers/board/boardController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import Board from "../../models/Master_data/Boards.js";

const router = express.Router();

router.get("/", requireAuth, getAllBoards);
router.post("/", requireGranularPermission("masterData", "board", "create"), createBoard);
router.post("/import", requireGranularPermission("masterData", "board", "create"), bulkImport(Board));
router.put("/:id", requireGranularPermission("masterData", "board", "edit"), updateBoard);
router.delete("/:id", requireGranularPermission("masterData", "board", "delete"), deleteBoard);

export default router;
