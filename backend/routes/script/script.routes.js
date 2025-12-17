import express from "express";
import { createScript, getScripts, updateScript, deleteScript } from "../../controllers/script/scriptController.js";

const router = express.Router();

router.post("/create", createScript);
router.get("/list", getScripts);
router.put("/update/:id", updateScript);
router.delete("/delete/:id", deleteScript);

export default router;
