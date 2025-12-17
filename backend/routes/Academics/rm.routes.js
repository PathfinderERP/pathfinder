import express from "express";
import { createRM, getAllRMs, updateRM, deleteRM } from "../../controllers/Academics/rmController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", authMiddleware, createRM);
router.get("/list", authMiddleware, getAllRMs);
router.put("/update/:id", authMiddleware, updateRM);
router.delete("/delete/:id", authMiddleware, deleteRM);

export default router;
