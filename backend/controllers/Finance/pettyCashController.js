import PettyCashCentre from "../../models/Finance/PettyCashCentre.js";
import PettyCashExpenditure from "../../models/Finance/PettyCashExpenditure.js";
import PettyCashRequest from "../../models/Finance/PettyCashRequest.js";
import Centre from "../../models/Master_data/Centre.js";
import Employee from "../../models/HR/Employee.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../../config/r2Config.js";
import multer from "multer";
import User from "../../models/User.js";

const storage = multer.memoryStorage();
export const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadToR2 = async (file, folder = "petty_cash") => {
    if (!file) return null;
    let publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") || "https://pub-3c9d12dd00618b00795184bc5ff0c333.r2.dev";
    const fileName = `${folder}/${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`;
    const uploadParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    };
    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        return `${publicUrl}/${fileName}`;
    } catch (error) {
        throw new Error("File upload failed: " + error.message);
    }
};

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

        let billImageUrl = null;
        if (req.file) {
            billImageUrl = await uploadToR2(req.file);
        }

        const userId = req.user.id || req.user._id;
        const employee = await Employee.findOne({ user: userId });
        if (!employee) return res.status(404).json({ message: "Employee profile not found" });

        const expenditure = new PettyCashExpenditure({
            centre,
            date,
            category,
            subCategory,
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
        res.status(201).json({ message: "Expenditure request submitted", data: expenditure });
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
                    return res.status(200).json({ expenditures: [], totalPages: 0, currentPage: page, totalItems: 0 }); // Better than 403 usually for list filters
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

        if (categoryId) query.category = categoryId;
        if (subCategoryId) query.subCategory = subCategoryId;
        if (expenditureTypeId) query.expenditureType = expenditureTypeId;

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
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            expenditures,
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

        res.status(200).json({ message: "Expenditure approved", data: expenditure });
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

        res.status(200).json({ message: "Expenditure rejected", data: expenditure });
    } catch (err) {
        console.error("Reject Expenditure Error:", err);
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
        const { status, centreId } = req.query;
        let query = {};
        if (status) query.status = status;

        if (req.user.role !== 'superAdmin' && req.user.role !== 'Super Admin') {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            if (centreId) {
                if (!userCentres.includes(centreId)) {
                    return res.status(403).json({ message: "Access denied to this centre's requests" });
                }
                query.centre = centreId;
            } else {
                query.centre = { $in: userCentres };
            }
        } else if (centreId) {
            query.centre = centreId;
        }

        const requests = await PettyCashRequest.find(query)
            .populate("centre", "centreName")
            .populate("requestedBy", "name")
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 });

        res.status(200).json(requests);
    } catch (err) {
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

