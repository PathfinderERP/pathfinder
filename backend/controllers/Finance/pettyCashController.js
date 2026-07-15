import PettyCashCentre from "../../models/Finance/PettyCashCentre.js";
import PettyCashExpenditure from "../../models/Finance/PettyCashExpenditure.js";
import PettyCashRequest from "../../models/Finance/PettyCashRequest.js";
import Centre from "../../models/Master_data/Centre.js";
import Employee from "../../models/HR/Employee.js";
import multer from "multer";
import User from "../../models/User.js";
import { getSignedFileUrl, uploadToR2 } from "../../utils/r2Upload.js";

const storage = multer.memoryStorage();
export const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Get all centres with petty cash details
export const getPettyCashCentres = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = currentUser ? currentUser.centres.map(c => c._id || c) : [];
            query.centre = { $in: userCentres };
        }

        const centres = await PettyCashCentre.find(query)
            .populate("centre", "centreName enterCode email phoneNumber")
            .sort({ "centre.centreName": 1 });
        res.status(200).json(centres);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Sync centres - ensure every centre has a PettyCashCentre record
export const syncPettyCashCentres = async (req, res) => {
    try {
        const allCentres = await Centre.find();
        let syncedCount = 0;

        for (const centre of allCentres) {
            const exists = await PettyCashCentre.findOne({ centre: centre._id });
            if (!exists) {
                await PettyCashCentre.create({ centre: centre._id });
                syncedCount++;
            }
        }

        res.status(200).json({ message: "Centres synced successfully", syncedCount });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Add new expenditure
export const addExpenditure = async (req, res) => {
    try {
        const {
            centre, date, category, subCategory, expenditureType,
            amount, description, approvedBy, vendorName,
            paymentMode, taxApplicable
        } = req.body;

        // Center Visibility Restriction
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(centre)) {
                return res.status(403).json({ message: "Access denied: You cannot add expenditure for this centre" });
            }
        }

        if (!description || description.trim() === "") {
            return res.status(400).json({ message: "Description is a required field." });
        }

        let billImageUrl = null;
        if (req.files && req.files.length > 0) {
            billImageUrl = await Promise.all(req.files.map(file => uploadToR2(file, "petty_cash")));
        } else if (req.file) {
            billImageUrl = await uploadToR2(req.file, "petty_cash");
        }

        const userId = req.user.id || req.user._id;
        const employee = await Employee.findOne({ user: userId });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        const expenditure = new PettyCashExpenditure({
            centre,
            date,
            category: (category && category !== "" && category !== "null") ? category : undefined,
            subCategory: (subCategory && subCategory !== "" && subCategory !== "null") ? subCategory : undefined,
            expenditureType,
            amount: Number(amount),
            description,
            approvedBy,
            vendorName,
            paymentMode,
            taxApplicable: taxApplicable === 'true' || taxApplicable === true,
            billImage: billImageUrl,
            requestedBy: employee._id
        });

        await expenditure.save();
        const expObj = expenditure.toObject();
        if (expObj.billImage) {
            expObj.billImage = await getSignedFileUrl(expObj.billImage);
        }
        res.status(201).json({ message: "Expenditure request submitted", data: expObj });
    } catch (err) {
        console.error("Add Expenditure Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Get expenditures
export const getExpenditures = async (req, res) => {
    try {
        const { status, centreId, startDate, endDate, categoryId, subCategoryId, expenditureTypeId, search } = req.query;
        let query = {};

        // Handle Status (Support comma-separated or single)
        if (status) {
            if (status.includes(',')) {
                query.status = { $in: status.split(',') };
            } else {
                query.status = status;
            }
        }

        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (centreId) {
                const requestedCentres = centreId.split(',').filter(id => id.trim() !== "");
                const filteredCentres = requestedCentres.filter(id => userCentres.includes(id));
                if (filteredCentres.length === 0) {
                    const pageVal = parseInt(req.query.page) || 1;
                    return res.status(200).json({ expenditures: [], totalPages: 0, currentPage: pageVal, totalItems: 0 }); // Better than 403 usually for list filters
                }
                query.centre = { $in: filteredCentres };
            } else {
                query.centre = { $in: userCentres };
            }
        } else if (centreId) {
            if (centreId.includes(',')) {
                query.centre = { $in: centreId.split(',').filter(id => id.trim() !== "") };
            } else {
                query.centre = centreId;
            }
        }

        if (categoryId) {
            const catIds = categoryId.split(',').filter(id => id.trim() !== '');
            query.category = catIds.length === 1 ? catIds[0] : { $in: catIds };
        }
        if (subCategoryId) {
            const subIds = subCategoryId.split(',').filter(id => id.trim() !== '');
            query.subCategory = subIds.length === 1 ? subIds[0] : { $in: subIds };
        }
        if (expenditureTypeId) {
            const typeIds = expenditureTypeId.split(',').filter(id => id.trim() !== '');
            query.expenditureType = typeIds.length === 1 ? typeIds[0] : { $in: typeIds };
        }

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        if (search) {
            query.$or = [
                { description: { $regex: search, $options: "i" } },
                { vendorName: { $regex: search, $options: "i" } },
                { paymentMode: { $regex: search, $options: "i" } }
            ];
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalExpenditures = await PettyCashExpenditure.countDocuments(query);
        const expenditures = await PettyCashExpenditure.find(query)
            .populate("centre", "centreName")
            .populate("category", "name")
            .populate("subCategory", "name")
            .populate("expenditureType", "name")
            .populate("requestedBy", "name employeeId")
            .populate("actionTakenBy", "name employeeId")
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const signedExpenditures = await Promise.all(
            expenditures.map(async (exp) => {
                const expObj = exp.toObject();
                if (expObj.billImage) {
                    if (Array.isArray(expObj.billImage)) {
                        expObj.billImages = await Promise.all(expObj.billImage.map(img => getSignedFileUrl(img)));
                        expObj.billImage = expObj.billImages[0] || null;
                    } else if (typeof expObj.billImage === 'string') {
                        try {
                            const parsed = JSON.parse(expObj.billImage);
                            if (Array.isArray(parsed)) {
                                expObj.billImages = await Promise.all(parsed.map(img => getSignedFileUrl(img)));
                                expObj.billImage = expObj.billImages[0] || null;
                            } else {
                                expObj.billImage = await getSignedFileUrl(expObj.billImage);
                                expObj.billImages = [expObj.billImage];
                            }
                        } catch (e) {
                            expObj.billImage = await getSignedFileUrl(expObj.billImage);
                            expObj.billImages = [expObj.billImage];
                        }
                    }
                } else {
                    expObj.billImages = [];
                    expObj.billImage = null;
                }
                return expObj;
            })
        );

        res.status(200).json({
            expenditures: signedExpenditures,
            totalPages: Math.ceil(totalExpenditures / limit),
            currentPage: page,
            totalItems: totalExpenditures
        });
    } catch (err) {
        console.error("Get Expenditures Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Approve expenditure
export const approveExpenditure = async (req, res) => {
    try {
        const { id } = req.params;
        const expenditure = await PettyCashExpenditure.findById(id);

        if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });

        // Center Visibility Restriction
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(expenditure.centre?.toString())) {
                return res.status(403).json({ message: "Access denied: You cannot approve expenditure for this centre" });
            }
        }

        if (expenditure.status !== "pending") return res.status(400).json({ message: "Expenditure already processed" });

        // Update Centre balance
        const pCentre = await PettyCashCentre.findOne({ centre: expenditure.centre });
        if (!pCentre) return res.status(404).json({ message: "Petty cash record for centre not found" });

        pCentre.totalExpenditure += expenditure.amount;
        pCentre.remainingBalance = pCentre.totalDeposit - pCentre.totalExpenditure;
        await pCentre.save();

        const employee = await Employee.findOne({ user: req.user.id || req.user._id });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        expenditure.status = "approved";
        expenditure.actionTakenBy = employee._id;
        expenditure.actionDate = new Date();
        await expenditure.save();

        const expObj = expenditure.toObject();
        if (expObj.billImage) {
            expObj.billImage = await getSignedFileUrl(expObj.billImage);
        }

        res.status(200).json({ message: "Expenditure approved", data: expObj });
    } catch (err) {
        console.error("Approve Expenditure Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Reject expenditure
export const rejectExpenditure = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const employee = await Employee.findOne({ user: req.user.id || req.user._id });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        const expenditure = await PettyCashExpenditure.findById(id);

        if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });

        // Center Visibility Restriction
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(expenditure.centre?.toString())) {
                return res.status(403).json({ message: "Access denied: You cannot reject expenditure for this centre" });
            }
        }

        if (expenditure.status !== "pending") return res.status(400).json({ message: "Expenditure already processed" });

        expenditure.status = "rejected";
        expenditure.actionTakenBy = employee._id;
        expenditure.actionDate = new Date();
        expenditure.rejectionReason = reason;
        await expenditure.save();

        const expObj = expenditure.toObject();
        if (expObj.billImage) {
            expObj.billImage = await getSignedFileUrl(expObj.billImage);
        }

        res.status(200).json({ message: "Expenditure rejected", data: expObj });
    } catch (err) {
        console.error("Reject Expenditure Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Bulk Approve Expenditures
export const bulkApproveExpenditure = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Invalid or empty IDs list" });
        }

        const employee = await Employee.findOne({ user: req.user.id || req.user._id });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        let userCentres = [];
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
        }

        const expenditures = await PettyCashExpenditure.find({ _id: { $in: ids } });
        let approvedCount = 0;
        let errors = [];

        for (const exp of expenditures) {
            try {
                if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
                    if (!userCentres.includes(exp.centre?.toString())) {
                        errors.push(`Access denied for expenditure ${exp._id}`);
                        continue;
                    }
                }
                if (exp.status !== "pending") {
                    errors.push(`Expenditure ${exp._id} is already processed`);
                    continue;
                }
                const pCentre = await PettyCashCentre.findOne({ centre: exp.centre });
                if (!pCentre) {
                    errors.push(`Petty cash record not found for centre of expenditure ${exp._id}`);
                    continue;
                }

                pCentre.totalExpenditure += exp.amount;
                pCentre.remainingBalance = pCentre.totalDeposit - pCentre.totalExpenditure;
                await pCentre.save();

                exp.status = "approved";
                exp.actionTakenBy = employee._id;
                exp.actionDate = new Date();
                await exp.save();
                approvedCount++;
            } catch (e) {
                errors.push(`Error processing ${exp._id}: ${e.message}`);
            }
        }

        res.status(200).json({
            message: `Bulk approval complete. Approved: ${approvedCount}, Failed: ${errors.length}`,
            approvedCount,
            errors
        });
    } catch (err) {
        console.error("Bulk Approve Expenditure Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Bulk Reject Expenditures
export const bulkRejectExpenditure = async (req, res) => {
    try {
        const { ids, reason } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "Invalid or empty IDs list" });
        }

        const employee = await Employee.findOne({ user: req.user.id || req.user._id });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        let userCentres = [];
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
        }

        const expenditures = await PettyCashExpenditure.find({ _id: { $in: ids } });
        let rejectedCount = 0;
        let errors = [];

        for (const exp of expenditures) {
            try {
                if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
                    if (!userCentres.includes(exp.centre?.toString())) {
                        errors.push(`Access denied for expenditure ${exp._id}`);
                        continue;
                    }
                }
                if (exp.status !== "pending") {
                    errors.push(`Expenditure ${exp._id} is already processed`);
                    continue;
                }

                exp.status = "rejected";
                exp.actionTakenBy = employee._id;
                exp.actionDate = new Date();
                exp.rejectionReason = reason || "Bulk rejected";
                await exp.save();
                rejectedCount++;
            } catch (e) {
                errors.push(`Error processing ${exp._id}: ${e.message}`);
            }
        }

        res.status(200).json({
            message: `Bulk rejection complete. Rejected: ${rejectedCount}, Failed: ${errors.length}`,
            rejectedCount,
            errors
        });
    } catch (err) {
        console.error("Bulk Reject Expenditure Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Update Deposit (Add funds to centre)
export const addPettyCashDeposit = async (req, res) => {
    try {
        const { centreId, amount } = req.body;

        // Center Visibility Restriction
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(centreId)) {
                return res.status(403).json({ message: "Access denied: You cannot add deposit to this centre" });
            }
        }

        const pCentre = await PettyCashCentre.findOne({ centre: centreId });

        if (!pCentre) {
            await PettyCashCentre.create({
                centre: centreId,
                totalDeposit: amount,
                remainingBalance: amount
            });
        } else {
            pCentre.totalDeposit += Number(amount);
            pCentre.remainingBalance = pCentre.totalDeposit - pCentre.totalExpenditure;
            await pCentre.save();
        }

        res.status(200).json({ message: "Deposit added successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Petty Cash Requests (Add Petty Cash)
export const requestPettyCash = async (req, res) => {
    try {
        const { centre, amount, remarks } = req.body;

        // Center Visibility Restriction
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(centre)) {
                return res.status(403).json({ message: "Access denied: You cannot request petty cash for this centre" });
            }
        }

        // Resolve Employee ID from User ID
        const employee = await Employee.findOne({ user: req.user.id || req.user._id });
        if (!employee) return res.status(404).json({ message: "Employee profile not found for this user" });

        const request = new PettyCashRequest({
            centre,
            requestedAmount: Number(amount),
            remarks,
            requestedBy: employee._id
        });
        await request.save();
        res.status(201).json({ message: "Petty cash request submitted", data: request });
    } catch (err) {
        console.error("Petty Cash Request Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const getPettyCashRequests = async (req, res) => {
    try {
        const { status, centreId, startDate, endDate, page = 1, limit = 10, isExport, search } = req.query;
        let query = {};
        
        if (status) query.status = status;

        // Centre name search
        if (search && search.trim()) {
            const matchingCentres = await Centre.find(
                { centreName: { $regex: search.trim(), $options: "i" } },
                "_id"
            );
            const matchingIds = matchingCentres.map(c => c._id);
            query.centre = { $in: matchingIds };
        }

        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (centreId) {
                const requestedCentres = centreId.split(',').filter(id => id.trim() !== "");
                const filteredCentres = requestedCentres.filter(id => userCentres.includes(id));
                if (filteredCentres.length === 0) {
                    return res.status(200).json(isExport === 'true' ? [] : { requests: [], totalPages: 0, currentPage: Number(page), totalItems: 0 });
                }
                query.centre = { $in: filteredCentres };
            } else {
                query.centre = { $in: userCentres };
            }
        } else if (centreId) {
            if (centreId.includes(',')) {
                query.centre = { $in: centreId.split(',').filter(id => id.trim() !== "") };
            } else {
                query.centre = centreId;
            }
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        if (isExport === 'true') {
            const requests = await PettyCashRequest.find(query)
                .populate("centre", "centreName")
                .populate("requestedBy", "name")
                .populate("approvedBy", "name")
                .populate("updatedBy", "name")
                .sort({ createdAt: -1 });
            return res.status(200).json(requests);
        }

        const skip = (Number(page) - 1) * Number(limit);
        const totalRequests = await PettyCashRequest.countDocuments(query);
        
        const requests = await PettyCashRequest.find(query)
            .populate("centre", "centreName")
            .populate("requestedBy", "name")
            .populate("approvedBy", "name")
            .populate("updatedBy", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.status(200).json({
            requests,
            totalPages: Math.ceil(totalRequests / Number(limit)),
            currentPage: Number(page),
            totalItems: totalRequests
        });
    } catch (err) {
        console.error("Get Petty Cash Requests Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const approvePettyCashRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedAmount, remarks } = req.body;
        const request = await PettyCashRequest.findById(id);

        if (!request) return res.status(404).json({ message: "Request not found" });

        // Center Visibility Restriction
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(request.centre.toString())) {
                return res.status(403).json({ message: "Access denied: You cannot approve request for this centre" });
            }
        }

        if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

        // Update Centre balance
        const pCentre = await PettyCashCentre.findOne({ centre: request.centre });
        if (!pCentre) {
            await PettyCashCentre.create({
                centre: request.centre,
                totalDeposit: Number(approvedAmount),
                remainingBalance: Number(approvedAmount)
            });
        } else {
            pCentre.totalDeposit += Number(approvedAmount);
            pCentre.remainingBalance = pCentre.totalDeposit - pCentre.totalExpenditure;
            await pCentre.save();
        }

        const employee = await Employee.findOne({ user: req.user.id || req.user._id });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        request.status = "approved";
        request.approvedAmount = Number(approvedAmount);
        request.approvedBy = employee._id;
        request.approvalDate = new Date();
        if (remarks) request.remarks = remarks;
        await request.save();

        res.status(200).json({ message: "Petty cash request approved", data: request });
    } catch (err) {
        console.error("Approve Petty Cash Request Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const rejectPettyCashRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        const request = await PettyCashRequest.findById(id);

        if (!request) return res.status(404).json({ message: "Request not found" });

        // Center Visibility Restriction
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(request.centre.toString())) {
                return res.status(403).json({ message: "Access denied: You cannot reject request for this centre" });
            }
        }

        if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

        const employee = await Employee.findOne({ user: req.user.id || req.user._id });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        request.status = "rejected";
        request.approvedBy = employee._id;
        request.approvalDate = new Date();
        if (remarks) request.remarks = remarks;
        await request.save();

        res.status(200).json({ message: "Petty cash request rejected", data: request });
    } catch (err) {
        console.error("Reject Petty Cash Request Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// Update petty cash request (SuperAdmin/Admin edit everything)
export const updatePettyCashRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        const request = await PettyCashRequest.findById(id);
        if (!request) return res.status(404).json({ message: "Request not found" });

        // Center Visibility Restriction for non-superAdmins
        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (!userCentres.includes(request.centre.toString())) {
                return res.status(403).json({ message: "Access denied: You cannot edit request for this centre" });
            }
            if (updates.centre && !userCentres.includes(updates.centre.toString())) {
                return res.status(403).json({ message: "Access denied: You cannot move request to this centre" });
            }
        }

        const oldStatus = request.status;
        const oldApprovedAmount = request.approvedAmount || 0;
        const oldCentre = request.centre;

        // Apply updates to request document
        if (updates.centre) request.centre = updates.centre;
        if (updates.requestedAmount !== undefined) request.requestedAmount = Number(updates.requestedAmount);
        if (updates.approvedAmount !== undefined) request.approvedAmount = Number(updates.approvedAmount);
        if (updates.status) request.status = updates.status;
        if (updates.remarks !== undefined) request.remarks = updates.remarks;
        if (updates.createdAt) request.createdAt = new Date(updates.createdAt);
        if (updates.requestedBy) request.requestedBy = updates.requestedBy;
        if (updates.approvedBy) request.approvedBy = updates.approvedBy || null;
        if (updates.approvalDate) {
            request.approvalDate = new Date(updates.approvalDate);
        } else if (updates.approvalDate === null) {
            request.approvalDate = undefined;
        }
        const updaterEmployee = await Employee.findOne({ user: req.user.id || req.user._id });
        if (updaterEmployee) {
            request.updatedBy = updaterEmployee._id;
        }

        await request.save();

        // Adjust PettyCashCentre balance
        const newStatus = request.status;
        const newApprovedAmount = request.approvedAmount || 0;
        const newCentre = request.centre;

        // First, reverse the old approval from the old centre (if it was approved)
        if (oldStatus === 'approved') {
            const pCentreOld = await PettyCashCentre.findOne({ centre: oldCentre });
            if (pCentreOld) {
                pCentreOld.totalDeposit -= oldApprovedAmount;
                pCentreOld.remainingBalance = pCentreOld.totalDeposit - pCentreOld.totalExpenditure;
                await pCentreOld.save();
            }
        }

        // Second, apply the new approval to the new centre (if it is now approved)
        if (newStatus === 'approved') {
            let pCentreNew = await PettyCashCentre.findOne({ centre: newCentre });
            if (!pCentreNew) {
                await PettyCashCentre.create({
                    centre: newCentre,
                    totalDeposit: newApprovedAmount,
                    remainingBalance: newApprovedAmount
                });
            } else {
                pCentreNew.totalDeposit += newApprovedAmount;
                pCentreNew.remainingBalance = pCentreNew.totalDeposit - pCentreNew.totalExpenditure;
                await pCentreNew.save();
            }
        }

        res.status(200).json({ message: "Petty cash request updated successfully", data: request });
    } catch (err) {
        console.error("Update Petty Cash Request Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


