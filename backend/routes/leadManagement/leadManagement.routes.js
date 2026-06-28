import express from "express";
import { createLead } from "../../controllers/leadManagement/createLead.js";
import { getLeads, getLeadById, getDistinctSchools, getDistinctSources } from "../../controllers/leadManagement/getLeads.js";
import { getFollowUpLeads } from "../../controllers/leadManagement/getFollowUpLeads.js";
import { updateLead, tagWalkIn, toggleLeadPriority } from "../../controllers/leadManagement/updateLead.js";
import { deleteLead } from "../../controllers/leadManagement/deleteLead.js";
import { bulkDeleteLeads } from "../../controllers/leadManagement/bulkDeleteLeads.js";
import { bulkDeleteLeadsByFilter } from "../../controllers/leadManagement/bulkDeleteLeadsByFilter.js";
import { addFollowUp } from "../../controllers/leadManagement/addFollowUp.js";
import { bulkContactedLeads } from "../../controllers/leadManagement/bulkContactedLeads.js";
import { bulkUpdateLeads } from "../../controllers/leadManagement/bulkUpdateLeads.js";
import { bulkUploadLeads } from "../../controllers/leadManagement/bulkUploadLeads.js";
import uploadRecording from "../../controllers/leadManagement/uploadRecording.js";
import { getLeadDashboardStats } from "../../controllers/leadManagement/getLeadDashboard.js";
import { getFollowUpStats } from "../../controllers/leadManagement/getFollowUpStats.js";
import { exportLeadsExcel } from "../../controllers/leadManagement/exportLeadsExcel.js";
import { exportTelecallerLogs } from "../../controllers/leadManagement/exportTelecallerLogs.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { getTelecallerAnalytics } from "../../controllers/leadManagement/getTelecallerAnalytics.js";
import { getAllTelecallerAnalytics } from "../../controllers/leadManagement/getAllTelecallerAnalytics.js";
import { getCentreLeadAnalysis } from "../../controllers/leadManagement/getCentreAnalysis.js";
import { resetRedFlags, processDailyPenalty, resetPerformance } from "../../controllers/leadManagement/redFlagController.js";
import { getPlanners, createPlanner, updatePlannerApproval, saveDraftPlanner, getDraftPlanner } from "../../controllers/leadManagement/marketingPlannerController.js";
import { getMyUploads } from "../../controllers/leadManagement/getMyUploads.js";
import { getCampaigns, createCampaign, deleteCampaign, updateCampaign, runCampaignAction } from "../../controllers/leadManagement/campaignController.js";
import { pushCampaignLeads } from "../../controllers/leadManagement/pushCampaignLeads.js";
import multer from "multer";
import { getLeadJourney } from "../../controllers/leadManagement/getLeadJourney.js";
import { checkDuplicatePhone } from "../../controllers/leadManagement/checkDuplicatePhone.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All lead management routes require authentication
router.get("/", requireAuth, getLeads);
router.get("/distinct-schools", requireAuth, getDistinctSchools);
router.get("/distinct-sources", requireAuth, getDistinctSources);
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
router.get("/planner/draft", requireAuth, getDraftPlanner);
router.post("/planner/draft", requireAuth, saveDraftPlanner);

router.get("/my-uploads", requireAuth, getMyUploads);
router.post("/bulk-upload", requireAuth, bulkUploadLeads);
router.post("/campaign-leads/push", requireAuth, pushCampaignLeads);
router.post("/bulk-delete", requireAuth, bulkDeleteLeads);
router.post("/bulk-delete-filtered", requireAuth, bulkDeleteLeadsByFilter);
router.post("/bulk-contacted", requireAuth, bulkContactedLeads);
router.post("/bulk-update", requireAuth, bulkUpdateLeads);

// Campaign / Ads routes
router.get("/campaigns", requireAuth, requireGranularPermission("leadManagement", "campaignAds", "view"), getCampaigns);
router.post("/campaigns", requireAuth, requireGranularPermission("leadManagement", "campaignAds", "create"), createCampaign);
router.post("/campaigns/:id/run-action", requireAuth, runCampaignAction);
router.delete("/campaigns/:id", requireAuth, requireGranularPermission("leadManagement", "campaignAds", "delete"), deleteCampaign);
router.put("/campaigns/:id", requireAuth, requireGranularPermission("leadManagement", "campaignAds", "edit"), updateCampaign);

// Generic ID route must come AFTER specific routes
router.get("/check-duplicate", requireAuth, checkDuplicatePhone);
router.get("/:id/journey", requireAuth, getLeadJourney);
router.get("/:id", requireAuth, getLeadById);

router.post("/create", requireAuth, createLead);
router.put("/:id", requireAuth, updateLead);
router.put("/:id/follow-up", requireAuth, addFollowUp);
router.post("/:leadId/upload-recording", requireAuth, upload.single('audio'), uploadRecording);
router.put("/:id/walk-in", requireAuth, tagWalkIn);
router.put("/:id/toggle-priority", requireAuth, toggleLeadPriority);
router.delete("/:id", requireAuth, deleteLead);

export default router;
