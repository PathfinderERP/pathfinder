import express from "express";
import { createDepartment } from "../../controllers/department/createDepartment.js";
import { getDepartments } from "../../controllers/department/getDepartments.js";
import { getDepartmentById } from "../../controllers/department/getDepartmentById.js";
import { updateDepartment } from "../../controllers/department/updateDepartment.js";
import { deleteDepartment } from "../../controllers/department/deleteDepartment.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Read routes - Accessible to authenticated users
router.get("/", requireAuth, getDepartments);
router.get("/:id", requireAuth, getDepartmentById);

// Write routes - Require granular permissions
router.post("/create", requireGranularPermission("masterData", "department", "create"), createDepartment);
router.put("/:id", requireGranularPermission("masterData", "department", "edit"), updateDepartment);
router.delete("/:id", requireGranularPermission("masterData", "department", "delete"), deleteDepartment);

export default router;
