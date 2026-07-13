import {
    createExpense,
    getAllExpence,
    getSingleExpence,
    updateExpence,
    bulkImportExpenses,
    deleteExpense
} from "../../controllers/Finance/expense.js";

import express from "express";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createExpense);
router.post("/bulk-import", protect, bulkImportExpenses);

router.get("/",getAllExpence);

router.get("/:id",getSingleExpence);

router.put("/:id",updateExpence);

router.delete("/:id",deleteExpense);

export default router;