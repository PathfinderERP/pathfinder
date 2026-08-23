import express from "express";
import multer from "multer";
import {
    getB2BComparisonData,
    updateB2BRecord,
    syncB2BExcelData
} from "../../controllers/marketingCRM/b2bComparisonController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/", protect, getB2BComparisonData);
router.put("/:id", protect, updateB2BRecord);
router.post("/sync-excel", protect, upload.single("file"), syncB2BExcelData);

export default router;
