import express from "express";
import {
    createCategory,
    getAllCategories,
    getSingleCategoryById,
    deleteCategory,
    updateCategory,
    importCategories
} from "../../controllers/masterData/category.js";

const router = express.Router();

router.post("/",createCategory);

router.get("/",getAllCategories);

router.post("/import", importCategories);

router.get("/:id",getSingleCategoryById);

router.put("/:id",updateCategory);

router.delete("/:id",deleteCategory);

export default router;