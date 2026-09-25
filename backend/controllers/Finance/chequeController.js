import mongoose from "mongoose";
import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Zone from "../../models/Zone.js";
import User from "../../models/User.js";
import Student from "../../models/Students.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Account from "../../models/Master_data/Account.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import s3Client from "../../config/r2Config.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
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

// Helper function to revert installment amount or carry-forward adjustments
const revertPaymentVariance = async (payment, admission, isBoardAdmission = false) => {
    try {
        const variance = (payment.amount || 0) - (payment.paidAmount || 0);
        if (variance === 0) return;

        console.log(`Reverting variance for payment ${payment._id}. Variance to revert: ${variance}`);

        if (payment.isCarryForward) {
            // Revert Carry Forward Balance on Student
            const studentId = isBoardAdmission ? admission.studentId : (admission.student?._id || admission.student);
            await Student.findByIdAndUpdate(
                studentId,
                { $inc: { carryForwardBalance: -variance } }
            );
            console.log(`Reverted student carry forward balance by ${-variance}`);
        } else if (!isBoardAdmission) {
            // Revert Next Installment Adjustment (Only for Normal Admissions)
            const nextInstallmentNumber = (payment.installmentNumber || 0) + 1;
            const nextInstallment = admission.paymentBreakdown?.find(
                p => p.installmentNumber === nextInstallmentNumber
            );

            if (nextInstallment) {
                nextInstallment.amount -= variance;
                nextInstallment.remarks = (nextInstallment.remarks ? nextInstallment.remarks + "; " : "") +
                    `Reverted ₹${variance} adjustment from rejected/cancelled Inst #${payment.installmentNumber}`;
                console.log(`Reverted next installment amount for Inst #${nextInstallmentNumber}. New amount: ${nextInstallment.amount}`);
            }
        }
        // For Board Admissions, variance/adjustment is handled differently via cascading,
        // which will be triggered by saving the document after amount adjustments.
    } catch (error) {
        console.error("Error in revertPaymentVariance:", error);
    }
};

