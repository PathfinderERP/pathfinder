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
    getBoardAdmissionAnalysis,
    bulkUpdateBoardAdmissions,
    deleteBoardAdmission,
    reactivateBoardAdmission,
    repairCancelledBoardAdmissions
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
// Repair route: restores wrongly-CANCELLED board admissions (by old delete logic) back to ACTIVE
router.post("/repair-cancelled", repairCancelledBoardAdmissions);
router.get("/:id", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardAdmissionById);
router.put("/update-subjects/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), updateBoardSubjects);
router.post("/collect-installment/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardInstallment);
router.post("/collect-exam-fee/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardExamFee);
router.post("/collect-additional-fee/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectBoardAdditionalFee);
router.post("/collect-ncrp-fees/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), collectNcrpFees);
router.post("/bulk-update", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), bulkUpdateBoardAdmissions);
router.delete("/:id", requireGranularPermission("admissions", "boardCourseAdmission", "delete"), deleteBoardAdmission);
router.put("/:id/reactivate", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), reactivateBoardAdmission);

// Board Course Counselling Routes
router.post("/counsel/create", requireGranularPermission("admissions", "boardCourseAdmission", "create"), createBoardCourseCounselling);
router.get("/counsel/all", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardCourseCounselling);
// check-duplicate MUST be before /:id to avoid collision
router.get("/counsel/check-duplicate", requireGranularPermission("admissions", "boardCourseAdmission", "view"), checkDuplicateContact);
router.get("/counsel/:id", requireGranularPermission("admissions", "boardCourseAdmission", "view"), getBoardCourseCounselling);
router.put("/counsel/:id", requireGranularPermission("admissions", "boardCourseAdmission", "edit"), updateBoardCourseCounselling);
router.delete("/counsel/:id", requireGranularPermission("admissions", "boardCourseAdmission", "delete"), deleteBoardCourseCounselling);

export default router;
