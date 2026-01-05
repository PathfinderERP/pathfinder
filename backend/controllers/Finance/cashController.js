import CashTransfer from "../../models/Finance/CashTransfer.js";
import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import User from "../../models/User.js";
import mongoose from "mongoose";
import s3Client from "../../config/r2Config.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Helper to generate unique 6-digit password
const generatePassword = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to get bucket name with fallback
const getBucketName = () => process.env.R2_BUCKET_NAME || "erp-documents";

// Helper to get signed URL
const getSignedReceiptUrl = async (key) => {
    if (!key) return null;
    if (key.startsWith('http')) return key;
    try {
        const bucketName = getBucketName();
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key
        });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 });
    } catch (error) {
        console.error("Error generating signed URL:", error);
        return null;
    }
};

export const initiateCashTransfer = async (req, res) => {
    try {
        const { fromCentreId, toCentreId, amount, accountNumber, remarks, referenceNumber } = req.body;

        if (!fromCentreId || !toCentreId || !amount || !accountNumber) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let receiptFileKey = null;
        if (req.file) {
            const bucketName = getBucketName();
            const fileName = `cash_receipts/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

            console.log(`Cash Transfer: Uploading to bucket: ${bucketName}, key: ${fileName}`);

            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            }));
            receiptFileKey = fileName;
        }

        const uniquePassword = generatePassword();

        const transfer = new CashTransfer({
            fromCentre: fromCentreId,
            toCentre: toCentreId,
            amount: Number(amount),
            accountNumber,
            uniquePassword,
            referenceNumber,
            receiptFile: receiptFileKey,
            transferredBy: req.user._id,
            remarks
        });

        await transfer.save();
        await transfer.populate(["fromCentre", "toCentre"]);

        res.status(201).json({
            message: "Cash transfer initiated successfully",
            transfer: transfer,
            password: uniquePassword
        });
    } catch (error) {
        console.error("INITIATE_CASH_TRANSFER_ERROR:", error);
        res.status(500).json({ message: "Error initiating transfer", error: error.message });
    }
};

export const getCashReceiveRequests = async (req, res) => {
    try {
        const { centreId, serialNumber, referenceNumber, accountNumber, startDate, endDate, status } = req.query;
        let query = {};

        if (status) {
            query.status = status;
        } else {
            query.status = "PENDING";
        }

        if (centreId) {
            query.toCentre = centreId;
        }

        if (serialNumber) {
            query.serialNumber = parseInt(serialNumber);
        }

        if (referenceNumber) {
            query.referenceNumber = { $regex: referenceNumber, $options: "i" };
        }

        if (accountNumber) {
            query.accountNumber = { $regex: accountNumber, $options: "i" };
        }

        if (startDate || endDate) {
            query.transferDate = {};
            if (startDate) query.transferDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.transferDate.$lte = end;
            }
        }

        const requests = await CashTransfer.find(query)
            .populate("fromCentre", "centreName")
            .populate("toCentre", "centreName")
            .populate("transferredBy", "name")
            .sort({ createdAt: -1 });

        // Resolve signed URLs
        const requestsWithUrls = await Promise.all(requests.map(async (r) => {
            const doc = r.toObject();
            if (doc.receiptFile) {
                doc.receiptFile = await getSignedReceiptUrl(doc.receiptFile);
            }
            return doc;
        }));

        res.status(200).json(requestsWithUrls);
    } catch (error) {
        console.error("GET_CASH_RECEIVE_REQUESTS_ERROR:", error);
        res.status(500).json({ message: "Error fetching receive requests", error: error.message });
    }
};

export const confirmCashReceived = async (req, res) => {
    try {
        const { transferId, password } = req.body;

        const transfer = await CashTransfer.findById(transferId);
        if (!transfer) {
            return res.status(404).json({ message: "Transfer request not found" });
        }

        if (transfer.status !== "PENDING") {
            return res.status(400).json({ message: "This transfer is already processed" });
        }

        if (String(transfer.uniquePassword).trim() !== String(password).trim()) {
            return res.status(401).json({ message: "Invalid password" });
        }

        transfer.status = "RECEIVED";
        transfer.receivedDate = new Date();
        transfer.receivedBy = req.user._id;

        await transfer.save();

        res.status(200).json({ message: "Cash received successfully", transfer });
    } catch (error) {
        console.error("CONFIRM_CASH_RECEIVED_ERROR:", error);
        res.status(500).json({ message: "Error confirming cash receipt", error: error.message });
    }
};

export const getCashReport = async (req, res) => {
    try {
        const { serialNumber, referenceNumber, startDate, endDate, centreId } = req.query;

        // Filter centres based on user's authorized centres
        let centreQuery = {};
        if (req.user.role !== "superAdmin") {
            if (req.user.centres && req.user.centres.length > 0) {
                centreQuery = { _id: { $in: req.user.centres } };
            } else {
                return res.status(200).json({
                    summary: { totalCashLeft: 0, totalTransit: 0, totalTransferredLastMonth: 0 },
                    report: [],
                    recentTransfers: []
                });
            }
        }

        if (centreId) {
            centreQuery._id = centreId;
        }

        const centres = await CentreSchema.find(centreQuery);
        const report = [];

        for (const centre of centres) {
            const admissions = await Admission.find({
                $or: [
                    { centre: { $regex: new RegExp(`^${centre.centreName}$`, "i") } },
                    { primaryCentre: centre._id }
                ]
            }).select("_id");
            const admissionIds = admissions.map(a => a._id);

            const collections = await Payment.aggregate([
                {
                    $match: {
                        admission: { $in: admissionIds },
                        paymentMethod: "CASH",
                        status: "PAID"
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$paidAmount" }
                    }
                }
            ]);
            const totalCollected = collections.length > 0 ? collections[0].total : 0;

            const transfersOut = await CashTransfer.aggregate([
                {
                    $match: {
                        fromCentre: centre._id,
                        status: { $in: ["PENDING", "RECEIVED"] }
                    }
                },
                {
                    $group: {
                        _id: "$status",
                        total: { $sum: "$amount" }
                    }
                }
            ]);

            const sentConfirmed = transfersOut.find(t => t._id === "RECEIVED")?.total || 0;
            const sentPending = transfersOut.find(t => t._id === "PENDING")?.total || 0;

            const transfersIn = await CashTransfer.aggregate([
                {
                    $match: {
                        toCentre: centre._id,
                        status: "RECEIVED"
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$amount" }
                    }
                }
            ]);
            const receivedIn = transfersIn.length > 0 ? transfersIn[0].total : 0;

            const cashLeft = totalCollected + receivedIn - (sentConfirmed + sentPending);

            report.push({
                centreId: centre._id,
                centreName: centre.centreName,
                accountNumber: centre.accountNumber || centre.enterCode,
                cashLeft: cashLeft,
                cashTransferred: sentConfirmed,
                onTransitCash: sentPending,
                totalCollected: totalCollected
            });
        }

        // Fetch Recent Transfers with Filters
        let transferQuery = {};
        if (req.user.role !== "superAdmin") {
            transferQuery.$or = [
                { fromCentre: { $in: centres.map(c => c._id) } },
                { toCentre: { $in: centres.map(c => c._id) } }
            ];
        }

        if (serialNumber) transferQuery.serialNumber = parseInt(serialNumber);
        if (referenceNumber) transferQuery.referenceNumber = { $regex: referenceNumber, $options: "i" };
        if (startDate || endDate) {
            transferQuery.transferDate = {};
            if (startDate) transferQuery.transferDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                transferQuery.transferDate.$lte = end;
            }
        }

        const recentTransfers = await CashTransfer.find(transferQuery)
            .populate("fromCentre", "centreName")
            .populate("toCentre", "centreName")
            .populate("transferredBy", "name")
            .sort({ createdAt: -1 })
            .limit(serialNumber || referenceNumber ? 100 : 20);

        // Resolve signed URLs for recent transfers
        const transfersWithUrls = await Promise.all(recentTransfers.map(async (t) => {
            const doc = t.toObject();
            if (doc.receiptFile) {
                doc.receiptFile = await getSignedReceiptUrl(doc.receiptFile);
            }
            return doc;
        }));

        const totalCashLeft = report.reduce((sum, r) => sum + r.cashLeft, 0);
        const totalTransit = report.reduce((sum, r) => sum + r.onTransitCash, 0);

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

        const transferredLastMonthAgg = await CashTransfer.aggregate([
            {
                $match: {
                    status: "RECEIVED",
                    receivedDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                    ...(req.user.role !== "superAdmin" ? { fromCentre: { $in: report.map(r => r.centreId) } } : {})
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);
        const totalTransferredLastMonth = transferredLastMonthAgg.length > 0 ? transferredLastMonthAgg[0].total : 0;

        res.status(200).json({
            summary: {
                totalCashLeft,
                totalTransit,
                totalTransferredLastMonth
            },
            report,
            recentTransfers: transfersWithUrls
        });
    } catch (error) {
        console.error("GET_CASH_REPORT_ERROR:", error);
        res.status(500).json({ message: "Error generating cash report", error: error.message });
    }
};

export const getCentreTransferDetails = async (req, res) => {
    try {
        const { centreId } = req.params;
        const { serialNumber, referenceNumber, accountNumber, startDate, endDate, type } = req.query;

        let query = {
            $or: [
                { fromCentre: centreId },
                { toCentre: centreId }
            ]
        };

        if (type === "SENT") query = { fromCentre: centreId };
        if (type === "RECEIVED") query = { toCentre: centreId };

        if (serialNumber) query.serialNumber = parseInt(serialNumber);
        if (referenceNumber) query.referenceNumber = { $regex: referenceNumber, $options: "i" };
        if (accountNumber) query.accountNumber = { $regex: accountNumber, $options: "i" };

        if (startDate || endDate) {
            query.transferDate = {};
            if (startDate) query.transferDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.transferDate.$lte = end;
            }
        }

        const transfers = await CashTransfer.find(query)
            .populate("fromCentre", "centreName enterCode")
            .populate("toCentre", "centreName enterCode")
            .populate("transferredBy", "name")
            .populate("receivedBy", "name")
            .sort({ createdAt: -1 });

        // Resolve signed URLs
        const transfersWithUrls = await Promise.all(transfers.map(async (t) => {
            const doc = t.toObject();
            if (doc.receiptFile) {
                doc.receiptFile = await getSignedReceiptUrl(doc.receiptFile);
            }
            return doc;
        }));

        res.status(200).json(transfersWithUrls);
    } catch (error) {
        console.error("GET_CENTRE_TRANSFER_DETAILS_ERROR:", error);
        res.status(500).json({ message: "Error fetching centre transfer details", error: error.message });
    }
};
