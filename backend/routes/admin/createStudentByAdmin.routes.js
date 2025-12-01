import express from "express";
import { createStudentByAdmin } from "../../auth/admin/normalAdmin/createStudentByAdmin.js";
import adminTeacherLogin from "../../auth/admin/normalAdmin/adminTeacherLogin.js";
import { requireNormalAdmin } from "../../middleware/requireNormalAdmin.js";
import {requireSuperAdmin} from "../../middleware/requireSuperAdmin.js";
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";
const router = express.Router();

router.post("/createStudent",requireNormalAdmin,createStudentByAdmin);
router.post("/login", adminTeacherLogin);

export default router;