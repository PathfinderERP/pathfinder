import express from "express";
import { createLead } from "../../controllers/leadManagement/createLead.js";
import { getLeads, getLeadById } from "../../controllers/leadManagement/getLeads.js";
import { getFollowUpLeads } from "../../controllers/leadManagement/getFollowUpLeads.js";
import { updateLead } from "../../controllers/leadManagement/updateLead.js";
import { deleteLead } from "../../controllers/leadManagement/deleteLead.js";
import { addFollowUp } from "../../controllers/leadManagement/addFollowUp.js";
import uploadRecording from "../../controllers/leadManagement/uploadRecording.js";
import { getLeadDashboardStats } from "../../controllers/leadManagement/getLeadDashboard.js";
import { getFollowUpStats } from "../../controllers/leadManagement/getFollowUpStats.js";
import { exportLeadsExcel } from "../../controllers/leadManagement/exportLeadsExcel.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All lead management routes require authentication
router.get("/", requireAuth, getLeads);
router.get("/follow-ups", requireAuth, getFollowUpLeads);
router.get("/:id", requireAuth, getLeadById);
router.get("/stats/dashboard", requireAuth, getLeadDashboardStats);
router.get("/stats/today-followups", requireAuth, getFollowUpStats);
router.get("/export/excel", requireAuth, exportLeadsExcel);
router.post("/create", requireAuth, createLead);
router.put("/:id", requireAuth, updateLead);
router.put("/:id/follow-up", requireAuth, addFollowUp);
router.post("/:leadId/upload-recording", requireAuth, upload.single('audio'), uploadRecording);
router.delete("/:id", requireAuth, deleteLead);

export default router;
