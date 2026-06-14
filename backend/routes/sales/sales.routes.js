import express from "express";
import { requireAuth } from "../../middleware/permissionMiddleware.js";
import {
    createCentreTarget,
    getCentreTargets,
    updateCentreTarget,
    deleteCentreTarget,
    getQuarterlyFullReport
} from "../../controllers/sales/centreTargetController.js";
import { getCentreRankings } from "../../controllers/sales/centreRankController.js";
import { getTargetAnalysis } from "../../controllers/sales/targetAnalysisController.js";
import { getAdmissionReport } from "../../controllers/sales/admissionReportController.js";
import { getCourseReport } from "../../controllers/sales/courseReportController.js";
import { getDiscountReport } from "../../controllers/sales/discountReportController.js";
import { getTransactionReport } from "../../controllers/sales/transactionReportController.js";
import { getDailyCollectionReport } from "../../controllers/sales/dailyCollectionController.js";
import { getBoardReport } from "../../controllers/sales/boardReportController.js";
import { getWeeklyTarget, getFinalWeekendTarget } from "../../controllers/sales/weeklyTargetController.js";
import { saveCourseTarget, getCourseTargetAnalysis, getAdmissionDetails } from "../../controllers/sales/courseTargetController.js";
import { getComparisonAnalysis, saveComparisonManualData } from "../../controllers/sales/comparisonAnalysisController.js";
import { getAverageAdmissionFee } from "../../controllers/sales/averageAdmissionFeeController.js";

const router = express.Router();

router.get("/comparison-analysis", requireAuth, getComparisonAnalysis);
router.post("/comparison-analysis/save", requireAuth, saveComparisonManualData);

router.get("/centre-rank", requireAuth, getCentreRankings);
router.get("/target-analysis", requireAuth, getTargetAnalysis);
router.get("/admission-report", requireAuth, getAdmissionReport);
router.get("/course-report", requireAuth, getCourseReport);
router.get("/discount-report", requireAuth, getDiscountReport);
router.get("/transaction-report", requireAuth, getTransactionReport);
router.get("/daily-collection", requireAuth, getDailyCollectionReport);
router.get("/board-report", requireAuth, getBoardReport);
router.get("/average-admission-fee", requireAuth, getAverageAdmissionFee);

router.post("/centre-target", requireAuth, createCentreTarget);
router.get("/centre-target", requireAuth, getCentreTargets);
router.put("/centre-target/:id", requireAuth, updateCentreTarget);
router.delete("/centre-target/:id", requireAuth, deleteCentreTarget);
router.get("/quarterly-target-report", requireAuth, getQuarterlyFullReport);
router.get("/weekly-target", requireAuth, getWeeklyTarget);
router.get("/final-weekend-target", requireAuth, getFinalWeekendTarget);

// Course Target Routes
router.post("/course-target", requireAuth, saveCourseTarget);
router.get("/course-target/analysis", requireAuth, getCourseTargetAnalysis);
router.get("/course-target/admissions", requireAuth, getAdmissionDetails);

export default router;
