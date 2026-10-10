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
import { requireGranularPermission, requireAnyGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.get("/overview", protect, requireGranularPermission("operations", "store", "view"), getStoreOverview);
router.get("/centre-students", protect, requireGranularPermission("operations", "store", "view"), getCentreStudents);
router.get("/bill", protect, getBillDetailsByBillId);
router.get("/bill/:billId", protect, getBillDetailsByBillId);
router.post("/", protect, requireAnyGranularPermission([
    { module: "operations", section: "store", action: "create" },
    { module: "admissions", section: "enrolledStudents", action: "edit" },
    { module: "admissions", section: "enrolledStudents", action: "view" },
    { module: "financeFees", section: "installmentPayment", action: "create" },
    { module: "financeFees", section: "billGeneration", action: "create" }
]), createAllocation);
router.post("/buy-book", protect, requireAnyGranularPermission([
    { module: "operations", section: "store", action: "create" },
    { module: "admissions", section: "enrolledStudents", action: "edit" },
    { module: "admissions", section: "enrolledStudents", action: "view" },
    { module: "financeFees", section: "installmentPayment", action: "create" },
    { module: "financeFees", section: "billGeneration", action: "create" }
]), createAllocation);
router.post("/bulk", protect, requireGranularPermission("operations", "store", "create"), createBulkAllocation);
router.get("/list", protect, requireGranularPermission("operations", "store", "view"), getAllAllocations);
router.get("/student/:studentId", protect, requireGranularPermission("operations", "store", "view"), getStudentAllocations);

export default router;
