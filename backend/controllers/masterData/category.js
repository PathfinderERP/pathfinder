import mongoose from "mongoose";
import Category from "../../models/Master_data/Category.js";

const createCategory = async (req,res) => {
    try {
        const {name,description,status} = req.body;

        if(!name){
            return res.status(400).json({
                success:false,
                message :"Name is requierd to create the category"
            });
        }

        const data = {
            name,
            description,
            status: status || "Active"
        };
        
        const category = await Category.create(data);

        res.status(201).json({
            success:true,
            message:"Category created successfully",
            category
        });
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}

const getAllCategories = async (req,res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status && status !== "All") {
            if (status === "Active") {
                query.$or = [
                    { status: "Active" },
                    { status: { $exists: false } },
                    { status: null },
                    { status: "" }
                ];
            } else if (status === "Deactive" || status === "Inactive") {
                query.status = { $in: ["Deactive", "Inactive"] };
            } else {
                query.status = status;
            }
        }
        const categories = await Category.find(query).sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: `Found ${categories.length} categories`,
            categories: categories || []
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error getting the categories"
        });
    }
}

const getSingleCategoryById = async (req,res) => {
    try {
        const id = req.params.id;
        if(!id) {
            return res.status(400).json({
                success:false,
                message :"Please provide the course id",
            });
        }

        const category = await Category.findById(id);
        if(!category) {
            return res.status(404).json({
                success:false,
                message:"Category not found",
            });
        }

        res.status(201).json({
            success:true,
            message :"Category found ",
            category
        });
    } catch (error) {
        res.status(500).json({
            success:false,
            message :"InternaL SERVER ERROPR"
        })
    }
}

const deleteCategory = async (req,res) => {
    try {
        const {id} = req.params;
        if(!id) {
            return res.status(404).json({
                success:false,
                message:"pleasse provide the id"
            });
        }

        const category = await Category.findById(id);
        if(!category) {
            return res.status(404).json({
                success:false,
                message:"Category not found",
            });
        }

        await Category.findByIdAndDelete(id);
        res.status(200).json({
            success:true,
            message:"Category deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success:false,
            message :"Internal server error"
        });
    }
}

const updateCategory = async (req,res) => {
    try {
        const {id} = req.params;

        const {
            name,
            description,
            status
        } = req.body;

        const exists = await Category.findById(id);

        if(!exists) {
            return res.status(404).json({
                success:false,
                message:"Category doesnot exists",
            });
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;

        const updateCategory = await Category.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        res.status(200).json({
            message:"Category updated successfully",
            success:true,
            updateCategory
        });

    } catch (error) {
        res.status(500).json({
            message :"internal server error"
        })
    }
}

const importCategories = async (req, res) => {
    try {
        const categoriesData = req.body;
        
        if (!Array.isArray(categoriesData) || categoriesData.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of categories to import"
            });
        }

        const formattedCategories = categoriesData.map(cat => ({
            name: cat.name || cat['Category Name'],
            description: cat.description || cat['Description'] || '',
            status: cat.status || cat['Status'] || 'Active'
        })).filter(cat => cat.name);

        if (formattedCategories.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid categories found to import"
            });
        }

        const importedCategories = await Category.insertMany(formattedCategories, { ordered: false });

        res.status(201).json({
            success: true,
            message: `${importedCategories.length} categories imported successfully`,
            categories: importedCategories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error importing categories, possibly due to duplicates",
            error: error.message
        });
    }
}

const bulkUpdateCategoryStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide category IDs to update"
            });
        }

        if (!['Active', 'Deactive', 'Inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value. Must be 'Active' or 'Deactive'"
            });
        }

        const normalizedStatus = status === 'Inactive' ? 'Deactive' : status;

        const result = await Category.updateMany(
            { _id: { $in: ids } },
            { $set: { status: normalizedStatus } }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} categories updated to ${normalizedStatus}`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error updating categories status",
            error: error.message
        });
    }
};

export {
    createCategory,
    getAllCategories,
    getSingleCategoryById,
    deleteCategory,
    updateCategory,
    importCategories,
    bulkUpdateCategoryStatus
} ;