import Budget from "../../models/Finance/Budget.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Admission from "../../models/Admission/Admission.js";
import Payment from "../../models/Payment/Payment.js";
import PettyCashRequest from "../../models/Finance/PettyCashRequest.js";
import PettyCashExpenditure from "../../models/Finance/PettyCashExpenditure.js";
import User from "../../models/User.js";

// @desc    Get all centres with their budget info summary
// @route   GET /api/finance/budget/centres
// @access  Private
export const getBudgetCentres = async (req, res) => {
    try {
        let authorizedCentreIds = [];
        if (req.user.role !== "superAdmin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            authorizedCentreIds = currentUser ? currentUser.centres.map(c => c._id || c) : [];
        }

        let centreQuery = {};
        if (req.user.role !== "superAdmin") {
            centreQuery._id = { $in: authorizedCentreIds };
        }
        const centres = await CentreSchema.find(centreQuery).sort({ centreName: 1 });
        const budgets = await Budget.find(req.user.role !== "superAdmin" ? { centre: { $in: authorizedCentreIds } } : {});

        const now = new Date();
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const currentMonthName = monthNames[now.getMonth()];
        const currentYear = now.getFullYear();

        // 1. Fetch ALL admissions to map them to centres
        const allAdmissions = await Admission.find().select('centre _id');

        // 2. Fetch ALL relevant payments for the current month
        const startDate = new Date(currentYear, now.getMonth(), 1, 0, 0, 0, 0);
        const endDate = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999);

        const allMonthPayments = await Payment.find({
            status: { $in: ["PAID", "paid", "PARTIAL", "partial", "COMPLETED", "completed", "PENDING_CLEARANCE", "pending_clearance"] },
            $or: [
                { receivedDate: { $gte: startDate, $lte: endDate } },
                { paidDate: { $gte: startDate, $lte: endDate } },
                { createdAt: { $gte: startDate, $lte: endDate } } // Last resort fallback
            ]
        });

        // 3. Fetch ALL approved Petty Cash Requests (Funds Allocations) for the current month
        // User Logic: "Expense" = Money approved by admin for the center (Petty Cash Request)
        const allMonthFundAllocations = await PettyCashRequest.find({
            status: "approved",
            approvalDate: { $gte: startDate, $lte: endDate }
        });

        const result = centres.map(centre => {
            const centreIdStr = centre._id.toString();
            const centreNameTrimmed = centre.centreName.trim().toLowerCase();

            // Find budgets for this centre
            const centreBudgets = budgets.filter(b => b.centre.toString() === centreIdStr);
            const currentMonthBudget = centreBudgets.find(b => b.month === currentMonthName && b.year === currentYear);

            // Find admissions belonging to this centre
            const centreAdmissionIds = allAdmissions
                .filter(a => a.centre && a.centre.toString().trim().toLowerCase() === centreNameTrimmed)
                .map(a => a._id.toString());

            // Calculate Income
            const centreIncome = allMonthPayments
                .filter(p => p.admission && centreAdmissionIds.includes(p.admission.toString()))
                .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

            // Calculate Expense (Approved Petty Cash Requests)
            const centreExpense = allMonthFundAllocations
                .filter(r => r.centre && r.centre.toString() === centreIdStr)
                .reduce((sum, r) => sum + (r.approvedAmount || 0), 0);

            return {
                _id: centre._id,
                centreName: centre.centreName,
                enterCode: centre.enterCode,
                email: centre.email,
                phoneNumber: centre.phoneNumber,
                budgetAmount: currentMonthBudget ? currentMonthBudget.budgetAmount : 0,
                actualIncome: centreIncome,
                actualExpense: centreExpense,
                currentMonth: currentMonthName
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error in getBudgetCentres:", error);
        res.status(500).json({ message: "Error fetching centres for budget", error: error.message });
    }
};

// @desc    Get detailed budgets for a specific centre with actuals
// @route   GET /api/finance/budget/detail/:centreId
// @access  Private
export const getBudgetsByCentre = async (req, res) => {
    try {
        const { centreId } = req.params;

        // Center Visibility Restriction
        if (req.user.role !== "superAdmin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentreIds = (currentUser ? currentUser.centres : []).map(c => (c._id || c).toString());
            if (!userCentreIds.includes(centreId)) {
                return res.status(403).json({ message: "Access denied to this centre's budget details" });
            }
        }

        const centre = await CentreSchema.findById(centreId);
        if (!centre) {
            return res.status(404).json({ message: "Centre not found" });
        }

        const budgets = await Budget.find({ centre: centreId }).sort({ year: -1, month: -1 });

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // 1. Fetch ALL admissions for this centre name once
        const centerAdmissions = await Admission.find({
            centre: { $regex: new RegExp(`^${centre.centreName.trim()}$`, 'i') }
        }).select('_id');
        const admissionIds = centerAdmissions.map(a => a._id.toString());

        // Enrich budgets with actual income and expenses
        const enrichedBudgets = await Promise.all(budgets.map(async (b) => {
            const monthIndex = monthNames.indexOf(b.month);
            if (monthIndex === -1) return b;

            const startDate = new Date(b.year, monthIndex, 1, 0, 0, 0, 0);
            const endDate = new Date(b.year, monthIndex + 1, 0, 23, 59, 59, 999);

            // Calculate Actual Income
            const payments = await Payment.find({
                admission: { $in: admissionIds },
                status: { $in: ["PAID", "paid", "PARTIAL", "partial", "COMPLETED", "completed", "PENDING_CLEARANCE", "pending_clearance"] },
                $or: [
                    { receivedDate: { $gte: startDate, $lte: endDate } },
                    { paidDate: { $gte: startDate, $lte: endDate } },
                    { createdAt: { $gte: startDate, $lte: endDate } }
                ]
            });
            const actualIncome = payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

            // Calculate Actual Expense (Funds Approved/Allocated)
            const fundAllocations = await PettyCashRequest.find({
                centre: centreId,
                status: "approved",
                approvalDate: { $gte: startDate, $lte: endDate }
            });
            const actualExpense = fundAllocations.reduce((sum, r) => sum + (r.approvedAmount || 0), 0);

            const bObj = b.toObject();
            bObj.income = actualIncome;
            bObj.expense = actualExpense;

            return bObj;
        }));

        res.status(200).json({
            centre,
            budgets: enrichedBudgets
        });
    } catch (error) {
        console.error("Error fetching budget detail:", error);
        res.status(500).json({ message: "Error fetching budget details", error: error.message });
    }
};

// @desc    Update or create centre budget for a specific period
// @route   POST /api/finance/budget
// @access  Private
export const updateCentreBudget = async (req, res) => {
    try {
        let { centreId, budgetAmount, financialYear, year, month } = req.body;

        if (!centreId || !year || !month || !financialYear) {
            return res.status(400).json({ message: "Centre, Year, Month, and Financial Year are required" });
        }

        // Center Visibility Restriction
        if (req.user.role !== "superAdmin") {
            const userCentres = (req.user.centres || []).map(c => c.toString());
            if (!userCentres.includes(centreId)) {
                return res.status(403).json({ message: "Access denied: You cannot manage budget for this centre" });
            }
        }

        budgetAmount = Number(budgetAmount) || 0;
        year = Number(year);

        let budget = await Budget.findOne({ centre: centreId, year, month });

        if (budget) {
            budget.budgetAmount = budgetAmount;
            budget.financialYear = financialYear;
            budget.lastUpdatedBy = req.user.id;
            await budget.save();
        } else {
            budget = new Budget({
                centre: centreId,
                year,
                month,
                financialYear,
                budgetAmount,
                lastUpdatedBy: req.user.id
            });
            await budget.save();
        }

        res.status(200).json({ message: "Budget saved successfully", budget });
    } catch (error) {
        console.error("Budget Save Error:", error);
        res.status(500).json({ message: "Error saving budget", error: error.message });
    }
};
