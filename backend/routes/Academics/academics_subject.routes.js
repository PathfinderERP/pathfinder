import express from "express";
import { createSubject, getAllSubjects, getSubjectsByClass, updateSubject, deleteSubject, deleteMultipleSubjects } from "../../controllers/Academics/Academics_subjectController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createSubject);
router.post("/delete-multiple", authMiddleware, deleteMultipleSubjects);
router.get("/list", authMiddleware, getAllSubjects);
router.get("/list/class/:classId", authMiddleware, getSubjectsByClass);
router.put("/update/:id", authMiddleware, updateSubject);
router.delete("/delete/:id", authMiddleware, deleteSubject);

export default router;
