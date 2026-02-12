import Admission from "../models/Admission/Admission.js";
import PaymentReminder from "../models/PaymentManagement/PaymentReminder.js";
import Student from "../models/Students.js";
import { sendPaymentReminder, sendSMS } from "./smsService.js";

// Calculate days overdue
export const calculateDaysOverdue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};

// Check and update overdue payments
export const checkOverduePayments = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find admissions that have payments that are either PENDING or already marked OVERDUE
        const admissions = await Admission.find({
            admissionStatus: "ACTIVE",
            paymentStatus: { $in: ["PENDING", "PARTIAL"] },
            "paymentBreakdown": {
                $elemMatch: {
                    status: { $in: ["PENDING", "OVERDUE"] },
                    dueDate: { $lt: today }
                }
            }
        }).populate("student");

        const overduePayments = [];

        for (const admission of admissions) {
            let modified = false;
            for (const payment of admission.paymentBreakdown) {
                // Check for PENDING payments that have become overdue
                if (payment.status === "PENDING") {
                    const daysOverdue = calculateDaysOverdue(payment.dueDate);

                    if (daysOverdue > 0) {
                        // Update payment status to OVERDUE
                        payment.status = "OVERDUE";
                        modified = true;
                    }
                }

                // If it's OVERDUE (either just updated or already was OVERDUE), include in report
                if (payment.status === "OVERDUE") {
                    const daysOverdue = calculateDaysOverdue(payment.dueDate);
                    // Only include if actually overdue by today's date
                    if (daysOverdue > 0) {
                        overduePayments.push({
                            admission: admission._id,
                            student: admission.student,
                            installmentNumber: payment.installmentNumber,
                            dueDate: payment.dueDate,
                            amount: payment.amount,
                            daysOverdue
                        });
                    }
                }
            }
            if (modified) {
                await admission.save();
            }
        }

        // Also need to handle already OVERDUE payments that might not have been caught by the $elemMatch
        // because $elemMatch was looking for PENDING specifically to mark them as OVERDUE.
        // If we want a full report of ALL overdue payments, we should probably fetch them too.
        // Actually, the report is used for reminders.

        return overduePayments;
    } catch (error) {
        console.error("Error checking overdue payments:", error);
        throw error;
    }
};

