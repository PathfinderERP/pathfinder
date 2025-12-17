import express from "express";
import { getAllHODs } from "../../controllers/Academics/hodController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/list", authMiddleware, getAllHODs);

export default router;
