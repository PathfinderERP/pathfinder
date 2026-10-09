import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import User from "../../models/User.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import s3Client from "../../config/r2Config.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const getBucketName = () => process.env.R2_BUCKET_NAME || "erp-documents";

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

const populateAdmissions = async (cheques) => {
    const admissionIds = [...new Set(cheques.map(c => c.admission).filter(Boolean))];
    if (admissionIds.length === 0) return cheques;

    const normalAdmissions = await Admission.find({ _id: { $in: admissionIds } })
        .populate("student")
        .populate({ path: "course", select: "courseName" })
        .populate({ path: "department", select: "departmentName" })
        .lean();

    const normalMap = new Map(normalAdmissions.map(a => [a._id.toString(), a]));
    const remainingIds = admissionIds.filter(id => !normalMap.has(id.toString()));

    let boardMap = new Map();
    if (remainingIds.length > 0) {
        const boardAdmissions = await BoardCourseAdmission.find({ _id: { $in: remainingIds } })
            .populate('boardId')
            .lean();
        boardMap = new Map(boardAdmissions.map(a => [a._id.toString(), a]));
    }

    cheques.forEach(c => {
        const id = c.admission?.toString();
        if (normalMap.has(id)) {
            c.admission = normalMap.get(id);
            c.isBoardAdmission = false;
        } else if (boardMap.has(id)) {
            c.admission = boardMap.get(id);
            c.isBoardAdmission = true;
        }
    });

    return cheques;
};

// Validate Cheque Number
export const validateChequeNumber = async (req, res) => {
    try {
        const { chequeNo } = req.params;
        const { centreId, centre } = req.query;

        if (!chequeNo) {
            return res.status(400).json({ message: "Cheque number is required" });
        }

        // Find pending cheque payments
        let cheques = await Payment.find({
            paymentMethod: "CHEQUE",
            transactionId: chequeNo,
            status: "PENDING_CLEARANCE"
        }).lean();

        if (cheques.length === 0) {
            return res.status(404).json({ message: "No pending cheque found with this cheque number" });
        }

        // Populate admissions for all matching cheques
        await populateAdmissions(cheques);

        // Filter out cheques without valid admission record
        cheques = cheques.filter(c => c.admission);

        if (cheques.length === 0) {
            return res.status(404).json({ message: "Associated admission record not found for this cheque" });
        }

        // Filter cheques based on user authorized centres if not Super Admin
        if (req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const authorizedCentreNames = currentUser?.centres?.map(c => c.centreName.toLowerCase().trim()) || [];
            
            cheques = cheques.filter(c => {
                const cName = c.admission?.centre;
                return cName && authorizedCentreNames.includes(cName.toLowerCase().trim());
            });

            if (cheques.length === 0) {
                return res.status(403).json({ message: "Access denied: Cheque belongs to a center outside your authorized list." });
            }
        }

        // Optional specific centre filter (if user selected a centre or passed centreId / centre name)
        if (centreId) {
            const centreDoc = await CentreSchema.findById(centreId).lean();
            if (centreDoc) {
                const targetName = centreDoc.centreName.toLowerCase().trim();
                const matched = cheques.filter(c => c.admission?.centre?.toLowerCase()?.trim() === targetName);
                if (matched.length > 0) {
                    cheques = matched;
                }
            }
        } else if (centre) {
            const targetName = centre.toLowerCase().trim();
            const matched = cheques.filter(c => c.admission?.centre?.toLowerCase()?.trim() === targetName);
            if (matched.length > 0) {
                cheques = matched;
            }
        }

        const formatCheque = (cheque) => {
            const adm = cheque.admission;
            return {
                paymentId: cheque._id,
                amount: cheque.paidAmount,
                chequeNumber: cheque.transactionId,
                bankName: cheque.bankName || cheque.accountHolderName || "N/A",
                chequeDate: cheque.chequeDate,
                centre: adm.centre,
                studentName: cheque.isBoardAdmission 
                    ? adm.studentName 
                    : adm.student?.studentsDetails?.[0]?.studentName || "Unknown",
                admissionNumber: adm.admissionNumber,
                isDeposited: cheque.isDeposited
            };
        };

        if (cheques.length === 1) {
            return res.status(200).json(formatCheque(cheques[0]));
        }

        // If multiple cheques match
        const formattedList = cheques.map(formatCheque);
        return res.status(200).json({
            multiple: true,
            matches: formattedList,
            message: "Multiple matching cheques found. Please select the correct cheque."
        });
    } catch (error) {
        console.error("VALIDATE_CHEQUE_ERROR:", error);
        return res.status(500).json({ message: "Error validating cheque number", error: error.message });
    }
};

