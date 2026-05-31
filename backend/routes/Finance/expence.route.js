import {
    createExpense,
    getAllExpence,
    getSingleExpence,
    updateExpence
} from "../../controllers/Finance/expense.js";

import express from "express";

const router = express.Router();

router.post("/", createExpense);

router.get("/",getAllExpence);

router.get("/:id",getSingleExpence);

router.put("/:id",updateExpence);

export default router;