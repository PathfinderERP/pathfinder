import express from "express";
import {
    getPettyCashCentres, syncPettyCashCentres, addExpenditure,
    getExpenditures, approveExpenditure, rejectExpenditure,
    addPettyCashDeposit, requestPettyCash, getPettyCashRequests,
    approvePettyCashRequest, rejectPettyCashRequest, updatePettyCashRequest, upload,
    bulkApproveExpenditure, bulkRejectExpenditure
} from "../../controllers/Finance/pettyCashController.js";
import { requireAuth, requireGranularPermission, requireAnyGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(requireAuth);

// Centre Petty Cash Details
router.get("/centres", requireGranularPermission("pettyCashManagement", "pettyCashCentre", "view"), getPettyCashCentres);
router.post("/sync", requireGranularPermission("pettyCashManagement", "pettyCashCentre", "create"), syncPettyCashCentres);
router.post("/deposit", requireGranularPermission("pettyCashManagement", "pettyCashCentre", "create"), addPettyCashDeposit);

// Expenditure
router.get("/expenditure", requireGranularPermission("pettyCashManagement", "addExpenditure", "view"), getExpenditures);
router.post("/expenditure", upload.array("billImage", 10), requireGranularPermission("pettyCashManagement", "addExpenditure", "create"), addExpenditure);

// Approval
router.get("/approval", requireGranularPermission("pettyCashManagement", "expenditureApproval", "view"), getExpenditures);
router.put("/approve/:id", requireGranularPermission("pettyCashManagement", "expenditureApproval", "approve"), approveExpenditure);
router.put("/reject/:id", requireGranularPermission("pettyCashManagement", "expenditureApproval", "approve"), rejectExpenditure);
router.put("/bulk-approve", requireGranularPermission("pettyCashManagement", "expenditureApproval", "approve"), bulkApproveExpenditure);
router.put("/bulk-reject", requireGranularPermission("pettyCashManagement", "expenditureApproval", "approve"), bulkRejectExpenditure);

// Petty Cash Requests (Add Petty Cash)
router.get("/requests", requireGranularPermission("pettyCashManagement", "addPettyCash", "view"), getPettyCashRequests);
router.post("/requests", requireGranularPermission("pettyCashManagement", "addPettyCash", "create"), requestPettyCash);

// Petty Cash Request Approval
router.get("/request-approval", requireGranularPermission("pettyCashManagement", "pettyCashRequestApproval", "view"), getPettyCashRequests);
router.put("/request-approve/:id", requireGranularPermission("pettyCashManagement", "pettyCashRequestApproval", "approve"), approvePettyCashRequest);
router.put("/request-reject/:id", requireGranularPermission("pettyCashManagement", "pettyCashRequestApproval", "approve"), rejectPettyCashRequest);
router.put("/request-update/:id", requireAnyGranularPermission([
    { module: "pettyCashManagement", section: "pettyCashRequestApproval", action: "create" },
    { module: "pettyCashManagement", section: "pettyCashRequestApproval", action: "edit" },
    { module: "pettyCashManagement", section: "pettyCashRequestApproval", action: "delete" }
]), updatePettyCashRequest);

export default router;