// Robust helper to populate admissions from either collection
const populateAdmissions = async (cheques) => {
    const admissionIds = [...new Set(cheques.map(c => c.admission).filter(Boolean))];
    if (admissionIds.length === 0) return cheques;

    // Try Normal Admissions
    const normalAdmissions = await Admission.find({ _id: { $in: admissionIds } })
        .populate("student")
        .populate({ path: "course", select: "courseName" })
        .populate({ path: "department", select: "departmentName" })
        .populate("downPaymentBankAccount")
        .populate("paymentBreakdown.bankAccount")
        .lean();

    const normalMap = new Map(normalAdmissions.map(a => [a._id.toString(), a]));

    // Identify IDs that were not found in Normal Admissions
    const remainingIds = admissionIds.filter(id => !normalMap.has(id.toString()));

    // Try Board Admissions
    let boardMap = new Map();
    if (remainingIds.length > 0) {
        const boardAdmissions = await BoardCourseAdmission.find({ _id: { $in: remainingIds } })
            .populate('boardId') // Boards model
            .populate('studentId')
            .populate('installments.paymentTransactions.bankAccount')
            .lean();
        boardMap = new Map(boardAdmissions.map(a => [a._id.toString(), a]));
    }

    // Attach to cheques
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

// Get all pending cheques
export const getPendingCheques = async (req, res) => {
    try {
        const {
            zone,
            zoneIds,
            centre,
            course,
            department,
            account,
            bankAccount,
            search,
            status,
            startDate,
            endDate,
            receivedStartDate,
            receivedEndDate,
            chequeStartDate,
            chequeEndDate,
            clearRejectStartDate,
            clearRejectEndDate,
            clearedRejectStartDate,
            clearedRejectEndDate
        } = req.query;

        // Build query for retrieving payments
        const query = {
            paymentMethod: "CHEQUE"
        };

        // Date filter for Received Date (fallback priority: receivedDate -> paidDate -> createdAt)
        const effectiveRecStart = receivedStartDate || startDate;
        const effectiveRecEnd = receivedEndDate || endDate;
        if (effectiveRecStart || effectiveRecEnd) {
            const dateCond = {};
            if (effectiveRecStart) dateCond.$gte = new Date(effectiveRecStart);
            if (effectiveRecEnd) {
                const end = new Date(effectiveRecEnd);
                end.setHours(23, 59, 59, 999);
                dateCond.$lte = end;
            }

            query.$or = [
                { receivedDate: dateCond },
                { receivedDate: { $in: [null, undefined] }, paidDate: dateCond },
                { receivedDate: { $in: [null, undefined] }, paidDate: { $in: [null, undefined] }, createdAt: dateCond }
            ];
        }

        // Date filter for Cheque Date
        if (chequeStartDate || chequeEndDate) {
            query.chequeDate = {};
            if (chequeStartDate) query.chequeDate.$gte = new Date(chequeStartDate);
            if (chequeEndDate) {
                const end = new Date(chequeEndDate);
                end.setHours(23, 59, 59, 999);
                query.chequeDate.$lte = end;
            }
        }

        // Date filter for Cheque Clear / Reject Date
        const effectiveCRStart = clearRejectStartDate || clearedRejectStartDate;
        const effectiveCREnd = clearRejectEndDate || clearedRejectEndDate;
        if (effectiveCRStart || effectiveCREnd) {
            query.clearedOrRejectedDate = {};
            if (effectiveCRStart) query.clearedOrRejectedDate.$gte = new Date(effectiveCRStart);
            if (effectiveCREnd) {
                const end = new Date(effectiveCREnd);
                end.setHours(23, 59, 59, 999);
                query.clearedOrRejectedDate.$lte = end;
            }
        }

        // If status specified, validate and apply
        if (status) {
            const allowedStatuses = ["PENDING_CLEARANCE", "PAID", "REJECTED", "CANCELLED"];
            const statusArray = Array.isArray(status) ? status : [status];
            const validStatusFilters = statusArray.filter(s => allowedStatuses.includes(s));
            if (validStatusFilters.length > 0) {
                query.status = { $in: validStatusFilters };
            } else {
                query.status = { $in: ["PENDING_CLEARANCE", "PAID", "REJECTED"] };
            }
        } else {
            query.status = { $in: ["PENDING_CLEARANCE", "PAID", "REJECTED"] };
        }

        let cheques = await Payment.find(query)
            .populate({
                path: "processedBy",
                select: "name"
            })
            .populate({
                path: "depositedBy",
                select: "name"
            })
            .populate("bankAccount")
            .sort({ updatedAt: -1 })
            .lean();

        // Manual Population
        await populateAdmissions(cheques);

        // Filter based on user's authorized assigned centres (under User Management)
        const userRoles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role || ''];
        const isSuperAdmin = userRoles.some(r => {
            const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
            return clean === 'superadmin';
        });

        if (!isSuperAdmin) {
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user?.centres || [] }
            }).select('centreName');
            const authorizedCentreNames = userCentres.map(c => (c.centreName || '').trim().toLowerCase()).filter(Boolean);

            cheques = cheques.filter(c => {
                const adm = c.admission;
                const admCentre = (adm?.centre || '').trim().toLowerCase();
                return admCentre && authorizedCentreNames.includes(admCentre);
            });
        }

        // Resolve Zone filter (by IDs or Zone names)
        let zoneCentreNames = null;
        const rawZones = zone || zoneIds;
        const requestedZones = rawZones
            ? (Array.isArray(rawZones) ? rawZones : typeof rawZones === 'string' ? rawZones.split(',') : [rawZones])
                .map(z => String(z).trim())
                .filter(Boolean)
            : [];

        if (requestedZones.length > 0) {
            const validObjectIds = requestedZones.filter(z => mongoose.Types.ObjectId.isValid(z));
            const zoneNames = requestedZones.filter(z => !mongoose.Types.ObjectId.isValid(z));

            const orConditions = [];
            if (validObjectIds.length > 0) {
                orConditions.push({ _id: { $in: validObjectIds } });
            }
            if (zoneNames.length > 0) {
                orConditions.push({
                    name: { $in: zoneNames.map(n => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) }
                });
            }

            if (orConditions.length > 0) {
                const zoneDocs = await Zone.find({ $or: orConditions }).populate('centres', 'centreName').lean();
                zoneCentreNames = new Set();
                zoneDocs.forEach(z => {
                    (z.centres || []).forEach(c => {
                        const name = typeof c === 'object' ? c.centreName : null;
                        if (name) zoneCentreNames.add(name.trim().toLowerCase());
                    });
                });
            }
        }

        // Filter results based on query params (since some data is in populated fields)
        if (zoneCentreNames !== null || centre || course || department || search) {
            const requestedCentres = centre ? (Array.isArray(centre) ? centre : [centre]) : [];
            const requestedCourses = course ? (Array.isArray(course) ? course : [course]) : [];
            const requestedDepts = department ? (Array.isArray(department) ? department : [department]) : [];
            const normalizedRequestedCentres = requestedCentres.map(c => (c || "").trim().toLowerCase()).filter(Boolean);

            cheques = cheques.filter(c => {
                const adm = c.admission;
                if (!adm) return false;

                const admCentre = (adm.centre || "").trim().toLowerCase();

                if (zoneCentreNames !== null && !zoneCentreNames.has(admCentre)) {
                    return false;
                }

                let matchesCentre = true;
                if (normalizedRequestedCentres.length > 0) {
                    matchesCentre = normalizedRequestedCentres.includes(admCentre);
                }

                let matchesCourse = true;
                if (requestedCourses.length > 0) {
                    const courseName = c.isBoardAdmission ? adm.boardCourseName : adm.course?.courseName;
                    matchesCourse = requestedCourses.includes(courseName);
                }

                let matchesDept = true;
                if (requestedDepts.length > 0) {
                    const deptName = c.isBoardAdmission ? "Board" : adm.department?.departmentName;
                    matchesDept = requestedDepts.includes(deptName);
                }

                let matchesSearch = true;
                if (search) {
                    const s = search.toLowerCase();
                    const studentName = (c.isBoardAdmission ? adm.studentName : (adm.student?.studentsDetails?.[0]?.studentName || "")).toLowerCase();
                    const admNo = (adm.admissionNumber || "").toLowerCase();
                    const chNo = (c.transactionId || "").toLowerCase();
                    const bank = (c.bankName || c.accountHolderName || "").toLowerCase();
                    const bAcc = (c.bankAccount?.accname || "").toLowerCase();
                    matchesSearch = studentName.includes(s) || admNo.includes(s) || chNo.includes(s) || bank.includes(s) || bAcc.includes(s);
                }

                return matchesCentre && matchesCourse && matchesDept && matchesSearch;
            });
        }

        // Additional in-memory verification for received date filter
        if (effectiveRecStart || effectiveRecEnd) {
            const startD = effectiveRecStart ? new Date(effectiveRecStart) : null;
            const endD = effectiveRecEnd ? new Date(effectiveRecEnd) : null;
            if (endD) endD.setHours(23, 59, 59, 999);

            cheques = cheques.filter(c => {
                const effectiveDate = c.receivedDate || c.paidDate || c.createdAt;
                if (!effectiveDate) return false;
                const d = new Date(effectiveDate);
                if (startD && d < startD) return false;
                if (endD && d > endD) return false;
                return true;
            });
        }

        // Additional in-memory verification for clear/reject date filter
        if (effectiveCRStart || effectiveCREnd) {
            const startD = effectiveCRStart ? new Date(effectiveCRStart) : null;
            const endD = effectiveCREnd ? new Date(effectiveCREnd) : null;
            if (endD) endD.setHours(23, 59, 59, 999);

            cheques = cheques.filter(c => {
                if (!c.clearedOrRejectedDate) return false;
                const d = new Date(c.clearedOrRejectedDate);
                if (startD && d < startD) return false;
                if (endD && d > endD) return false;
                return true;
            });
        }

        // Preload active zones to enrich each cheque with its zone name
        const allActiveZones = await Zone.find({ isActive: { $ne: false } }).populate('centres', 'centreName').lean();
        const centreToZoneMap = {};
        allActiveZones.forEach(z => {
            (z.centres || []).forEach(c => {
                const cName = typeof c === 'object' ? c.centreName : null;
                if (cName) {
                    centreToZoneMap[cName.trim().toLowerCase()] = z.name;
                }
            });
        });

        const allAccounts = await Account.find().lean();
        const accountMap = new Map(allAccounts.map(a => [a._id.toString(), a]));

        const formattedCheques = await Promise.all(cheques.map(async (c) => {
            const adm = c.admission;
            const isBoard = c.isBoardAdmission;
            const signedReceiptUrl = c.receiptFile ? await getSignedReceiptUrl(c.receiptFile) : null;

            let billId = c.billId;
            if (!billId && c.status === "PAID") {
                if (isBoard) {
                    const inst = adm?.installments?.find(i => i.monthNumber === c.installmentNumber || i.monthNumber === (c.installmentNumber + 1));
                    billId = inst?.billId;
                } else {
                    const inst = adm?.paymentBreakdown?.find(p => p.installmentNumber === c.installmentNumber);
                    billId = inst?.billId;
                }
            }

            const rawCentre = adm?.centre || "";
            const resolvedZone = centreToZoneMap[rawCentre.trim().toLowerCase()] || "N/A";

            // Resolve bank account selected during payment
            let bankAcc = null;
            if (c.bankAccount) {
                bankAcc = typeof c.bankAccount === 'object' && c.bankAccount.accname ? c.bankAccount : accountMap.get(c.bankAccount.toString());
            }
            if (!bankAcc && adm) {
                if (c.installmentNumber === 0) {
                    const dpAcc = adm.downPaymentBankAccount || adm.paymentBreakdown?.[0]?.bankAccount || adm.bankAccount;
                    bankAcc = typeof dpAcc === 'object' && dpAcc?.accname ? dpAcc : (dpAcc ? accountMap.get(dpAcc.toString()) : null);
                } else {
                    const inst = adm.paymentBreakdown?.find(p => p.installmentNumber === c.installmentNumber);
                    const instAcc = inst?.bankAccount;
                    bankAcc = typeof instAcc === 'object' && instAcc?.accname ? instAcc : (instAcc ? accountMap.get(instAcc.toString()) : null);
                    if (!bankAcc && isBoard) {
                        const bInst = adm.installments?.find(i => i.monthNumber === c.installmentNumber || i.monthNumber === (c.installmentNumber + 1));
                        const lastTx = bInst?.paymentTransactions?.[bInst.paymentTransactions?.length - 1];
                        const bAcc = lastTx?.bankAccount || bInst?.bankAccount;
                        bankAcc = typeof bAcc === 'object' && bAcc?.accname ? bAcc : (bAcc ? accountMap.get(bAcc.toString()) : null);
                    }
                }
            }

            const bankAccountLabel = bankAcc
                ? (bankAcc.accno ? `${bankAcc.accname.toUpperCase()} (A/C: ${bankAcc.accno})` : bankAcc.accname.toUpperCase())
                : (c.depositAccount || null);

            return {
                paymentId: c._id,
                admissionId: adm?._id,
                admissionNumber: adm?.admissionNumber,
                studentName: isBoard
                    ? adm?.studentName
                    : adm?.student?.studentsDetails?.[0]?.studentName,
                centre: rawCentre,
                zone: resolvedZone,
                department: isBoard ? "Board" : adm?.department?.departmentName,
                courseName: isBoard ? adm?.boardCourseName : adm?.course?.courseName,
                installmentNumber: c.installmentNumber,
                amount: c.paidAmount,
                chequeNumber: c.transactionId,
                chequeDate: c.chequeDate,
                receivedDate: c.receivedDate || c.paidDate || c.createdAt,
                bankName: c.bankName || c.accountHolderName || "N/A",
                accountHolderName: c.accountHolderName || "N/A",
                bankAccount: bankAcc ? {
                    _id: bankAcc._id,
                    accname: bankAcc.accname,
                    accno: bankAcc.accno
                } : null,
                bankAccountName: bankAccountLabel,
                bankAccountOnlyName: bankAcc ? bankAcc.accname : null,
                bankAccountNumber: bankAcc ? bankAcc.accno : null,
                status: c.status,
                createdAt: c.createdAt,
                processedBy: c.processedBy?.name || "System",
                clearedOrRejectedDate: c.clearedOrRejectedDate,
                receiptFile: signedReceiptUrl,
                depositedDate: c.depositedDate,
                depositAccount: c.depositAccount,
                depositedBy: c.depositedBy?.name || null,
                isDeposited: c.isDeposited || false,
                billId: billId || null,
                billingMonth: c.billingMonth || null,
                isBoardAdmission: isBoard
            };
        }));

        const rawAccountFilter = account || bankAccount;
        let finalCheques = formattedCheques;

        if (rawAccountFilter) {
            const requestedAccounts = (Array.isArray(rawAccountFilter) ? rawAccountFilter : [rawAccountFilter])
                .map(a => String(a).trim().toLowerCase())
                .filter(Boolean);

            if (requestedAccounts.length > 0) {
                finalCheques = formattedCheques.filter(c => {
                    const accId = c.bankAccount?._id ? String(c.bankAccount._id).toLowerCase() : "";
                    const accNo = c.bankAccountNumber ? String(c.bankAccountNumber).trim().toLowerCase() : (c.bankAccount?.accno ? String(c.bankAccount.accno).trim().toLowerCase() : "");
                    const accName = c.bankAccountOnlyName ? String(c.bankAccountOnlyName).trim().toLowerCase() : (c.bankAccount?.accname ? String(c.bankAccount.accname).trim().toLowerCase() : "");
                    const depAcc = c.depositAccount ? String(c.depositAccount).trim().toLowerCase() : "";
                    const fullName = c.bankAccountName ? String(c.bankAccountName).trim().toLowerCase() : "";

                    return requestedAccounts.some(target =>
                        target === accId ||
                        target === accNo ||
                        target === accName ||
                        target === depAcc ||
                        (accNo && target.includes(accNo)) ||
                        (accName && target.includes(accName)) ||
                        (fullName && fullName.includes(target))
                    );
                });
            }
        }

        res.status(200).json(finalCheques);
    } catch (error) {
        console.error("Get Pending Cheques Error:", error);
        res.status(500).json({ message: "Error fetching pending cheques", error: error.message });
    }
};

