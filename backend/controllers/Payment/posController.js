import PosTransaction from "../../models/Payment/PosTransaction.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Payment from "../../models/Payment/Payment.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import { updateCentreTargetAchieved } from "../../services/centreTargetService.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Returns the base URL for Ezetap/Razorpay P2P adapter APIs based on the current environment mode.
 * The production URL uses the 3.0 p2padapter path as identified from integration documentation.
 */
const getBaseUrl = () => {
    return process.env.EZETAP_MODE === 'production'
        ? "https://www.ezetap.com/api/3.0/p2padapter"
        : "https://demo.ezetap.com/api/3.0/p2padapter";
};

// ─────────────────────────────────────────────────────────────────────────────
// INITIATE Payment — fires the P2P push to the physical terminal
// ─────────────────────────────────────────────────────────────────────────────
export const initiatePosPayment = async (req, res) => {
    try {
        const { amount, externalRefNumber, deviceId, customerMobileNumber, customerName, centerName, mode, admissionId, admissionType } = req.body;

        let finalDeviceId = deviceId;

        // Auto-lookup posKey from Centre if not provided manually by user in the modal
        if (!finalDeviceId && centerName) {
            const center = await CentreSchema.findOne({ centreName: centerName });
            if (center && center.posKey) {
                finalDeviceId = center.posKey.toString().trim();
            }
        }

        if (!finalDeviceId) {
            return res.status(400).json({
                success: false,
                errorMessage: "Device ID not found. Please set the POS Machine Code in Centre settings or enter it manually."
            });
        }

        // External reference number: Prefix PF- followed by last 8 digits of timestamp. Max length 20.
        const extRef = (externalRefNumber || `PF-${Date.now().toString().slice(-8)}`).substring(0, 20);

        // Append |ezetap_android suffix to device serial if not already present
        const pushDeviceId = finalDeviceId.includes('|') ? finalDeviceId : `${finalDeviceId}|ezetap_android`;

        const payload = {
            appKey: process.env.EZETAP_APP_KEY,
            username: process.env.EZETAP_USERNAME,
            password: process.env.EZETAP_PASSWORD,
            orgCode: process.env.EZETAP_ORG_CODE,
            amount: Number(parseFloat(amount).toFixed(2)),
            externalRefNumber: extRef,
            customerMobileNumber: customerMobileNumber || "",
            pushTo: {
                deviceId: pushDeviceId
            },
            mode: mode || "CARD",
            expiry: 120 // Force POS machine to timeout in 120 seconds (2 minutes)
        };

        console.log(`[POS] Initiating payment of ₹${amount} to device ${pushDeviceId}`);
        console.log("[POS] Payload:", JSON.stringify(payload));

        const response = await fetch(`${getBaseUrl()}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("[POS] Ezetap Response:", JSON.stringify(data));

        if (data && data.success) {
            const tx = new PosTransaction({
                p2pRequestId: data.p2pRequestId,
                deviceId: finalDeviceId,
                amount,
                externalRefNumber: extRef,
                admissionId: admissionId,
                admissionType: admissionType || "NORMAL",
                customerName,
                customerMobileNumber,
                status: "WAITING"
            });
            await tx.save();

            return res.status(200).json({
                success: true,
                p2pRequestId: data.p2pRequestId,
                status: "WAITING",
                deviceId: finalDeviceId
            });
        } else {
            // Mapping specific Ezetap error codes to user-friendly messages
            let userMsg = "Failed to reach the POS machine.";

            if (data?.errorCode === "EZETAP_0000073" || data?.realCode === "AUTH_FAILED") {
                userMsg = "POS authentication failed. Please verify your Ezetap App Key and API User ID.";
            } else if (data?.errorCode === "JAVA_EXCEPTION_CAUGHT" || data?.errorCode === "EZETAP_0000382") {
                userMsg = `Could not find machine "${finalDeviceId}". Ensure the serial number matches the Razorpay POS dashboard and is online.`;
            } else if (data?.errorMessage) {
                userMsg = data.errorMessage;
            }

            console.error("[POS] Ezetap Initiate Failed:", data);
            return res.status(400).json({ success: false, errorMessage: userMsg });
        }

    } catch (error) {
        console.error("[POS] Initiate Error:", error);
        res.status(500).json({ success: false, errorMessage: "Server error contacting POS Gateway." });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS — poll payment result from Ezetap
// ─────────────────────────────────────────────────────────────────────────────
export const getPosPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const tx = await PosTransaction.findOne({ p2pRequestId: id });

        if (!tx) return res.status(404).json({ success: false, errorMessage: "Transaction not found" });

        const payload = {
            appKey: process.env.EZETAP_APP_KEY,
            username: process.env.EZETAP_USERNAME,
            p2pRequestId: tx.p2pRequestId
        };

        const response = await fetch(`${getBaseUrl()}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data && data.success) {
            const apiStatus = data.status || "WAITING";
            
            // Merge response data for frontend visibility (timings, receipts, etc)
            const responseData = {
                ...data,
                success: true,
                p2pRequestId: tx.p2pRequestId,
                status: apiStatus
            };

            // If transaction reaches a final state, persist it to DB
            if (["AUTHORIZED", "SUCCESS", "FAILED", "DECLINED", "CANCELLED"].includes(apiStatus)) {
                const isSuccess = ["AUTHORIZED", "SUCCESS"].includes(apiStatus);
                const wasWaiting = tx.status === "WAITING";
                
                tx.status = apiStatus;
                await tx.save();

                if (isSuccess && wasWaiting) {
                    console.log(`[POS] Payment ${tx.p2pRequestId} successful. Automating ERP update...`);
                    try {
                        const { admissionId, admissionType, amount } = tx;
                        
                        if (admissionId) {
                            let admission = await Admission.findById(admissionId);
                            if (!admission && admissionType === "BOARD") {
                                admission = await BoardCourseAdmission.findById(admissionId);
                            }

                            if (admission) {
                                console.log(`[POS] Found Admission: ${admission._id}`);
                                
                                const alreadyProcessed = 
                                    (admission.downPaymentTransactionId === tx.p2pRequestId) ||
                                    (admission.paymentBreakdown && admission.paymentBreakdown.some(p => p.transactionId === tx.p2pRequestId)) ||
                                    (admission.monthlySubjectHistory && admission.monthlySubjectHistory.some(h => h.transactionId === tx.p2pRequestId));

                                if (alreadyProcessed) {
                                    console.log(`[POS] Transaction ${tx.p2pRequestId} already processed.`);
                                } else {
                                    let installmentNum = 1;
                                    let instObj = null;
                                    let isDownPayment = (admission.totalPaidAmount || 0) < 1 || admission.downPaymentStatus === "PENDING";

                                    if (isDownPayment) {
                                        admission.downPaymentStatus = "PAID";
                                        admission.downPaymentTransactionId = tx.p2pRequestId;
                                        admission.downPaymentMethod = "RAZORPAY_POS";
                                        admission.downPaymentReceivedDate = new Date();
                                        installmentNum = 0;
                                    } else {
                                        if (admission.paymentBreakdown && admission.paymentBreakdown.length > 0) {
                                            instObj = admission.paymentBreakdown.find(i => i.status !== "PAID" && i.status !== "PENDING_CLEARANCE");
                                            if (instObj) installmentNum = instObj.installmentNumber;
                                        } else if (admission.monthlySubjectHistory && admission.monthlySubjectHistory.length > 0) {
                                            instObj = admission.monthlySubjectHistory.find(h => h.status !== "PAID");
                                            if (instObj) installmentNum = 99;
                                        }

                                        if (instObj) {
                                            instObj.status = "PAID";
                                            instObj.paidAmount = amount;
                                            instObj.paidDate = new Date();
                                            instObj.paymentMethod = "RAZORPAY_POS";
                                            instObj.transactionId = tx.p2pRequestId;
                                        }
                                    }

                                    admission.totalPaidAmount = (admission.totalPaidAmount || 0) + amount;
                                    if (admission.totalFees) {
                                        admission.remainingAmount = Math.max(0, (admission.totalFees || 0) - admission.totalPaidAmount);
                                        admission.paymentStatus = (admission.totalPaidAmount >= admission.totalFees) ? "COMPLETED" : "PARTIAL";
                                    }

                                    await admission.save();

                                    let centreCode = 'POS';
                                    if (admission.centre) {
                                        const centre = await CentreSchema.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
                                        if (centre) centreCode = centre.enterCode || 'POS';
                                    }
                                    
                                    const billId = await generateBillId(centreCode);
                                    const taxableAmount = amount / 1.18;
                                    const cgst = (amount - taxableAmount) / 2;
                                    const sgst = cgst;

                                    const paymentDoc = {
                                        admission: admission._id,
                                        installmentNumber: installmentNum,
                                        amount: amount,
                                        paidAmount: amount,
                                        dueDate: (instObj && instObj.dueDate) ? instObj.dueDate : new Date(),
                                        paidDate: new Date(),
                                        receivedDate: new Date(),
                                        status: "PAID",
                                        paymentMethod: "RAZORPAY_POS",
                                        transactionId: tx.p2pRequestId,
                                        recordedBy: null,
                                        billId: billId,
                                        cgst: parseFloat(cgst.toFixed(2)),
                                        sgst: parseFloat(sgst.toFixed(2)),
                                        courseFee: parseFloat(taxableAmount.toFixed(2)),
                                        totalAmount: amount,
                                        remarks: `POS Sync: ${tx.externalRefNumber}`,
                                        billingMonth: new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                                    };

                                    if (admission.boardCourseName) paymentDoc.boardCourseName = admission.boardCourseName;

                                    const newPayment = new Payment(paymentDoc);
                                    await newPayment.save();

                                    if (admission.centre) await updateCentreTargetAchieved(admission.centre, new Date());
                                    console.log(`[POS] Sync complete: ${tx.p2pRequestId} -> Bill ${billId}`);
                                }
                            }
                        }
                    } catch (autoError) {
                        console.error("[POS] Automation Error:", autoError);
                    }
                }
            }

            return res.status(200).json(responseData);
        } else {
            return res.status(400).json({
                success: false,
                errorMessage: data?.errorMessage || "Failed to fetch status from terminal"
            });
        }

    } catch (error) {
        console.error("[POS] Status Error:", error);
        res.status(500).json({ success: false, errorMessage: "Server error fetching status" });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL — cancel a pending notification
// ─────────────────────────────────────────────────────────────────────────────
export const cancelPosPayment = async (req, res) => {
    try {
        const { p2pRequestId } = req.body;

        const tx = await PosTransaction.findOne({ p2pRequestId });
        if (!tx) return res.status(404).json({ success: false, errorMessage: "Transaction not found" });

        const payload = {
            appKey: process.env.EZETAP_APP_KEY,
            username: process.env.EZETAP_USERNAME,
            password: process.env.EZETAP_PASSWORD,
            p2pRequestId: tx.p2pRequestId
        };

        console.log(`[POS] Cancelling transaction ${tx.p2pRequestId} on machine...`);
        console.log("[POS] Cancel Payload:", JSON.stringify(payload));

        const response = await fetch(`${getBaseUrl()}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data && data.success) {
            tx.status = "CANCELLED";
            await tx.save();
            return res.status(200).json({ success: true, status: "CANCELLED" });
        } else {
            return res.status(400).json({
                success: false,
                errorMessage: data?.errorMessage || "Cannot cancel transaction",
                status: tx.status
            });
        }
    } catch (error) {
        console.error("[POS] Cancel Error:", error);
        res.status(500).json({ success: false, errorMessage: "Server error cancelling transaction" });
    }
};