// Deposit Cheque Entry
export const depositCheque = async (req, res) => {
    try {
        const { paymentId, depositAccount, depositDate, remarks } = req.body;

        if (!paymentId || !depositAccount || !depositDate) {
            return res.status(400).json({ message: "Missing required fields (Payment ID, Account Number, Deposit Date)" });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Cheque payment record not found" });
        }

        if (payment.paymentMethod !== "CHEQUE" || payment.status !== "PENDING_CLEARANCE") {
            return res.status(400).json({ message: "Only pending cheque payments can be deposited" });
        }

        let receiptFileKey = null;
        if (req.file) {
            const bucketName = getBucketName();
            const fileName = `cheque_deposits/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

            console.log(`Cheque Deposit: Uploading to bucket: ${bucketName}, key: ${fileName}`);

            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            }));
            receiptFileKey = fileName;
        }

        payment.isDeposited = true;
        payment.depositedDate = new Date(depositDate);
        payment.depositAccount = depositAccount;
        payment.receiptFile = receiptFileKey;
        payment.depositedBy = req.user.id || req.user._id;
        
        if (remarks) {
            payment.remarks = payment.remarks ? `${payment.remarks}; Deposit Remarks: ${remarks}` : remarks;
        }

        await payment.save();

        return res.status(200).json({
            message: "Cheque deposit details saved successfully",
            payment
        });
    } catch (error) {
        console.error("DEPOSIT_CHEQUE_ERROR:", error);
        return res.status(500).json({ message: "Error depositing cheque", error: error.message });
    }
};

// Get Cheque Deposit History
export const getChequeDepositHistory = async (req, res) => {
    try {
        const { centreId, startDate, endDate } = req.query;

        const query = {
            paymentMethod: "CHEQUE",
            isDeposited: true
        };

        if (startDate || endDate) {
            query.depositedDate = {};
            if (startDate) query.depositedDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.depositedDate.$lte = end;
            }
        }

        let cheques = await Payment.find(query)
            .populate("depositedBy", "name")
            .populate("processedBy", "name")
            .sort({ depositedDate: -1 })
            .lean();

        // Populate admissions
        await populateAdmissions(cheques);

        // Filter based on user authorized centers & query centreId
        if (req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const authorizedCentreNames = currentUser?.centres?.map(c => c.centreName.toLowerCase().trim()) || [];
            
            cheques = cheques.filter(c => {
                const centreName = c.admission?.centre;
                return centreName && authorizedCentreNames.includes(centreName.toLowerCase().trim());
            });
        }

        if (centreId) {
            cheques = cheques.filter(c => c.admission?.centre === centreId || c.admission?.primaryCentre?.toString() === centreId);
        }

        const formattedHistory = await Promise.all(cheques.map(async (c) => {
            const adm = c.admission;
            const isBoard = c.isBoardAdmission;
            const signedReceiptUrl = c.receiptFile ? await getSignedReceiptUrl(c.receiptFile) : null;

            return {
                paymentId: c._id,
                chequeNumber: c.transactionId,
                amount: c.paidAmount,
                studentName: isBoard 
                    ? adm?.studentName 
                    : adm?.student?.studentsDetails?.[0]?.studentName || "Unknown",
                admissionNumber: adm?.admissionNumber || "N/A",
                centre: adm?.centre || "N/A",
                depositedDate: c.depositedDate,
                depositAccount: c.depositAccount,
                receiptFile: signedReceiptUrl,
                status: c.status,
                depositedBy: c.depositedBy?.name || "System",
                processedBy: c.processedBy?.name || "N/A",
                remarks: c.remarks
            };
        }));

        return res.status(200).json(formattedHistory);
    } catch (error) {
        console.error("GET_DEPOSIT_HISTORY_ERROR:", error);
        return res.status(500).json({ message: "Error fetching deposit history", error: error.message });
    }
};
