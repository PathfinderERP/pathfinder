import express from "express";
import { 
    createAllocation, 
    createBulkAllocation,
    getStudentAllocations, 
    getAllAllocations,
    getStoreOverview,
    getCentreStudents,
    getBillDetailsByBillId
} from "../../controllers/Inventory/allocationController.js";
import protect from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/overview", protect, requireGranularPermission("operations", "store", "view"), getStoreOverview);
router.get("/centre-students", protect, requireGranularPermission("operations", "store", "view"), getCentreStudents);
router.get("/bill", protect, requireGranularPermission("operations", "store", "view"), getBillDetailsByBillId);
router.get("/bill/:billId", protect, requireGranularPermission("operations", "store", "view"), getBillDetailsByBillId);
router.post("/", protect, requireGranularPermission("operations", "store", "create"), createAllocation);
router.post("/bulk", protect, requireGranularPermission("operations", "store", "create"), createBulkAllocation);
router.get("/list", protect, requireGranularPermission("operations", "store", "view"), getAllAllocations);
router.get("/student/:studentId", protect, requireGranularPermission("operations", "store", "view"), getStudentAllocations);

export default router;
