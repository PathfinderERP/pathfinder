import express from "express";
import { 
    createRequirement, 
    getRequirements, 
    getCentreBucket, 
    getAllCentresBuckets, 
    approveRequisition, 
    rejectRequisition, 
    updateRequisition,
    deleteRequisition,
    cancelRequisition, 
    updateCentreBucketDirectly 
} from "../../controllers/Operations/marketingController.js";
import protect from "../../middleware/authMiddleware.js";
import { requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Requisition CRUD
router.get("/", protect, getRequirements);
router.post("/", protect, createRequirement);
router.post("/requisition", protect, createRequirement);
router.put("/requisitions/:id", protect, updateRequisition);
router.delete("/requisitions/:id", protect, deleteRequisition);

// Approvals & Rejections (Requires marketingApproval permission or SuperAdmin)
router.put("/requisitions/:id/approve", protect, requireGranularPermission("operations", "marketingApproval", "edit"), approveRequisition);
router.put("/requisitions/:id/reject", protect, requireGranularPermission("operations", "marketingApproval", "edit"), rejectRequisition);

// Bucket Inventory Tracking
router.get("/bucket", protect, getCentreBucket);
router.get("/bucket/:centreId", protect, getCentreBucket);
router.get("/all-buckets", protect, requireGranularPermission("operations", "marketingApproval", "view"), getAllCentresBuckets);
router.put("/bucket/:centreId", protect, updateCentreBucketDirectly);

export default router;