// Send reminders for overdue payments
export const sendOverdueReminders = async () => {
    try {
        const overduePayments = await checkOverduePayments();
        const remindersSent = [];

        for (const payment of overduePayments) {
            // student is already populated in checkOverduePayments
            const student = payment.student;
            if (!student) continue;

            const studentDetails = student.studentsDetails?.[0];
            if (!studentDetails) continue;

            const phoneNumber = studentDetails.mobileNum;
            const studentName = studentDetails.studentName;

            // Check if reminder already sent today
            const existingReminder = await PaymentReminder.findOne({
                admission: payment.admission,
                installmentNumber: payment.installmentNumber,
                "remindersSent.sentDate": {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            });

            if (!existingReminder) {
                // Send SMS reminder
                const smsResult = await sendPaymentReminder(
                    studentName,
                    phoneNumber,
                    payment.amount,
                    payment.daysOverdue,
                    payment.dueDate
                );

                // Create or update reminder record
                let reminder = await PaymentReminder.findOne({
                    admission: payment.admission,
                    installmentNumber: payment.installmentNumber
                });

                if (!reminder) {
                    reminder = new PaymentReminder({
                        admission: payment.admission,
                        student: payment.student,
                        installmentNumber: payment.installmentNumber,
                        dueDate: payment.dueDate,
                        amount: payment.amount,
                        daysOverdue: payment.daysOverdue,
                        status: "REMINDED"
                    });
                }

                reminder.daysOverdue = payment.daysOverdue;
                reminder.remindersSent.push({
                    method: "SMS",
                    status: smsResult.success ? "SENT" : "FAILED",
                    message: `Payment overdue by ${payment.daysOverdue} days`
                });

                await reminder.save();

                remindersSent.push({
                    studentName,
                    phoneNumber,
                    amount: payment.amount,
                    daysOverdue: payment.daysOverdue,
                    status: smsResult.success ? "SENT" : "FAILED"
                });
            }
        }

        return {
            totalOverdue: overduePayments.length,
            remindersSent: remindersSent.length,
            details: remindersSent
        };
    } catch (error) {
        console.error("Error sending overdue reminders:", error);
        throw error;
    }
};

// Get overdue payment summary
export const getOverduePaymentsSummary = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const admissions = await Admission.find({
            admissionStatus: "ACTIVE",
            paymentStatus: { $in: ["PENDING", "PARTIAL"] },
            "paymentBreakdown": {
                $elemMatch: {
                    status: { $in: ["PENDING", "OVERDUE"] },
                    dueDate: { $lt: today }
                }
            }
        }).populate("student course");

        const overdueList = [];

        for (const admission of admissions) {
            for (const payment of admission.paymentBreakdown) {
                if (payment.status === "PENDING" || payment.status === "OVERDUE") {
                    const daysOverdue = calculateDaysOverdue(payment.dueDate);

                    if (daysOverdue >= 0) {
                        const student = admission.student;
                        const studentDetails = student.studentsDetails[0];

                        overdueList.push({
                            admissionId: admission._id,
                            admissionNumber: admission.admissionNumber,
                            studentName: studentDetails.studentName,
                            phoneNumber: studentDetails.mobileNum,
                            email: studentDetails.studentEmail,
                            course: admission.course?.courseName,
                            installmentNumber: payment.installmentNumber,
                            dueDate: payment.dueDate,
                            amount: payment.amount,
                            daysOverdue,
                            status: payment.status
                        });
                    }
                }
            }
        }

        // Sort by days overdue (descending)
        overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);

        return overdueList;
    } catch (error) {
        console.error("Error getting overdue payments summary:", error);
        throw error;
    }
};

// Send reminders to ALL pending payments (including not yet due) - for testing
export const sendAllPendingReminders = async () => {
    try {
        const admissions = await Admission.find({
            admissionStatus: "ACTIVE",
            paymentStatus: { $in: ["PENDING", "PARTIAL"] },
            "paymentBreakdown": {
                $elemMatch: {
                    status: { $in: ["PENDING", "OVERDUE"] }
                }
            }
        }).populate("student course");

        const remindersSent = [];

        // Check if running in MOCK mode
        const isMockMode = !process.env.SMS_GATEWAY || process.env.SMS_GATEWAY === 'MOCK';
        if (isMockMode) {
            console.warn("\n⚠️  WARNING: System is running in SMS MOCK MODE.");
            console.warn("   Messages will be logged to console but NOT sent to real phones.");
            console.warn("   To send real SMS, configure SMS_GATEWAY in .env file.\n");
        }

        for (const admission of admissions) {
            for (const payment of admission.paymentBreakdown) {
                if (payment.status === "PENDING" || payment.status === "OVERDUE") {
                    const student = admission.student;
                    if (!student) continue;

                    const studentDetails = student.studentsDetails[0];
                    const phoneNumber = studentDetails.mobileNum;
                    const studentName = studentDetails.studentName;

                    const daysOverdue = calculateDaysOverdue(payment.dueDate);
                    const daysUntilDue = -daysOverdue; // Negative means not yet due

                    // Send SMS reminder
                    let message;
                    if (daysOverdue > 0) {
                        message = `Dear ${studentName}, Your payment of ₹${payment.amount} was due on ${new Date(payment.dueDate).toLocaleDateString('en-IN')}. You are ${daysOverdue} day(s) overdue. Please pay immediately. - Pathfinder ERP`;
                    } else if (daysOverdue === 0) {
                        message = `Dear ${studentName}, Your payment of ₹${payment.amount} is due TODAY (${new Date(payment.dueDate).toLocaleDateString('en-IN')}). Please pay today. - Pathfinder ERP`;
                    } else {
                        message = `Dear ${studentName}, Reminder: Your payment of ₹${payment.amount} is due on ${new Date(payment.dueDate).toLocaleDateString('en-IN')} (in ${daysUntilDue} days). Please keep it ready. - Pathfinder ERP`;
                    }

                    const smsResult = await sendSMS(phoneNumber, message);

                    // Create or update reminder record
                    let reminder = await PaymentReminder.findOne({
                        admission: admission._id,
                        installmentNumber: payment.installmentNumber
                    });

                    if (!reminder) {
                        reminder = new PaymentReminder({
                            admission: admission._id,
                            student: student._id,
                            installmentNumber: payment.installmentNumber,
                            dueDate: payment.dueDate,
                            amount: payment.amount,
                            daysOverdue: Math.max(0, daysOverdue),
                            status: daysOverdue >= 0 ? "REMINDED" : "PENDING"
                        });
                    }

                    reminder.daysOverdue = Math.max(0, daysOverdue);
                    reminder.remindersSent.push({
                        method: "SMS",
                        status: smsResult.success ? "SENT" : "FAILED",
                        message: daysOverdue > 0 ? `Overdue by ${daysOverdue} days` :
                            daysOverdue === 0 ? "Due today" :
                                `Due in ${daysUntilDue} days`
                    });

                    await reminder.save();

                    remindersSent.push({
                        studentName,
                        phoneNumber,
                        amount: payment.amount,
                        dueDate: payment.dueDate,
                        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
                        daysUntilDue: daysOverdue < 0 ? daysUntilDue : 0,
                        status: smsResult.success ? "SENT" : "FAILED"
                    });
                }
            }
        }

        return {
            totalPending: remindersSent.length,
            remindersSent: remindersSent.length,
            details: remindersSent
        };
    } catch (error) {
        console.error("Error sending all pending reminders:", error);
        throw error;
    }
};

