import express from "express";
import { getAllStudents } from "../../controllers/admin/getAllStudents.js";
import { getStudentById, admitStudent } from "../../controllers/admin/studentAdmission.js";
import { updateStudent } from "../../controllers/admin/updateStudent.js";
import { deleteStudent } from "../../controllers/admin/deleteStudent.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// All student routes require "Admissions & Sales" permission
router.get("/getAllStudents", requirePermission("Admissions & Sales"), getAllStudents);
router.get("/getStudent/:studentId", requirePermission("Admissions & Sales"), getStudentById);
router.post("/admitStudent/:studentId", requirePermission("Admissions & Sales"), admitStudent);
router.put("/updateStudent/:studentId", requirePermission("Admissions & Sales"), updateStudent);
router.delete("/deleteStudent/:studentId", requirePermission("Admissions & Sales"), deleteStudent);

export default router;
