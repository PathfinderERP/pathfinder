import express from "express";
import { createLead } from "../../controllers/leadManagement/createLead.js";
import { getLeads, getLeadById } from "../../controllers/leadManagement/getLeads.js";
import { getFollowUpLeads } from "../../controllers/leadManagement/getFollowUpLeads.js";
import { updateLead, tagWalkIn } from "../../controllers/leadManagement/updateLead.js";
import { deleteLead } from "../../controllers/leadManagement/deleteLead.js";
import { bulkDeleteLeads } from "../../controllers/leadManagement/bulkDeleteLeads.js";
import { bulkDeleteLeadsByFilter } from "../../controllers/leadManagement/bulkDeleteLeadsByFilter.js";
import { addFollowUp } from "../../controllers/leadManagement/addFollowUp.js";
import { bulkContactedLeads } from "../../controllers/leadManagement/bulkContactedLeads.js";
import uploadRecording from "../../controllers/leadManagement/uploadRecording.js";
import { getLeadDashboardStats } from "../../controllers/leadManagement/getLeadDashboard.js";
import { getFollowUpStats } from "../../controllers/leadManagement/getFollowUpStats.js";
import { exportLeadsExcel } from "../../controllers/leadManagement/exportLeadsExcel.js";
import { exportTelecallerLogs } from "../../controllers/leadManagement/exportTelecallerLogs.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";
import { getTelecallerAnalytics } from "../../controllers/leadManagement/getTelecallerAnalytics.js";
import { getAllTelecallerAnalytics } from "../../controllers/leadManagement/getAllTelecallerAnalytics.js";
import { getCentreLeadAnalysis } from "../../controllers/leadManagement/getCentreAnalysis.js";
import { resetRedFlags, processDailyPenalty, resetPerformance } from "../../controllers/leadManagement/redFlagController.js";
import { getPlanners, createPlanner, updatePlannerApproval } from "../../controllers/leadManagement/marketingPlannerController.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All lead management routes require authentication
router.get("/", requireAuth, getLeads);
router.get("/follow-ups", requireAuth, getFollowUpLeads);
router.get("/stats/dashboard", requireAuth, getLeadDashboardStats);
router.get("/stats/today-followups", requireAuth, getFollowUpStats);
router.get("/export/excel", requireAuth, exportLeadsExcel);
router.get("/export/telecaller-logs", requireAuth, exportTelecallerLogs);
router.get("/analytics-all", requireAuth, getAllTelecallerAnalytics);
router.get("/stats/centre-analysis", requireAuth, getCentreLeadAnalysis);
router.get("/analytics/:telecallerId", requireAuth, getTelecallerAnalytics);
router.post("/red-flags/reset/:userId", requireAuth, resetRedFlags);
router.post("/red-flags/process-daily", requireAuth, processDailyPenalty);
router.post("/performance/reset/:userId", requireAuth, resetPerformance);

// Marketing Planner routes
router.get("/planner", requireAuth, getPlanners);
router.post("/planner", requireAuth, createPlanner);
router.put("/planner/:id/approval", requireAuth, updatePlannerApproval);

router.post("/bulk-delete", requireAuth, bulkDeleteLeads);
router.post("/bulk-delete-filtered", requireAuth, bulkDeleteLeadsByFilter);
router.post("/bulk-contacted", requireAuth, bulkContactedLeads);

// Generic ID route must come AFTER specific routes
router.get("/:id", requireAuth, getLeadById);

router.post("/create", requireAuth, createLead);
router.put("/:id", requireAuth, updateLead);
router.put("/:id/follow-up", requireAuth, addFollowUp);
router.post("/:leadId/upload-recording", requireAuth, upload.single('audio'), uploadRecording);
router.put("/:id/walk-in", requireAuth, tagWalkIn);
router.delete("/:id", requireAuth, deleteLead);

export default router;
