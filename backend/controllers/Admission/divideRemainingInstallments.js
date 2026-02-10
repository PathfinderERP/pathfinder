import Admission from "../../models/Admission/Admission.js";

/**
 * Controller to re-divide the remaining balance of an admission into a new set of installments.
 * Only pending or overdue installments are replaced.
 */
export const divideRemainingInstallments = async (req, res) => {
    try {
        const { admissionId } = req.params;
        const { numberOfNewInstallments } = req.body;

        if (!numberOfNewInstallments || numberOfNewInstallments < 1) {
            return res.status(400).json({ message: "Number of installments must be at least 1." });
        }

        const admission = await Admission.findById(admissionId).populate('student');
        if (!admission) {
            return res.status(404).json({ message: "Admission record not found." });
        }

        if (admission.student && admission.student.status === 'Deactivated') {
            return res.status(400).json({ message: "This student is deactivated. Financial operations are restricted." });
        }

        // 1. Identify installments to KEEP (PAID or PENDING_CLEARANCE)
        const keptInstallments = admission.paymentBreakdown.filter(p =>
            p.status === "PAID" || p.status === "PENDING_CLEARANCE"
        );

        // 2. Calculate already paid/engaged amount
        const amountEngaged = keptInstallments.reduce((sum, p) => sum + (p.paidAmount || 0), 0) + admission.downPayment;
        const remainingToDivide = Math.max(0, admission.totalFees - amountEngaged);

        if (remainingToDivide <= 0) {
            return res.status(400).json({ message: "No remaining balance to divide." });
        }

        // 3. Determine the starting date for new installments
        let startDate;
        if (keptInstallments.length > 0) {
            // Sort to find the latest kept installment
            const sortedKept = [...keptInstallments].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
            startDate = new Date(sortedKept[0].dueDate);
        } else {
            startDate = new Date(admission.admissionDate || Date.now());
        }

        // 4. Generate new installments
        const newInstallments = [];
        const baseAmount = Math.floor(remainingToDivide / numberOfNewInstallments);
        const remainder = remainingToDivide % numberOfNewInstallments;

        for (let i = 1; i <= numberOfNewInstallments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(startDate.getMonth() + i);

            // Distribute remainder into the first installment
            const installmentAmount = (i === 1) ? (baseAmount + remainder) : baseAmount;

            newInstallments.push({
                installmentNumber: keptInstallments.length + i,
                dueDate: dueDate,
                amount: installmentAmount,
                status: "PENDING",
                paidAmount: 0,
                remarks: `Re-divided balance into ${numberOfNewInstallments} installments.`
            });
        }

        // 5. Update the admission record
        admission.paymentBreakdown = [...keptInstallments, ...newInstallments];

        // Re-index all installments just in case
        admission.paymentBreakdown.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        admission.paymentBreakdown.forEach((p, index) => {
            p.installmentNumber = index + 1;
        });

        admission.numberOfInstallments = admission.paymentBreakdown.length;
        // Update installmentAmount to reflect the new average if applicable
        admission.installmentAmount = baseAmount;

        await admission.save();

        const updatedAdmission = await Admission.findById(admissionId)
            .populate('student')
            .populate('course')
            .populate('class')
            .populate('examTag')
            .populate('department');

        res.status(200).json({
            message: `Successfully re-divided remaining balance into ${numberOfNewInstallments} installments.`,
            admission: updatedAdmission
        });

    } catch (err) {
        console.error("Error in divideRemainingInstallments:", err);
        res.status(500).json({ message: "Server error during installment division.", error: err.message });
    }
};
