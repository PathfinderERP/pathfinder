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
            password: process.env.EZETAP_PASSWORD,
            orgCode: process.env.EZETAP_ORG_CODE,
            p2pRequestId: tx.p2pRequestId,
            requestId: tx.p2pRequestId, // Fallback key name
            externalRefNumber: tx.externalRefNumber
        };

        // CLEAN minimalist payload for 3.0
        const payload3 = {
            appKey: process.env.EZETAP_APP_KEY,
            username: process.env.EZETAP_USERNAME,
            merchantId: process.env.EZETAP_USERNAME, // Backup identifier
            p2pRequestId: tx.p2pRequestId
        };

        // Try standard, P2P specific, and Legacy endpoints
        const endpoints = [
            { url: `${getBaseUrl()}/status`, format: "3.0", payload: { ...payload3, password: process.env.EZETAP_PASSWORD, orgCode: process.env.EZETAP_ORG_CODE } },
            { url: `https://p2p.ezetap.com/api/3.0/p2padapter/status`, format: "3.0", payload: payload3 },
            { url: `https://www.ezetap.com/api/3.0/p2p/status`, format: "3.0", payload: payload3 },
            { url: `https://www.ezetap.com/api/2.0/external/push/status`, format: "2.0", payload: { appKey: process.env.EZETAP_APP_KEY, username: process.env.EZETAP_USERNAME, externalRequestId: tx.p2pRequestId } }
        ];

        let finalData = null;
        let lastError = null;

        for (const endpoint of endpoints) {
            console.log(`[POS Status] Probing: ${endpoint.url}`);
            try {
                const response = await fetch(endpoint.url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(endpoint.payload)
                });

                const data = await response.json();
                
                if (data && (data.success || data.status)) {
                    finalData = data;
                    break;
                }
                
                // Keep track of errors but continue probing
                lastError = data;
                console.log(`[POS Status] Skipping ${endpoint.url}: ${data.errorCode || 'No response'}`);
            } catch (err) {
                console.error(`[POS Status] Endpoint ${endpoint.url} error:`, err.message);
            }
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // FINAL STATUS LOGIC
        // ─────────────────────────────────────────────────────────────────────────────
        const data = finalData || lastError || { success: false, errorMessage: "No response from terminal" };
        const apiStatus = data.status || "WAITING";
        const isSuccess = ["AUTHORIZED", "SUCCESS"].includes(apiStatus);
        const isFailure = ["FAILED", "DECLINED", "EXPIRED", "CANCELLED"].includes(apiStatus);

        // If it's not a definitive success or failure, we keep the frontend WAITING.
        // This avoids 400 errors when Ezetap crashes or returns weird Java Exceptions.
        if (!isSuccess && !isFailure) {
            console.log(`[POS Status] Treating Ezetap response (${apiStatus} / ${data.errorCode}) as WAITING for ${tx.p2pRequestId}`);
            return res.status(200).json({
                success: true,
                p2pRequestId: tx.p2pRequestId,
                status: "WAITING",
                apiMessageText: data.apiMessageText || "Connecting to terminal... please wait",
                errorMessage: data.errorMessage || data.errorCode
            });
        }

        console.log(`[POS Status] Final Ezetap Status for ${tx.p2pRequestId}: ${apiStatus}`);

        // Update DB status
        if (tx.status !== apiStatus) {
            tx.status = apiStatus;
            await tx.save();
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // ERP SYNC (Async - won't block the response)
        // ─────────────────────────────────────────────────────────────────────────────
        if (isSuccess && !tx.erpProcessed) {
            // Decouple sync so frontend gets response immediately
            (async () => {
                console.log(`[POS] Async syncing ERP for ${tx.p2pRequestId}...`);
                try {
                    const txDoc = await PosTransaction.findOne({ p2pRequestId: tx.p2pRequestId });
                    if (!txDoc || txDoc.erpProcessed) return;

                    const { admissionId, admissionType, amount } = txDoc;
                    if (!admissionId) return;

                    let admission = await Admission.findById(admissionId);
                    if (!admission && admissionType === "BOARD") {
                        admission = await BoardCourseAdmission.findById(admissionId);
                    }

                    if (admission) {
                        const alreadyProcessed = (admission.downPaymentTransactionId === txDoc.p2pRequestId); // Check only DP for now
                        if (!alreadyProcessed) {
                            if ((admission.totalPaidAmount || 0) < 1 || admission.downPaymentStatus === "PENDING") {
                                admission.downPaymentStatus = "PAID";
                                admission.downPaymentTransactionId = txDoc.p2pRequestId;
                                admission.downPaymentReceivedDate = new Date();
                                admission.totalPaidAmount = (admission.totalPaidAmount || 0) + amount;
                                await admission.save();
                                console.log(`[POS] ERP Sync Successful for ${txDoc.p2pRequestId}`);
                            }
                        }
                        txDoc.erpProcessed = true;
                        await txDoc.save();
                    }
                } catch (e) {
                    console.error("[POS] Async Sync Error:", e.message);
                }
            })();
        }

        // Return status immediately
        return res.status(200).json({
            ...data,
            success: true,
            p2pRequestId: tx.p2pRequestId,
            status: apiStatus
        });

    } catch (error) {
        console.error("[POS] Critical Status Error:", error);
        res.status(500).json({ success: false, errorMessage: "Server fault during status check" });
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
