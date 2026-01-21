import express from "express";
import { createScript, getScripts, updateScript, deleteScript } from "../../controllers/script/scriptController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import Script from "../../models/Master_data/Script.js";

const router = express.Router();

router.post("/create", requireGranularPermission("masterData", "script", "create"), createScript);
router.post("/import", requireGranularPermission("masterData", "script", "create"), bulkImport(Script));
router.get("/list", requireAuth, getScripts);
router.put("/update/:id", requireGranularPermission("masterData", "script", "edit"), updateScript);
router.delete("/delete/:id", requireGranularPermission("masterData", "script", "delete"), deleteScript);

export default router;
