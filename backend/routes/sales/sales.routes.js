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
import {
    getUserRankings,
    getUserAdmissionDetails,
    getUserCounsellingDetails,
    getUserCallingDetails,
    getUserWalkInDetails
} from "../../controllers/sales/userRankController.js";
import { getTargetAnalysis } from "../../controllers/sales/targetAnalysisController.js";
import { getAdmissionReport } from "../../controllers/sales/admissionReportController.js";
import { getCourseReport } from "../../controllers/sales/courseReportController.js";
import { getDiscountReport } from "../../controllers/sales/discountReportController.js";
import { getTransactionReport } from "../../controllers/sales/transactionReportController.js";
import { getDailyCollectionReport, saveDailyTarget } from "../../controllers/sales/dailyCollectionController.js";
import { getBoardReport } from "../../controllers/sales/boardReportController.js";
import { getWeeklyTarget, getFinalWeekendTarget, overrideWeeklyTarget, overrideWeeklyTargetBulk } from "../../controllers/sales/weeklyTargetController.js";
import { saveCourseTarget, getCourseTargetAnalysis, getAdmissionDetails } from "../../controllers/sales/courseTargetController.js";
import { getComparisonAnalysis, saveComparisonManualData } from "../../controllers/sales/comparisonAnalysisController.js";
import { getAverageAdmissionFee } from "../../controllers/sales/averageAdmissionFeeController.js";
import { getManpowerTargets, saveManpowerTarget } from "../../controllers/sales/manpowerTargetController.js";


const router = express.Router();

router.get("/comparison-analysis", requireAuth, getComparisonAnalysis);
router.post("/comparison-analysis/save", requireAuth, saveComparisonManualData);

router.get("/centre-rank", requireAuth, getCentreRankings);
router.get("/user-rank/admissions", requireAuth, getUserAdmissionDetails);
router.get("/user-rank/counselling", requireAuth, getUserCounsellingDetails);
router.get("/user-rank/calling", requireAuth, getUserCallingDetails);
router.get("/user-rank/follow-ups", requireAuth, getUserCallingDetails);
router.get("/user-rank/walk-in", requireAuth, getUserWalkInDetails);
router.get("/user-rank", requireAuth, getUserRankings);
router.get("/target-analysis", requireAuth, getTargetAnalysis);
router.get("/admission-report", requireAuth, getAdmissionReport);
router.get("/course-report", requireAuth, getCourseReport);
router.get("/discount-report", requireAuth, getDiscountReport);
router.get("/transaction-report", requireAuth, getTransactionReport);
router.get("/daily-collection", requireAuth, getDailyCollectionReport);
router.post("/daily-collection/target", requireAuth, saveDailyTarget);
router.get("/board-report", requireAuth, getBoardReport);
router.get("/average-admission-fee", requireAuth, getAverageAdmissionFee);

router.post("/centre-target", requireAuth, createCentreTarget);
router.get("/centre-target", requireAuth, getCentreTargets);
router.put("/centre-target/:id", requireAuth, updateCentreTarget);
router.delete("/centre-target/:id", requireAuth, deleteCentreTarget);
router.get("/quarterly-target-report", requireAuth, getQuarterlyFullReport);
router.get("/weekly-target", requireAuth, getWeeklyTarget);
router.get("/final-weekend-target", requireAuth, getFinalWeekendTarget);
router.post("/weekly-target/override", requireAuth, overrideWeeklyTarget);
router.post("/weekly-target/override-bulk", requireAuth, overrideWeeklyTargetBulk);

// Course Target Routes
router.post("/course-target", requireAuth, saveCourseTarget);
router.post("/course-target/bulk", requireAuth, saveCourseTarget);
router.get("/course-target/analysis", requireAuth, getCourseTargetAnalysis);
router.get("/course-target/admissions", requireAuth, getAdmissionDetails);

// Manpower Target Routes
router.get("/manpower-target", requireAuth, getManpowerTargets);
router.post("/manpower-target", requireAuth, saveManpowerTarget);

export default router;
