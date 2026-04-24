import express from "express";
import { createSession, getSessions, updateSession, deleteSession, setGlobalActiveSession } from "../../controllers/session/sessionController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import Session from "../../models/Master_data/Session.js";

const router = express.Router();

router.post("/create", requireGranularPermission("masterData", "session", "create"), createSession);
router.post("/import", requireGranularPermission("masterData", "session", "create"), bulkImport(Session));
router.get("/list", requireAuth, getSessions);
router.put("/update/:id", requireGranularPermission("masterData", "session", "edit"), updateSession);
router.put("/set-active/:id", requireGranularPermission("masterData", "session", "edit"), setGlobalActiveSession);
router.delete("/delete/:id", requireGranularPermission("masterData", "session", "delete"), deleteSession);

export default router;
