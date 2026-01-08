import express from "express";
import { createCoordinator, getAllCoordinators, updateCoordinator, deleteCoordinator } from "../../controllers/Academics/coordinatorController.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.post("/create", requireGranularPermission("academics", "classCoordinator", "create"), createCoordinator);
router.get("/list", requireGranularPermission("academics", "classCoordinator", "view"), getAllCoordinators);
router.put("/update/:id", requireGranularPermission("academics", "classCoordinator", "edit"), updateCoordinator);
router.delete("/delete/:id", requireGranularPermission("academics", "classCoordinator", "delete"), deleteCoordinator);

export default router;