const checkChequeApprovalRoleAccess = (user) => {
    if (!user) return false;
    const roles = Array.isArray(user.role) ? user.role : [user.role || ''];
    return roles.some(r => {
        const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
        return clean === 'superadmin' || clean === 'accounts' || clean === 'account';
    });
};

// Clear a cheque
export const clearCheque = async (req, res) => {
    try {
        if (!checkChequeApprovalRoleAccess(req.user)) {
            return res.status(403).json({
                message: "Access Denied: Cheque approval can only be performed by Accounts and SuperAdmin roles."
            });
        }

        const { paymentId } = req.params;
        const { clearedDate } = req.body;

        if (!clearedDate) {
            return res.status(400).json({ message: "Cleared Date is required to clear the cheque" });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        if (payment.status === "PAID") {
            // Already cleared previously
            return res.status(200).json({
                message: "Cheque cleared successfully",
                paymentId: payment._id,
                billId: payment.billId
            });
        }

        if (payment.status !== "PENDING_CLEARANCE") {
            return res.status(400).json({ message: "Only pending cheques can be cleared" });
        }

        // Try Normal Admission first, then Board Admission
        let admission = await Admission.findById(payment.admission);
        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(payment.admission);
            isBoardAdmission = true;
        } else if (admission.admissionType === "BOARD") {
            isBoardAdmission = true;
        }

        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        const userRoles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role || ''];
        const isSuperAdmin = userRoles.some(r => {
            const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
            return clean === 'superadmin';
        });

        if (!isSuperAdmin) {
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user?.centres || [] }
            }).select('centreName');
            const authorizedCentreNames = userCentres.map(c => (c.centreName || '').trim().toLowerCase()).filter(Boolean);
            const admCentre = (admission.centre || '').trim().toLowerCase();
            if (!authorizedCentreNames.includes(admCentre)) {
                return res.status(403).json({
                    message: "Access Denied: You are not authorized to process cheques for this centre."
                });
            }
        }

        // 1. Update Payment record
        payment.status = "PAID";
        // Set paidDate to the actual clearance time so it sorts correctly in Daily Collection.
        // clearedOrRejectedDate stays as midnight IST of the cleared date for date attribution.
        // For paidDate: if clearing for today, use current time. For past dates, use 23:30 IST
        // so it appears at the end of that day's list (not at the very bottom due to midnight UTC).
        const clearedDateIST = new Date(clearedDate + "T00:00:00+05:30");
        const nowIST = new Date();
        const todayISTStr = nowIST.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const clearedDateStr = typeof clearedDate === "string" ? (clearedDate.includes("T") ? clearedDate.split("T")[0] : clearedDate) : clearedDate;
        if (clearedDateStr === todayISTStr) {
            // Clearing for today — use actual current timestamp so it appears at top of today's list
            payment.paidDate = nowIST;
        } else {
            // Clearing for a past date — use 23:30 IST of that date so it appears at end of that day
            payment.paidDate = new Date(clearedDate + "T23:30:00+05:30");
        }
        payment.clearedOrRejectedDate = clearedDateIST;
        payment.processedBy = req.user?.id || req.user?._id;

        // Generate Bill ID on clearance (it was intentionally skipped at submission for CHEQUE payments)
        if (!payment.billId) {
            let centre = await CentreSchema.findOne({ centreName: admission.centre });
            const centreCode = centre?.enterCode || "GEN";
            payment.billId = await generateBillId(centreCode, clearedDate || new Date());
        }
        payment.isReceivingSlip = false;

        await payment.save();

        if (isBoardAdmission) {
            // 2. Update Board Admission installments
            const inst = admission.installments?.find(i => 
                (payment.transactionId && i.paymentTransactions?.some(t => t.transactionId === payment.transactionId)) ||
                (payment.billingMonth && new Date(i.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) === payment.billingMonth) ||
                (payment.installmentId && i._id?.toString() === payment.installmentId.toString()) ||
                i.monthNumber === (payment.installmentNumber + 1) ||
                i.monthNumber === payment.installmentNumber
            );
            if (inst) {
                inst.status = "PAID";
                inst.billId = payment.billId;
                if (!inst.paidAmount || inst.paidAmount < payment.paidAmount) {
                    inst.paidAmount = payment.paidAmount || inst.payableAmount;
                }
            }

            if (admission.monthlySubjectHistory && payment.billingMonth) {
                const hist = admission.monthlySubjectHistory.find(h => h.month === payment.billingMonth);
                if (hist) {
                    hist.isPaid = true;
                    hist.status = "PAID";
                }
            }

            // 3. Recalculate Board Admission totalPaidAmount
            admission.totalPaidAmount = admission.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0);

            // Note: Board Admissions use a different status management (ACTIVE/COMPLETED)
            if (admission.totalPaidAmount >= (admission.totalExpectedAmount || 0) - 0.5) {
                admission.status = "COMPLETED";
            }
        } else {
            // 2. Update Normal Admission paymentBreakdown or Down Payment
            if (payment.installmentNumber === 0) {
                admission.downPaymentStatus = "PAID";
            } else {
                const installment = (admission.paymentBreakdown || []).find(
                    p => p.installmentNumber === payment.installmentNumber
                );

                if (installment) {
                    installment.status = "PAID";
                    installment.paidDate = payment.paidDate;
                }
            }

            // 3. Update Normal Admission totalPaidAmount
            admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                0
            ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

            // Recalculate remaining amount
            admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

            // Update overall payment status
            if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                admission.paymentStatus = "COMPLETED";
                admission.remainingAmount = 0;
            } else {
                admission.paymentStatus = "PARTIAL";
            }

            // 4. Update Board-type Normal Admission monthly history if applicable
            if (admission.admissionType === 'BOARD' && payment.billingMonth) {
                const historyEntry = admission.monthlySubjectHistory?.find(h => h.month === payment.billingMonth);
                if (historyEntry) {
                    historyEntry.isPaid = true;
                    historyEntry.status = "PAID";
                }
            }
        }

        await admission.save({ validateBeforeSave: false });

        res.status(200).json({
            message: "Cheque cleared successfully",
            paymentId: payment._id,
            billId: payment.billId
        });
    } catch (error) {
        console.error("Clear Cheque Error:", error);
        res.status(500).json({ message: "Error clearing cheque", error: error.message });
    }
};

