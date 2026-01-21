import express from "express";
import {
    getDesignations,
    getDesignationById,
    createDesignation,
    updateDesignation,
    deleteDesignation
} from "../../controllers/designationController.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import Designation from "../../models/Master_data/Designation.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getDesignations);
router.get("/:id", getDesignationById);
router.post("/", createDesignation);
router.post("/import", bulkImport(Designation));
router.put("/:id", updateDesignation);
router.delete("/:id", deleteDesignation);

export default router;
