import express from "express";
import { createStudentByAdmin } from "../../auth/admin/normalAdmin/createStudentByAdmin.js";
import adminTeacherLogin from "../../auth/admin/normalAdmin/adminTeacherLogin.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.post("/createStudent", requireGranularPermission("admissions", "allLeads", "create"), createStudentByAdmin);
router.post("/login", adminTeacherLogin);

export default router;