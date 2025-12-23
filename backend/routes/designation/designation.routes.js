import express from "express";
import {
    getDesignations,
    getDesignationById,
    createDesignation,
    updateDesignation,
    deleteDesignation
} from "../../controllers/designationController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getDesignations);
router.get("/:id", getDesignationById);
router.post("/", createDesignation);
router.put("/:id", updateDesignation);
router.delete("/:id", deleteDesignation);

export default router;
