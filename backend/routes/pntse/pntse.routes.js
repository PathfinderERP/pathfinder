import express from "express";
import multer from "multer";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import {
    createPNTSEStudent,
    getPNTSEStudents,
    getPNTSESchools,
    checkDuplicate,
    checkDuplicatesBulk,
    downloadTemplate,
    importExcel,
    setStudentFree,
    processStudentPayment,
    updatePNTSEStudent,
    deletePNTSEStudent,
    bulkUpdateAttendance,
    uploadResults,
    saveSingleStudentResult,
    getStudentResult,
    deleteStudentResult,
    getResultsSummary
} from "../../controllers/pntse/pntseController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/create", requireGranularPermission("pntse", "addStudent", "create"), createPNTSEStudent);
router.get("/list", requireGranularPermission("pntse", "allStudents", "view"), getPNTSEStudents);
router.get("/schools", requireGranularPermission("pntse", "allStudents", "view"), getPNTSESchools);
router.get("/check-duplicate", requireGranularPermission("pntse", "allStudents", "view"), checkDuplicate);
router.post("/check-duplicates-bulk", requireGranularPermission("pntse", "allStudents", "view"), checkDuplicatesBulk);
router.get("/template", requireGranularPermission("pntse", "allStudents", "view"), downloadTemplate);
router.post("/import-excel", requireGranularPermission("pntse", "allStudents", "import"), upload.single("file"), importExcel);
router.post("/bulk-attendance", requireGranularPermission("pntse", "allStudents", "edit"), bulkUpdateAttendance);
router.patch("/:id/set-free", requireGranularPermission("pntse", "allStudents", "edit"), setStudentFree);
router.post("/:id/process-payment", requireGranularPermission("pntse", "allStudents", "edit"), processStudentPayment);

// Student Result & Rank Routes
router.post("/upload-results", requireGranularPermission("pntse", "allStudents", "import"), upload.single("file"), uploadResults);
router.post("/save-single-result", requireGranularPermission("pntse", "allStudents", "edit"), saveSingleStudentResult);
router.get("/results-summary", requireGranularPermission("pntse", "allStudents", "view"), getResultsSummary);
router.get("/:id/result", requireGranularPermission("pntse", "allStudents", "view"), getStudentResult);
router.delete("/:id/result", requireGranularPermission("pntse", "allStudents", "edit"), deleteStudentResult);

router.put("/:id", requireGranularPermission("pntse", "allStudents", "edit"), updatePNTSEStudent);
router.delete("/:id", requireGranularPermission("pntse", "allStudents", "delete"), deletePNTSEStudent);

export default router;
