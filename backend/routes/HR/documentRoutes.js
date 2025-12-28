import express from "express";
import { uploadDocument, getDocuments, deleteDocument } from "../../controllers/HR/documentController.js";
import protect from "../../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();

// Multer in Memory for R2 Upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/upload", protect, upload.array("files", 5), uploadDocument);
router.get("/list", protect, getDocuments);
router.delete("/:id", protect, deleteDocument);

// Test route
router.get("/test", (req, res) => res.send("Document Route Working"));

export default router;
