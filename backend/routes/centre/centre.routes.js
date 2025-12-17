import express from "express";
import { createCentre } from "../../controllers/centre/createCentre.js";
import { getCentres, getCentreById } from "../../controllers/centre/getCentres.js";
import { updateCentre } from "../../controllers/centre/updateCentre.js";
import { deleteCentre } from "../../controllers/centre/deleteCentre.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/", requireAuth, getCentres);
router.get("/list", requireAuth, getCentres); // Alias for consistency
router.get("/:id", requireAuth, getCentreById);

// Write routes - Require granular permissions
router.post("/create", requireGranularPermission("masterData", "centre", "create"), createCentre);
router.put("/:id", requireGranularPermission("masterData", "centre", "edit"), updateCentre);
router.delete("/:id", requireGranularPermission("masterData", "centre", "delete"), deleteCentre);

export default router;
