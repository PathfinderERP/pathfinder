import express from "express";
import {
    getPartTimeTeachers,
    upsertFeeStructure
} from "../../controllers/Finance/partTimeTeacherController.js";
import { requireAuth } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getPartTimeTeachers);
router.post("/", requireAuth, upsertFeeStructure);
router.put("/:id", requireAuth, upsertFeeStructure); // Use same controller for simplicity

export default router;
