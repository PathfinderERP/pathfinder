import express from "express";
import {
    getBudgetCentres,
    updateCentreBudget,
    getBudgetsByCentre
} from "../../controllers/Finance/budgetController.js";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/centres", protect, getBudgetCentres);
router.get("/detail/:centreId", protect, getBudgetsByCentre);
router.post("/", protect, updateCentreBudget);

export default router;
