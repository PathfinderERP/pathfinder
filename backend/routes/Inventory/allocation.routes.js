import express from "express";
import { 
    createAllocation, 
    getStudentAllocations, 
    getAllAllocations 
} from "../../controllers/Inventory/allocationController.js";
import protect from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.post("/", protect, requireGranularPermission("operations", "store", "create"), createAllocation);
router.get("/list", protect, requireGranularPermission("operations", "store", "view"), getAllAllocations);
router.get("/student/:studentId", protect, requireGranularPermission("operations", "store", "view"), getStudentAllocations);

export default router;
