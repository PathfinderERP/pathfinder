import express from "express";
import multer from "multer";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { createPNTSEStudent, getPNTSEStudents, checkDuplicate, checkDuplicatesBulk, downloadTemplate, importExcel, setStudentFree, processStudentPayment, updatePNTSEStudent, deletePNTSEStudent } from "../../controllers/pntse/pntseController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/create", requireGranularPermission("pntse", "addStudent", "create"), createPNTSEStudent);
router.get("/list", requireGranularPermission("pntse", "allStudents", "view"), getPNTSEStudents);
router.get("/check-duplicate", requireGranularPermission("pntse", "allStudents", "view"), checkDuplicate);
router.post("/check-duplicates-bulk", requireGranularPermission("pntse", "allStudents", "view"), checkDuplicatesBulk);
router.get("/template", requireGranularPermission("pntse", "allStudents", "import"), downloadTemplate);
router.post("/import-excel", requireGranularPermission("pntse", "allStudents", "import"), upload.single("file"), importExcel);
router.patch("/:id/set-free", requireGranularPermission("pntse", "allStudents", "edit"), setStudentFree);
router.post("/:id/process-payment", requireGranularPermission("pntse", "allStudents", "edit"), processStudentPayment);
router.put("/:id", requireGranularPermission("pntse", "allStudents", "edit"), updatePNTSEStudent);
router.delete("/:id", requireGranularPermission("pntse", "allStudents", "delete"), deletePNTSEStudent);

export default router;
