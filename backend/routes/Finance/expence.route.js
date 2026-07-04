import {
    createExpense,
    getAllExpence,
    getSingleExpence,
    updateExpence,
    bulkImportExpenses
} from "../../controllers/Finance/expense.js";

import express from "express";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createExpense);
router.post("/bulk-import", protect, bulkImportExpenses);

router.get("/",getAllExpence);

router.get("/:id",getSingleExpence);

router.put("/:id",updateExpence);

export default router;