import Payment from "../models/Payment/Payment.js";
import Centre from "../models/Master_data/Centre.js";
import mongoose from "mongoose";
import CentreTarget from "../models/Sales/CentreTarget.js";
import DailyTarget from "../models/Sales/DailyTarget.js";
import Zone from "../models/Zone.js";
import User from "../models/User.js";

const getDailyAchievedForMonth = async (startDate, endDate) => {
    try {
        const result = await Payment.aggregate([
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
                    admissionDetails: {
                        $ifNull: [
                            { $arrayElemAt: ["$admissionInfoNormal", 0] },
                            { $arrayElemAt: ["$admissionInfoBoard", 0] }
                        ]
                    }
                }
            },
            { $unwind: "$admissionDetails" },
            {
                $match: {
                    billId: { $exists: true, $nin: [null, "", "-"] },
                    $or: [
                        { status: { $in: ["PAID", "PARTIAL", "PENDING_CLEARANCE", "REJECTED"] } },
                        { paymentMethod: { $exists: true } },
                        { paidAmount: { $gt: 0 } }
                    ]
                }
            },
            {
                $addFields: {
                    effectiveDate: { $ifNull: ["$receivedDate", "$paidDate", "$createdAt"] },
                    revenueBase: {
                        $cond: [
                            { $gt: ["$courseFee", 0] },
                            "$courseFee",
                            { $divide: ["$paidAmount", 1.18] }
                        ]
                    }
                }
            },
            {
                $match: {
                    effectiveDate: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        centre: "$admissionDetails.centre",
                        day: { $dayOfMonth: "$effectiveDate" }
                    },
                    totalExclGST: { $sum: "$revenueBase" }
                }
            }
        ]);
        return result;
    } catch (err) {
        console.error("getDailyAchievedForMonth error:", err);
        return [];
    }
};

const buildFixedWeeks = (year, monthIndex) => {
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const periods = [];
    let weekNum = 1;
    let startDay = 1;

    while (startDay <= daysInMonth) {
        let endDay = startDay;
        while (endDay < daysInMonth) {
            const date = new Date(year, monthIndex, endDay);
            if (date.getDay() === 0) { // Sunday ends the week
                break;
            }
            endDay++;
        }

        periods.push({
            weekNumber: weekNum,
            start: startDay,
            end: endDay
        });

        startDay = endDay + 1;
        weekNum++;
    }

    return periods
        .filter(p => p.start <= daysInMonth)
        .map(p => {
            const actualEnd = Math.min(p.end, daysInMonth);
            const days = [];
            for (let d = p.start; d <= actualEnd; d++) {
                const date = new Date(year, monthIndex, d);
                const dow  = date.getDay(); // 0=Sun … 6=Sat
                days.push({
                    day:       d,
                    dayName:   dayNames[dow],
                    isWeekend: dow === 0 || dow === 6,
                    isEmpty:   false
                });
            }
            return {
                weekNumber: p.weekNumber,
                startDay:   p.start,
                endDay:     actualEnd,
                actualDays: days.length,
                days
            };
        });
};


