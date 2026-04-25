import express from "express";
import { 
    createBoardAdmission, 
    getBoardAdmissions, 
    getBoardAdmissionById, 
    updateBoardSubjects, 
    collectBoardInstallment,
    collectBoardExamFee,
    collectBoardAdditionalFee,
    collectNcrpFees,
    getBoardAdmissionAnalysis
} from "../../controllers/Admission/BoardCourseAdmissionController.js";
import {
    createBoardCourseCounselling,
    getBoardCourseCounselling,
    updateBoardCourseCounselling,
    checkDuplicateContact,
    deleteBoardCourseCounselling
} from "../../controllers/Admission/BoardCourseCounsellingController.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";
const router = express.Router();

router.post("/create", requireGranularPermission("admissions", "boardCourseAdmission", "create"), createBoardAdmission);
router.get("/all", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardAdmissions);
router.get("/analysis", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardAdmissionAnalysis);
router.get("/:id", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardAdmissionById);
router.put("/update-subjects/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), updateBoardSubjects);
router.post("/collect-installment/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardInstallment);
router.post("/collect-exam-fee/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardExamFee);
router.post("/collect-additional-fee/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardAdditionalFee);
router.post("/collect-ncrp-fees/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectNcrpFees);

// Board Course Counselling Routes
router.post("/counsel/create", requireGranularPermission("admissions", "boardCourseAdmission", "create"), createBoardCourseCounselling);
router.get("/counsel/all", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardCourseCounselling);
// check-duplicate MUST be before /:id to avoid collision
router.get("/counsel/check-duplicate", requireGranularPermission("admissions", "boardCourseAdmission", "view"), checkDuplicateContact);
router.get("/counsel/:id", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardCourseCounselling);
router.put("/counsel/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), updateBoardCourseCounselling);
router.delete("/counsel/:id", requireGranularPermission("admissions", "boardCourseAdmission", "delete"), deleteBoardCourseCounselling);

export default router;
