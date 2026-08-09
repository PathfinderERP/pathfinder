import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { getCentrePerformance } from "../../controllers/marketing/centrePerformanceController.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
    "/",
    requireGranularPermission("marketingCRM", "centrePerformance", "view"),
    getCentrePerformance
);

export default router;
