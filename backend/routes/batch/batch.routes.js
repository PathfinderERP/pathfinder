import express from "express";
import { createBatch, getBatches, updateBatch, deleteBatch } from "../../controllers/batch/batchController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import Batch from "../../models/Master_data/Batch.js";

const router = express.Router();

router.post("/create", requireGranularPermission("masterData", "batch", "create"), createBatch);
router.post("/import", requireGranularPermission("masterData", "batch", "create"), bulkImport(Batch));
router.get("/list", requireAuth, getBatches);
router.put("/update/:id", requireGranularPermission("masterData", "batch", "edit"), updateBatch);
router.delete("/delete/:id", requireGranularPermission("masterData", "batch", "delete"), deleteBatch);

export default router;
