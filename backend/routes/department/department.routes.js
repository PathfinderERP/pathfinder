import express from "express";
import { createDepartment } from "../../controllers/department/createDepartment.js";
import { getDepartments } from "../../controllers/department/getDepartments.js";
import { getDepartmentById } from "../../controllers/department/getDepartmentById.js";
import { updateDepartment } from "../../controllers/department/updateDepartment.js";
import { deleteDepartment } from "../../controllers/department/deleteDepartment.js";
import { requirePermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// All department routes require "Master Data" permission
router.post("/create", requirePermission("Master Data"), createDepartment);
router.get("/", requirePermission("Master Data"), getDepartments);
router.get("/:id", requirePermission("Master Data"), getDepartmentById);
router.put("/:id", requirePermission("Master Data"), updateDepartment);
router.delete("/:id", requirePermission("Master Data"), deleteDepartment);

export default router;
