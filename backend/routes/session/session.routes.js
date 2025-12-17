import express from "express";
import { createSession, getSessions, updateSession, deleteSession } from "../../controllers/session/sessionController.js";

const router = express.Router();

router.post("/create", createSession);
router.get("/list", getSessions);
router.put("/update/:id", updateSession);
router.delete("/delete/:id", deleteSession);

export default router;
