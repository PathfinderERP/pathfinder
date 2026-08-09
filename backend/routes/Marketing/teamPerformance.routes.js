import express from "express";
import authMiddleware from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { getTeamPerformance } from "../../controllers/marketing/teamPerformanceController.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
    "/",
    requireGranularPermission("marketingCRM", "teamPerformance", "view"),
    getTeamPerformance
);

export default router;
