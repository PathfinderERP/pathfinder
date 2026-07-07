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
            week,
            amount,
            approvedBy,
            approvedDate,
            expenseDate,
            createdBy,
            accountNumber,
            ifscCode
        } = req.body;

        if (!name || !category || !months || !week || !amount || !createdBy || !accountNumber || !ifscCode) {
            return res.status(400).json({
                success: false,
                message: "Expense Name, Category, Month, Week, Amount, Created By, Bank Account No., and IFSC Code fields are required",
            });
        }

        const data = {
            name,
            category,
            months,
            week,
            amount,
            approvedBy,
            approvedDate,
            expenseDate,
            createdBy,
            accountNumber,
            ifscCode
        };

        const expense = await Expense.create(data);

        return res.status(200).json({
            message: "Expense created successfully",
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
            .sort({ createdAt: -1 })
            .populate("category")
            .populate("createdBy")
            .populate("approvedBy")
            .populate("employeeId")
            .populate("hrApprovedBy")
            .populate("financeApprovedBy")
            .populate("departmentId");

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
            week,
            approvedBy,
            approvedDate,
            expenseDate,
            createdBy,
            financeStatus,
            financeApprovedBy,
            financeApprovedDate,
            givenBy,
            reason,
            amount
        } = req.body;

        const data = await Expense.findById(id);

        if(!data) {
            return res.status(404).json({
                success:false,
                message:"Expense not found",
            });
        }

        let updateData = {
            name,
            category,
            months,
            week,
            approvedBy,
            approvedDate,
            expenseDate,
            createdBy,
            financeStatus,
            financeApprovedBy,
            financeApprovedDate,
            givenBy,
            reason,
            amount
        };

        if (financeStatus === 'Approved') {
            const originalAmount = data.originalAmount !== undefined ? data.originalAmount : (data.amount || amount || 0);
            const currentPaidAmount = data.paidAmount || 0;
            const currentRemainingAmount = data.remainingAmount !== undefined ? data.remainingAmount : originalAmount;

            const actualAmountPaid = req.body.amountPaid !== undefined ? Number(req.body.amountPaid) : currentRemainingAmount;

            const newPayment = {
                amountPaid: actualAmountPaid,
                paidDate: new Date(),
                paidBy: financeApprovedBy || null,
                givenBy: givenBy || "",
                reason: reason || ""
            };

            const updatedPayments = [...(data.payments || []), newPayment];
            const newPaidAmount = currentPaidAmount + actualAmountPaid;
            const newRemainingAmount = Math.max(0, originalAmount - newPaidAmount);

            const finalStatus = newRemainingAmount <= 0 ? 'Approved' : 'Pending';

            updateData = {
                ...updateData,
                originalAmount,
                paidAmount: newPaidAmount,
                remainingAmount: newRemainingAmount,
                payments: updatedPayments,
                financeStatus: finalStatus,
                financeApprovedBy: finalStatus === 'Approved' ? (financeApprovedBy || data.financeApprovedBy) : null,
                financeApprovedDate: finalStatus === 'Approved' ? (financeApprovedDate || new Date()) : null
            };
        }

        const updateExpensedata = await Expense.findByIdAndUpdate(
            id,
            updateData,
            {
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
        console.error("Update expense error:", error);
        res.status(500).json({
            success:false,
            message:"Internal server error",
        });
    }
}

const bulkImportExpenses = async (req, res) => {
    try {
        const rows = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ success: false, message: "No data provided" });
        }

        // Fetch all categories and users for mapping
        const categoriesList = await Category.find();
        const usersList = await User.find();

        const createdBy = req.user?._id || req.user?.id || req.body.createdBy;

        const expensesToCreate = [];
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const name = row["Expense Name"]?.toString().trim();
            const categoryName = row["Category"]?.toString().trim();
            const months = row["Month"]?.toString().trim();
            const week = row["Week"]?.toString().trim();
            const expenseDateVal = row["Expense Date"];
            const approvedByName = row["Approved By"]?.toString().trim();
            const approvedDateVal = row["Approved Date"];
            const amountVal = row["Amount"];
            const accountNumber = row["Bank Account No."] || row["Bank Account Number"] || row["Account Number"];
            const ifscCode = row["IFSC Code"] || row["IFSC"];

            // Validations
            if (!name) {
                errors.push(`Row ${i + 2}: Expense Name is required.`);
                continue;
            }
            if (!categoryName) {
                errors.push(`Row ${i + 2}: Category is required.`);
                continue;
            }
            if (!months) {
                errors.push(`Row ${i + 2}: Month is required.`);
                continue;
            }
            if (!week) {
                errors.push(`Row ${i + 2}: Week is required.`);
                continue;
            }

            if (amountVal === undefined || amountVal === null || amountVal === "") {
                errors.push(`Row ${i + 2}: Amount is required.`);
                continue;
            }
            const amount = parseFloat(amountVal);
            if (isNaN(amount) || amount <= 0) {
                errors.push(`Row ${i + 2}: Amount must be a positive number.`);
                continue;
            }

            if (!accountNumber || !accountNumber.toString().trim()) {
                errors.push(`Row ${i + 2}: Bank Account No. is required.`);
                continue;
            }
            if (!ifscCode || !ifscCode.toString().trim()) {
                errors.push(`Row ${i + 2}: IFSC Code is required.`);
                continue;
            }

            // Month enum validation
            const validMonths = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            const matchedMonth = validMonths.find(m => m.toLowerCase() === months.toLowerCase());
            if (!matchedMonth) {
                errors.push(`Row ${i + 2}: Invalid Month "${months}".`);
                continue;
            }

            // Week enum validation
            const validWeeks = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
            const matchedWeek = validWeeks.find(w => w.toLowerCase() === week.toLowerCase());
            if (!matchedWeek) {
                errors.push(`Row ${i + 2}: Invalid Week "${week}".`);
                continue;
            }

            // Resolve Category
            let cat = categoriesList.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
            if (!cat) {
                errors.push(`Row ${i + 2}: Category "${categoryName}" does not match any existing expense category.`);
                continue;
            }

            // Resolve Approved By (Optional)
            let approvedBy = undefined;
            if (approvedByName) {
                const approver = usersList.find(u => 
                    u.name?.toLowerCase() === approvedByName.toLowerCase() || 
                    u.email?.toLowerCase() === approvedByName.toLowerCase()
                );
                if (approver) {
                    approvedBy = approver._id;
                }
            }

            // Parse Date utility
            const parseExcelDate = (val) => {
                if (!val) return undefined;
                // If it's a number (Excel serial date)
                if (typeof val === 'number') {
                    return new Date((val - 25569) * 86400 * 1000);
                }
                const parsed = Date.parse(val);
                if (!isNaN(parsed)) return new Date(parsed);
                return undefined;
            };

            const expenseDate = parseExcelDate(expenseDateVal) || new Date();
            const approvedDate = parseExcelDate(approvedDateVal);

            expensesToCreate.push({
                expenseType: 'General',
                name,
                category: cat._id,
                months: matchedMonth,
                week: matchedWeek,
                expenseDate,
                approvedBy,
                approvedDate,
                amount,
                accountNumber: accountNumber.toString().trim(),
                ifscCode: ifscCode.toString().trim(),
                createdBy
            });
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Validation failed for some rows",
                errors
            });
        }

        const results = await Expense.insertMany(expensesToCreate);

        return res.status(200).json({
            success: true,
            message: `Successfully imported ${results.length} expense records`,
            count: results.length
        });

    } catch (error) {
        console.error("Bulk import expenses error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export { createExpense, getAllExpence ,getSingleExpence,updateExpence, bulkImportExpenses};