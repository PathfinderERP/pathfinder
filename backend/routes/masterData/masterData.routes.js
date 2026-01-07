import express from "express";
import {
    createExpenseCategory, getExpenseCategories, updateExpenseCategory, deleteExpenseCategory
} from "../../controllers/masterData/expenseCategoryController.js";
import {
    createExpenseSubCategory, getExpenseSubCategories, updateExpenseSubCategory, deleteExpenseSubCategory
} from "../../controllers/masterData/expenseSubCategoryController.js";
import {
    createExpenditureType, getExpenditureTypes, updateExpenditureType, deleteExpenditureType
} from "../../controllers/masterData/expenditureTypeController.js";
import {
    createAccount, getAccounts, updateAccount, deleteAccount
} from "../../controllers/masterData/accountController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";

const router = express.Router();

// Expense Category
router.get("/category", requireAuth, getExpenseCategories);
router.post("/category", requireGranularPermission("masterData", "category", "create"), createExpenseCategory);
router.put("/category/:id", requireGranularPermission("masterData", "category", "edit"), updateExpenseCategory);
router.delete("/category/:id", requireGranularPermission("masterData", "category", "delete"), deleteExpenseCategory);

// Expense Sub Category
router.get("/subcategory", requireAuth, getExpenseSubCategories);
router.post("/subcategory", requireGranularPermission("masterData", "subcategory", "create"), createExpenseSubCategory);
router.put("/subcategory/:id", requireGranularPermission("masterData", "subcategory", "edit"), updateExpenseSubCategory);
router.delete("/subcategory/:id", requireGranularPermission("masterData", "subcategory", "delete"), deleteExpenseSubCategory);

// Expenditure Type
router.get("/expenditure-type", requireAuth, getExpenditureTypes);
router.post("/expenditure-type", requireGranularPermission("masterData", "expenditureType", "create"), createExpenditureType);
router.put("/expenditure-type/:id", requireGranularPermission("masterData", "expenditureType", "edit"), updateExpenditureType);
router.delete("/expenditure-type/:id", requireGranularPermission("masterData", "expenditureType", "delete"), deleteExpenditureType);

// Account
router.get("/account", requireAuth, getAccounts);
router.post("/account", requireGranularPermission("masterData", "account", "create"), createAccount);
router.put("/account/:id", requireGranularPermission("masterData", "account", "edit"), updateAccount);
router.delete("/account/:id", requireGranularPermission("masterData", "account", "delete"), deleteAccount);

export default router;
