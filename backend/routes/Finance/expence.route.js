import {
    createExpense,
    getAllExpence,
    getSingleExpence,
    updateExpence,
    bulkImportExpenses,
    deleteExpense,
    bulkDeleteExpenses,
    bulkEditExpenses
} from "../../controllers/Finance/expense.js";

import express from "express";
import protect from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createExpense);
router.post("/bulk-import", protect, bulkImportExpenses);
router.post("/bulk-delete", protect, bulkDeleteExpenses);
router.post("/bulk-edit", protect, bulkEditExpenses);

router.get("/", getAllExpence);

router.get("/:id", getSingleExpence);

router.put("/:id", updateExpence);

router.delete("/:id", deleteExpense);

export default router;