import express from "express";
import {
    getCenterTaggings,
    tagCenter,
    getAvailableHeadCentres
} from "../../controllers/Finance/centerTaggingController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
    .get(protect, getCenterTaggings)
    .post(protect, tagCenter);

router.get("/heads", protect, getAvailableHeadCentres);

export default router;
