import express from "express";
import { createClass, getAllClasses, updateClass, deleteClass } from "../../controllers/Academics/Academics_classController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createClass);
router.get("/list", authMiddleware, getAllClasses);
router.put("/update/:id", authMiddleware, updateClass);
router.delete("/delete/:id", authMiddleware, deleteClass);

export default router;
