import express from "express";
import { createCentre } from "../../controllers/centre/createCentre.js";
import { getCentres, getCentreById } from "../../controllers/centre/getCentres.js";
import { updateCentre } from "../../controllers/centre/updateCentre.js";
import { deleteCentre } from "../../controllers/centre/deleteCentre.js";
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", requireNormalOrSuper, createCentre);
router.get("/", requireNormalOrSuper, getCentres);
router.get("/:id", requireNormalOrSuper, getCentreById);
router.put("/:id", requireNormalOrSuper, updateCentre);
router.delete("/:id", requireNormalOrSuper, deleteCentre);

export default router;
