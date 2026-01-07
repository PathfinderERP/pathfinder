import Account from "../../models/Master_data/Account.js";

export const createAccount = async (req, res) => {
    try {
        const { accno, accname } = req.body;
        const account = new Account({ accno, accname });
        await account.save();
        res.status(201).json({ message: "Account created", data: account });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getAccounts = async (req, res) => {
    try {
        const accounts = await Account.find().sort({ accname: 1 });
        res.status(200).json(accounts);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { accno, accname } = req.body;
        const account = await Account.findByIdAndUpdate(
            id,
            { accno, accname },
            { new: true }
        );
        res.status(200).json({ message: "Account updated", data: account });
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
