import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import PNTSEStudent from "../../models/PNTSEStudent.js";
import PMOStudent from "../../models/PMOStudent.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Account from "../../models/Master_data/Account.js";
import { isGstExempt } from "../../utils/gstHelper.js";
import { clearCachePattern } from "../../utils/redisCache.js";

const checkEditBillRoleAccess = (user) => {
    if (!user) return false;
    const roles = Array.isArray(user.role) ? user.role : [user.role || ''];
    const isAllowedRole = roles.some(r => {
        const clean = (typeof r === 'string' ? r : '').toLowerCase().replace(/[\s\-_]+/g, '');
        return clean === 'superadmin' || clean === 'digital' || clean === 'accounts' || clean === 'account';
    });
    if (!isAllowedRole) return false;

    const hasCustomPerms = user.granularPermissions && typeof user.granularPermissions === 'object' && Object.keys(user.granularPermissions).length > 0;
    if (!hasCustomPerms) return true;

    const finSec = user.granularPermissions.financeFees;
    if (!finSec) return false;
    if (finSec.editBill) {
        return finSec.editBill.view === true || finSec.editBill.edit === true || finSec.editBill.create === true || Object.values(finSec.editBill).some(v => v === true);
    }
    return Object.keys(finSec).length > 0;
};

/**
 * Search for bills by billId, transactionId, rollNo, or admissionNumber.
 */
