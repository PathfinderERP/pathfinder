import Payment from "../../models/Payment/Payment.js";
import Admission from "../../models/Admission/Admission.js";
import Centre from "../../models/Master_data/Centre.js";
import Course from "../../models/Master_data/Courses.js";
import Student from "../../models/Students.js"; // Importing to ensure schema registration for lookups if needed
import mongoose from "mongoose";

export const getTransactionReport = async (req, res) => {
    try {
        const {
            year,
            startDate,
            endDate,
            centreIds,
            courseIds,
            examTagId,
            session, // e.g., "2025-2026"
            paymentMode,
            transactionType, // "Initial" or "EMI"
            departmentIds,
            minAmount,
            maxAmount
        } = req.query;

        // Base Match for Payment (paidAmount > 0)
        let baseAttributesMatch = {
            paidAmount: { $gt: 0 }
        };

        if (minAmount || maxAmount) {
            if (minAmount) baseAttributesMatch.paidAmount.$gte = parseFloat(minAmount);
            if (maxAmount) baseAttributesMatch.paidAmount.$lte = parseFloat(maxAmount);
        }

        if (paymentMode) {
            const modes = paymentMode.split(',');
            baseAttributesMatch.paymentMethod = { $in: modes };
        }

        if (transactionType) {
            const types = transactionType.split(',').map(t => t.toLowerCase());
            let criteria = [];
            if (types.includes("initial")) criteria.push({ installmentNumber: 1 });
            if (types.includes("emi")) criteria.push({ installmentNumber: { $gt: 1 } });

            if (criteria.length > 0) {
                if (criteria.length > 1) {
                    baseAttributesMatch.$or = criteria;
                } else {
                    Object.assign(baseAttributesMatch, criteria[0]);
                }
            }
        }

        let paymentMatch = { ...baseAttributesMatch };

        // Filter by Date Range (startDate/endDate OR year) for the main report
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            paymentMatch.paidDate = { $gte: start, $lte: end };
        } else if (year && !isNaN(parseInt(year))) {
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

        // Fix: Resolve Centre IDs to Centre Names (since Admission stores Centre Name)
        if (centreIds) {
            const cIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            // Valid Hex IDs only
            const validIds = cIds.filter(id => mongoose.Types.ObjectId.isValid(id.trim()));
            if (validIds.length > 0) {
                const centres = await Centre.find({ _id: { $in: validIds } }).select("centreName");
                const centreNames = centres.map(c => c.centreName);
                if (centreNames.length > 0) {
                    admissionMatch["admissionInfo.centre"] = { $in: centreNames };
                } else {
                    admissionMatch["admissionInfo.centre"] = { $in: ["__NO_MATCH__"] };
                }
            }
        }

        if (courseIds) {
            const coIds = typeof courseIds === 'string' ? courseIds.split(',') : coIds;
            const validIds = coIds.filter(id => mongoose.Types.ObjectId.isValid(id.trim()));
            if (validIds.length > 0) {
                // Course is ObjectId
                const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));
                admissionMatch["admissionInfo.course"] = { $in: objectIds };
            }
        }

        if (examTagId && mongoose.Types.ObjectId.isValid(examTagId)) {
            admissionMatch["admissionInfo.examTag"] = new mongoose.Types.ObjectId(examTagId);
        }

        let departmentMatch = {};
        if (departmentIds) {
            const dIds = typeof departmentIds === 'string' ? departmentIds.split(',') : departmentIds;
            const validDIds = dIds.filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id));

            if (validDIds.length > 0) {
                departmentMatch["courseInfo.department"] = { $in: validDIds };
            }
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

            // Lookup Course for Dept Filter (and general info)
            {
                $lookup: {
                    from: "courses",
                    localField: "admissionInfo.course",
                    foreignField: "_id",
                    as: "courseInfo"
                }
            },
            { $unwind: "$courseInfo" },
            { $match: departmentMatch },

            // 4. Facets for Charts
            {
                $facet: {
                    // Chart 1: Monthly Revenue (Bar Chart)
                    monthlyRevenue: [
                        {
                            $group: {
                                _id: { $month: "$paidDate" },
                                revenue: { $sum: "$paidAmount" }, // Use actual paid amount
                                count: { $sum: 1 }
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
                    ],

                    // Chart 3: Centre Wise Revenue
                    centreRevenue: [
                        {
                            $group: {
                                _id: "$admissionInfo.centre",
                                revenue: { $sum: "$paidAmount" },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { revenue: -1 } }
                    ],

                    // Chart 4: Course Wise Revenue
                    courseRevenue: [
                        {
                            $group: {
                                _id: "$admissionInfo.course",
                                revenue: { $sum: "$paidAmount" },
                                count: { $sum: 1 }
                            }
                        },
                        {
                            // Optimized: courseInfo is already present
                            $lookup: {
                                from: "courses",
                                localField: "_id",
                                foreignField: "_id",
                                as: "courseDetails"
                            }
                        },
                        { $unwind: "$courseDetails" },
                        {
                            $project: {
                                name: "$courseDetails.courseName",
                                revenue: 1,
                                count: 1
                            }
                        },
                        { $sort: { revenue: -1 } }
                    ]
                }
            }
        ]);

        // Process Detailed Report (Separate Query for Flattened Data)
        // We reuse the pipeline logic but project detailed fields
        const detailedData = await Payment.aggregate([
            { $match: paymentMatch },
            {
                $lookup: {
                    from: "admissions",
                    localField: "admission",
                    foreignField: "_id",
                    as: "admissionInfo"
                }
            },
            { $unwind: "$admissionInfo" },
            { $match: admissionMatch },
            {
                $lookup: {
                    from: "students",
                    localField: "admissionInfo.student",
                    foreignField: "_id",
                    as: "studentInfo"
                }
            },
            { $unwind: "$studentInfo" },
            {
                $lookup: {
                    from: "courses",
                    localField: "admissionInfo.course",
                    foreignField: "_id",
                    as: "courseInfo"
                }
            },
            { $unwind: "$courseInfo" },
            {
                $lookup: {
                    from: "departments",
                    localField: "courseInfo.department",
                    foreignField: "_id",
                    as: "departmentDetails"
                }
            },
            { $unwind: { path: "$departmentDetails", preserveNullAndEmptyArrays: true } },
            { $match: departmentMatch },
            { $sort: { paidDate: -1 } },
            {
                $project: {
                    transactionId: "$transactionId",
                    paymentDate: "$paidDate",
                    amount: "$paidAmount",
                    method: "$paymentMethod",
                    status: "$status",

                    // Admission/Student Info
                    studentName: { $arrayElemAt: ["$studentInfo.studentsDetails.studentName", 0] },
                    centre: "$admissionInfo.centre",
                    course: "$courseInfo.courseName",
                    department: "$departmentDetails.departmentName",
                    session: "$admissionInfo.academicSession",
                    admissionNumber: "$admissionInfo.admissionNumber",
                    receivedDate: "$receivedDate",
                    receiptNo: "$billId",
                    installmentNumber: "$installmentNumber"
                }
            }
        ]);


        // --- Stats Calculation (Current Year, Previous Year, Current Month, Previous Month) ---
        // Dynamically calculate based on current date
        const now = new Date();
        const currentYear = now.getFullYear();
        const previousYear = currentYear - 1;

        const startCY = new Date(currentYear, 0, 1);
        const endCY = new Date(currentYear, 11, 31, 23, 59, 59, 999);

        const startPY = new Date(previousYear, 0, 1);
        const endPY = new Date(previousYear, 11, 31, 23, 59, 59, 999);

        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Stats Aggregation - Uses baseAttributesMatch (ignores user date filter) but keeps context filters
        const statsData = await Payment.aggregate([
            { $match: baseAttributesMatch },
            {
                $lookup: {
                    from: "admissions",
                    localField: "admission",
                    foreignField: "_id",
                    as: "admissionInfo"
                }
            },
            { $unwind: "$admissionInfo" },
            { $match: admissionMatch },
            {
                $lookup: {
                    from: "courses",
                    localField: "admissionInfo.course",
                    foreignField: "_id",
                    as: "courseInfo"
                }
            },
            { $unwind: "$courseInfo" },
            { $match: departmentMatch },
            {
                $project: {
                    paidAmount: 1,
                    paidDate: 1
                }
            },
            {
                $group: {
                    _id: null,
                    currentYearRevenue: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ["$paidDate", startCY] }, { $lte: ["$paidDate", endCY] }] },
                                "$paidAmount",
                                0
                            ]
                        }
                    },
                    previousYearRevenue: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ["$paidDate", startPY] }, { $lte: ["$paidDate", endPY] }] },
                                "$paidAmount",
                                0
                            ]
                        }
                    },
                    currentMonthRevenue: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ["$paidDate", currentMonthStart] }, { $lte: ["$paidDate", currentMonthEnd] }] },
                                "$paidAmount",
                                0
                            ]
                        }
                    },
                    previousMonthRevenue: {
                        $sum: {
                            $cond: [
                                { $and: [{ $gte: ["$paidDate", prevMonthStart] }, { $lte: ["$paidDate", prevMonthEnd] }] },
                                "$paidAmount",
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const stats = statsData.length > 0 ? statsData[0] : { currentYearRevenue: 0, previousYearRevenue: 0, currentMonthRevenue: 0, previousMonthRevenue: 0 };

        const result = reportData[0];

        // Format Monthly Data (1-12 to Jan-Dec)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedMonthly = result.monthlyRevenue.map(item => ({
            month: monthNames[item._id - 1],
            revenue: item.revenue,
            count: item.count,
            fullMonth: item._id // For sorting if needed
        }));

        // Fill missing months with 0?
        // Optional: Ensure all 12 months present
        const finalMonthly = monthNames.map((m, i) => {
            const found = formattedMonthly.find(x => x.month === m);
            return found || { month: m, revenue: 0, count: 0, fullMonth: i + 1 };
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
            centreRevenue: result.centreRevenue, // New
            courseRevenue: result.courseRevenue, // New
            detailedReport: detailedData,        // New
            totalRevenue,
            stats: {
                currentYear: stats.currentYearRevenue,
                previousYear: stats.previousYearRevenue,
                currentMonth: stats.currentMonthRevenue,
                previousMonth: stats.previousMonthRevenue,
                currentYearLabel: currentYear,
                previousYearLabel: previousYear,
                currentMonthLabel: now.toLocaleString('default', { month: 'long' }),
                previousMonthLabel: prevMonthStart.toLocaleString('default', { month: 'long' })
            }
        });

    } catch (error) {
        console.error("Error in Transaction Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
