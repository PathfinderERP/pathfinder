import express from "express";
import { getMyProfile, updateMyProfile } from "../../auth/profile/profileController.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Get current user's profile
router.get("/me", requireAuth, getMyProfile);

// Update current user's profile
router.put("/me", requireAuth, updateMyProfile);

export default router;
