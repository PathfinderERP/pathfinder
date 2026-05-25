import Expense from "../../models/Finance/Expense.js";
import Category from "../../models/Master_data/Category.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

const createExpense = async (req, res) => {
    try {
        const {
            name,
            category,
            months,
            approvedBy,
            approvedDate,
            expenseDate,
            createdBy
        } = req.body;

        if (!name || !category || !approvedBy || !approvedDate || !createdBy) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const data = {
            name,
            category,
            months,
            approvedBy,
            approvedDate,
            expenseDate,
            createdBy
        };

        const expense = await Expense.create(data);

        return res.status(200).json({
            message: "Expence created successfully",
            expense,
        });

    } catch (error) {
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

const getAllExpence = async (req, res) => {
    try {
        const expences = await Expense.find()
            .populate("category")
            .populate("createdBy")
            .populate("approvedBy");

        if (expences.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Expenses not found",
            });
        }

        res.status(200).json({
            success: true,
            message: `Found ${expences.length} expenses`,
            expences,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error"
        })
    }
}

const getSingleExpence = async (req, res) => {

    try {

        const id = req.params.id;

        const expense = await Expense.findById(id);

        if (!expense) {
            return res.status(404).json({
                success:false,
                message: "Expense not found",
            });
        }

        res.status(201).json({
            success:true,
            expense,
        });
    } catch (error) {
        res.status(500).json({
            success:false,
            message: "Internal server error",
        });
    }

}

const updateExpence = async (req,res) => {
    try {
        const {id} = req.params;

        const {
            name,
            category,
            months,
            approvedBy,
            approvedDate,
            expenseDate,
            createdBy
        } = req.body;

        const data = await Expense.findById(id);

        if(!data) {
            return res.status(404).json({
                success:false,
                message:"Expense not found",
            });
        }

        const updateExpensedata = await Expense.findByIdAndUpdate(
            id,
            {
                name,
                category,
                months,
                approvedBy,
                approvedDate,
                expenseDate,
                createdBy
            },{
        new: true,
        runValidators: true
    }

        );

        res.status(201).json({
            message :"Expence updated successfully",
            success:true,
            updateExpensedata
        });
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"Internal server error",
        });
    }
}
export { createExpense, getAllExpence ,getSingleExpence,updateExpence};