// Update clearance date of an already cleared cheque (Accounts and SuperAdmin only)
export const updateChequeClearanceDate = async (req, res) => {
    try {
        if (!checkChequeApprovalRoleAccess(req.user)) {
            return res.status(403).json({
                message: "Access Denied: Editing clearance date can only be performed by Accounts and SuperAdmin roles."
            });
        }

        const { paymentId } = req.params;
        const { clearedDate } = req.body;

        if (!clearedDate) {
            return res.status(400).json({ message: "Cleared Date is required" });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        if (payment.status !== "PAID") {
            return res.status(400).json({ message: "Only cleared cheques can have their clearance date updated." });
        }

        // Try Normal Admission first, then Board Admission
        let admission = await Admission.findById(payment.admission);
        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(payment.admission);
            isBoardAdmission = true;
        } else if (admission.admissionType === "BOARD") {
            isBoardAdmission = true;
        }

        const userRoles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role || ''];
        const isSuperAdmin = userRoles.some(r => {
            const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
            return clean === 'superadmin';
        });

        if (!isSuperAdmin && admission) {
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user?.centres || [] }
            }).select('centreName');
            const authorizedCentreNames = userCentres.map(c => (c.centreName || '').trim().toLowerCase()).filter(Boolean);
            const admCentre = (admission.centre || '').trim().toLowerCase();
            if (admCentre && !authorizedCentreNames.includes(admCentre)) {
                return res.status(403).json({
                    message: "Access Denied: You are not authorized to edit cheques for this centre."
                });
            }
        }

        // 1. Update Payment record dates
        const clearedDateIST = new Date(clearedDate + "T00:00:00+05:30");
        const nowIST = new Date();
        const todayISTStr = nowIST.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const clearedDateStr = typeof clearedDate === "string" ? (clearedDate.includes("T") ? clearedDate.split("T")[0] : clearedDate) : clearedDate;

        let newPaidDate;
        if (clearedDateStr === todayISTStr) {
            newPaidDate = nowIST;
        } else {
            newPaidDate = new Date(clearedDate + "T23:30:00+05:30");
        }

        payment.clearedOrRejectedDate = clearedDateIST;
        payment.paidDate = newPaidDate;
        await payment.save();

        // 2. Update Admission installment paidDate if applicable
        if (admission) {
            if (isBoardAdmission) {
                const inst = admission.installments?.find(i => 
                    (payment.transactionId && i.paymentTransactions?.some(t => t.transactionId === payment.transactionId)) ||
                    (payment.billingMonth && new Date(i.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) === payment.billingMonth) ||
                    (payment.installmentId && i._id?.toString() === payment.installmentId.toString()) ||
                    i.monthNumber === (payment.installmentNumber + 1) ||
                    i.monthNumber === payment.installmentNumber
                );
                if (inst && inst.paymentTransactions) {
                    const tx = inst.paymentTransactions.find(t => t.transactionId === payment.transactionId);
                    if (tx) {
                        tx.date = newPaidDate;
                        await admission.save({ validateBeforeSave: false });
                    }
                }
            } else {
                if (payment.installmentNumber > 0) {
                    const installment = (admission.paymentBreakdown || []).find(
                        p => p.installmentNumber === payment.installmentNumber
                    );
                    if (installment) {
                        installment.paidDate = newPaidDate;
                        await admission.save({ validateBeforeSave: false });
                    }
                }
            }
        }

        return res.status(200).json({
            message: "Clearance date updated successfully",
            paymentId: payment._id,
            clearedOrRejectedDate: payment.clearedOrRejectedDate,
            paidDate: payment.paidDate
        });
    } catch (error) {
        console.error("Update Cheque Clearance Date Error:", error);
        return res.status(500).json({ message: "Error updating clearance date", error: error.message });
    }
};

