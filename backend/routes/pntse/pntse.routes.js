import express from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/permissionMiddleware.js";
import { createPNTSEStudent, getPNTSEStudents, checkDuplicate, downloadTemplate, importExcel, setStudentFree, processStudentPayment, updatePNTSEStudent, deletePNTSEStudent } from "../../controllers/pntse/pntseController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/create", requireAuth, createPNTSEStudent);
router.get("/list", requireAuth, getPNTSEStudents);
router.get("/check-duplicate", requireAuth, checkDuplicate);
router.get("/template", requireAuth, downloadTemplate);
router.post("/import-excel", requireAuth, upload.single("file"), importExcel);
router.patch("/:id/set-free", requireAuth, setStudentFree);
router.post("/:id/process-payment", requireAuth, processStudentPayment);
router.put("/:id", requireAuth, updatePNTSEStudent);
router.delete("/:id", requireAuth, deletePNTSEStudent);

export default router;