export const getDailyCollectionReportData = async ({ query, user }) => {
    const {
        date,
        startDate,
        endDate,
        centreIds,
        courseIds,
        examTagId,
        session,
        departmentIds,
        paymentMode,
        transactionType,
        search
    } = query;

    let startOfDay;
    let endOfDay;
    const selectedDate = endDate ? new Date(endDate) : (date ? new Date(date) : new Date());

    if (startDate && endDate) {
        startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
    } else {
        selectedDate.setHours(0, 0, 0, 0);
        startOfDay = selectedDate;
        endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
    }

    // Base Payment Filter (Only show transactions where a bill has been generated)
    const paymentMatch = {
        paidAmount: { $gte: 0 },
        billId: { $regex: /^PATH/i },
        $or: [
            { status: { $in: ["PAID", "PARTIAL"] } },
            {
                paymentMethod: "CHEQUE",
                status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
            }
        ]
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

    // Resolve Centre Names for filtering and active centres
    const allCentres = await Centre.find({}).select("centreName");
    const allCentreNames = allCentres.map(c => c.centreName);

    let allowedCentreNames = [];
    if (user.role !== 'superAdmin') {
        const userCentreIds = Array.isArray(user.centres) ? user.centres : [];
        const userCentres = await Centre.find({ _id: { $in: userCentreIds } }).select("centreName");
        allowedCentreNames = userCentres.map(c => c.centreName);
    }

    const buildCentreRegexes = (names) => names.filter(Boolean).map(n => new RegExp(`^${n.trim()}$`, 'i'));

    if (centreIds) {
        const ids = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id.trim())).map(id => new mongoose.Types.ObjectId(id.trim()));
        if (validIds.length > 0) {
            const requestedCentres = await Centre.find({ _id: { $in: validIds } }).select("centreName");
            const requestedNames = requestedCentres.map(c => c.centreName);
            if (user.role !== 'superAdmin') {
                const finalNames = requestedNames.filter(name => allowedCentreNames.includes(name));
                admissionMatch["effectiveCentre"] = { $in: finalNames.length > 0 ? buildCentreRegexes(finalNames) : ["__NO_MATCH__"] };
            } else {
                admissionMatch["effectiveCentre"] = { $in: requestedNames.length > 0 ? buildCentreRegexes(requestedNames) : ["__NO_MATCH__"] };
            }
        }
    } else {
        const defaultAllCentreNames = allCentreNames.filter(name => name && !/franchise/i.test(name) && !/rkm/i.test(name));
        const defaultAllowedCentreNames = allowedCentreNames.filter(name => name && !/franchise/i.test(name) && !/rkm/i.test(name));
        if (user.role !== 'superAdmin') {
            admissionMatch["effectiveCentre"] = { $in: defaultAllowedCentreNames.length > 0 ? buildCentreRegexes(defaultAllowedCentreNames) : ["__NO_MATCH__"] };
        } else {
            admissionMatch["effectiveCentre"] = { $in: defaultAllCentreNames.length > 0 ? buildCentreRegexes(defaultAllCentreNames) : ["__NO_MATCH__"] };
        }
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
            $addFields: {
                effectiveDate: { $ifNull: [{ $toDate: "$paidDate" }, { $toDate: "$chequeDate" }, { $toDate: "$receivedDate" }, "$createdAt"] }
            }
        },
        {
            $match: {
                effectiveDate: { $gte: startOfDay, $lte: endOfDay }
            }
        },
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
            $lookup: {
                from: "pntsestudents",
                localField: "admission",
                foreignField: "_id",
                as: "admissionInfoPntse"
            }
        },
        {
            $lookup: {
                from: "pmostudents",
                localField: "admission",
                foreignField: "_id",
                as: "admissionInfoPmo"
            }
        },
        {
            $addFields: {
                admissionInfo: {
                    $ifNull: [
                        { $arrayElemAt: ["$admissionInfoNormal", 0] },
                        { $arrayElemAt: ["$admissionInfoBoard", 0] },
                        { $arrayElemAt: ["$admissionInfoPntse", 0] },
                        { $arrayElemAt: ["$admissionInfoPmo", 0] }
                    ]
                }
            }
        },
        { $unwind: { path: "$admissionInfo", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "centreschemas",
                localField: "admissionInfo.centre",
                foreignField: "_id",
                as: "pntseCentreInfo"
            }
        },
        {
            $addFields: {
                "admissionInfo.centre": {
                    $cond: {
                        if: { $gt: [{ $size: "$pntseCentreInfo" }, 0] },
                        then: { $arrayElemAt: ["$pntseCentreInfo.centreName", 0] },
                        else: "$admissionInfo.centre"
                    }
                }
            }
        },
        {
            $addFields: {
                effectiveCentre: {
                    $ifNull: ["$centre", "$admissionInfo.centre"]
                }
            }
        },
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
                        "$admissionInfo.name",
                        ""
                    ]
                },
                studentClassId: {
                    $ifNull: [
                        "$admissionInfo.class",
                        "$courseInfo.class"
                    ]
                },
                courseName: {
                    $ifNull: ["$courseInfo.courseName", "$admissionInfo.boardCourseName", "$admissionInfo.course"]
                },
                mrDate: { $ifNull: ["$paidDate", "$receivedDate", "$createdAt"] },
                actualReceivedDate: { $ifNull: ["$paidDate", "$receivedDate", "$createdAt"] },
                effectiveDate: { $ifNull: ["$paidDate", "$receivedDate", "$createdAt"] },
                recordedByName: {
                    $ifNull: [
                        { $arrayElemAt: ["$userInfo.name", 0] },
                        "N/A"
                    ]
                },
                studentEmail: {
                    $ifNull: [
                        { $arrayElemAt: ["$studentInfo.studentsDetails.studentEmail", 0] },
                        "$admissionInfo.email"
                    ]
                },
                studentMobile: {
                    $ifNull: [
                        { $arrayElemAt: ["$studentInfo.studentsDetails.mobileNum", 0] },
                        "$admissionInfo.mobile"
                    ]
                },
                studentWhatsapp: {
                    $ifNull: [
                        { $arrayElemAt: ["$studentInfo.studentsDetails.whatsappNumber", 0] },
                        "$admissionInfo.mobile"
                    ]
                },
                studentAddress: {
                    $ifNull: [
                        { $arrayElemAt: ["$studentInfo.studentsDetails.address", 0] },
                        "$admissionInfo.address"
                    ]
                },
                guardianName: {
                    $ifNull: [
                        { $arrayElemAt: ["$studentInfo.guardians.guardianName", 0] },
                        "$admissionInfo.guardianName"
                    ]
                },
                guardianMobile: {
                    $ifNull: [
                        { $arrayElemAt: ["$studentInfo.guardians.guardianMobile", 0] },
                        "$admissionInfo.guardianMobile"
                    ]
                },
                }
            },
            {
                $lookup: {
                    from: "studentattendances",
                    let: { studentId: "$studentInfo._id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$studentId", "$$studentId"] } } },
                        {
                            $group: {
                                _id: null,
                                totalClasses: { $sum: 1 },
                                presentCount: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
                                absentCount: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } }
                            }
                        }
                    ],
                    as: "attendanceStats"
                }
            },
            { $unwind: { path: "$attendanceStats", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "classes",
                localField: "studentClassId",
                foreignField: "_id",
                as: "classInfo"
            }
        },
        {
            $lookup: {
                from: "departments",
                localField: "courseInfo.department",
                foreignField: "_id",
                as: "courseDepartmentInfo"
            }
        },
        {
            $addFields: {
                studentClass: {
                    $ifNull: [
                        { $arrayElemAt: ["$classInfo.name", 0] },
                        "$admissionInfo.lastClass"
                    ]
                },
                departmentName: {
                    $ifNull: [
                        { $arrayElemAt: ["$departmentInfo.departmentName", 0] },
                        { $arrayElemAt: ["$courseDepartmentInfo.departmentName", 0] }
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
                            totalCollection: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $regexMatch: { input: { $ifNull: ["$effectiveCentre", ""] }, regex: "phsps", options: "i" } },
                                                { $regexMatch: { input: { $ifNull: ["$effectiveCentre", ""] }, regex: "midnapore|midnapur|medinipur", options: "i" } }
                                            ]
                                        },
                                        0,
                                        "$paidAmount"
                                    ]
                                }
                            },
                            transactionCount: { $sum: 1 }
                        }
                    }
                ],
                paymentMethods: [
                    {
                        $group: {
                            _id: "$paymentMethod",
                            totalAmount: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $regexMatch: { input: { $ifNull: ["$effectiveCentre", ""] }, regex: "phsps", options: "i" } },
                                                { $regexMatch: { input: { $ifNull: ["$effectiveCentre", ""] }, regex: "midnapore|midnapur|medinipur", options: "i" } }
                                            ]
                                        },
                                        0,
                                        "$paidAmount"
                                    ]
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { totalAmount: -1 } }
                ],
                details: [
                    {
                        $project: {
                            _id: 1,
                            date: "$mrDate",
                            receivedDate: "$actualReceivedDate",
                            centre: "$effectiveCentre",
                            academicSession: "$admissionInfo.academicSession",
                            admissionNumber: { $ifNull: ["$admissionInfo.admissionNumber", "$admissionInfo.rollNo"] },
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
                            courseFee: 1,
                            revenueWithoutGst: {
                                $cond: {
                                    if: { $regexMatch: { input: { $ifNull: ["$effectiveCentre", ""] }, regex: "phsps", options: "i" } },
                                    then: "$paidAmount",
                                    else: {
                                        $cond: {
                                            if: { $and: [{ $ne: ["$courseFee", null] }, { $gt: ["$courseFee", 0] }] },
                                            then: "$courseFee",
                                            else: {
                                                $cond: {
                                                    if: { $and: [{ $eq: ["$cgst", 0] }, { $eq: ["$sgst", 0] }] },
                                                    then: "$paidAmount",
                                                    else: { $divide: ["$paidAmount", 1.18] }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            remarks: 1,
                            recordedByName: "$recordedByName",
                            studentEmail: 1,
                            studentMobile: 1,
                            studentWhatsapp: 1,
                            studentAddress: 1,
                            guardianName: 1,
                            guardianMobile: 1,
                            totalClasses: { $ifNull: ["$attendanceStats.totalClasses", 0] },
                            presentCount: { $ifNull: ["$attendanceStats.presentCount", 0] },
                            absentCount: { $ifNull: ["$attendanceStats.absentCount", 0] },
                            attendanceStatus: {
                                $cond: [
                                    { $gt: [{ $ifNull: ["$attendanceStats.totalClasses", 0] }, 0] },
                                    "Available",
                                    "Not Taken"
                                ]
                            }
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

    // Fetch centre targets for the selected month and year
    const year = selectedDate.getFullYear();
    const monthIndex = selectedDate.getMonth();
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[monthIndex];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    const targets = await CentreTarget.find({
        year,
        month: monthName
    }).populate({ path: "centre", select: "centreName", model: "CentreSchema" });

    // Fetch custom daily targets for this specific date / date range
    const startOfDate = new Date(selectedDate);
    startOfDate.setHours(0, 0, 0, 0);
    const endOfDate = new Date(selectedDate);
    endOfDate.setHours(23, 59, 59, 999);

    let customTargetFilter = {};
    if (startDate && endDate) {
        customTargetFilter = { date: { $gte: startOfDay, $lte: endOfDay } };
    } else {
        customTargetFilter = { date: { $gte: startOfDate, $lte: endOfDate } };
    }

    const [customTargets, monthCustomTargets] = await Promise.all([
        DailyTarget.find(customTargetFilter).sort({ date: -1 }).populate({ path: "centre", select: "centreName", model: "CentreSchema" }),
        DailyTarget.find({ date: { $gte: startOfMonth, $lte: endOfMonth } }).sort({ date: -1 }).populate({ path: "centre", select: "centreName", model: "CentreSchema" })
    ]);

    const achievementMap = {};
    const dailyRaw = await getDailyAchievedForMonth(startOfMonth, endOfMonth);
    dailyRaw.forEach(d => {
        const cName = d._id.centre?.trim().toUpperCase();
        const dayNum = d._id.day;
        if (cName) {
            if (!achievementMap[cName]) achievementMap[cName] = {};
            achievementMap[cName][dayNum] = d.totalExclGST || 0;
        }
    });

    const fixedWeeks = buildFixedWeeks(year, monthIndex);
    const selectedDayNum = selectedDate.getDate();

    const centreTargets = {};
    
    // Set default daily targets based on weekends target module rules
    targets.forEach(t => {
        if (t.centre && t.centre.centreName) {
            const name = t.centre.centreName;
            if (centreIds || (!/franchise/i.test(name) && !/phsps/i.test(name) && !/rkm/i.test(name))) {
                const cNameUpper = name.trim().toUpperCase();
                const monthlyTargetExclGST = t.targetAmount || 0;

                const dayMap = achievementMap[cNameUpper] || {};

                let cumulativeTarget = 0;
                let cumulativeAchievement = 0;
                let finalDailyTarget = 0;

                for (const week of fixedWeeks) {
                    // Proportional target for this week's days
                    const basePhaseTarget = daysInMonth > 0
                        ? (week.actualDays / daysInMonth) * monthlyTargetExclGST
                        : 0;

                    const overrideVal = t.weeklyTargetsOverride?.[week.weekNumber];
                    if (overrideVal !== undefined && overrideVal !== null) {
                        cumulativeTarget = overrideVal;
                    } else {
                        cumulativeTarget += basePhaseTarget;
                    }

                    const prevCumulativeAchievement = cumulativeAchievement;
                    const phaseTarget = Math.max(0, cumulativeTarget - prevCumulativeAchievement);

                    // Check if the selected day falls within this week
                    const isDayInWeek = selectedDayNum >= week.startDay && selectedDayNum <= week.endDay;

                    // Calculate achievements in this week to compute shortfall
                    let phaseAchieved = 0;
                    week.days.forEach(d => {
                        phaseAchieved += dayMap[d.day] || 0;
                    });

                    const phaseShortfall = Math.max(0, phaseTarget - phaseAchieved);
                    cumulativeAchievement += phaseAchieved;

                    if (isDayInWeek) {
                        const weekDaysCount = week.actualDays || week.days.length || 7;
                        const baseDailyTarget = weekDaysCount > 0 ? (phaseTarget / weekDaysCount) : 0;
                        const dayIndexInWeek = week.days.findIndex(d => d.day === selectedDayNum);

                        if (dayIndexInWeek <= 0) {
                            finalDailyTarget = baseDailyTarget;
                        } else {
                            let weekPriorAchieved = 0;
                            for (let i = 0; i < dayIndexInWeek; i++) {
                                const dNum = week.days[i].day;
                                weekPriorAchieved += dayMap[dNum] || 0;
                            }
                            finalDailyTarget = Math.max(0, ((dayIndexInWeek + 1) * baseDailyTarget) - weekPriorAchieved);
                        }
                        break;
                    }
                }

                centreTargets[name] = finalDailyTarget;
            }
        }
    });

    const defaultTodayCentreTargets = {
        "ARAMBAGH": 59271.18,
        "BAGNAN": 7816.1,
        "BALLY": 58300.84,
        "BALURGHAT": 53649.14,
        "BARASAT": 83084.73,
        "BARUIPUR": 157932.2,
        "BEHALA": 250038.13,
        "BERHAMPUR": 6000,
        "BURDWAN": 195368.14,
        "CHANDANNAGAR": 70805.09,
        "CONTAI": 6100,
        "COOCHBEHAR": 132694.91,
        "DIAMOND HARBOUR": 119932.19,
        "DUMDUM": 153433.896,
        "HABRA": 4821.18,
        "HAZRA H.O": 1192927.04,
        "HAZRA H.O.": 1192927.04,
        "HAZRA": 1192927.04,
        "JODHPUR PARK": 188542.38,
        "KALYANI": 66594.06,
        "KATWA": 45240.34,
        "KTPP TOWNSHIP": 39458.44,
        "KTPP": 39458.44,
        "MALDA": 91495.18,
        "MIDNAPORE": 12966.04,
        "RAIGANJ": 31864.4,
        "SHYAMBAZAR": 38358.474,
        "TAMLUK": 65830.5,
        "TARAKESWAR": 8161.04
    };

    // Set fallback default adjusted targets for centres if not already calculated from CentreTarget
    for (const c of allCentres) {
        if (c.centreName && (centreTargets[c.centreName] === undefined || centreTargets[c.centreName] === 0)) {
            const raw = c.centreName.trim().toUpperCase();
            for (const [key, val] of Object.entries(defaultTodayCentreTargets)) {
                if (raw === key || raw.startsWith(key) || key.startsWith(raw)) {
                    centreTargets[c.centreName] = val;
                    break;
                }
            }
        }
    }

    // Apply custom daily targets saved by user (these override monthly/fallback defaults)
    if (Array.isArray(customTargets) && customTargets.length > 0) {
        customTargets.forEach(dt => {
            const cName = dt.centre?.centreName;
            const targetVal = Number(dt.targetAmount);
            if (cName && !isNaN(targetVal)) {
                centreTargets[cName] = targetVal;
                // Also match any centre in allCentres with case-insensitive name
                allCentres.forEach(c => {
                    if (c.centreName && c.centreName.trim().toUpperCase() === cName.trim().toUpperCase()) {
                        centreTargets[c.centreName] = targetVal;
                    }
                });
            } else if (dt.centre && !isNaN(targetVal)) {
                const matchCentre = allCentres.find(c => String(c._id) === String(dt.centre?._id || dt.centre));
                if (matchCentre && matchCentre.centreName) {
                    centreTargets[matchCentre.centreName] = targetVal;
                }
            }
        });
    }

    // Fetch all zones with populated centres
    const zones = await Zone.find({ isActive: true }).populate("centres", "centreName").lean();

    // Fetch all users with role 'zonalManager'
    const zonalManagers = await User.find({ role: { $regex: /zonalManager/i } }).select("name centres").lean();

    return {
        date: selectedDate.toISOString().split("T")[0],
        totalCollection: summary.totalCollection || 0,
        transactionCount: summary.transactionCount || 0,
        paymentMethods,
        details,
        centreTargets,
        zones,
        zonalManagers
    };
};