// Update status of a cheque (Accounts and SuperAdmin only)
export const updateChequeStatus = async (req, res) => {
    try {
        if (!checkChequeApprovalRoleAccess(req.user)) {
            return res.status(403).json({
                message: "Access Denied: Only Accounts and SuperAdmin roles can edit cheque status."
            });
        }

        const { paymentId } = req.params;
        const { status: targetStatus, clearedDate, rejectedDate, reason } = req.body;

        const validStatuses = ["PAID", "REJECTED", "PENDING_CLEARANCE"];
        if (!validStatuses.includes(targetStatus)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        // Try Normal Admission first, then Board Admission
        let admission = await Admission.findById(payment.admission);
        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(payment.admission);
            isBoardAdmission = true;
        } else if (admission.admissionType === "BOARD") {
            isBoardAdmission = true;
        }

        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        const userRoles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role || ''];
        const isSuperAdmin = userRoles.some(r => {
            const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
            return clean === 'superadmin';
        });

        if (!isSuperAdmin && admission) {
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user?.centres || [] }
            }).select('centreName');
            const authorizedCentreNames = userCentres.map(c => (c.centreName || '').trim().toLowerCase()).filter(Boolean);
            const admCentre = (admission.centre || '').trim().toLowerCase();
            if (admCentre && !authorizedCentreNames.includes(admCentre)) {
                return res.status(403).json({
                    message: "Access Denied: You are not authorized to process cheques for this centre."
                });
            }
        }

        const previousStatus = payment.status;

        // 1. Changing to PAID (Cleared)
        if (targetStatus === "PAID") {
            const dateToUse = clearedDate || new Date().toISOString().split('T')[0];
            const clearedDateIST = new Date(dateToUse + "T00:00:00+05:30");
            const nowIST = new Date();
            const todayISTStr = nowIST.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const clearedDateStr = typeof dateToUse === "string" ? (dateToUse.includes("T") ? dateToUse.split("T")[0] : dateToUse) : dateToUse;

            let newPaidDate;
            if (clearedDateStr === todayISTStr) {
                newPaidDate = nowIST;
            } else {
                newPaidDate = new Date(dateToUse + "T23:30:00+05:30");
            }

            payment.status = "PAID";
            payment.clearedOrRejectedDate = clearedDateIST;
            payment.paidDate = newPaidDate;
            payment.processedBy = req.user?.id || req.user?._id;

            if (!payment.billId) {
                let centre = await CentreSchema.findOne({ centreName: admission.centre });
                const centreCode = centre?.enterCode || "GEN";
                payment.billId = await generateBillId(centreCode, dateToUse || new Date());
            }
            payment.isReceivingSlip = false;

            if (isBoardAdmission) {
                const inst = admission.installments?.find(i => 
                    (payment.transactionId && i.paymentTransactions?.some(t => t.transactionId === payment.transactionId)) ||
                    (payment.billingMonth && new Date(i.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) === payment.billingMonth) ||
                    (payment.installmentId && i._id?.toString() === payment.installmentId.toString()) ||
                    i.monthNumber === (payment.installmentNumber + 1) ||
                    i.monthNumber === payment.installmentNumber
                );
                if (inst) {
                    inst.status = "PAID";
                    inst.billId = payment.billId;
                    if (!inst.paidAmount || inst.paidAmount < payment.paidAmount) {
                        inst.paidAmount = payment.paidAmount || inst.payableAmount;
                    }
                    if (inst.paymentTransactions) {
                        const existingTx = inst.paymentTransactions.find(t => t.transactionId === payment.transactionId);
                        if (existingTx) {
                            existingTx.date = newPaidDate;
                        } else {
                            inst.paymentTransactions.push({
                                amount: payment.paidAmount,
                                date: newPaidDate,
                                paymentMethod: "CHEQUE",
                                transactionId: payment.transactionId,
                                bankName: payment.accountHolderName,
                                accountHolderName: payment.accountHolderName,
                                chequeDate: payment.chequeDate
                            });
                        }
                    }
                }

                if (admission.monthlySubjectHistory && payment.billingMonth) {
                    const hist = admission.monthlySubjectHistory.find(h => h.month === payment.billingMonth);
                    if (hist) {
                        hist.isPaid = true;
                        hist.status = "PAID";
                    }
                }

                admission.totalPaidAmount = (admission.installments || []).reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0);
                if (admission.totalExpectedAmount && admission.totalPaidAmount >= (admission.totalExpectedAmount || 0) - 0.5) {
                    admission.status = "COMPLETED";
                }
            } else {
                if (payment.installmentNumber === 0) {
                    admission.downPaymentStatus = "PAID";
                    admission.downPaymentTransactionId = payment.transactionId;
                } else {
                    const installment = (admission.paymentBreakdown || []).find(
                        p => p.installmentNumber === payment.installmentNumber
                    );
                    if (installment) {
                        installment.status = "PAID";
                        installment.paidDate = newPaidDate;
                        installment.paidAmount = payment.paidAmount || installment.amount;
                        installment.paymentMethod = "CHEQUE";
                        installment.transactionId = payment.transactionId;
                    }
                }

                admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                    (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                    0
                ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

                admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);
                if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                    admission.paymentStatus = "COMPLETED";
                    admission.remainingAmount = 0;
                } else if (admission.totalPaidAmount > 0) {
                    admission.paymentStatus = "PARTIAL";
                } else {
                    admission.paymentStatus = "PENDING";
                }
            }
        }
        // 2. Changing to REJECTED (Bounced)
        else if (targetStatus === "REJECTED") {
            const dateToUse = rejectedDate || new Date().toISOString().split('T')[0];
            const rejectMsg = reason || "Cheque rejected / bounced";

            if (previousStatus === "PAID") {
                await revertPaymentVariance(payment, admission, isBoardAdmission);
            }

            payment.status = "REJECTED";
            payment.remarks = (payment.remarks ? payment.remarks + "; " : "") + `REJECTED: ${rejectMsg}`;
            payment.processedBy = req.user?.id || req.user?._id;
            payment.clearedOrRejectedDate = new Date(dateToUse);
            payment.paidDate = null;

            if (isBoardAdmission) {
                const inst = admission.installments?.find(i => 
                    (payment.transactionId && i.paymentTransactions?.some(t => t.transactionId === payment.transactionId)) ||
                    (payment.billingMonth && new Date(i.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) === payment.billingMonth) ||
                    (payment.installmentId && i._id?.toString() === payment.installmentId.toString()) ||
                    i.monthNumber === (payment.installmentNumber + 1) ||
                    i.monthNumber === payment.installmentNumber
                );
                if (inst) {
                    if (payment.transactionId) {
                        inst.paymentTransactions = (inst.paymentTransactions || []).filter(t => t.transactionId !== payment.transactionId);
                    }
                    inst.paidAmount = (inst.paymentTransactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                    if (inst.paidAmount >= (inst.payableAmount || 0) - 0.5 && (inst.payableAmount || 0) > 0) {
                        inst.status = "PAID";
                    } else if (inst.paidAmount > 0.5) {
                        inst.status = "PARTIAL";
                    } else {
                        inst.status = "PENDING";
                    }
                }

                if (admission.monthlySubjectHistory && payment.billingMonth) {
                    const hist = admission.monthlySubjectHistory.find(h => h.month === payment.billingMonth);
                    if (hist) {
                        hist.isPaid = false;
                        hist.status = "PENDING";
                        hist.paidAmount = Math.max(0, (hist.paidAmount || 0) - (payment.paidAmount || 0));
                    }
                }

                admission.totalPaidAmount = (admission.installments || []).reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0);
                if (admission.totalExpectedAmount && admission.totalPaidAmount < admission.totalExpectedAmount - 0.5) {
                    admission.status = "ACTIVE";
                }
            } else {
                if (payment.installmentNumber === 0) {
                    admission.downPaymentStatus = "REJECTED";
                    admission.downPaymentTransactionId = null;
                    admission.remarks = (admission.remarks ? admission.remarks + "; " : "") + `Down payment cheque rejected: ${rejectMsg}`;
                }

                const installment = (admission.paymentBreakdown || []).find(
                    p => p.installmentNumber === payment.installmentNumber
                );
                if (installment) {
                    installment.status = "REJECTED";
                    installment.paidAmount = 0;
                    installment.paymentMethod = null;
                    installment.transactionId = null;
                    installment.remarks = (installment.remarks ? installment.remarks + "; " : "") + `Cheque rejected: ${rejectMsg}`;
                }

                if (payment.transactionId) {
                    const searchId = payment.transactionId;
                    (admission.paymentBreakdown || []).forEach(p => {
                        if (p.transactionId && p.transactionId.includes(searchId) && p.installmentNumber !== payment.installmentNumber) {
                            p.status = "REJECTED";
                            p.paidAmount = 0;
                            p.paymentMethod = null;
                            p.transactionId = null;
                            p.remarks = (p.remarks ? p.remarks + "; " : "") + `Reverted due to rejection of source cheque ${searchId}`;
                        }
                    });
                }

                admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                    (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                    0
                ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

                admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);
                if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                    admission.paymentStatus = "COMPLETED";
                    admission.remainingAmount = 0;
                } else if (admission.totalPaidAmount > 0) {
                    admission.paymentStatus = "PARTIAL";
                } else {
                    admission.paymentStatus = "PENDING";
                }
            }
        }
        // 3. Changing to PENDING_CLEARANCE
        else if (targetStatus === "PENDING_CLEARANCE") {
            if (previousStatus === "PAID") {
                await revertPaymentVariance(payment, admission, isBoardAdmission);
            }

            payment.status = "PENDING_CLEARANCE";
            payment.clearedOrRejectedDate = null;
            payment.paidDate = null;
            payment.processedBy = req.user?.id || req.user?._id;

            if (isBoardAdmission) {
                const inst = admission.installments?.find(i => 
                    (payment.transactionId && i.paymentTransactions?.some(t => t.transactionId === payment.transactionId)) ||
                    (payment.billingMonth && new Date(i.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) === payment.billingMonth) ||
                    (payment.installmentId && i._id?.toString() === payment.installmentId.toString()) ||
                    i.monthNumber === (payment.installmentNumber + 1) ||
                    i.monthNumber === payment.installmentNumber
                );
                if (inst) {
                    if (payment.transactionId) {
                        inst.paymentTransactions = (inst.paymentTransactions || []).filter(t => t.transactionId !== payment.transactionId);
                    }
                    inst.paidAmount = (inst.paymentTransactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
                    if (inst.paidAmount >= (inst.payableAmount || 0) - 0.5 && (inst.payableAmount || 0) > 0) {
                        inst.status = "PAID";
                    } else if (inst.paidAmount > 0.5) {
                        inst.status = "PARTIAL";
                    } else {
                        inst.status = "PENDING";
                    }
                }

                if (admission.monthlySubjectHistory && payment.billingMonth) {
                    const hist = admission.monthlySubjectHistory.find(h => h.month === payment.billingMonth);
                    if (hist) {
                        hist.isPaid = false;
                        hist.status = "PENDING";
                        hist.paidAmount = Math.max(0, (hist.paidAmount || 0) - (payment.paidAmount || 0));
                    }
                }

                admission.totalPaidAmount = (admission.installments || []).reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0);
                if (admission.totalExpectedAmount && admission.totalPaidAmount < admission.totalExpectedAmount - 0.5) {
                    admission.status = "ACTIVE";
                }
            } else {
                if (payment.installmentNumber === 0) {
                    admission.downPaymentStatus = "PENDING";
                }

                const installment = (admission.paymentBreakdown || []).find(
                    p => p.installmentNumber === payment.installmentNumber
                );
                if (installment) {
                    installment.status = "PENDING";
                    installment.paidAmount = 0;
                    installment.paymentMethod = null;
                    installment.transactionId = null;
                }

                if (payment.transactionId) {
                    const searchId = payment.transactionId;
                    (admission.paymentBreakdown || []).forEach(p => {
                        if (p.transactionId && p.transactionId.includes(searchId) && p.installmentNumber !== payment.installmentNumber) {
                            p.status = "PENDING";
                            p.paidAmount = 0;
                            p.paymentMethod = null;
                            p.transactionId = null;
                        }
                    });
                }

                admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                    (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                    0
                ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

                admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);
                if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                    admission.paymentStatus = "COMPLETED";
                    admission.remainingAmount = 0;
                } else if (admission.totalPaidAmount > 0) {
                    admission.paymentStatus = "PARTIAL";
                } else {
                    admission.paymentStatus = "PENDING";
                }
            }
        }

        await payment.save();
        await admission.save({ validateBeforeSave: false });

        return res.status(200).json({
            message: `Cheque status successfully updated to ${targetStatus === 'PAID' ? 'Cleared' : (targetStatus === 'REJECTED' ? 'Rejected' : 'Pending Clearance')}`,
            paymentId: payment._id,
            status: payment.status,
            clearedOrRejectedDate: payment.clearedOrRejectedDate,
            billId: payment.billId
        });
    } catch (error) {
        console.error("Update Cheque Status Error:", error);
        return res.status(500).json({ message: "Error updating cheque status", error: error.message });
    }
};

