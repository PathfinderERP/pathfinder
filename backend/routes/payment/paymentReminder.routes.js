import express from "express";
import { 
    getOverduePaymentsSummary, 
    sendOverdueReminders, 
    checkOverduePayments, 
    sendAllPendingReminders,
    getAllStudentFeeDetails,
    sendCustomMessage
} from "../../services/paymentReminderService.js";
import { requireNormalOrSuper } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Get all overdue payments
router.get("/overdue", requireNormalOrSuper, async (req, res) => {
    try {
        const overduePayments = await getOverduePaymentsSummary();
        res.status(200).json({
            success: true,
            count: overduePayments.length,
            data: overduePayments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching overdue payments",
            error: error.message
        });
    }
});

// Get comprehensive fee details for all students
router.get("/student-fees", requireNormalOrSuper, async (req, res) => {
    try {
        const feeDetails = await getAllStudentFeeDetails();
        res.status(200).json({
            success: true,
            count: feeDetails.length,
            data: feeDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching student fee details",
            error: error.message
        });
    }
});

// Send reminders manually (only overdue)
router.post("/send-reminders", requireNormalOrSuper, async (req, res) => {
    try {
        const result = await sendOverdueReminders();
        res.status(200).json({
            success: true,
            message: "Reminders sent successfully",
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error sending reminders",
            error: error.message
        });
    }
});

// Send reminders to ALL pending payments (including not yet due) - for testing
router.post("/send-all-reminders", requireNormalOrSuper, async (req, res) => {
    try {
        const result = await sendAllPendingReminders();
        res.status(200).json({
            success: true,
            message: "Reminders sent to all pending payments",
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error sending all reminders",
            error: error.message
        });
    }
});

// Send custom message to a student
router.post("/send-custom-message", requireNormalOrSuper, async (req, res) => {
    try {
        const { phoneNumber, message, studentId } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                message: "Phone number and message are required"
            });
        }

        const result = await sendCustomMessage(phoneNumber, message, studentId);
        
        if (result.success) {
            res.status(200).json({
                success: true,
                message: "Custom message sent successfully",
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: "Failed to send custom message",
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error sending custom message",
            error: error.message
        });
    }
});

// Check overdue payments (update status)
router.get("/check-overdue", requireNormalOrSuper, async (req, res) => {
    try {
        const overduePayments = await checkOverduePayments();
        res.status(200).json({
            success: true,
            count: overduePayments.length,
            data: overduePayments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error checking overdue payments",
            error: error.message
        });
    }
});

// Test SMS endpoint - send a test message to verify SMS gateway
router.post("/test-sms", requireNormalOrSuper, async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        // Import sendTestSMS function
        const { sendTestSMS } = await import("../../services/smsService.js");
        
        const result = await sendTestSMS(phoneNumber);
        
        if (result.success) {
            res.status(200).json({
                success: true,
                message: "Test SMS sent successfully",
                data: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: "Failed to send test SMS",
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error sending test SMS",
            error: error.message
        });
    }
});

export default router;
