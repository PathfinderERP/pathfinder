import express from "express";
import { 
    createTeacherRoutine, 
    getAllTeacherRoutines, 
    updateTeacherRoutine, 
    deleteTeacherRoutine, 
    bulkImportRoutines,
    getGroupedTeacherRoutines
} from "../../controllers/Academics/teacherRoutineController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createTeacherRoutine);
router.get("/", protect, getAllTeacherRoutines);
router.get("/grouped", protect, getGroupedTeacherRoutines);
router.put("/:id", protect, updateTeacherRoutine);
router.delete("/:id", protect, deleteTeacherRoutine);
router.post("/bulk-import", protect, bulkImportRoutines);


export default router;
