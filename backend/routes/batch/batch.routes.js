import express from "express";
import { createBatch, getBatches, updateBatch, deleteBatch } from "../../controllers/batch/batchController.js";

const router = express.Router();

router.post("/create", createBatch);
router.get("/list", getBatches);
router.put("/update/:id", updateBatch);
router.delete("/delete/:id", deleteBatch);

export default router;
