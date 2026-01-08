import express from "express";
import { createRM, getAllRMs, updateRM, deleteRM } from "../../controllers/Academics/rmController.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.post("/create", requireGranularPermission("academics", "rmList", "create"), createRM);
router.get("/list", requireGranularPermission("academics", "rmList", "view"), getAllRMs);
router.put("/update/:id", requireGranularPermission("academics", "rmList", "edit"), updateRM);
router.delete("/delete/:id", requireGranularPermission("academics", "rmList", "delete"), deleteRM);

export default router;
