import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import Centre from "../../models/Master_data/Centre.js";

export const getFinancialAnalytics = async (req, res) => {
    try {
        const { centreId, period } = req.query;

        // Calculate date range based on period
        let startDate, endDate;
        const now = new Date();

        switch (period) {
            case "This Month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case "Last Month":
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            case "This Quarter":
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
                break;
            case "This Year":
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
            default: // All Time
                startDate = new Date(2020, 0, 1);
                endDate = now;
        }

        // Base Filter for Centre
        const baseFilter = {};
        if (centreId && centreId !== 'undefined' && centreId !== 'null' && centreId !== '') {
            const centreDoc = await Centre.findById(centreId);
            if (centreDoc) {
                baseFilter.centre = centreDoc.centreName;
            }
        }

        const periodQuery = (period && period !== "All Time") ? { $gte: startDate, $lte: endDate } : null;

        // 1. Total Amount Came (Actual money received in the period)
        const paymentFilter = { status: { $in: ["PAID", "PENDING_CLEARANCE", "PARTIAL"] }, paidAmount: { $gt: 0 } };
        if (baseFilter.centre) {
            const centreAdmissions = await Admission.find({ centre: baseFilter.centre }).distinct('_id');
            paymentFilter.admission = { $in: centreAdmissions };
        }

        if (periodQuery) {
            paymentFilter.$or = [
                { paidDate: periodQuery },
                { receivedDate: periodQuery }
            ];
        }
        const periodPayments = await Payment.find(paymentFilter);
        const totalAmountCame = periodPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);

        // 2. Amount Will Come & Total Due
        // Amount Will Come: Sum of installments whose dueDate is in period and status is not PAID
        // Total Due: Snapshot of ALL overdue installments for the centre
        const allActiveAdmissions = await Admission.find({ ...baseFilter, admissionStatus: "ACTIVE" });

        let amountWillCome = 0;
        let totalDue = 0;

        allActiveAdmissions.forEach(a => {
            if (a.paymentBreakdown) {
                a.paymentBreakdown.forEach(p => {
                    const isUnpaid = ["PENDING", "OVERDUE", "PENDING_CLEARANCE"].includes(p.status);
                    const dueDate = new Date(p.dueDate);

                    // Amount Will Come logic (Period-based)
                    if (isUnpaid) {
                        if (period === "All Time") {
                            amountWillCome += (p.amount || 0);
                        } else if (dueDate >= startDate && dueDate <= endDate) {
                            amountWillCome += (p.amount || 0);
                        }
                    }

                    // Total Due logic (Global overdue for active students)
                    if (isUnpaid && dueDate < now) {
                        totalDue += (p.amount || 0);
                    }
                });
            }
        });

        // 3. Total Amount Has to Come 
        // Logic: What was scheduled = (What came) + (What is still pending for this period)
        const totalAmountToCome = totalAmountCame + amountWillCome;

        // 4. Payment Breakdown (for the money that actually 'Came' in this period)
        const paymentBreakdown = {
            CASH: 0, UPI: 0, CARD: 0, BANK_TRANSFER: 0, CHEQUE: 0, CHEQUE_PENDING: 0
        };

        periodPayments.forEach(p => {
            if (p.status === "PENDING_CLEARANCE") {
                paymentBreakdown.CHEQUE_PENDING += (p.paidAmount || 0);
            } else {
                const method = p.paymentMethod || 'CASH';
                if (paymentBreakdown.hasOwnProperty(method)) {
                    paymentBreakdown[method] += (p.paidAmount || 0);
                }
            }
        });

        res.status(200).json({
            totalAmountToCome: Number(totalAmountToCome.toFixed(2)),
            totalAmountCame: Number(totalAmountCame.toFixed(2)),
            amountWillCome: Number(amountWillCome.toFixed(2)),
            totalDue: Number(totalDue.toFixed(2)),
            paymentBreakdown: {
                CASH: Number(paymentBreakdown.CASH.toFixed(2)),
                UPI: Number(paymentBreakdown.UPI.toFixed(2)),
                CARD: Number(paymentBreakdown.CARD.toFixed(2)),
                BANK_TRANSFER: Number(paymentBreakdown.BANK_TRANSFER.toFixed(2)),
                CHEQUE: Number(paymentBreakdown.CHEQUE.toFixed(2)),
                CHEQUE_PENDING: Number(paymentBreakdown.CHEQUE_PENDING.toFixed(2))
            }
        });

    } catch (error) {
        console.error("Error fetching financial analytics:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
