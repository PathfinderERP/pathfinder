import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Payment from "../../models/Payment/Payment.js";
import Centre from "../../models/Master_data/Centre.js";
import { generateBillId } from "../../utils/billIdGenerator.js";
import crypto from "crypto";
import mongoose from "mongoose";

const getRazorpayAuth = () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    return Buffer.from(`${keyId}:${keySecret}`).toString('base64');
};

/**
 * Initiate a Razorpay Payment Link (SMS/Email Pay)
 */
export const initiateSMSPayment = async (req, res) => {
    try {
        const { 
            amount, 
            description, 
            customerName, 
            customerMobile, 
            customerEmail, 
            admissionId, 
            installmentNumber,
            admissionType = "NORMAL", // NORMAL or BOARD
            paidExamFee = 0,
            paidAdditionalThings = 0,
            installmentId = null // For Board Admissions to identify the specific installment in the array
        } = req.body;

        if (!amount || !admissionId) {
            return res.status(400).json({ message: "Amount and Admission ID are required" });
        }

        const payload = {
            amount: Math.round(parseFloat(amount) * 100), // Razorpay expects amount in paise
            currency: "INR",
            accept_partial: false,
            description: description || `Payment for Installment #${installmentNumber}`,
            customer: {
                name: customerName || "Student",
                contact: customerMobile || "",
                email: customerEmail || ""
            },
            notify: {
                sms: true,
                email: true
            },
            reminder_enable: true,
            notes: {
                admissionId: admissionId,
                installmentNumber: installmentNumber.toString(),
                admissionType: admissionType,
                paidExamFee: paidExamFee.toString(),
                paidAdditionalThings: paidAdditionalThings.toString(),
                installmentId: installmentId || "",
                type: "INSTALLMENT_PAYMENT"
            },
            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success`,
            callback_method: "get"
        };

        const response = await fetch('https://api.razorpay.com/v1/payment_links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${getRazorpayAuth()}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.id) {
            res.status(200).json({
                success: true,
                paymentLinkId: data.id,
                shortUrl: data.short_url,
                status: data.status
            });
        } else {
            console.error("Razorpay Error:", data);
            res.status(400).json({
                success: false,
                message: data.error?.description || "Failed to create payment link"
            });
        }
    } catch (error) {
        console.error("SMS Pay Initiation Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * Check the status of a Razorpay Payment Link
 */
export const checkSMSPaymentStatus = async (req, res) => {
    try {
        const { paymentLinkId } = req.params;

        if (!paymentLinkId) {
            return res.status(400).json({ message: "Payment Link ID is required" });
        }

        const response = await fetch(`https://api.razorpay.com/v1/payment_links/${paymentLinkId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${getRazorpayAuth()}`
            }
        });

        const data = await response.json();

        if (data.id) {
            res.status(200).json({
                success: true,
                status: data.status,
                amountPaid: data.amount_paid / 100,
                id: data.id
            });
        } else {
            res.status(400).json({ success: false, message: "Payment link not found" });
        }
    } catch (error) {
        console.error("SMS Status Error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * Handle Razorpay Webhooks
 */
export const razorpayWebhookHandler = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (signature !== digest) {
        return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === 'payment_link.paid') {
        const paymentLink = payload.payment_link.entity;
        const notes = paymentLink.notes;
        const admissionId = notes.admissionId;
        const admissionType = notes.admissionType || "NORMAL";
        const installmentNumber = parseInt(notes.installmentNumber);
        const amountPaid = paymentLink.amount_paid / 100;
        const paidExamFee = parseFloat(notes.paidExamFee || 0);
        const paidAdditionalThings = parseFloat(notes.paidAdditionalThings || 0);
        const installmentId = notes.installmentId;

        try {
            if (admissionType === "NORMAL") {
                // --- NORMAL ADMISSION LOGIC ---
                const admission = await Admission.findById(admissionId);
                if (!admission) return res.status(200).json({ status: 'ok' });

                const existingPayment = await Payment.findOne({ transactionId: paymentLink.id });
                if (existingPayment) return res.status(200).json({ status: 'ok' });

                const instIndex = admission.paymentBreakdown.findIndex(inst => inst.installmentNumber === installmentNumber);
                if (instIndex !== -1) {
                    admission.paymentBreakdown[instIndex].status = "PAID";
                    admission.paymentBreakdown[instIndex].paidAmount = amountPaid;
                    admission.paymentBreakdown[instIndex].paidDate = new Date();
                    admission.paymentBreakdown[instIndex].paymentMethod = "RAZORPAY_SMS";
                    admission.paymentBreakdown[instIndex].transactionId = paymentLink.id;

                    admission.totalPaid += amountPaid;
                    admission.remainingAmount -= amountPaid;
                    if (admission.remainingAmount <= 0) admission.paymentStatus = "COMPLETED";
                    else admission.paymentStatus = "PARTIAL";

                    await admission.save();

                    const newPayment = new Payment({
                        studentId: admission.studentId,
                        admission: admissionId,
                        installmentNumber: installmentNumber,
                        amount: amountPaid,
                        paidAmount: amountPaid,
                        paymentMethod: "RAZORPAY_SMS",
                        status: "PAID",
                        transactionId: paymentLink.id,
                        remarks: `Razorpay SMS Pay: ${paymentLink.id}`,
                        dueDate: admission.paymentBreakdown[instIndex].dueDate
                    });
                    await newPayment.save();
                }
            } else if (admissionType === "BOARD") {
                // --- BOARD ADMISSION LOGIC ---
                const admission = await BoardCourseAdmission.findById(admissionId);
                if (!admission) return res.status(200).json({ status: 'ok' });

                const existingPayment = await Payment.findOne({ transactionId: paymentLink.id });
                if (existingPayment) return res.status(200).json({ status: 'ok' });

                const inst = installmentId ? admission.installments.id(installmentId) : admission.installments.find(i => i.monthNumber === installmentNumber);
                
                // If installmentNumber is 0, it's a standalone fee payment (Exam/Additional/NCRP)
                // If installment is found, we update it. If not (instNum 0), we just process extra fees.
                if (inst) {
                    const baseAmount = amountPaid - paidExamFee - paidAdditionalThings;
                    inst.paidAmount += baseAmount;
                    inst.paymentTransactions.push({
                        amount: baseAmount,
                        date: new Date(),
                        paymentMethod: "RAZORPAY_SMS",
                        transactionId: paymentLink.id,
                        receivedBy: null // System/Webhook
                    });
                    inst.status = "PAID";
                }

                if (paidExamFee > 0) {
                    admission.examFeePaid += paidExamFee;
                    if (admission.examFeePaid >= admission.examFee) admission.examFeeStatus = "PAID";
                    else admission.examFeeStatus = "PARTIAL";
                }

                if (paidAdditionalThings > 0) {
                    admission.additionalThingsPaid += paidAdditionalThings;
                    if (admission.additionalThingsPaid >= admission.additionalThingsAmount) admission.additionalThingsStatus = "PAID";
                    else admission.additionalThingsStatus = "PARTIAL";
                }

                // Recalculate total paid
                admission.totalPaidAmount = admission.installments.reduce((sum, item) => sum + (item.paidAmount || 0), 0) + (admission.examFeePaid || 0) + (admission.additionalThingsPaid || 0);

                await admission.save();

                // Generate Bill ID for the Payment record
                let billId = null;
                try {
                    let centreObj = await Centre.findOne({ centreName: admission.centre });
                    if (!centreObj) centreObj = await Centre.findOne({ centreName: { $regex: new RegExp(`^${admission.centre}$`, 'i') } });
                    const centreCode = centreObj ? centreObj.enterCode : 'GEN';
                    billId = await generateBillId(centreCode);
                } catch (e) { console.error("Bill ID Gen error:", e); }

                const taxableAmount = amountPaid / 1.18;
                const cgst = (amountPaid - taxableAmount) / 2;
                const sgst = cgst;

                let billCourseName = admission.boardCourseName || '';
                if (paidExamFee > 0) billCourseName += ' + Examination';
                if (paidAdditionalThings > 0 && admission.additionalThingsName) billCourseName += ` + ${admission.additionalThingsName}`;

                const newPayment = new Payment({
                    admission: admissionId,
                    installmentNumber: inst ? inst.monthNumber : 0,
                    amount: (inst ? (inst.payableAmount || inst.standardAmount) : 0) + paidExamFee + paidAdditionalThings,
                    paidAmount: amountPaid,
                    dueDate: inst ? inst.dueDate : new Date(),
                    paidDate: new Date(),
                    receivedDate: new Date(),
                    status: "PAID",
                    paymentMethod: "RAZORPAY_SMS",
                    transactionId: paymentLink.id,
                    billingMonth: inst ? new Date(inst.dueDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
                    billId: billId,
                    courseFee: taxableAmount,
                    cgst: cgst,
                    sgst: sgst,
                    totalAmount: amountPaid,
                    boardCourseName: billCourseName,
                    remarks: `Razorpay SMS Pay: ${paymentLink.id} (${inst ? 'Board Inst ' + inst.monthNumber : 'Stand-alone Fees'})`
                });
                await newPayment.save();
            }
        } catch (err) {
            console.error("Webhook Processing Error:", err);
            return res.status(500).json({ message: "Error processing webhook" });
        }
    }

    res.status(200).json({ status: 'ok' });
};
