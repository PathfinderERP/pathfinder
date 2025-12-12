import express from "express";
import { requireAuth } from "../../middleware/permissionMiddleware.js";
import {
    createCentreTarget,
    getCentreTargets,
    updateCentreTarget,
    deleteCentreTarget
} from "../../controllers/sales/centreTargetController.js";
import { getCentreRankings } from "../../controllers/sales/centreRankController.js";
import { getTargetAnalysis } from "../../controllers/sales/targetAnalysisController.js";
import { getAdmissionReport } from "../../controllers/sales/admissionReportController.js";
import { getCourseReport } from "../../controllers/sales/courseReportController.js";
import { getDiscountReport } from "../../controllers/sales/discountReportController.js";
import { getTransactionReport } from "../../controllers/sales/transactionReportController.js";

const router = express.Router();

router.get("/centre-rank", requireAuth, getCentreRankings);
router.get("/target-analysis", requireAuth, getTargetAnalysis);
router.get("/admission-report", requireAuth, getAdmissionReport);
router.get("/course-report", requireAuth, getCourseReport);
router.get("/discount-report", requireAuth, getDiscountReport);
router.get("/transaction-report", requireAuth, getTransactionReport);

router.post("/centre-target", requireAuth, createCentreTarget);
router.get("/centre-target", requireAuth, getCentreTargets);
router.put("/centre-target/:id", requireAuth, updateCentreTarget);
router.delete("/centre-target/:id", requireAuth, deleteCentreTarget);

export default router;
