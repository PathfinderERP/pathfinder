import Admission from "../../models/Admission/Admission.js";
import User from "../../models/User.js";
import Payment from "../../models/Payment/Payment.js";

/**
 * Controller for Super Admin to manually correct fees and paid amounts.
 * Useful for data migration corrections or manual overrides.
 */
export const manualFeeAdjustment = async (req, res) => {
    try {
        const { id } = req.params;
        const { totalFees, totalPaidAmount, numberOfInstallments } = req.body;

        // Check if the user is a super admin (this check is also in middleware, but safe here)
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== "superAdmin" && user.role !== "Super Admin")) {
            return res.status(403).json({ message: "Access denied. Super Admin only." });
        }

        const admission = await Admission.findById(id).populate('student');
        if (!admission) {
            return res.status(404).json({ message: "Admission record not found." });
        }

        if (admission.student && admission.student.status === 'Deactivated') {
            return res.status(400).json({ message: "This student is deactivated. Adjustments are restricted." });
        }

        // 1. Update Core Financials
        const parsedTotalFees = parseFloat(totalFees);
        const parsedTotalPaid = parseFloat(totalPaidAmount);

        if (isNaN(parsedTotalFees) || isNaN(parsedTotalPaid)) {
            return res.status(400).json({ message: "Invalid amount values provided." });
        }

        const originalPaid = admission.totalPaidAmount || 0;
        const diff = parsedTotalPaid - originalPaid;

        admission.totalFees = parsedTotalFees;
        admission.totalPaidAmount = parsedTotalPaid;
        admission.downPayment = parsedTotalPaid; // Treat total paid so far as the new down payment reference
        admission.remainingAmount = Math.max(0, parsedTotalFees - parsedTotalPaid);

        // 1.5 Create a Payment record for sync if paid amount changed
        if (diff !== 0) {
            const adjustmentPayment = new Payment({
                admission: id,
                installmentNumber: 0,
                amount: diff,
                paidAmount: diff,
                dueDate: new Date(),
                paidDate: new Date(),
                status: "PAID",
                paymentMethod: "CASH",
                remarks: `Manual Balance Adjustment by Super Admin. (Prev: ${originalPaid} -> New: ${parsedTotalPaid})`,
                recordedBy: req.user.id,
                courseFee: diff / 1.18,
                totalAmount: diff
            });
            await adjustmentPayment.save();
        }

        // 2. Adjust Payment Status
        if (admission.remainingAmount <= 0) {
            admission.paymentStatus = "COMPLETED";
            admission.paymentBreakdown = [];
            admission.numberOfInstallments = 0;
            admission.installmentAmount = 0;
        } else {
            admission.paymentStatus = parsedTotalPaid > 0 ? "PARTIAL" : "PENDING";

            // 3. Handle Installment Re-Generation if requested
            if (numberOfInstallments && parseInt(numberOfInstallments) > 0) {
                const n = parseInt(numberOfInstallments);
                const remainingToDivide = admission.remainingAmount;
                const baseAmount = Math.floor(remainingToDivide / n);
                const remainder = remainingToDivide % n;

                const newInstallments = [];
                const startDate = new Date(); // Start from today for manual corrections

                for (let i = 1; i <= n; i++) {
                    const dueDate = new Date(startDate);
                    dueDate.setMonth(startDate.getMonth() + i);

                    const instAmount = (i === 1) ? (baseAmount + remainder) : baseAmount;

                    newInstallments.push({
                        installmentNumber: i,
                        dueDate: dueDate,
                        amount: instAmount,
                        status: "PENDING",
                        paidAmount: 0,
                        remarks: `Generated via Super Admin Manual Adjustment. Split into ${n} months.`
                    });
                }

                admission.paymentBreakdown = newInstallments;
                admission.numberOfInstallments = n;
                admission.installmentAmount = baseAmount;
            }
        }

        await admission.save();

        // Populate and return
        const updatedAdmission = await Admission.findById(id)
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department')
            .populate('createdBy', 'name');

        res.status(200).json({
            message: "Financial records corrected successfully.",
            admission: updatedAdmission
        });

    } catch (err) {
        console.error("Error in manualFeeAdjustment:", err);
        res.status(500).json({ message: "Server error during fee adjustment.", error: err.message });
    }
};