// Reject a cheque (Bounce)
export const rejectCheque = async (req, res) => {
    try {
        if (!checkChequeApprovalRoleAccess(req.user)) {
            return res.status(403).json({
                message: "Access Denied: Cheque rejection can only be performed by Accounts and SuperAdmin roles."
            });
        }

        const { paymentId } = req.params;
        const { reason, rejectedDate } = req.body;

        if (!rejectedDate) {
            return res.status(400).json({ message: "Rejected Date is required to reject the cheque" });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        // Try Normal Admission first, then Board Admission
        let admission = await Admission.findById(payment.admission);
        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(payment.admission);
            isBoardAdmission = true;
        } else if (admission.admissionType === "BOARD") {
            isBoardAdmission = true;
        }

        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        const userRoles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role || ''];
        const isSuperAdmin = userRoles.some(r => {
            const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
            return clean === 'superadmin';
        });

        if (!isSuperAdmin) {
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user?.centres || [] }
            }).select('centreName');
            const authorizedCentreNames = userCentres.map(c => (c.centreName || '').trim().toLowerCase()).filter(Boolean);
            const admCentre = (admission.centre || '').trim().toLowerCase();
            if (!authorizedCentreNames.includes(admCentre)) {
                return res.status(403).json({
                    message: "Access Denied: You are not authorized to process cheques for this centre."
                });
            }
        }

        // Revert any variance adjustments made during payment recording
        await revertPaymentVariance(payment, admission, isBoardAdmission);

        // 1. Update Payment record
        payment.status = "REJECTED";
        payment.remarks = (payment.remarks ? payment.remarks + "; " : "") + `REJECTED: ${reason || 'Cheque bounced'}`;
        payment.processedBy = req.user.id || req.user._id;
        payment.clearedOrRejectedDate = new Date(rejectedDate);
        await payment.save();

        if (isBoardAdmission) {
            // 2. Update Board Admission installments
            const inst = admission.installments?.find(i => 
                (payment.transactionId && i.paymentTransactions?.some(t => t.transactionId === payment.transactionId)) ||
                (payment.billingMonth && new Date(i.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) === payment.billingMonth) ||
                (payment.installmentId && i._id?.toString() === payment.installmentId.toString()) ||
                i.monthNumber === (payment.installmentNumber + 1) ||
                i.monthNumber === payment.installmentNumber
            );
            if (inst) {
                // Find and remove the transaction from the array
                if (payment.transactionId) {
                    inst.paymentTransactions = (inst.paymentTransactions || []).filter(t => t.transactionId !== payment.transactionId);
                }

                // Recalculate true paid amount for this installment from remaining valid transactions
                inst.paidAmount = (inst.paymentTransactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

                if (inst.paidAmount >= (inst.payableAmount || 0) - 0.5 && (inst.payableAmount || 0) > 0) {
                    inst.status = "PAID";
                } else if (inst.paidAmount > 0.5) {
                    inst.status = "PARTIAL";
                } else {
                    inst.status = "PENDING";
                }
            }

            if (admission.monthlySubjectHistory && payment.billingMonth) {
                const hist = admission.monthlySubjectHistory.find(h => h.month === payment.billingMonth);
                if (hist) {
                    hist.isPaid = false;
                    hist.status = "PENDING";
                    hist.paidAmount = Math.max(0, (hist.paidAmount || 0) - (payment.paidAmount || 0));
                }
            }

            // 3. Recalculate Board Admission totals
            // Check if it was an exam fee or additional fee
            const isExamFee = payment.remarks?.toLowerCase().includes("exam") || payment.boardCourseName?.toLowerCase().includes("examination");
            if (isExamFee) {
                admission.examFeePaid = Math.max(0, (admission.examFeePaid || 0) - (payment.paidAmount || 0));
                if (admission.examFeePaid > 0) admission.examFeeStatus = "PARTIAL";
                else admission.examFeeStatus = "PENDING";
            }

            const isAdditionalFee = payment.remarks?.toLowerCase().includes("additional") || 
                (admission.additionalThingsName && payment.boardCourseName?.toLowerCase().includes(admission.additionalThingsName.toLowerCase()));
            if (isAdditionalFee) {
                admission.additionalThingsPaid = Math.max(0, (admission.additionalThingsPaid || 0) - (payment.paidAmount || 0));
                if (admission.additionalThingsPaid > 0) admission.additionalThingsStatus = "PARTIAL";
                else admission.additionalThingsStatus = "PENDING";
            }

            admission.totalPaidAmount = (admission.installments || []).reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0) + (admission.additionalThingsPaid || 0);
            if (admission.totalExpectedAmount && admission.totalPaidAmount < admission.totalExpectedAmount - 0.5) {
                admission.status = "ACTIVE";
            }

            // Re-trigger cascade if needed (handled by the controller logic usually)
            // For now, we manually recalculate the chain for board admissions to be safe
            let runningBalance = 0;
            let adjustmentApplied = false;
            for (let i = 0; i < admission.installments.length; i++) {
                const current = admission.installments[i];
                const netMonthly = (current.standardAmount || 0) - (current.waiverAmount || 0);
                const extraFees = current.monthNumber === 1 ? (Number(admission.admissionFee) || 0) : 0;

                if (current.monthNumber > 1 && !adjustmentApplied && Math.abs(runningBalance) > 0.5) {
                    current.adjustmentAmount = -runningBalance;
                    adjustmentApplied = true;
                } else if (current.monthNumber > 1) {
                    current.adjustmentAmount = 0;
                }

                current.payableAmount = Math.max(0, netMonthly + extraFees + (current.adjustmentAmount || 0));

                if (current.paidAmount >= current.payableAmount - 0.5 && current.payableAmount > 0) {
                    current.status = "PAID";
                } else if (current.paidAmount > 0.5) {
                    current.status = "PARTIAL";
                } else {
                    current.status = "PENDING";
                }

                if (current.paidAmount > 0.5) {
                    runningBalance += (current.paidAmount - (netMonthly + extraFees));
                    adjustmentApplied = false;
                }
            }
        } else {
            // 2. Update Normal Admission paymentBreakdown or Down Payment
            const today = new Date();

            if (payment.installmentNumber === 0) {
                admission.downPaymentStatus = "REJECTED";
                admission.downPaymentTransactionId = null;
                admission.remarks = (admission.remarks ? admission.remarks + "; " : "") + `Down payment cheque rejected: ${reason}`;
            }

            // Find the primary installment for this payment
            const installment = (admission.paymentBreakdown || []).find(
                p => p.installmentNumber === payment.installmentNumber
            );

            if (installment) {
                installment.status = "REJECTED";
                installment.paidAmount = 0;
                installment.paymentMethod = null;
                installment.transactionId = null;
                installment.remarks = (installment.remarks ? installment.remarks + "; " : "") + `Cheque rejected: ${reason}`;
            }

            // --- CASCADING REVERSION (Crucial Fix) ---
            // If this payment credited future installments (Auto-Credit), we must revert them too.
            if (payment.transactionId) {
                const searchId = payment.transactionId;
                (admission.paymentBreakdown || []).forEach(p => {
                    // Check if this installment was paid using the rejected transaction ID (even as auto-credit)
                    if (p.transactionId && p.transactionId.includes(searchId) && p.installmentNumber !== payment.installmentNumber) {
                        console.log(`Cascading Rejection: Reverting auto-paid Inst #${p.installmentNumber} linked to txn ${searchId}`);
                        p.status = "REJECTED";
                        p.paidAmount = 0;
                        p.paymentMethod = null;
                        p.transactionId = null;
                        p.remarks = (p.remarks ? p.remarks + "; " : "") + `Reverted due to rejection of source cheque ${searchId}`;
                    }
                });
            }

            // 3. Recalculate Normal Admission totalPaidAmount
            admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                0
            ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

            // Recalculate remaining amount
            admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

            // Update payment status
            if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                admission.paymentStatus = "COMPLETED";
                admission.remainingAmount = 0;
            } else if (admission.totalPaidAmount > 0) {
                admission.paymentStatus = "PARTIAL";
            } else {
                admission.paymentStatus = "PENDING";
            }

            // 4. Update Board-type Normal Admission monthly history if applicable
            if (admission.admissionType === 'BOARD' && payment.billingMonth) {
                const historyEntry = admission.monthlySubjectHistory?.find(h => h.month === payment.billingMonth);
                if (historyEntry) {
                    historyEntry.isPaid = false;
                    historyEntry.status = "REJECTED";
                }
            }
        }

        await admission.save({ validateBeforeSave: false });

        res.status(200).json({ message: "Cheque rejected successfully" });
    } catch (error) {
        console.error("Reject Cheque Error:", error);
        res.status(500).json({ message: "Error rejecting cheque", error: error.message });
    }
};

