import express from "express";
import { createSource } from "../../controllers/source/createSource.js";
import { getSources, getSourceById } from "../../controllers/source/getSources.js";
import { updateSource } from "../../controllers/source/updateSource.js";
import { deleteSource } from "../../controllers/source/deleteSource.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/", requireAuth, getSources);
router.get("/:id", requireAuth, getSourceById);

// Write routes - Require granular permissions
router.post("/create", requireGranularPermission("masterData", "source", "create"), createSource);
router.put("/:id", requireGranularPermission("masterData", "source", "edit"), updateSource);
router.delete("/:id", requireGranularPermission("masterData", "source", "delete"), deleteSource);

export default router;
