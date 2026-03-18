import express from "express";
import { 
    createBoardAdmission, 
    getBoardAdmissions, 
    getBoardAdmissionById, 
    updateBoardSubjects, 
    collectBoardInstallment 
} from "../../controllers/Admission/BoardCourseAdmissionController.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
const router = express.Router();

router.post("/create", requireGranularPermission("admissions", "boardCourseAdmission", "create"), createBoardAdmission);
router.get("/all", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardAdmissions);
router.get("/:id", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardAdmissionById);
router.put("/update-subjects/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), updateBoardSubjects);
router.post("/collect-installment/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardInstallment);

export default router;
