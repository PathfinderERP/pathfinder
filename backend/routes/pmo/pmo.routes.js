import express from "express";
import multer from "multer";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import {
    createPMOStudent,
    getPMOStudents,
    checkDuplicate,
    checkDuplicatesBulk,
    downloadTemplate,
    importExcel,
    setStudentFree,
    processStudentPayment,
    updatePMOStudent,
    deletePMOStudent
} from "../../controllers/pmo/pmoController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/create", requireGranularPermission("pmo", "addStudent", "create"), createPMOStudent);
router.get("/list", requireGranularPermission("pmo", "allStudents", "view"), getPMOStudents);
router.get("/check-duplicate", requireGranularPermission("pmo", "allStudents", "view"), checkDuplicate);
router.post("/check-duplicates-bulk", requireGranularPermission("pmo", "allStudents", "view"), checkDuplicatesBulk);
router.get("/template", requireGranularPermission("pmo", "allStudents", "view"), downloadTemplate);
router.post("/import-excel", requireGranularPermission("pmo", "allStudents", "import"), upload.single("file"), importExcel);
router.patch("/:id/set-free", requireGranularPermission("pmo", "allStudents", "edit"), setStudentFree);
router.post("/:id/process-payment", requireGranularPermission("pmo", "allStudents", "edit"), processStudentPayment);
router.put("/:id", requireGranularPermission("pmo", "allStudents", "edit"), updatePMOStudent);
router.delete("/:id", requireGranularPermission("pmo", "allStudents", "delete"), deletePMOStudent);

export default router;
