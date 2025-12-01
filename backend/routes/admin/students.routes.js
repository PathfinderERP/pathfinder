import express from "express";
import { getAllStudents } from "../../controllers/admin/getAllStudents.js";
import { getStudentById, admitStudent } from "../../controllers/admin/studentAdmission.js";
import { updateStudent } from "../../controllers/admin/updateStudent.js";
import { deleteStudent } from "../../controllers/admin/deleteStudent.js";
import { requireNormalAdmin } from "../../middleware/requireNormalAdmin.js";

const router = express.Router();

// Protect this route with admin middleware if needed, or leave public if requested. 
// Assuming it should be protected like other admin routes.
router.get("/getAllStudents", requireNormalAdmin, getAllStudents);
router.get("/getStudent/:studentId", requireNormalAdmin, getStudentById);
router.post("/admitStudent/:studentId", requireNormalAdmin, admitStudent);
router.put("/updateStudent/:studentId", requireNormalAdmin, updateStudent);
router.delete("/deleteStudent/:studentId", requireNormalAdmin, deleteStudent);

export default router;
