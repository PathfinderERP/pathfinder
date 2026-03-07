import express from "express";
import { createBatch, getBatches, updateBatch, deleteBatch } from "../../controllers/batch/batchController.js";
import { assignBatch, removeBatch } from "../../controllers/batch/batchAllocationController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import Batch from "../../models/Master_data/Batch.js";

const router = express.Router();

router.post("/create", requireGranularPermission("masterData", "batch", "create"), createBatch);
router.post("/import", requireGranularPermission("masterData", "batch", "create"), bulkImport(Batch));
router.get("/list", requireAuth, getBatches);
router.put("/update/:id", requireGranularPermission("masterData", "batch", "edit"), updateBatch);
router.delete("/delete/:id", requireGranularPermission("masterData", "batch", "delete"), deleteBatch);

// Batch Allocation routes (accessible to any authenticated user; centre-level access enforced in frontend)
router.post("/assign", requireAuth, assignBatch);
router.put("/remove/:studentId", requireAuth, removeBatch);

export default router;