// Get all cheques (Pending & Cleared) with filters
export const getAllCheques = async (req, res) => {
    try {
        const { centre, course, department, search, status, startDate, endDate, chequeStartDate, chequeEndDate } = req.query;

        // Build query for retrieving payments
        const query = {
            paymentMethod: "CHEQUE"
        };

        // Date filter for processing Date (updatedAt)
        if (startDate || endDate) {
            query.updatedAt = {};
            if (startDate) query.updatedAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.updatedAt.$lte = end;
            }
        }

        // Date filter for Cheque Date
        if (chequeStartDate || chequeEndDate) {
            query.chequeDate = {};
            if (chequeStartDate) query.chequeDate.$gte = new Date(chequeStartDate);
            if (chequeEndDate) {
                const end = new Date(chequeEndDate);
                end.setHours(23, 59, 59, 999);
                query.chequeDate.$lte = end;
            }
        }

        // If status specified, validate and apply
        if (status) {
            const allowedStatuses = ["PAID", "REJECTED", "CANCELLED", "PENDING_CLEARANCE"];
            const statusArray = Array.isArray(status) ? status : [status];
            const validStatusFilters = statusArray.filter(s => allowedStatuses.includes(s));
            if (validStatusFilters.length > 0) {
                query.status = { $in: validStatusFilters };
            } else {
                query.status = { $in: ["PAID", "REJECTED", "CANCELLED"] };
            }
        } else {
            query.status = { $in: ["PAID", "REJECTED", "CANCELLED"] };
        }

        let cheques = await Payment.find(query)
            .populate({
                path: "processedBy",
                select: "name"
            })
            .populate({
                path: "depositedBy",
                select: "name"
            })
            .populate("bankAccount")
            .sort({ createdAt: -1 })
            .lean();

        // Manual Population
        await populateAdmissions(cheques);

        // Filter based on user's authorized assigned centres (under User Management)
        const userRoles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role || ''];
        const isSuperAdmin = userRoles.some(r => {
            const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
            return clean === 'superadmin';
        });

        if (!isSuperAdmin) {
            const userCentreIds = (req.user?.centres || []).map(c => typeof c === 'object' && c?._id ? c._id : c);
            const userCentres = await CentreSchema.find({
                _id: { $in: userCentreIds }
            }).select('centreName');
            const authorizedCentreNames = new Set([
                ...userCentres.map(c => (c.centreName || '').trim().toLowerCase()),
                ...(req.user?.centres || []).map(c => typeof c === 'object' && c?.centreName ? c.centreName.trim().toLowerCase() : null)
            ]);
            authorizedCentreNames.delete(null);
            authorizedCentreNames.delete('');

            cheques = cheques.filter(c => {
                const adm = c.admission;
                const admCentre = (adm?.centre || '').trim().toLowerCase();
                return admCentre && authorizedCentreNames.has(admCentre);
            });
        }

        // Filter results based on query params (since some data is in populated fields)
        if (centre || course || department || search) {
            const requestedCentres = centre ? (Array.isArray(centre) ? centre : [centre]) : [];
            const requestedCourses = course ? (Array.isArray(course) ? course : [course]) : [];
            const requestedDepts = department ? (Array.isArray(department) ? department : [department]) : [];

            // Normalize centre names for robust matching (trim and lowercase)
            const normalizedRequestedCentres = requestedCentres.map(c => (c || "").trim().toLowerCase()).filter(Boolean);

            cheques = cheques.filter(c => {
                const adm = c.admission;
                if (!adm) return false;

                // Robust centre matching (ignoring whitespace and case)
                let matchesCentre = true;
                if (normalizedRequestedCentres.length > 0) {
                    const admCentre = (adm.centre || "").trim().toLowerCase();
                    matchesCentre = normalizedRequestedCentres.includes(admCentre);
                }

                // Course multi-select matching
                let matchesCourse = true;
                if (requestedCourses.length > 0) {
                    const courseName = c.isBoardAdmission ? adm.boardCourseName : adm.course?.courseName;
                    matchesCourse = requestedCourses.includes(courseName);
                }

                // Department multi-select matching
                let matchesDept = true;
                if (requestedDepts.length > 0) {
                    const deptName = c.isBoardAdmission ? "Board" : adm.department?.departmentName;
                    matchesDept = requestedDepts.includes(deptName);
                }

                // Search matching (Admission No, Student Name, Cheque Number)
                let matchesSearch = true;
                if (search && search.trim()) {
                    const term = search.trim().toLowerCase();
                    const student = adm.student;
                    const studentName = (c.isBoardAdmission
                        ? (adm.studentName || adm.studentId?.studentsDetails?.[0]?.studentName || adm.studentId?.name)
                        : (student?.studentsDetails?.[0]?.studentName || student?.name || student?.studentName || adm.studentName || "")
                    ) || "";
                    const admNo = (c.isBoardAdmission ? adm.admissionNumber : (adm.admissionNumber || adm.admissionNo)) || "";
                    const chqNo = c.transactionId || c.chequeNumber || "";

                    matchesSearch = studentName.toLowerCase().includes(term) ||
                        admNo.toLowerCase().includes(term) ||
                        chqNo.toLowerCase().includes(term);
                }

                return matchesCentre && matchesCourse && matchesDept && matchesSearch;
            });
        }

        const allAccounts = await Account.find().lean();
        const accountMap = new Map(allAccounts.map(a => [a._id.toString(), a]));

        // Format for frontend response
        const formattedCheques = await Promise.all(cheques.map(async (c) => {
            const adm = c.admission;
            const isBoard = c.isBoardAdmission;
            const student = adm?.student;
            const studentName = isBoard
                ? (adm?.studentName || adm?.studentId?.studentsDetails?.[0]?.studentName || adm?.studentId?.name || "N/A")
                : (
                    student?.studentsDetails?.[0]?.studentName ||
                    student?.name ||
                    student?.studentName ||
                    adm?.studentsDetails?.[0]?.studentName ||
                    adm?.studentName ||
                    "N/A"
                );
            const admissionNo = isBoard ? (adm?.admissionNumber || "N/A") : (adm?.admissionNumber || adm?.admissionNo || "N/A");

            let signedReceiptUrl = c.receiptUrl || null;
            if (signedReceiptUrl && !signedReceiptUrl.startsWith("http")) {
                try {
                    signedReceiptUrl = await getFileUrl(signedReceiptUrl);
                } catch (e) {
                    console.error("Error signing receipt URL:", e);
                }
            }

            // Resolve bank account
            let bankAcc = null;
            if (c.bankAccount) {
                bankAcc = typeof c.bankAccount === 'object' && c.bankAccount.accname ? c.bankAccount : accountMap.get(c.bankAccount.toString());
            }
            if (!bankAcc && adm) {
                if (c.installmentNumber === 0) {
                    const dpAcc = adm.downPaymentBankAccount || adm.paymentBreakdown?.[0]?.bankAccount || adm.bankAccount;
                    bankAcc = typeof dpAcc === 'object' && dpAcc?.accname ? dpAcc : (dpAcc ? accountMap.get(dpAcc.toString()) : null);
                } else {
                    const inst = adm.paymentBreakdown?.find(p => p.installmentNumber === c.installmentNumber);
                    const instAcc = inst?.bankAccount;
                    bankAcc = typeof instAcc === 'object' && instAcc?.accname ? instAcc : (instAcc ? accountMap.get(instAcc.toString()) : null);
                    if (!bankAcc && isBoard) {
                        const bInst = adm.installments?.find(i => i.monthNumber === c.installmentNumber || i.monthNumber === (c.installmentNumber + 1));
                        const lastTx = bInst?.paymentTransactions?.[bInst.paymentTransactions?.length - 1];
                        const bAcc = lastTx?.bankAccount || bInst?.bankAccount;
                        bankAcc = typeof bAcc === 'object' && bAcc?.accname ? bAcc : (bAcc ? accountMap.get(bAcc.toString()) : null);
                    }
                }
            }

            const bankAccountLabel = bankAcc
                ? (bankAcc.accno ? `${bankAcc.accname.toUpperCase()} (A/C: ${bankAcc.accno})` : bankAcc.accname.toUpperCase())
                : (c.depositAccount || null);

            return {
                id: c._id,
                paymentId: c._id,
                chequeNumber: c.transactionId || c.chequeNumber || "N/A",
                studentName,
                admissionNo,
                bankName: c.bankName || c.accountHolderName || "N/A",
                accountHolderName: c.accountHolderName || "N/A",
                bankAccount: bankAcc ? {
                    _id: bankAcc._id,
                    accname: bankAcc.accname,
                    accno: bankAcc.accno
                } : null,
                bankAccountName: bankAccountLabel,
                bankAccountOnlyName: bankAcc ? bankAcc.accname : null,
                bankAccountNumber: bankAcc ? bankAcc.accno : null,
                amount: c.paidAmount,
                receivedDate: c.receivedDate || c.paidDate || c.createdAt,
                chequeDate: c.chequeDate,
                status: c.status === "PAID" ? "Cleared" : (c.status === "REJECTED" ? "Rejected" : (c.status === "CANCELLED" ? "Cancelled" : "Pending")),
                centre: adm?.centre || "N/A",
                course: isBoard ? adm?.boardCourseName : (adm?.course?.courseName || "N/A"),
                department: isBoard ? "Board" : (adm?.department?.departmentName || "N/A"),
                remarks: c.remarks || "N/A",
                processedBy: c.processedBy?.name || "System",
                processedDate: c.updatedAt,
                clearedOrRejectedDate: c.clearedOrRejectedDate,
                receiptFile: signedReceiptUrl,
                depositedDate: c.depositedDate,
                depositAccount: c.depositAccount,
                depositedBy: c.depositedBy?.name || null,
                isDeposited: c.isDeposited || false
            };
        }));

        res.status(200).json(formattedCheques);
    } catch (error) {
        console.error("Get All Cheques Error:", error);
        res.status(500).json({ message: "Error fetching cheques", error: error.message });
    }
};

