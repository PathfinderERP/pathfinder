import express from "express";
import { requireAuth } from "../../middleware/permissionMiddleware.js";
import { createPNTSEStudent, getPNTSEStudents } from "../../controllers/pntse/pntseController.js";

const router = express.Router();

router.post("/create", requireAuth, createPNTSEStudent);
router.get("/list", requireAuth, getPNTSEStudents);

export default router;
