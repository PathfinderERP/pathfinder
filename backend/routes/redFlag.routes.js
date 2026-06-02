import express from "express";
import { getRedFlags, getRedFlagStats, updateRedFlag, generateRedFlags } from "../controllers/redFlagController.js";
import protect from "../middleware/authMiddleware.js";
import { requireGranularPermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", protect, requireGranularPermission("trackingFlagging", "redFlagDesk", "view"), getRedFlags);
router.get("/stats", protect, requireGranularPermission("trackingFlagging", "redFlagDesk", "view"), getRedFlagStats);
router.put("/:id", protect, requireGranularPermission("trackingFlagging", "redFlagDesk", "edit"), updateRedFlag);
router.post("/generate", protect, requireGranularPermission("trackingFlagging", "redFlagDesk", "create"), generateRedFlags);

export default router;
