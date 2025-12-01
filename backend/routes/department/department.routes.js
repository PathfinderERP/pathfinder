import express from "express";
import { createDepartment } from "../../controllers/department/createDepartment.js";
import { getDepartments } from "../../controllers/department/getDepartments.js";
import { getDepartmentById } from "../../controllers/department/getDepartmentById.js";
import { updateDepartment } from "../../controllers/department/updateDepartment.js";
import { deleteDepartment } from "../../controllers/department/deleteDepartment.js";
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", requireNormalOrSuper, createDepartment);
router.get("/", requireNormalOrSuper, getDepartments);
router.get("/:id", requireNormalOrSuper, getDepartmentById);
router.put("/:id", requireNormalOrSuper, updateDepartment);
router.delete("/:id", requireNormalOrSuper, deleteDepartment);

export default router;
