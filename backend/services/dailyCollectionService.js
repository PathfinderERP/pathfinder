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

    // Base Payment Filter
    const paymentMatch = {
        paidAmount: { $gte: 0 },
        billId: { $regex: /^PATH/i },
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
                        { $ifNull: ["$paidDate", "$receivedDate", "$createdAt"] },
                        startOfDay
                    ]
                },
                {
                    $lte: [
                        { $ifNull: ["$paidDate", "$receivedDate", "$createdAt"] },
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

    // Resolve Centre Names for filtering and active centres
    const allCentres = await Centre.find({}).select("centreName");
    const allCentreNames = allCentres.map(c => c.centreName);

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
            const requestedCentres = await Centre.find({ _id: { $in: validIds } }).select("centreName");
            const requestedNames = requestedCentres.map(c => c.centreName);
            if (user.role !== 'superAdmin') {
                const finalNames = requestedNames.filter(name => allowedCentreNames.includes(name));
                admissionMatch["admissionInfo.centre"] = finalNames.length > 0 ? { $in: finalNames } : "__NO_MATCH__";
            } else {
                admissionMatch["admissionInfo.centre"] = requestedNames.length > 0 ? { $in: requestedNames } : "__NO_MATCH__";
            }
        }
    } else {
        const defaultAllCentreNames = allCentreNames.filter(name => name && !/franchise/i.test(name) && !/rkm/i.test(name));
        const defaultAllowedCentreNames = allowedCentreNames.filter(name => name && !/franchise/i.test(name) && !/rkm/i.test(name));
        if (user.role !== 'superAdmin') {
            admissionMatch["admissionInfo.centre"] = defaultAllowedCentreNames.length > 0 ? { $in: defaultAllowedCentreNames } : "__NO_MATCH__";
        } else {
            admissionMatch["admissionInfo.centre"] = defaultAllCentreNames.length > 0 ? { $in: defaultAllCentreNames } : "__NO_MATCH__";
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
            $addFields: {
                admissionInfo: {
                    $ifNull: [
                        { $arrayElemAt: ["$admissionInfoNormal", 0] },
                        { $arrayElemAt: ["$admissionInfoBoard", 0] },
                        { $arrayElemAt: ["$admissionInfoPntse", 0] }
                    ]
                }
            }
        },
        { $unwind: "$admissionInfo" },
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
                            date: "$mrDate",
                            receivedDate: "$actualReceivedDate",
                            centre: "$admissionInfo.centre",
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

    const targets = await CentreTarget.find({
        year,
        month: monthName
    }).populate({ path: "centre", select: "centreName", model: "CentreSchema" });

    // Fetch custom daily targets for this specific date
    const startOfDate = new Date(selectedDate);
    startOfDate.setHours(0, 0, 0, 0);
    const endOfDate = new Date(selectedDate);
    endOfDate.setHours(23, 59, 59, 999);

    const customTargets = await DailyTarget.find({
        date: { $gte: startOfDate, $lte: endOfDate }
    }).populate({ path: "centre", select: "centreName", model: "CentreSchema" });

    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

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
                        // This is the week containing our selected date!
                        const hasWeekdays = week.days.some(d => !d.isWeekend);
                        const hasSat = week.days.some(d => d.dayName === 'Sat');
                        const hasSun = week.days.some(d => d.dayName === 'Sun');
                        const hasWeekend = hasSat || hasSun;

                        let workingTarget = 0;
                        let baseWeekendTarget = 0;

                        if (hasWeekdays && !hasWeekend) {
                            workingTarget = phaseTarget;
                            baseWeekendTarget = 0;
                        } else if (!hasWeekdays && hasWeekend) {
                            workingTarget = 0;
                            baseWeekendTarget = phaseTarget;
                        } else if (hasWeekdays && hasWeekend) {
                            workingTarget = phaseTarget * 0.35;
                            baseWeekendTarget = phaseTarget * 0.65;
                        }

                        const dayIndex = selectedDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                        const isWeekend = dayIndex === 0 || dayIndex === 6;

                        if (isWeekend) {
                            let satTarget = 0;
                            let sunTarget = 0;

                            if (hasSat && hasSun) {
                                satTarget = baseWeekendTarget * 0.35;
                                sunTarget = baseWeekendTarget * 0.65;
                            } else if (hasSat && !hasSun) {
                                satTarget = baseWeekendTarget;
                                sunTarget = 0;
                            } else if (!hasSat && hasSun) {
                                satTarget = 0;
                                sunTarget = baseWeekendTarget;
                            }

                            if (dayIndex === 6) {
                                finalDailyTarget = satTarget;
                            } else {
                                finalDailyTarget = sunTarget;
                            }
                        } else {
                            const weekdayCount = week.days.filter(d => !d.isWeekend).length;
                            finalDailyTarget = weekdayCount > 0 ? workingTarget / weekdayCount : 0;
                        }
                        break;
                    }
                }

                centreTargets[name] = finalDailyTarget;
            }
        }
    });

    // Override with custom daily targets if set
    customTargets.forEach(ct => {
        if (ct.centre && ct.centre.centreName) {
            const name = ct.centre.centreName;
            if (centreIds || (!/franchise/i.test(name) && !/phsps/i.test(name) && !/rkm/i.test(name))) {
                centreTargets[name] = ct.targetAmount || 0;
            }
        }
    });

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
