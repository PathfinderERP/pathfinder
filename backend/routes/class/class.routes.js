import express from "express";
import { requirePermission } from "../../middleware/permissionMiddleware.js";
import { createClass } from "../../controllers/class/createClass.js";
import { getClasses } from "../../controllers/class/getClasses.js";
import { getClassById } from "../../controllers/class/getClassById.js";
import { updateClass } from "../../controllers/class/updateClass.js";
import { deleteClass } from "../../controllers/class/deleteClass.js";

const router = express.Router();

// All class routes require "Master Data" permission
router.post("/create", requirePermission("Master Data"), createClass);
router.get("/", requirePermission("Master Data"), getClasses);
router.get("/:id", requirePermission("Master Data"), getClassById);
router.put("/:id", requirePermission("Master Data"), updateClass);
router.delete("/:id", requirePermission("Master Data"), deleteClass);

export default router;
