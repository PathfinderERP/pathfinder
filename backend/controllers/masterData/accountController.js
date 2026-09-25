import Account from "../../models/Master_data/Account.js";

export const createAccount = async (req, res) => {
    try {
        const { accno, accname, status } = req.body;
        const normalizedStatus = status === "Deactive" || status === "Inactive" ? "Deactive" : "Active";
        const isActive = normalizedStatus === "Active";

        const account = new Account({ 
            accno, 
            accname,
            status: normalizedStatus,
            isActive
        });
        await account.save();
        res.status(201).json({ message: "Account created", data: account });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getAccounts = async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {};

        // If status is 'All', do not filter by status
        // If status is 'Deactive' or 'Inactive', return only deactivated accounts
        // Otherwise (default or 'Active'), return ONLY active accounts so all dropdowns/other modules only see active accounts
        if (status === "All") {
            // No status constraint
        } else if (status === "Deactive" || status === "Inactive") {
            query.$or = [
                { status: { $in: ["Deactive", "Inactive"] } },
                { isActive: false }
            ];
        } else {
            // Default: Active accounts only
            query.$and = [
                {
                    $or: [
                        { status: "Active" },
                        { status: { $exists: false } },
                        { status: null },
                        { status: "" }
                    ]
                },
                { isActive: { $ne: false } }
            ];
        }

        if (search && search.trim()) {
            const searchCondition = [
                { accno: { $regex: search.trim(), $options: "i" } },
                { accname: { $regex: search.trim(), $options: "i" } }
            ];
            if (query.$and) {
                query.$and.push({ $or: searchCondition });
            } else if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchCondition }
                ];
                delete query.$or;
            } else {
                query.$or = searchCondition;
            }
        }

        const accounts = await Account.find(query).sort({ accname: 1 });
        res.status(200).json(accounts || []);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { accno, accname, status, isActive } = req.body;

        const updateData = {};
        if (accno !== undefined) updateData.accno = accno;
        if (accname !== undefined) updateData.accname = accname;

        if (status !== undefined) {
            const normalizedStatus = status === "Deactive" || status === "Inactive" ? "Deactive" : "Active";
            updateData.status = normalizedStatus;
            updateData.isActive = normalizedStatus === "Active";
        } else if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
            updateData.status = isActive ? "Active" : "Deactive";
        }

        const account = await Account.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        res.status(200).json({ message: "Account updated", data: account });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const toggleAccountStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const account = await Account.findById(id);
        if (!account) {
            return res.status(404).json({ message: "Account not found" });
        }

        const isCurrentlyActive = account.isActive !== false && account.status !== "Deactive" && account.status !== "Inactive";
        const newStatus = isCurrentlyActive ? "Deactive" : "Active";
        const newIsActive = !isCurrentlyActive;

        account.status = newStatus;
        account.isActive = newIsActive;
        await account.save();

        res.status(200).json({
            message: `Account status updated to ${newStatus}`,
            data: account
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const bulkUpdateAccountStatus = async (req, res) => {
    try {
        const { ids, status } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Please provide account IDs to update" });
        }
        if (!['Active', 'Deactive', 'Inactive'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const normalizedStatus = status === 'Inactive' ? 'Deactive' : status;
        const isActive = normalizedStatus === 'Active';

        const result = await Account.updateMany(
            { _id: { $in: ids } },
            { $set: { status: normalizedStatus, isActive } }
        );

        res.status(200).json({
            message: `${result.modifiedCount} accounts updated to ${normalizedStatus}`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        await Account.findByIdAndDelete(id);
        res.status(200).json({ message: "Account deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
