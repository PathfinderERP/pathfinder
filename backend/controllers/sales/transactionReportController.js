import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import mongoose from "mongoose";

export const getTransactionReport = async (req, res) => {
    try {
        const {
            year,
            centreIds,
            courseIds,
            examTagId,
            session // e.g., "2025-2026"
        } = req.query;

        // Base Match for Payment (Status PAID)
        let paymentMatch = {
            status: { $in: ["PAID", "PARTIAL", "COMPLETED"] } // Include all valid payment states
        };

        // Filter by Year (payment date)
        if (year && !isNaN(parseInt(year))) {
            const targetYear = parseInt(year);
            const startOfYear = new Date(targetYear, 0, 1);
            const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
            paymentMatch.paidDate = { $gte: startOfYear, $lte: endOfYear };
        }

        // Match for Admission fields (Centre, Course, Session, ExamTag)
        let admissionMatch = {};

        if (session) {
            admissionMatch["admissionInfo.academicSession"] = session;
        }

        if (centreIds) {
            const cIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            if (cIds.length > 0) {
                admissionMatch["admissionInfo.centre"] = { $in: cIds };
            }
        }

        if (courseIds) {
            const coIds = typeof courseIds === 'string' ? courseIds.split(',') : courseIds;
            if (coIds.length > 0) {
                // Course is ObjectId
                const objectIds = coIds.map(id => new mongoose.Types.ObjectId(id));
                admissionMatch["admissionInfo.course"] = { $in: objectIds };
            }
        }

        if (examTagId) {
            admissionMatch["admissionInfo.examTag"] = new mongoose.Types.ObjectId(examTagId);
        }

        const reportData = await Payment.aggregate([
            // 1. Match Payments
            { $match: paymentMatch },

            // 2. Lookup Admission Details
            {
                $lookup: {
                    from: "admissions",
                    localField: "admission",
                    foreignField: "_id",
                    as: "admissionInfo"
                }
            },
            { $unwind: "$admissionInfo" },

            // 3. Match Admission Filters
            { $match: admissionMatch },

            // 4. Facets for Charts
            {
                $facet: {
                    // Chart 1: Monthly Revenue (Bar Chart)
                    monthlyRevenue: [
                        {
                            $group: {
                                _id: { $month: "$paidDate" },
                                revenue: { $sum: "$paidAmount" } // Use actual paid amount
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],

                    // Chart 2: Payment Method Breakdown (Pie Chart)
                    paymentMethods: [
                        {
                            $group: {
                                _id: "$paymentMethod",
                                value: { $sum: "$paidAmount" },
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        // Process Results
        const result = reportData[0];

        // Format Monthly Data (1-12 to Jan-Dec)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedMonthly = result.monthlyRevenue.map(item => ({
            month: monthNames[item._id - 1],
            revenue: item.revenue,
            fullMonth: item._id // For sorting if needed
        }));

        // Fill missing months with 0?
        // Optional: Ensure all 12 months present
        const finalMonthly = monthNames.map((m, i) => {
            const found = formattedMonthly.find(x => x.month === m);
            return found || { month: m, revenue: 0, fullMonth: i + 1 };
        });

        // Calculate Total
        const totalRevenue = result.paymentMethods.reduce((acc, curr) => acc + curr.value, 0);

        // Format Payment Methods
        const formattedMethods = result.paymentMethods.map(item => ({
            name: item._id || "Unknown",
            value: item.value,
            count: item.count,
            percent: totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : 0
        }));

        res.status(200).json({
            monthlyRevenue: finalMonthly,
            paymentMethods: formattedMethods,
            totalRevenue
        });

    } catch (error) {
        console.error("Error in Transaction Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
