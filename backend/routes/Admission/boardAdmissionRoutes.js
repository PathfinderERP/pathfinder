import express from "express";
import { 
    createBoardAdmission, 
    getBoardAdmissions, 
    getBoardAdmissionById, 
    updateBoardSubjects, 
    collectBoardInstallment,
    collectBoardExamFee,
    collectBoardAdditionalFee
} from "../../controllers/Admission/BoardCourseAdmissionController.js";
import {
    createBoardCourseCounselling,
    getBoardCourseCounselling,
    deleteBoardCourseCounselling
} from "../../controllers/Admission/BoardCourseCounsellingController.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
const router = express.Router();

router.post("/create", requireGranularPermission("admissions", "boardCourseAdmission", "create"), createBoardAdmission);
router.get("/all", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardAdmissions);
router.get("/:id", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardAdmissionById);
router.put("/update-subjects/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), updateBoardSubjects);
router.post("/collect-installment/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardInstallment);
router.post("/collect-exam-fee/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardExamFee);
router.post("/collect-additional-fee/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardAdditionalFee);

// Board Course Counselling Routes
router.post("/counsel/create", requireGranularPermission("admissions", "boardCourseAdmission", "create"), createBoardCourseCounselling);
router.get("/counsel/all", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardCourseCounselling);
router.get("/counsel/:id", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardCourseCounselling); // Reuse existing or add new? (I'll add new below)
router.delete("/counsel/:id", requireGranularPermission("admissions", "boardCourseAdmission", "delete"), deleteBoardCourseCounselling);

export default router;