// Cancel a cheque
export const cancelCheque = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason } = req.body;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        // Try Normal Admission first, then Board Admission
        let admission = await Admission.findById(payment.admission);
        let isBoardAdmission = false;

        if (!admission) {
            admission = await BoardCourseAdmission.findById(payment.admission);
            isBoardAdmission = true;
        }

        if (!admission) {
            return res.status(404).json({ message: "Admission record not found" });
        }

        // Center Visibility Restriction
        const userRoles = Array.isArray(req.user?.role) ? req.user.role : [req.user?.role || ''];
        const isSuperAdmin = userRoles.some(r => {
            const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
            return clean === 'superadmin';
        });

        if (!isSuperAdmin) {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentreNames = currentUser ? currentUser.centres.map(c => (c.centreName || "").trim().toLowerCase()).filter(Boolean) : [];
            const centerName = (admission.centre || "").trim().toLowerCase();
            if (!userCentreNames.includes(centerName)) {
                return res.status(403).json({ message: "Access denied: You cannot cancel cheques for this center" });
            }
        }

        // Revert any variance adjustments made during payment recording
        await revertPaymentVariance(payment, admission, isBoardAdmission);

        // 1. Update Payment record
        payment.status = "CANCELLED";
        payment.remarks = (payment.remarks ? payment.remarks + "; " : "") + `CANCELLED: ${reason}`;
        payment.processedBy = req.user.id || req.user._id;
        await payment.save();

        if (isBoardAdmission) {
            // 2. Update Board Admission installments
            const inst = admission.installments.find(i => i.monthNumber === payment.installmentNumber);
            if (inst) {
                // Subtract the cancelled amount
                inst.paidAmount = Math.max(0, (inst.paidAmount || 0) - (payment.paidAmount || 0));

                // Reset status
                if (inst.paidAmount > 0.5) inst.status = "PARTIAL";
                else inst.status = "PENDING";

                // Remove transaction
                if (payment.transactionId) {
                    inst.paymentTransactions = inst.paymentTransactions.filter(t => t.transactionId !== payment.transactionId);
                }
            }

            // 3. Recalculate Board Admission totals
            const isExamFee = payment.remarks?.toLowerCase().includes("exam");
            if (isExamFee) {
                admission.examFeePaid = Math.max(0, (admission.examFeePaid || 0) - (payment.paidAmount || 0));
                if (admission.examFeePaid > 0) admission.examFeeStatus = "PARTIAL";
                else admission.examFeeStatus = "PENDING";
            }

            admission.totalPaidAmount = admission.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0);

            // Recalculate cascade
            let runningBalance = 0;
            let adjustmentApplied = false;
            for (let i = 0; i < admission.installments.length; i++) {
                const current = admission.installments[i];
                const netMonthly = (current.standardAmount || 0) - (current.waiverAmount || 0);
                const extraFees = current.monthNumber === 1 ? (Number(admission.admissionFee) || 0) : 0;

                if (current.monthNumber > 1 && !adjustmentApplied && Math.abs(runningBalance) > 0.5) {
                    current.adjustmentAmount = -runningBalance;
                    adjustmentApplied = true;
                } else if (current.monthNumber > 1) {
                    current.adjustmentAmount = 0;
                }

                current.payableAmount = Math.max(0, netMonthly + extraFees + (current.adjustmentAmount || 0));

                if (current.paidAmount >= current.payableAmount - 0.5 && current.payableAmount > 0) {
                    current.status = "PAID";
                } else if (current.paidAmount > 0.5) {
                    current.status = "PARTIAL";
                } else {
                    current.status = "PENDING";
                }

                if (current.paidAmount > 0.5) {
                    runningBalance += (current.paidAmount - (netMonthly + extraFees));
                    adjustmentApplied = false;
                }
            }
        } else {
            // 2. Update Normal Admission paymentBreakdown or Down Payment
            const today = new Date();

            if (payment.installmentNumber === 0) {
                if (admission.downPaymentStatus === "PAID" || admission.downPaymentStatus === "PENDING_CLEARANCE") {
                    admission.downPaymentStatus = "REJECTED";
                }
                admission.remarks = (admission.remarks ? admission.remarks + "; " : "") + `Down payment cheque cancelled: ${reason}`;
            }

            // Find the primary installment
            const installment = (admission.paymentBreakdown || []).find(
                p => p.installmentNumber === payment.installmentNumber
            );

            if (installment) {
                installment.status = (new Date(installment.dueDate) < today) ? "OVERDUE" : "PENDING";
                installment.paidAmount = 0;
                installment.paymentMethod = null;
                installment.transactionId = null;
                installment.remarks = (installment.remarks ? installment.remarks + "; " : "") + `Cheque cancelled: ${reason}`;
            }

            // --- CASCADING REVERSION (Crucial Fix) ---
            // If this payment credited future installments (Auto-Credit), we must revert them too.
            if (payment.transactionId) {
                const searchId = payment.transactionId;
                (admission.paymentBreakdown || []).forEach(p => {
                    // Check if this installment was paid using the cancelled transaction ID (even as auto-credit)
                    if (p.transactionId && p.transactionId.includes(searchId) && p.installmentNumber !== payment.installmentNumber) {
                        console.log(`Cascading Cancellation: Reverting auto-paid Inst #${p.installmentNumber} linked to txn ${searchId}`);
                        p.status = (new Date(p.dueDate) < today) ? "OVERDUE" : "PENDING";
                        p.paidAmount = 0;
                        p.paymentMethod = null;
                        p.transactionId = null;
                        p.remarks = (p.remarks ? p.remarks + "; " : "") + `Reverted due to cancellation of source cheque ${searchId}`;
                    }
                });
            }

            // 3. Recalculate Normal Admission totalPaidAmount
            admission.totalPaidAmount = (admission.paymentBreakdown || []).reduce(
                (sum, p) => sum + (p.status === "PAID" ? (p.paidAmount || 0) : 0),
                0
            ) + (admission.downPaymentStatus === "PAID" ? (admission.downPayment || 0) : 0);

            // Recalculate remaining amount
            admission.remainingAmount = Math.max(0, admission.totalFees - admission.totalPaidAmount);

            // Update paymentStatus
            if (admission.totalPaidAmount >= admission.totalFees - 0.5) {
                admission.paymentStatus = "COMPLETED";
                admission.remainingAmount = 0;
            } else if (admission.totalPaidAmount > 0) {
                admission.paymentStatus = "PARTIAL";
            } else {
                admission.paymentStatus = "PENDING";
            }

            // 4. Update Board-type Normal Admission monthly history if applicable
            if (admission.admissionType === 'BOARD' && payment.billingMonth) {
                const historyEntry = admission.monthlySubjectHistory?.find(h => h.month === payment.billingMonth);
                if (historyEntry) {
                    historyEntry.isPaid = false;
                    historyEntry.status = "PENDING";
                }
            }
        }

        await admission.save();

        res.status(200).json({ message: "Cheque cancelled successfully" });
    } catch (error) {
        console.error("Cancel Cheque Error:", error);
        res.status(500).json({ message: "Error cancelling cheque", error: error.message });
    }
};