// Get comprehensive fee details for all students
export const getAllStudentFeeDetails = async () => {
    try {
        const admissions = await Admission.find({
            admissionStatus: "ACTIVE"
        }).populate("student course");

        const feeDetails = admissions.map(admission => {
            const student = admission.student;
            const studentDetails = student?.studentsDetails?.[0] || {};

            // Calculate totals
            const totalPaidInstallments = admission.paymentBreakdown
                .filter(p => p.status === "PAID")
                .reduce((sum, p) => sum + p.amount, 0);

            const totalPaid = (admission.downPayment || 0) + totalPaidInstallments;
            const totalDue = admission.totalFees - totalPaid;

            // Find next due date
            const nextInstallment = admission.paymentBreakdown
                .find(p => p.status === "PENDING" || p.status === "OVERDUE");

            return {
                admissionId: admission._id,
                admissionNumber: admission.admissionNumber,
                studentName: studentDetails.studentName || "Unknown",
                phoneNumber: studentDetails.mobileNum || "",
                courseName: admission.course?.courseName || "N/A",
                totalFees: admission.totalFees,
                discountAmount: admission.discountAmount || 0,
                downPayment: admission.downPayment || 0,
                totalPaid: totalPaid,
                remainingAmount: totalDue,
                paymentStatus: admission.paymentStatus,
                nextDueDate: nextInstallment?.dueDate || null,
                nextDueAmount: nextInstallment?.amount || 0,
                installments: admission.paymentBreakdown.map(p => ({
                    installmentNumber: p.installmentNumber,
                    dueDate: p.dueDate,
                    amount: p.amount,
                    status: p.status,
                    paidDate: p.paidDate,
                    paymentMethod: p.paymentMethod
                }))
            };
        });

        return feeDetails;
    } catch (error) {
        console.error("Error getting all student fee details:", error);
        throw error;
    }
};

// Send custom message to a student
export const sendCustomMessage = async (phoneNumber, message, studentId) => {
    try {
        // Here we could also log this message to a "Communication Log" in the database if needed
        const result = await sendSMS(phoneNumber, message);
        return result;
    } catch (error) {
        console.error("Error sending custom message:", error);
        throw error;
    }
};
