import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Centre from "../../models/Master_data/Centre.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

export const getFinancialAnalytics = async (req, res) => {
    try {
        const { centreId, centreIds, period, startDate: customStartDate, endDate: customEndDate, session } = req.query;

        // Calculate date range based on period
        let startDate, endDate;
        const now = new Date();

        if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
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
                case "From April 1st": {
                    const currentYear = now.getFullYear();
                    const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
                    startDate = new Date(fyStartYear, 3, 1);
                    endDate = now;
                    break;
                }
                case "Last Year": {
                    const currentYear = now.getFullYear();
                    const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
                    startDate = new Date(fyStartYear - 1, 3, 1);
                    endDate = new Date(fyStartYear, 2, 31, 23, 59, 59);
                    break;
                }
                default: // All Time
                    startDate = new Date(2020, 0, 1);
                    endDate = now;
            }
        }

        // Base Filter for Centre
        const baseFilter = {};
        const targetCentreIds = centreIds ? centreIds.split(",") : (centreId ? [centreId] : []);

        if (req.user.role !== "superAdmin" && req.user.role !== "Super Admin") {
            const currentUser = await User.findById(req.user.id || req.user._id).populate("centres");
            const userCentres = (currentUser ? currentUser.centres : []).map(c => c._id?.toString() || c.toString());
            
            if (targetCentreIds.length > 0) {
                const allowedTargetIds = targetCentreIds.filter(id => userCentres.includes(id));
                if (allowedTargetIds.length === 0) {
                    return res.status(403).json({ message: "Access denied to selected centres' analytics" });
                }
                const centreDocs = await Centre.find({ _id: { $in: allowedTargetIds } });
                baseFilter.centre = { $in: centreDocs.map(c => c.centreName) };
            } else {
                // If no centreId, filter by all allowed centres
                const userCentreDocs = await Centre.find({ _id: { $in: userCentres } });
                const userCentreNames = userCentreDocs.map(c => c.centreName);
                baseFilter.centre = { $in: userCentreNames };
            }
        } else if (targetCentreIds.length > 0) {
            const centreDocs = await Centre.find({ _id: { $in: targetCentreIds } });
            baseFilter.centre = { $in: centreDocs.map(c => c.centreName) };
        }

        if (session) {
            baseFilter.academicSession = session;
        }

        const periodQuery = (period && period !== "All Time") || (customStartDate && customEndDate) ? { $gte: startDate, $lte: endDate } : null;

        // 1. Total Amount Came (Actual money received in the period)
        // We only include payments that have a billId (receipt number) as per user request
        const paymentFilter = { 
            paidAmount: { $gt: 0 },
            billId: { $exists: true, $ne: null, $nin: ["", "-"] }
        };
        
        // Find admissions matching centre and session filters ONLY if filters are applied
        if (Object.keys(baseFilter).length > 0) {
            const [centreAdmissions, boardAdmissions] = await Promise.all([
                Admission.find(baseFilter).distinct('_id'),
                BoardCourseAdmission.find(baseFilter).distinct('_id')
            ]);
            paymentFilter.admission = { $in: [...centreAdmissions, ...boardAdmissions] };
        }

        const dateFilter = (startDate && !isNaN(startDate.getTime()) && endDate && !isNaN(endDate.getTime())) ? {
            $expr: {
                $and: [
                    { $gte: [{ $ifNull: ["$paidDate", "$createdAt"] }, startDate] },
                    { $lte: [{ $ifNull: ["$paidDate", "$createdAt"] }, endDate] }
                ]
            }
        } : {};

        // Calculate Fiscal Totals (April 1st to now)
        const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const fyStartDate = new Date(fyStartYear, 3, 1);
        const fiscalDateFilter = {
            $expr: {
                $and: [
                    { $gte: [{ $ifNull: ["$paidDate", "$createdAt"] }, fyStartDate] },
                    { $lte: [{ $ifNull: ["$paidDate", "$createdAt"] }, now] }
                ]
            }
        };

        const [periodPayments, fiscalPayments] = await Promise.all([
            Payment.find({ ...paymentFilter, ...dateFilter }),
            Payment.find({ ...paymentFilter, ...fiscalDateFilter })
        ]);

        const totalAmountCame = periodPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        const selectionWithoutGst = periodPayments.reduce((sum, p) => {
            const base = p.courseFee > 0 ? p.courseFee : ((p.paidAmount || 0) / 1.18);
            return sum + base;
        }, 0);
        
        const fiscalWithGst = fiscalPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        const fiscalWithoutGst = fiscalPayments.reduce((sum, p) => {
            const base = p.courseFee > 0 ? p.courseFee : ((p.paidAmount || 0) / 1.18);
            return sum + base;
        }, 0);

        // 2. Amount Will Come & Total Due
        // Amount Will Come: Sum of installments whose dueDate is in period and status is not PAID
        // Total Due: Snapshot of ALL overdue installments for the centre
        const allActiveAdmissions = await Admission.find({ ...baseFilter, admissionStatus: "ACTIVE" });
        const allBoardAdmissions = await BoardCourseAdmission.find({ ...baseFilter, admissionStatus: "ACTIVE" });
        const consolidatedAdmissions = [...allActiveAdmissions, ...allBoardAdmissions];

        let amountWillCome = 0;
        let totalDue = 0;

        consolidatedAdmissions.forEach(a => {
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

        // 5. Dynamic Revenue Trend
        const trendData = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Calculate the difference in days between startDate and endDate
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const trendPayments = await Payment.find({
            ...paymentFilter,
            $expr: {
                $and: [
                    { $gte: [{ $ifNull: ["$paidDate", "$createdAt"] }, startDate] },
                    { $lte: [{ $ifNull: ["$paidDate", "$createdAt"] }, endDate] }
                ]
            }
        });

        if (diffDays <= 31) {
            // Day-wise granularity
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dayStart = new Date(d);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(d);
                dayEnd.setHours(23, 59, 59, 999);

                const dPayments = trendPayments.filter(p => {
                    const pDate = new Date(p.paidDate || p.createdAt);
                    return pDate >= dayStart && pDate <= dayEnd;
                });

                trendData.push({
                    name: `${d.getDate()} ${monthNames[d.getMonth()]}`,
                    revenue: dPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0)
                });
            }
        } else {
            // Month-wise granularity
            let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            while (current <= endDate) {
                const mStart = new Date(current.getFullYear(), current.getMonth(), 1);
                const mEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);

                const mPayments = trendPayments.filter(p => {
                    const pDate = new Date(p.paidDate || p.createdAt);
                    return pDate >= mStart && pDate <= mEnd;
                });

                trendData.push({
                    name: `${monthNames[current.getMonth()]} ${current.getFullYear().toString().slice(-2)}`,
                    revenue: mPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0)
                });
                current.setMonth(current.getMonth() + 1);
            }
        }

        // 6. Centre-wise Revenue Breakdown (Detailed for Stacked Bar Chart)
        let centreDetailedData = [];
        const allCentres = await Centre.find({});
        
        for (const c of allCentres) {
            const cAdmissions = await Admission.find({ centre: c.centreName }).distinct('_id');
            const cBoardAdmissions = await BoardCourseAdmission.find({ centre: c.centreName }).distinct('_id');
            const allCAdmissions = [...cAdmissions, ...cBoardAdmissions].map(id => id.toString());
            
            const cPayments = periodPayments.filter(p => allCAdmissions.includes(p.admission.toString()));
            
            if (cPayments.length > 0) {
                const breakdown = {
                    name: c.centreName,
                    total: cPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0),
                    CASH: 0, UPI: 0, CARD: 0, BANK_TRANSFER: 0, CHEQUE: 0, CHEQUE_PENDING: 0
                };
                
                cPayments.forEach(p => {
                    if (p.status === "PENDING_CLEARANCE") {
                        breakdown.CHEQUE_PENDING += (p.paidAmount || 0);
                    } else {
                        const method = p.paymentMethod || 'CASH';
                        if (breakdown.hasOwnProperty(method)) {
                            breakdown[method] += (p.paidAmount || 0);
                        }
                    }
                });
                
                centreDetailedData.push(breakdown);
            }
        }
        
        // Sort by total revenue descending
        centreDetailedData.sort((a, b) => b.total - a.total);

        res.status(200).json({
            totalAmountToCome: Number(totalAmountToCome.toFixed(2)),
            totalAmountCame: Number(totalAmountCame.toFixed(2)),
            selectionWithoutGst: Number(selectionWithoutGst.toFixed(2)),
            fiscalWithGst: Number(fiscalWithGst.toFixed(2)),
            fiscalWithoutGst: Number(fiscalWithoutGst.toFixed(2)),
            amountWillCome: Number(amountWillCome.toFixed(2)),
            totalDue: Number(totalDue.toFixed(2)),
            paymentBreakdown: {
                CASH: Number(paymentBreakdown.CASH.toFixed(2)),
                UPI: Number(paymentBreakdown.UPI.toFixed(2)),
                CARD: Number(paymentBreakdown.CARD.toFixed(2)),
                BANK_TRANSFER: Number(paymentBreakdown.BANK_TRANSFER.toFixed(2)),
                CHEQUE: Number(paymentBreakdown.CHEQUE.toFixed(2)),
                CHEQUE_PENDING: Number(paymentBreakdown.CHEQUE_PENDING.toFixed(2))
            },
            trendData,
            centreData: centreDetailedData
        });

    } catch (error) {
        console.error("Error fetching financial analytics:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
