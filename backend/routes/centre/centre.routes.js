import express from "express";
import { createCentre } from "../../controllers/centre/createCentre.js";
import { getCentres, getCentreById } from "../../controllers/centre/getCentres.js";
import { updateCentre } from "../../controllers/centre/updateCentre.js";
import { deleteCentre } from "../../controllers/centre/deleteCentre.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// All centre routes require "Master Data" permission
router.post("/create", requirePermission("Master Data"), createCentre);
router.get("/", requirePermission("Master Data"), getCentres);
router.get("/:id", requirePermission("Master Data"), getCentreById);
router.put("/:id", requirePermission("Master Data"), updateCentre);
router.delete("/:id", requirePermission("Master Data"), deleteCentre);

export default router;
