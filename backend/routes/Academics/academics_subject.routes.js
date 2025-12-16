import express from "express";
import { createSubject, getAllSubjects, updateSubject, deleteSubject } from "../../controllers/Academics/Academics_subjectController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createSubject);
router.get("/list", authMiddleware, getAllSubjects);
router.put("/update/:id", authMiddleware, updateSubject);
router.delete("/delete/:id", authMiddleware, deleteSubject);

export default router;
