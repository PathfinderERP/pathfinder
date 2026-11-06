import express from "express";
import { getMarketingAnalysis } from "../../controllers/marketingCRM/marketingAnalysisController.js";
import protect from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get(
    "/",
    protect,
    requireGranularPermission("marketingCRM", "marketingAnalysis", "view"),
    getMarketingAnalysis
);

export default router;

