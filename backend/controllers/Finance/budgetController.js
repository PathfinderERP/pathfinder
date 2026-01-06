// @desc    Get all centres with their budget info summary
// @route   GET /api/finance/budget/centres
// @access  Private
export const getBudgetCentres = async (req, res) => {
    try {
        const centres = await CentreSchema.find().sort({ centreName: 1 });
        const budgets = await Budget.find();

        const result = centres.map(centre => {
            const centreBudgets = budgets.filter(b => b.centre.toString() === centre._id.toString());
            const totalBudget = centreBudgets.reduce((sum, b) => sum + (b.budgetAmount || 0), 0);
            return {
                _id: centre._id,
                centreName: centre.centreName,
                enterCode: centre.enterCode,
                email: centre.email,
                phoneNumber: centre.phoneNumber,
                budgetAmount: totalBudget
            };
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Error fetching centres for budget", error: error.message });
    }
};

// @desc    Get detailed budgets for a specific centre
// @route   GET /api/finance/budget/detail/:centreId
// @access  Private
export const getBudgetsByCentre = async (req, res) => {
    try {
        const budgets = await Budget.find({ centre: req.params.centreId }).sort({ year: -1, month: -1 });
        res.status(200).json(budgets);
    } catch (error) {
        res.status(500).json({ message: "Error fetching budget details", error: error.message });
    }
};

// @desc    Update or create centre budget for a specific period
// @route   POST /api/finance/budget
// @access  Private
export const updateCentreBudget = async (req, res) => {
    try {
        const { centreId, budgetAmount, financialYear, year, month } = req.body;

        if (!centreId || !year || !month || !financialYear) {
            return res.status(400).json({ message: "Centre, Year, Month, and Financial Year are required" });
        }

        let budget = await Budget.findOne({ centre: centreId, year, month });

        if (budget) {
            budget.budgetAmount = budgetAmount;
            budget.financialYear = financialYear;
            budget.lastUpdatedBy = req.user._id;
            await budget.save();
        } else {
            budget = new Budget({
                centre: centreId,
                year,
                month,
                financialYear,
                budgetAmount,
                lastUpdatedBy: req.user._id
            });
            await budget.save();
        }

        res.status(200).json({ message: "Budget saved successfully", budget });
    } catch (error) {
        res.status(500).json({ message: "Error saving budget", error: error.message });
    }
};
