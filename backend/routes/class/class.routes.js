import express from "express";

import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";
import { createClass } from "../../controllers/class/createClass.js";
import { getClasses } from "../../controllers/class/getClasses.js";
import { getClassById } from "../../controllers/class/getClassById.js";
import { updateClass } from "../../controllers/class/updateClass.js";
import { deleteClass } from "../../controllers/class/deleteClass.js";

const router = express.Router();

router.post("/create", requireNormalOrSuper, createClass);
router.get("/", requireNormalOrSuper, getClasses);
router.get("/:id", requireNormalOrSuper, getClassById);
router.put("/:id", requireNormalOrSuper, updateClass);
router.delete("/:id", requireNormalOrSuper, deleteClass);

export default router;
