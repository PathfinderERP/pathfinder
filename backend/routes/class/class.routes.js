import express from "express";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { createClass } from "../../controllers/class/createClass.js";
import { getClasses } from "../../controllers/class/getClasses.js";
import { getClassById } from "../../controllers/class/getClassById.js";
import { updateClass } from "../../controllers/class/updateClass.js";
import { deleteClass } from "../../controllers/class/deleteClass.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import Class from "../../models/Master_data/Class.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/", requireAuth, getClasses);
router.get("/:id", requireAuth, getClassById);

// Write routes - Require granular permissions
router.post("/create", requireGranularPermission("masterData", "class", "create"), createClass);
router.post("/import", requireGranularPermission("masterData", "class", "create"), bulkImport(Class));
router.put("/:id", requireGranularPermission("masterData", "class", "edit"), updateClass);
router.delete("/:id", requireGranularPermission("masterData", "class", "delete"), deleteClass);

export default router;
