import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";

/**
 * GET /admission/:admissionId/bills
 * Returns all Payment records for a given admission, sorted newest-first.
 * These records are immutable history — manual financial corrections create
 * new Payment entries but never delete existing ones.
 */
export const getBillsForAdmission = async (req, res) => {
    try {
        const { admissionId } = req.params;

        const admission = await Admission.findById(admissionId);

        if (!admission) {
            return res.status(404).json({ message: "Admission not found" });
        }

        // 1. Fetch actual Payment records
        let bills = await Payment.find({ admission: admissionId })
            .populate('recordedBy', 'name')
            .lean();

        // 2. Synthesize missing historical records (Down Payment)
        const hasDownPaymentRecord = bills.some(b => b.installmentNumber === 0);
        if (!hasDownPaymentRecord && admission.downPayment > 0 && admission.downPaymentStatus !== "PENDING") {
            bills.push({
                _id: `synthetic-dp-${admissionId}`,
                admission: admissionId,
                installmentNumber: 0,
                amount: admission.downPayment,
                paidAmount: admission.downPayment,
                receivedDate: admission.downPaymentReceivedDate || admission.createdAt,
                paidDate: admission.downPaymentReceivedDate || admission.createdAt,
                status: admission.downPaymentStatus || "PAID",
                paymentMethod: admission.downPaymentMethod || "UNSET",
                remarks: "Down Payment (Historical Record)",
                billId: admission.downPaymentTransactionId || "HISTORICAL_DP",
                createdAt: admission.createdAt
            });
        }

        // 3. Synthesize missing historical records (Installments)
        if (admission.paymentBreakdown && admission.paymentBreakdown.length > 0) {
            admission.paymentBreakdown.forEach(inst => {
                if (["PAID", "COMPLETED", "PENDING_CLEARANCE"].includes(inst.status) || inst.paidAmount > 0) {
                    const hasRecord = bills.some(b => b.installmentNumber === inst.installmentNumber);
                    if (!hasRecord) {
                        bills.push({
                            _id: `synthetic-inst-${inst.installmentNumber}`,
                            admission: admissionId,
                            installmentNumber: inst.installmentNumber,
                            amount: inst.amount,
                            paidAmount: inst.paidAmount || inst.amount,
                            receivedDate: inst.receivedDate || inst.paidDate || admission.createdAt,
                            paidDate: inst.paidDate || inst.receivedDate || admission.createdAt,
                            status: inst.status,
                            paymentMethod: inst.paymentMethod || "UNSET",
                            remarks: inst.remarks || "Installment (Historical Record)",
                            billId: inst.transactionId || "HISTORICAL_INST",
                            createdAt: inst.paidDate || admission.createdAt
                        });
                    }
                }
            });
        }

        // 4. Sort all bills (actual + synthesized) newest-first
        bills.sort((a, b) => {
            const da = new Date(a.receivedDate || a.paidDate || a.createdAt);
            const db = new Date(b.receivedDate || b.paidDate || b.createdAt);
            return db - da;
        });

        res.status(200).json({ bills, total: bills.length });

    } catch (err) {
        console.error("getBillsForAdmission error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
