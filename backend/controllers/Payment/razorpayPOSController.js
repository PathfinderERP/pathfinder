// Native fetch is available in Node.js 18+

/**
 * Controller for Razorpay POS (Ezetap) Integration
 * Handles server-to-server communication with POS terminals
 */

const getEzetapBaseUrl = () => {
    return process.env.EZETAP_MODE === 'production' 
        ? 'https://www.ezetap.com/api/3.0/p2padapter' 
        : 'https://demo.ezetap.com/api/3.0/p2padapter';
};

/**
 * Initiate a payment request to a POS device
 */
export const initiatePOSPayment = async (req, res) => {
    try {
        const { amount, externalRefNumber, deviceId, customerMobileNumber, customerEmail, customerName } = req.body;

        if (!amount || !externalRefNumber || !deviceId) {
            return res.status(400).json({ message: "Amount, Invoice ID, and Device ID are required" });
        }

        const appKey = process.env.EZETAP_APP_KEY;
        const username = process.env.EZETAP_USERNAME;

        if (!appKey || !username) {
            return res.status(500).json({ message: "Ezetap configuration missing (AppKey/Username)" });
        }

        const payload = {
            appKey: appKey,
            username: username,
            amount: parseFloat(amount),
            externalRefNumber: externalRefNumber,
            pushTo: {
                deviceId: `${deviceId}|ezetap_android`
            },
            mode: "ALL", // Allow all modes supported by the device
            customerMobileNumber: customerMobileNumber || "",
            customerEmail: customerEmail || "",
            customerName: customerName || ""
        };

        console.log(`Initiating Ezetap POS Payment: ${externalRefNumber} for ₹${amount} on device ${deviceId}`);

        const response = await fetch(`${getEzetapBaseUrl()}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            return res.status(200).json({
                success: true,
                p2pRequestId: data.p2pRequestId,
                message: "Notification sent to device"
            });
        } else {
            return res.status(400).json({
                success: false,
                errorCode: data.errorCode,
                errorMessage: data.errorMessage || "Failed to initiate payment"
            });
        }
    } catch (error) {
        console.error("Ezetap Initiate Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * Check the status of a previously initiated P2P request
 */
export const checkPOSPaymentStatus = async (req, res) => {
    try {
        const { p2pRequestId } = req.params;

        if (!p2pRequestId) {
            return res.status(400).json({ message: "P2P Request ID is required" });
        }

        const appKey = process.env.EZETAP_APP_KEY;
        const username = process.env.EZETAP_USERNAME;

        const payload = {
            appKey: appKey,
            username: username,
            origP2pRequestId: p2pRequestId
        };

        const response = await fetch(`${getEzetapBaseUrl()}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // The interesting fields in the response are 'status' and 'messageCode'
        // status: AUTHORIZED, FAILED, EXPIRED, etc.
        // messageCode: P2P_DEVICE_TXN_DONE, P2P_DEVICE_RECEIVED, etc.

        res.status(200).json(data);
    } catch (error) {
        console.error("Ezetap Status Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * Cancel a pending POS payment request
 */
export const cancelPOSPayment = async (req, res) => {
    try {
        const { p2pRequestId, deviceId } = req.body;

        if (!p2pRequestId || !deviceId) {
            return res.status(400).json({ message: "P2P Request ID and Device ID are required" });
        }

        const appKey = process.env.EZETAP_APP_KEY;
        const username = process.env.EZETAP_USERNAME;

        const payload = {
            appKey: appKey,
            username: username,
            origP2pRequestId: p2pRequestId,
            pushTo: {
                deviceId: `${deviceId}|ezetap_android`
            }
        };

        const response = await fetch(`${getEzetapBaseUrl()}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Ezetap Cancel Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}; 
