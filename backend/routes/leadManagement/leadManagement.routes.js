import express from "express";
import { createLead } from "../../controllers/LeadManagement/createLead.js";
import { getLeads, getLeadById } from "../../controllers/LeadManagement/getLeads.js";
import { getFollowUpLeads } from "../../controllers/LeadManagement/getFollowUpLeads.js";
import { updateLead } from "../../controllers/LeadManagement/updateLead.js";
import { deleteLead } from "../../controllers/LeadManagement/deleteLead.js";
import { addFollowUp } from "../../controllers/LeadManagement/addFollowUp.js";
import uploadRecording from "../../controllers/LeadManagement/uploadRecording.js";
import { getLeadDashboardStats } from "../../controllers/LeadManagement/getLeadDashboard.js";
import { exportLeadsExcel } from "../../controllers/LeadManagement/exportLeadsExcel.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All lead management routes require authentication
router.get("/", requireAuth, getLeads);
router.get("/follow-ups", requireAuth, getFollowUpLeads);
router.get("/:id", requireAuth, getLeadById);
router.get("/stats/dashboard", requireAuth, getLeadDashboardStats);
router.get("/export/excel", requireAuth, exportLeadsExcel);
router.post("/create", requireAuth, createLead);
router.put("/:id", requireAuth, updateLead);
router.put("/:id/follow-up", requireAuth, addFollowUp);
router.post("/:leadId/upload-recording", requireAuth, upload.single('audio'), uploadRecording);
router.delete("/:id", requireAuth, deleteLead);

export default router;
