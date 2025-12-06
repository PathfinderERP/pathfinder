import express from "express";
import { getAllStudents } from "../../controllers/admin/getAllStudents.js";
import { getStudentById, admitStudent } from "../../controllers/admin/studentAdmission.js";
import { updateStudent } from "../../controllers/admin/updateStudent.js";
import { deleteStudent } from "../../controllers/admin/deleteStudent.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/getAllStudents", requireAuth, getAllStudents);
router.get("/getStudent/:studentId", requireAuth, getStudentById);

// Write routes - Require granular permissions
router.post("/admitStudent/:studentId", requireGranularPermission("admissions", "allLeads", "edit"), admitStudent);
router.put("/updateStudent/:studentId", requireGranularPermission("admissions", "allLeads", "edit"), updateStudent);
router.delete("/deleteStudent/:studentId", requireGranularPermission("admissions", "allLeads", "delete"), deleteStudent);

export default router;
