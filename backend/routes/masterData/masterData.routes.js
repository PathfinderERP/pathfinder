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
import {
    createFollowUpFeedback, getFollowUpFeedbacks, updateFollowUpFeedback, deleteFollowUpFeedback
} from "../../controllers/masterData/followUpFeedbackController.js";
import { requireAuth, requireGranularPermission } from "../../middleware/permissionMiddleware.js";
import { bulkImport } from "../../controllers/common/bulkController.js";
import ExpenseCategory from "../../models/Master_data/ExpenseCategory.js";
import ExpenseSubCategory from "../../models/Master_data/ExpenseSubCategory.js";
import ExpenditureType from "../../models/Master_data/ExpenditureType.js";
import Account from "../../models/Master_data/Account.js";
import FollowUpFeedback from "../../models/Master_data/FollowUpFeedback.js";

const router = express.Router();

// Expense Category
router.get("/category", requireAuth, getExpenseCategories);
router.post("/category", requireGranularPermission("masterData", "category", "create"), createExpenseCategory);
router.post("/category/import", requireGranularPermission("masterData", "category", "create"), bulkImport(ExpenseCategory));
router.put("/category/:id", requireGranularPermission("masterData", "category", "edit"), updateExpenseCategory);
router.delete("/category/:id", requireGranularPermission("masterData", "category", "delete"), deleteExpenseCategory);

// Expense Sub Category
router.get("/subcategory", requireAuth, getExpenseSubCategories);
router.post("/subcategory", requireGranularPermission("masterData", "subcategory", "create"), createExpenseSubCategory);
router.post("/subcategory/import", requireGranularPermission("masterData", "subcategory", "create"), bulkImport(ExpenseSubCategory));
router.put("/subcategory/:id", requireGranularPermission("masterData", "subcategory", "edit"), updateExpenseSubCategory);
router.delete("/subcategory/:id", requireGranularPermission("masterData", "subcategory", "delete"), deleteExpenseSubCategory);

// Expenditure Type
router.get("/expenditure-type", requireAuth, getExpenditureTypes);
router.post("/expenditure-type", requireGranularPermission("masterData", "expenditureType", "create"), createExpenditureType);
router.post("/expenditure-type/import", requireGranularPermission("masterData", "expenditureType", "create"), bulkImport(ExpenditureType));
router.put("/expenditure-type/:id", requireGranularPermission("masterData", "expenditureType", "edit"), updateExpenditureType);
router.delete("/expenditure-type/:id", requireGranularPermission("masterData", "expenditureType", "delete"), deleteExpenditureType);

// Account
router.get("/account", requireAuth, getAccounts);
router.post("/account", requireGranularPermission("masterData", "account", "create"), createAccount);
router.post("/account/import", requireGranularPermission("masterData", "account", "create"), bulkImport(Account));
router.put("/account/:id", requireGranularPermission("masterData", "account", "edit"), updateAccount);
router.delete("/account/:id", requireGranularPermission("masterData", "account", "delete"), deleteAccount);

// Follow Up Feedback
router.get("/follow-up-feedback", requireAuth, getFollowUpFeedbacks);
router.post("/follow-up-feedback", requireGranularPermission("masterData", "followUpFeedback", "create"), createFollowUpFeedback);
router.post("/follow-up-feedback/import", requireGranularPermission("masterData", "followUpFeedback", "create"), bulkImport(FollowUpFeedback));
router.put("/follow-up-feedback/:id", requireGranularPermission("masterData", "followUpFeedback", "edit"), updateFollowUpFeedback);
router.delete("/follow-up-feedback/:id", requireGranularPermission("masterData", "followUpFeedback", "delete"), deleteFollowUpFeedback);

export default router;