export const searchBill = async (req, res) => {
    try {
        if (!checkEditBillRoleAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Edit Bill is strictly restricted to SuperAdmin, Digital, and Accounts roles."
            });
        }

        const queryParam = (req.params.billNumber || req.query.billNumber || req.query.query || "").trim();

        if (!queryParam) {
            return res.status(400).json({
                success: false,
                message: "Please provide a Bill Number to search"
            });
        }

        // 1. Try exact match on billId first
        let payments = await Payment.find({
            billId: { $regex: new RegExp(`^${queryParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        })
            .populate({
                path: 'admission',
                populate: [
                    { path: 'student', populate: { path: 'batches' } },
                    { path: 'course' },
                    { path: 'board' },
                    { path: 'department' },
                    { path: 'examTag' },
                    { path: 'class' },
                    { path: 'paymentBreakdown.bankAccount' }
                ]
            })
            .populate('bankAccount')
            .populate('recordedBy', 'name email role')
            .populate('processedBy', 'name email role')
            .sort({ createdAt: -1 });

        // 2. If no exact match on billId, search by partial billId, transactionId, or admission
        if (!payments || payments.length === 0) {
            payments = await Payment.find({
                $or: [
                    { billId: { $regex: queryParam, $options: 'i' } },
                    { transactionId: { $regex: queryParam, $options: 'i' } }
                ]
            })
                .populate({
                    path: 'admission',
                    populate: [
                        { path: 'student', populate: { path: 'batches' } },
                        { path: 'course' },
                        { path: 'board' },
                        { path: 'department' },
                        { path: 'examTag' },
                        { path: 'class' },
                        { path: 'paymentBreakdown.bankAccount' }
                    ]
                })
                .populate('bankAccount')
                .populate('recordedBy', 'name email role')
                .populate('processedBy', 'name email role')
                .sort({ createdAt: -1 })
                .limit(20);
        }

        // 3. If still nothing found, search in Admission by admissionNumber or student rollNo
        if (!payments || payments.length === 0) {
            const admissions = await Admission.find({
                $or: [
                    { admissionNumber: { $regex: queryParam, $options: 'i' } }
                ]
            }).select('_id');

            if (admissions.length > 0) {
                const admissionIds = admissions.map(a => a._id);
                payments = await Payment.find({
                    admission: { $in: admissionIds },
                    billId: { $exists: true, $nin: [null, ""] }
                })
                    .populate({
                        path: 'admission',
                        populate: [
                            { path: 'student', populate: { path: 'batches' } },
                            { path: 'course' },
                            { path: 'board' },
                            { path: 'department' },
                            { path: 'examTag' },
                            { path: 'class' },
                            { path: 'paymentBreakdown.bankAccount' }
                        ]
                    })
                    .populate('bankAccount')
                    .populate('recordedBy', 'name email role')
                    .populate('processedBy', 'name email role')
                    .sort({ createdAt: -1 })
                    .limit(20);
            }
        }

        // 4. Also check BoardCourseAdmissions if not found
        if (!payments || payments.length === 0) {
            const boardAdmissions = await BoardCourseAdmission.find({
                $or: [
                    { admissionNumber: { $regex: queryParam, $options: 'i' } }
                ]
            }).select('_id');

            if (boardAdmissions.length > 0) {
                const boardIds = boardAdmissions.map(b => b._id);
                payments = await Payment.find({
                    admission: { $in: boardIds },
                    billId: { $exists: true, $nin: [null, ""] }
                })
                    .populate('bankAccount')
                    .populate('recordedBy', 'name email role')
                    .populate('processedBy', 'name email role')
                    .sort({ createdAt: -1 })
                    .limit(20);
            }
        }

        if (!payments || payments.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No bill found matching "${queryParam}". Please check the Bill Number.`
            });
        }

        // Process details for each payment record
        const enrichedBills = await Promise.all(payments.map(async (payment) => {
            const paymentObj = payment.toObject();
            let admission = payment.admission;
            let admissionType = "STANDARD";

            // If admission was not populated or is a BoardCourseAdmission
            if (!admission || !admission.student) {
                const boardAdm = await BoardCourseAdmission.findById(payment.admission)
                    .populate({
                        path: 'studentId',
                        populate: [
                            { path: 'department' },
                            { path: 'batches', select: 'batchName' }
                        ]
                    })
                    .populate('boardId')
                    .populate('department')
                    .populate('examTag');

                if (boardAdm) {
                    admissionType = "BOARD";
                    admission = {
                        _id: boardAdm._id,
                        admissionNumber: boardAdm.admissionNumber || "N/A",
                        student: boardAdm.studentId,
                        studentName: boardAdm.studentName || boardAdm.studentId?.studentsDetails?.[0]?.studentName,
                        mobileNum: boardAdm.mobileNum || boardAdm.studentId?.studentsDetails?.[0]?.mobileNum,
                        centre: boardAdm.centre || payment.centre,
                        course: { courseName: boardAdm.boardCourseName || boardAdm.boardId?.boardCourse || "Board Course" },
                        boardCourseName: boardAdm.boardCourseName || boardAdm.boardId?.boardCourse,
                        department: boardAdm.department,
                        examTag: boardAdm.examTag,
                        academicSession: boardAdm.academicSession,
                        totalFees: boardAdm.totalExpectedAmount || 0,
                        totalPaidAmount: boardAdm.totalPaidAmount || 0,
                        paymentStatus: boardAdm.status,
                        installments: boardAdm.installments
                    };
                }
            }

            // Also check PNTSE / PMO if linked
            let pntseRecord = null;
            let pmoRecord = null;
            if (payment.billId) {
                pntseRecord = await PNTSEStudent.findOne({ billId: payment.billId }).lean().catch(() => null);
                if (!pntseRecord) {
                    pmoRecord = await PMOStudent.findOne({ billId: payment.billId }).lean().catch(() => null);
                }
            }

            // Centre details
            const centreName = admission?.centre || payment.centre;
            let centre = null;
            if (centreName) {
                centre = await CentreSchema.findOne({
                    centreName: { $regex: new RegExp(`^${centreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                }).lean().catch(() => null);
            }

            // Exemption check
            const exempt = isGstExempt({
                centreName: centreName,
                admission: admission,
                student: admission?.student
            });

            // Format student details
            const studentDoc = admission?.student;
            const studentDetails = {
                id: studentDoc?._id || admission?.studentId || pntseRecord?._id || pmoRecord?._id,
                name: studentDoc?.studentsDetails?.[0]?.studentName || admission?.studentName || pntseRecord?.name || pmoRecord?.name || "N/A",
                admissionNumber: admission?.admissionNumber || pntseRecord?.rollNo || pmoRecord?.rollNo || "N/A",
                rollNo: studentDoc?.studentsDetails?.[0]?.rollNo || pntseRecord?.rollNo || pmoRecord?.rollNo || admission?.admissionNumber || "N/A",
                mobileNum: studentDoc?.studentsDetails?.[0]?.mobileNum || admission?.mobileNum || pntseRecord?.phoneNo || pmoRecord?.phoneNo || "N/A",
                email: studentDoc?.studentsDetails?.[0]?.studentEmail || pntseRecord?.email || pmoRecord?.email || "N/A",
                batches: studentDoc?.batches?.map(b => b.batchName || b.name || b) || []
            };

            // Format course details
            const courseDetails = {
                name: payment.boardCourseName || admission?.boardCourseName || admission?.course?.courseName || pntseRecord?.course || pmoRecord?.course || "N/A",
                department: admission?.department?.departmentName || "N/A",
                examTag: admission?.examTag?.name || admission?.examTag?.tagName || "N/A",
                class: admission?.class?.name || admission?.lastClass || "N/A",
                session: admission?.academicSession || "N/A"
            };

            return {
                payment: paymentObj,
                admissionType,
                admissionSummary: admission ? {
                    _id: admission._id,
                    admissionNumber: admission.admissionNumber,
                    totalFees: admission.totalFees,
                    downPayment: admission.downPayment,
                    totalPaidAmount: admission.totalPaidAmount,
                    remainingAmount: admission.remainingAmount,
                    paymentStatus: admission.paymentStatus,
                    admissionDate: admission.admissionDate
                } : null,
                student: studentDetails,
                course: courseDetails,
                centre: centre || { centreName: centreName || "N/A" },
                isGstExempt: exempt
            };
        }));

        return res.status(200).json({
            success: true,
            count: enrichedBills.length,
            data: enrichedBills.length === 1 ? enrichedBills[0] : enrichedBills
        });
    } catch (error) {
        console.error("Error in searchBill:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to search bill",
            error: error.message
        });
    }
};

/**
 * Update bill and payment details, and synchronize across all associated records.
 */
export const updateBill = async (req, res) => {
    try {
        if (!checkEditBillRoleAccess(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Edit Bill is strictly restricted to SuperAdmin, Digital, and Accounts roles."
            });
        }

        const { paymentId } = req.params;
        const {
            billId: newBillId,
            paidAmount,
            courseFee: customCourseFee,
            cgst: customCgst,
            sgst: customSgst,
            amount,
            paymentMethod,
            transactionId,
            paidDate,
            receivedDate,
            dueDate,
            chequeDate,
            bankAccount,
            accountHolderName,
            bankName,
            remarks,
            status,
            centre
        } = req.body;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: "Payment ID is required"
            });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found"
            });
        }

        const oldBillId = payment.billId;

        // 1. Check if newBillId conflicts with another payment
        if (newBillId && newBillId !== payment.billId) {
            const existing = await Payment.findOne({ billId: newBillId, _id: { $ne: paymentId } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: `Bill Number ${newBillId} already exists in another payment record`
                });
            }
            payment.billId = newBillId.trim();
        }

        // 2. Fetch associated Admission or BoardCourseAdmission to evaluate GST and updates
        let admission = null;
        let isBoardAdmission = false;

        if (payment.admission) {
            admission = await Admission.findById(payment.admission)
                .populate({ path: 'student', populate: { path: 'batches' } })
                .populate('board')
                .populate('course');

            if (!admission) {
                admission = await BoardCourseAdmission.findById(payment.admission)
                    .populate({ path: 'studentId', populate: { path: 'batches' } })
                    .populate('boardId');
                if (admission) {
                    isBoardAdmission = true;
                }
            }
        }

        // 3. GST Calculations (use directly supplied custom GST fields if present)
        let courseFee, cgst, sgst, billTotal;

        if (customCourseFee !== undefined && customCgst !== undefined && customSgst !== undefined) {
            courseFee = parseFloat(Number(customCourseFee || 0).toFixed(2));
            cgst = parseFloat(Number(customCgst || 0).toFixed(2));
            sgst = parseFloat(Number(customSgst || 0).toFixed(2));
            billTotal = (paidAmount !== undefined && paidAmount !== null && paidAmount !== "")
                ? parseFloat(Number(paidAmount).toFixed(2))
                : parseFloat((courseFee + cgst + sgst).toFixed(2));
        } else {
            const effectivePaidAmount = (paidAmount !== undefined && paidAmount !== null && paidAmount !== "")
                ? parseFloat(paidAmount)
                : payment.paidAmount;

            const effectiveCentre = centre || payment.centre || admission?.centre;

            const exempt = isGstExempt({
                centreName: effectiveCentre,
                admission: admission,
                student: admission?.student || admission?.studentId
            });

            billTotal = parseFloat(Number(effectivePaidAmount || 0).toFixed(2));
            const baseAmount = exempt ? billTotal : billTotal / 1.18;
            courseFee = parseFloat(baseAmount.toFixed(2));
            const remainingGst = exempt ? 0 : billTotal - courseFee;
            cgst = parseFloat((remainingGst / 2).toFixed(2));
            sgst = parseFloat((remainingGst - cgst).toFixed(2));
        }

        // 4. Update Payment fields
        if (amount !== undefined && amount !== null && amount !== "") {
            payment.amount = parseFloat(amount);
        }
        payment.paidAmount = billTotal;
        payment.totalAmount = billTotal;
        payment.courseFee = courseFee;
        payment.cgst = cgst;
        payment.sgst = sgst;

        if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
        if (transactionId !== undefined) payment.transactionId = transactionId;
        if (paidDate !== undefined) payment.paidDate = paidDate ? new Date(paidDate) : null;
        if (receivedDate !== undefined) payment.receivedDate = receivedDate ? new Date(receivedDate) : null;
        if (dueDate !== undefined) payment.dueDate = dueDate ? new Date(dueDate) : null;
        if (chequeDate !== undefined) payment.chequeDate = chequeDate ? new Date(chequeDate) : null;
        if (bankAccount !== undefined) payment.bankAccount = (bankAccount && bankAccount !== "") ? bankAccount : null;
        if (accountHolderName !== undefined) payment.accountHolderName = accountHolderName;
        if (bankName !== undefined) payment.bankName = bankName;
        if (remarks !== undefined) payment.remarks = remarks;
        if (status !== undefined) payment.status = status;
        if (centre !== undefined) payment.centre = centre;

        payment.processedBy = req.user?.id || req.user?._id || payment.processedBy;

        await payment.save();

        // 5. Synchronize with Admission document
        if (admission && !isBoardAdmission) {
            const installmentNum = payment.installmentNumber;

            if (installmentNum === 0) {
                // Down Payment
                admission.downPayment = billTotal;
                if (paymentMethod) admission.downPaymentPaymentMethod = paymentMethod;
                if (transactionId !== undefined) admission.downPaymentTransactionId = transactionId;
                if (paidDate || receivedDate) admission.downPaymentDate = paidDate ? new Date(paidDate) : (receivedDate ? new Date(receivedDate) : admission.downPaymentDate);
                if (status) {
                    admission.downPaymentStatus = (status === "PENDING_CLEARANCE") ? "PENDING_CLEARANCE" : (status === "REJECTED" ? "REJECTED" : "PAID");
                }
            } else if (admission.paymentBreakdown && admission.paymentBreakdown.length > 0) {
                // Regular Installment in paymentBreakdown
                const instIndex = admission.paymentBreakdown.findIndex(p => p.installmentNumber === installmentNum);
                if (instIndex !== -1) {
                    const inst = admission.paymentBreakdown[instIndex];
                    inst.paidAmount = billTotal;
                    if (paymentMethod) inst.paymentMethod = paymentMethod;
                    if (transactionId !== undefined) inst.transactionId = transactionId;
                    if (paidDate) inst.paidDate = new Date(paidDate);
                    if (receivedDate) inst.receivedDate = new Date(receivedDate);
                    if (dueDate) inst.dueDate = new Date(dueDate);
                    if (chequeDate) inst.chequeDate = new Date(chequeDate);
                    if (bankAccount !== undefined) inst.bankAccount = (bankAccount && bankAccount !== "") ? bankAccount : undefined;
                    if (accountHolderName !== undefined) inst.accountHolderName = accountHolderName;
                    if (remarks !== undefined) inst.remarks = remarks;
                    if (status) inst.status = status;
                }
            }

            // Recalculate Admission Total Paid and Remaining Amounts
            const paidDownPayment = (!["REJECTED", "CANCELLED"].includes(admission.downPaymentStatus) && admission.downPayment > 0)
                ? (admission.downPayment || 0)
                : 0;

            const paidInstallmentsSum = (admission.paymentBreakdown || []).reduce((sum, p) => {
                if (["PAID", "COMPLETED"].includes(p.status) || (p.paidAmount > 0 && p.status !== "REJECTED" && p.status !== "CANCELLED")) {
                    return sum + (p.paidAmount || 0);
                }
                return sum;
            }, 0);

            admission.totalPaidAmount = parseFloat((paidDownPayment + paidInstallmentsSum).toFixed(2));
            admission.remainingAmount = Math.max(0, parseFloat(((admission.totalFees || 0) - admission.totalPaidAmount).toFixed(2)));

            if (admission.totalPaidAmount >= (admission.totalFees || 0) && (admission.totalFees || 0) > 0) {
                admission.paymentStatus = "COMPLETED";
                admission.remainingAmount = 0;
            } else if (admission.totalPaidAmount > 0) {
                admission.paymentStatus = "PARTIAL";
            } else {
                admission.paymentStatus = "PENDING";
            }

            await admission.save();
        } else if (admission && isBoardAdmission) {
            // Synchronize with BoardCourseAdmission
            const installmentNum = payment.installmentNumber;
            if (admission.installments && admission.installments.length > 0) {
                const inst = admission.installments.find(i => i.monthNumber === installmentNum || i.monthNumber === installmentNum + 1);
                if (inst) {
                    inst.paidAmount = billTotal;
                    if (status) inst.status = status;
                    if (inst.paymentTransactions && inst.paymentTransactions.length > 0) {
                        const lastTx = inst.paymentTransactions[inst.paymentTransactions.length - 1];
                        lastTx.amount = billTotal;
                        if (paymentMethod) lastTx.paymentMethod = paymentMethod;
                        if (transactionId !== undefined) lastTx.transactionId = transactionId;
                        if (bankAccount !== undefined) lastTx.bankAccount = bankAccount;
                        if (accountHolderName !== undefined) lastTx.accountHolderName = accountHolderName;
                        if (bankName !== undefined) lastTx.bankName = bankName;
                    }
                }
            }

            // Recalculate Board totalPaidAmount
            const totalPaidBoard = (admission.installments || []).reduce((sum, i) => sum + (i.paidAmount || 0), 0) + (admission.examFeePaid || 0) + (admission.additionalThingsPaid || 0);
            admission.totalPaidAmount = totalPaidBoard;
            await admission.save();
        }

        // 6. Synchronize PNTSE / PMO if linked
        if (oldBillId) {
            await PNTSEStudent.updateMany(
                { billId: oldBillId },
                {
                    $set: {
                        billId: payment.billId,
                        amountPaid: billTotal,
                        ...(paymentMethod ? { paymentMethod } : {})
                    }
                }
            );

            await PMOStudent.updateMany(
                { billId: oldBillId },
                {
                    $set: {
                        billId: payment.billId,
                        amountPaid: billTotal,
                        ...(paymentMethod ? { paymentMethod } : {})
                    }
                }
            );
        }

        // 7. Invalidate caches for instant reporting consistency across all modules
        await Promise.all([
            clearCachePattern("finance:*"),
            clearCachePattern("sales:*"),
            clearCachePattern("admissions:*")
        ]).catch(err => console.warn("Cache eviction warning:", err.message));

        return res.status(200).json({
            success: true,
            message: "Bill details updated and synchronized successfully",
            data: {
                payment,
                admissionSummary: admission ? {
                    _id: admission._id,
                    admissionNumber: admission.admissionNumber,
                    totalFees: admission.totalFees,
                    totalPaidAmount: admission.totalPaidAmount,
                    remainingAmount: admission.remainingAmount,
                    paymentStatus: admission.paymentStatus
                } : null
            }
        });
    } catch (error) {
        console.error("Error in updateBill:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update bill",
            error: error.message
        });
    }
};
