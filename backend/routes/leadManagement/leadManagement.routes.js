import express from "express";
import { createLead } from "../../controllers/leadManagement/createLead.js";
import { getLeads, getLeadById } from "../../controllers/leadManagement/getLeads.js";
import { getFollowUpLeads } from "../../controllers/leadManagement/getFollowUpLeads.js";
import { updateLead } from "../../controllers/leadManagement/updateLead.js";
import { deleteLead } from "../../controllers/leadManagement/deleteLead.js";
import { addFollowUp } from "../../controllers/leadManagement/addFollowUp.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// All lead management routes require authentication
router.get("/", requireAuth, getLeads);
router.get("/follow-ups", requireAuth, getFollowUpLeads);
router.get("/:id", requireAuth, getLeadById);
router.post("/create", requireAuth, createLead);
router.put("/:id", requireAuth, updateLead);
router.put("/:id/follow-up", requireAuth, addFollowUp);
router.delete("/:id", requireAuth, deleteLead);

export default router;
