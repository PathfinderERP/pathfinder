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
            if (types.includes("initial")) criteria.push({ installmentNumber: 0 });
            if (types.includes("emi")) criteria.push({ installmentNumber: { $gt: 0 } });

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

        // Resolve Centre IDs to Centre Names (since Admission stores Centre Name)
        let allowedCentreNames = [];
        if (req.user.role !== 'superAdmin') {
            const userCentres = await Centre.find({ _id: { $in: req.user.centres || [] } }).select("centreName");
            allowedCentreNames = userCentres.map(c => c.centreName);
        }

        if (centreIds) {
            const cIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            const validIds = cIds.filter(id => mongoose.Types.ObjectId.isValid(id.trim()));
            if (validIds.length > 0) {
                const requestedCentres = await Centre.find({ _id: { $in: validIds } }).select("centreName");
                const requestedNames = requestedCentres.map(c => c.centreName);

                if (req.user.role !== 'superAdmin') {
                    const finalNames = requestedNames.filter(name => allowedCentreNames.includes(name));
                    admissionMatch["admissionInfo.centre"] = { $in: finalNames.length > 0 ? finalNames : ["__NO_MATCH__"] };
                } else if (requestedNames.length > 0) {
                    admissionMatch["admissionInfo.centre"] = { $in: requestedNames };
                }
            }
        } else if (req.user.role !== 'superAdmin') {
            admissionMatch["admissionInfo.centre"] = { $in: allowedCentreNames.length > 0 ? allowedCentreNames : ["__NO_MATCH__"] };
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
            { $lookup: { from: "admissions", localField: "admission", foreignField: "_id", as: "admissionInfo" } },
            { $unwind: "$admissionInfo" },

            // Lookup Course for Dept Filter (and general info)
            { $lookup: { from: "courses", localField: "admissionInfo.course", foreignField: "_id", as: "courseInfo" } },
            { $unwind: { path: "$courseInfo", preserveNullAndEmptyArrays: true } },

            // 3. Match Admission & Dept Filters
            {
                $match: {
                    ...admissionMatch,
                    ...(departmentIds ? {
                        $or: [
                            { "courseInfo.department": { $in: (typeof departmentIds === 'string' ? departmentIds.split(',') : departmentIds).filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id)) } },
                            { "admissionInfo.department": { $in: (typeof departmentIds === 'string' ? departmentIds.split(',') : departmentIds).filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id)) } }
                        ]
                    } : {})
                }
            },

            // Add Fallback Date for Grouping
            {
                $addFields: {
                    reportDate: { $ifNull: ["$paidDate", { $ifNull: ["$receivedDate", "$createdAt"] }] },
                    revenueBase: { $ifNull: ["$courseFee", { $divide: ["$paidAmount", 1.18] }] }
                }
            },

            // 4. Facets for Charts
            {
                $facet: {
                    // Chart 1: Monthly Revenue (Bar Chart)
                    monthlyRevenue: [
                        {
                            $group: {
                                _id: { $month: "$reportDate" },
                                revenue: { $sum: "$paidAmount" }, // With GST
                                revenueWithoutGst: { $sum: "$revenueBase" }, // Use calculated base
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
                                value: { $sum: "$paidAmount" }, // With GST
                                revenueWithoutGst: { $sum: "$revenueBase" },
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
                                revenueWithoutGst: { $sum: { $divide: ["$paidAmount", 1.18] } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { revenue: -1 } }
                    ],

                    // Chart 4: Course Wise Revenue
                    courseRevenue: [
                        {
                            $group: {
                                _id: { $ifNull: ["$admissionInfo.course", "$admissionInfo.boardCourseName"] },
                                revenue: { $sum: "$paidAmount" },
                                revenueWithoutGst: { $sum: { $divide: ["$paidAmount", 1.18] } },
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $lookup: {
                                from: "courses",
                                localField: "_id",
                                foreignField: "_id",
                                as: "courseDetails"
                            }
                        },
                        {
                            $project: {
                                name: { $ifNull: [{ $arrayElemAt: ["$courseDetails.courseName", 0] }, "$_id"] },
                                revenue: 1,
                                revenueWithoutGst: 1,
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
            { $lookup: { from: "admissions", localField: "admission", foreignField: "_id", as: "admissionInfo" } },
            { $unwind: "$admissionInfo" },
            { $match: admissionMatch },
            { $lookup: { from: "students", localField: "admissionInfo.student", foreignField: "_id", as: "studentInfo" } },
            { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },
            { $lookup: { from: "courses", localField: "admissionInfo.course", foreignField: "_id", as: "courseInfo" } },
            { $unwind: { path: "$courseInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "departments",
                    localField: "admissionInfo.department",
                    foreignField: "_id",
                    as: "directDept"
                }
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "courseInfo.department",
                    foreignField: "_id",
                    as: "courseDept"
                }
            },
            {
                $addFields: {
                    departmentDetails: {
                        $ifNull: [
                            { $arrayElemAt: ["$directDept", 0] },
                            { $arrayElemAt: ["$courseDept", 0] }
                        ]
                    }
                }
            },
            {
                $match: departmentIds ? {
                    $or: [
                        { "courseInfo.department": { $in: (typeof departmentIds === 'string' ? departmentIds.split(',') : departmentIds).filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id)) } },
                        { "admissionInfo.department": { $in: (typeof departmentIds === 'string' ? departmentIds.split(',') : departmentIds).filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id)) } }
                    ]
                } : {}
            },
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
                    course: { $ifNull: ["$courseInfo.courseName", "$admissionInfo.boardCourseName", "$boardCourseName"] },
                    department: "$departmentDetails.departmentName",
                    session: "$admissionInfo.academicSession",
                    admissionNumber: "$admissionInfo.admissionNumber",
                    receivedDate: { $ifNull: ["$receivedDate", "$paidDate"] },
                    receiptNo: "$billId",
                    installmentNumber: "$installmentNumber",
                    revenueWithoutGst: { $ifNull: ["$courseFee", { $divide: ["$paidAmount", 1.18] }] },
                    gstAmount: { $ifNull: [{ $add: ["$cgst", "$sgst"] }, { $subtract: ["$paidAmount", { $divide: ["$paidAmount", 1.18] }] }] }
                }
            }
        ]);


        // --- Stats Calculation (Current Year, Previous Year, Current Month, Previous Month) ---
        // Dynamically calculate based on current date
        // Dynamically calculate based on current date
        const now = new Date();
        const currentYear = now.getFullYear();

        // Financial Year Logic (April - March)
        const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
        const startCFY = new Date(fyStartYear, 3, 1);
        const endCFY = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);

        const startPFY = new Date(fyStartYear - 1, 3, 1);
        const endPFY = new Date(fyStartYear, 2, 31, 23, 59, 59, 999);

        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Stats Aggregation - Uses baseAttributesMatch (ignores user date filter) but keeps context filters
        const statsData = await Payment.aggregate([
            { $match: baseAttributesMatch },
            { $lookup: { from: "admissions", localField: "admission", foreignField: "_id", as: "admissionInfo" } },
            { $unwind: "$admissionInfo" },
            { $match: admissionMatch },
            { $lookup: { from: "courses", localField: "admissionInfo.course", foreignField: "_id", as: "courseInfo" } },
            { $unwind: { path: "$courseInfo", preserveNullAndEmptyArrays: true } },
            {
                $match: departmentIds ? {
                    $or: [
                        { "courseInfo.department": { $in: (typeof departmentIds === 'string' ? departmentIds.split(',') : departmentIds).filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id)) } },
                        { "admissionInfo.department": { $in: (typeof departmentIds === 'string' ? departmentIds.split(',') : departmentIds).filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id)) } }
                    ]
                } : {}
            },
            {
                $project: {
                    paidAmount: 1,
                    paidDate: { $ifNull: ["$paidDate", { $ifNull: ["$receivedDate", "$createdAt"] }] }
                }
            },
            {
                $group: {
                    _id: null,
                    currentYearWithGst: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$paidDate", startCFY] }, { $lte: ["$paidDate", endCFY] }] }, "$paidAmount", 0] }
                    },
                    currentYearWithoutGst: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$paidDate", startCFY] }, { $lte: ["$paidDate", endCFY] }] }, { $divide: ["$paidAmount", 1.18] }, 0] }
                    },
                    previousYearWithGst: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$paidDate", startPFY] }, { $lte: ["$paidDate", endPFY] }] }, "$paidAmount", 0] }
                    },
                    previousYearWithoutGst: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$paidDate", startPFY] }, { $lte: ["$paidDate", endPFY] }] }, { $divide: ["$paidAmount", 1.18] }, 0] }
                    },
                    currentMonthWithGst: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$paidDate", currentMonthStart] }, { $lte: ["$paidDate", currentMonthEnd] }] }, "$paidAmount", 0] }
                    },
                    currentMonthWithoutGst: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$paidDate", currentMonthStart] }, { $lte: ["$paidDate", currentMonthEnd] }] }, { $divide: ["$paidAmount", 1.18] }, 0] }
                    },
                    previousMonthWithGst: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$paidDate", prevMonthStart] }, { $lte: ["$paidDate", prevMonthEnd] }] }, "$paidAmount", 0] }
                    },
                    previousMonthWithoutGst: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$paidDate", prevMonthStart] }, { $lte: ["$paidDate", prevMonthEnd] }] }, { $divide: ["$paidAmount", 1.18] }, 0] }
                    }
                }
            }
        ]);

        const stats = statsData.length > 0 ? statsData[0] : {
            currentYearWithGst: 0, currentYearWithoutGst: 0,
            previousYearWithGst: 0, previousYearWithoutGst: 0,
            currentMonthWithGst: 0, currentMonthWithoutGst: 0,
            previousMonthWithGst: 0, previousMonthWithoutGst: 0
        };

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
                currentYear: stats.currentYearWithGst,
                currentYearRevenue: stats.currentYearWithoutGst,
                previousYear: stats.previousYearWithGst,
                previousYearRevenue: stats.previousYearWithoutGst,
                currentMonth: stats.currentMonthWithGst,
                currentMonthRevenue: stats.currentMonthWithoutGst,
                previousMonth: stats.previousMonthWithGst,
                previousMonthRevenue: stats.previousMonthWithoutGst,
                currentYearLabel: `${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`,
                previousYearLabel: `${fyStartYear - 1}-${fyStartYear.toString().slice(-2)}`,
                currentMonthLabel: now.toLocaleString('default', { month: 'long' }),
                previousMonthLabel: prevMonthStart.toLocaleString('default', { month: 'long' }),
                selectionTotalWithGst: result.paymentMethods.reduce((acc, curr) => acc + curr.value, 0),
                selectionTotalBase: result.paymentMethods.reduce((acc, curr) => acc + (curr.revenueWithoutGst || 0), 0)
            }
        });

    } catch (error) {
        console.error("Error in Transaction Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
