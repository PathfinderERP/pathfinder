import Payment from "../models/Payment/Payment.js";
import Centre from "../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getDailyCollectionReportData = async ({ query, user }) => {
    const {
        date,
        centreIds,
        courseIds,
        examTagId,
        session,
        departmentIds,
        paymentMode,
        transactionType,
        search
    } = query;

    const selectedDate = date ? new Date(date) : new Date();
    selectedDate.setHours(0, 0, 0, 0);
    const startOfDay = selectedDate;
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Base Payment Filter
    const paymentMatch = {
        paidAmount: { $gt: 0 },
        billId: { $exists: true, $nin: [null, ""] },
        $or: [
            { status: { $in: ["PAID", "PARTIAL"] } },
            {
                paymentMethod: "CHEQUE",
                status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
            }
        ],
        $expr: {
            $and: [
                {
                    $gte: [
                        { $ifNull: ["$receivedDate", "$paidDate"] },
                        startOfDay
                    ]
                },
                {
                    $lte: [
                        { $ifNull: ["$receivedDate", "$paidDate"] },
                        endOfDay
                    ]
                }
            ]
        }
    };

    if (paymentMode) {
        const modes = typeof paymentMode === "string" ? paymentMode.split(",") : paymentMode;
        paymentMatch.paymentMethod = { $in: modes };
    }

    if (transactionType) {
        const types = typeof transactionType === "string" ? transactionType.split(",") : transactionType;
        const lowerTypes = types.map(t => t.toLowerCase());
        const typeCriteria = [];
        if (lowerTypes.includes("initial")) typeCriteria.push({ installmentNumber: 0 });
        if (lowerTypes.includes("emi")) typeCriteria.push({ installmentNumber: { $gt: 0 } });
        if (typeCriteria.length === 1) {
            Object.assign(paymentMatch, typeCriteria[0]);
        } else if (typeCriteria.length > 1) {
            paymentMatch.$or = paymentMatch.$or.concat(typeCriteria);
        }
    }

    let admissionMatch = {};
    let departmentMatch = {};

    // Restrict by user centres unless superAdmin
    let allowedCentreNames = [];
    if (user.role !== 'superAdmin') {
        const userCentreIds = Array.isArray(user.centres) ? user.centres : [];
        const userCentres = await Centre.find({ _id: { $in: userCentreIds } }).select("centreName");
        allowedCentreNames = userCentres.map(c => c.centreName);
    }

    if (centreIds) {
        const ids = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id.trim()));
        if (validIds.length > 0) {
            const requestedNames = (await Centre.find({ _id: { $in: validIds } }).select("centreName")).map(c => c.centreName);
            if (user.role !== 'superAdmin') {
                const finalNames = requestedNames.filter(name => allowedCentreNames.includes(name));
                admissionMatch["admissionInfo.centre"] = finalNames.length > 0 ? { $in: finalNames } : "__NO_MATCH__";
            } else {
                admissionMatch["admissionInfo.centre"] = { $in: requestedNames };
            }
        }
    } else if (user.role !== 'superAdmin' && allowedCentreNames.length > 0) {
        admissionMatch["admissionInfo.centre"] = { $in: allowedCentreNames };
    }

    if (session) {
        const sessionValues = typeof session === 'string' ? session.split(',').map(s => s.trim()).filter(Boolean) : Array.isArray(session) ? session : [];
        if (sessionValues.length > 0) {
            admissionMatch["admissionInfo.academicSession"] = { $in: sessionValues };
        }
    }

    if (examTagId) {
        const tagValues = typeof examTagId === 'string' ? examTagId.split(',') : examTagId;
        const validTagIds = (Array.isArray(tagValues) ? tagValues : [tagValues])
            .map(id => String(id).trim())
            .filter(id => mongoose.Types.ObjectId.isValid(id))
            .map(id => new mongoose.Types.ObjectId(id));
        if (validTagIds.length > 0) {
            admissionMatch["admissionInfo.examTag"] = { $in: validTagIds };
        }
    }

    if (courseIds) {
        const ids = typeof courseIds === 'string' ? courseIds.split(',') : courseIds;
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id.trim()));
        if (validIds.length > 0) {
            admissionMatch.$or = admissionMatch.$or || [];
            admissionMatch.$or.push({ "admissionInfo.course": { $in: validIds } });
            admissionMatch.$or.push({ "admissionInfo.board": { $in: validIds } });
        }
    }

    if (departmentIds) {
        const ids = typeof departmentIds === 'string' ? departmentIds.split(',') : departmentIds;
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id.trim()));
        if (validIds.length > 0) {
            departmentMatch.$or = [
                { "courseInfo.department": { $in: validIds } },
                { "admissionInfo.department": { $in: validIds } }
            ];
        }
    }

    const searchMatch = {};
    if (search) {
        const regex = { $regex: search, $options: "i" };
        searchMatch.$or = [
            { billId: regex },
            { transactionId: regex },
            { "admissionInfo.admissionNumber": regex },
            { "studentName": regex }
        ];
    }

    const aggregateMatch = [];
    if (Object.keys(admissionMatch).length > 0) aggregateMatch.push(admissionMatch);
    if (Object.keys(departmentMatch).length > 0) aggregateMatch.push(departmentMatch);
    if (Object.keys(searchMatch).length > 0) aggregateMatch.push(searchMatch);

    const finalMatchStage = aggregateMatch.length > 0 ? { $match: { $and: aggregateMatch } } : { $match: {} };

    const reportData = await Payment.aggregate([
        { $match: paymentMatch },
        {
            $lookup: {
                from: "admissions",
                localField: "admission",
                foreignField: "_id",
                as: "admissionInfoNormal"
            }
        },
        {
            $lookup: {
                from: "boardcourseadmissions",
                localField: "admission",
                foreignField: "_id",
                as: "admissionInfoBoard"
            }
        },
        {
            $addFields: {
                admissionInfo: {
                    $ifNull: [
                        { $arrayElemAt: ["$admissionInfoNormal", 0] },
                        { $arrayElemAt: ["$admissionInfoBoard", 0] }
                    ]
                }
            }
        },
        { $unwind: "$admissionInfo" },
        {
            $lookup: {
                from: "students",
                localField: "admissionInfo.student",
                foreignField: "_id",
                as: "studentInfoNormal"
            }
        },
        {
            $lookup: {
                from: "students",
                localField: "admissionInfo.studentId",
                foreignField: "_id",
                as: "studentInfoBoard"
            }
        },
        {
            $addFields: {
                studentInfo: {
                    $ifNull: [
                        { $arrayElemAt: ["$studentInfoNormal", 0] },
                        { $arrayElemAt: ["$studentInfoBoard", 0] }
                    ]
                }
            }
        },
        {
            $lookup: {
                from: "courses",
                localField: "admissionInfo.course",
                foreignField: "_id",
                as: "courseInfo"
            }
        },
        {
            $unwind: {
                path: "$courseInfo",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "recordedBy",
                foreignField: "_id",
                as: "userInfo"
            }
        },
        {
            $lookup: {
                from: "departments",
                localField: "admissionInfo.department",
                foreignField: "_id",
                as: "departmentInfo"
            }
        },
        {
            $addFields: {
                studentName: {
                    $ifNull: [
                        { $arrayElemAt: ["$studentInfo.studentsDetails.studentName", 0] },
                        ""
                    ]
                },
                studentClassId: {
                    $ifNull: [
                        {
                            $cond: [
                                { $isArray: "$studentInfo.studentsDetails.class" },
                                { $arrayElemAt: ["$studentInfo.studentsDetails.class", 0] },
                                "$studentInfo.studentsDetails.class"
                            ]
                        },
                        "$admissionInfo.class"
                    ]
                },
                courseName: {
                    $ifNull: ["$courseInfo.courseName", "$admissionInfo.boardCourseName"]
                },
                effectiveDate: { $ifNull: ["$receivedDate", "$paidDate"] },
                recordedByName: {
                    $ifNull: [
                        { $arrayElemAt: ["$userInfo.name", 0] },
                        "N/A"
                    ]
                }
            }
        },
        {
            $lookup: {
                from: "classes",
                localField: "studentClassId",
                foreignField: "_id",
                as: "classInfo"
            }
        },
        {
            $addFields: {
                studentClass: {
                    $ifNull: [
                        { $arrayElemAt: ["$classInfo.name", 0] },
                        {
                            $cond: [
                                { $isArray: "$studentInfo.studentsDetails.class" },
                                { $arrayElemAt: ["$studentInfo.studentsDetails.class", 0] },
                                "$studentInfo.studentsDetails.class"
                            ]
                        }
                    ]
                }
            }
        },
        finalMatchStage,
        {
            $facet: {
                summary: [
                    {
                        $group: {
                            _id: null,
                            totalCollection: { $sum: "$paidAmount" },
                            transactionCount: { $sum: 1 }
                        }
                    }
                ],
                paymentMethods: [
                    {
                        $group: {
                            _id: "$paymentMethod",
                            totalAmount: { $sum: "$paidAmount" },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { totalAmount: -1 } }
                ],
                details: [
                    {
                        $project: {
                            _id: 1,
                            date: "$effectiveDate",
                            centre: "$admissionInfo.centre",
                            academicSession: "$admissionInfo.academicSession",
                            admissionNumber: "$admissionInfo.admissionNumber",
                            studentName: "$studentName",
                            studentClass: 1,
                            billId: 1,
                            transactionId: 1,
                            courseName: 1,
                            departmentName: { $arrayElemAt: ["$departmentInfo.departmentName", 0] },
                            paymentMethod: 1,
                            installmentNumber: 1,
                            status: 1,
                            paidAmount: 1,
                            remarks: 1,
                            recordedByName: "$recordedByName"
                        }
                    },
                    { $sort: { date: -1 } }
                ]
            }
        }
    ]);

    const summary = reportData[0]?.summary?.[0] || { totalCollection: 0, transactionCount: 0 };
    const paymentMethods = reportData[0]?.paymentMethods || [];
    const details = reportData[0]?.details || [];

    return {
        date: selectedDate.toISOString().split("T")[0],
        totalCollection: summary.totalCollection || 0,
        transactionCount: summary.transactionCount || 0,
        paymentMethods,
        details
    };
};
