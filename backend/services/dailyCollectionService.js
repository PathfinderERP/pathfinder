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
                        day: { $dayOfMonth: { date: "$effectiveDate", timezone: "+05:30" } }
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
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const periods = [];
    let weekNum = 1;
    let startDay = 1;

    while (startDay <= daysInMonth) {
        let endDay = startDay;
        while (endDay < daysInMonth) {
            const date = new Date(Date.UTC(year, monthIndex, endDay));
            if (date.getUTCDay() === 0) { // Sunday ends the week
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
                const date = new Date(Date.UTC(year, monthIndex, d));
                const dow  = date.getUTCDay(); // 0=Sun … 6=Sat
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

    const cleanDateStr = (d) => {
        if (!d) return null;
        if (typeof d === "string") {
            return d.includes("T") ? d.split("T")[0] : d;
        }
        return new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    };

    let startOfDay;
    let endOfDay;
    let selectedDateStr;

    if (startDate && endDate) {
        const sStr = cleanDateStr(startDate);
        const eStr = cleanDateStr(endDate);
        startOfDay = new Date(`${sStr}T00:00:00+05:30`);
        endOfDay = new Date(`${eStr}T23:59:59.999+05:30`);
        selectedDateStr = eStr;
    } else if (date) {
        const dStr = cleanDateStr(date);
        startOfDay = new Date(`${dStr}T00:00:00+05:30`);
        endOfDay = new Date(`${dStr}T23:59:59.999+05:30`);
        selectedDateStr = dStr;
    } else {
        const now = new Date();
        const nowISTStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        startOfDay = new Date(`${nowISTStr}T00:00:00+05:30`);
        endOfDay = new Date(`${nowISTStr}T23:59:59.999+05:30`);
        selectedDateStr = nowISTStr;
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

    // Calculate centre daily targets based strictly on user-entered targets for the month in IST
    const [year, monthNum, selectedDayNum] = selectedDateStr.split('-').map(Number);
    const monthIndex = monthNum - 1;
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

    const mm = String(monthNum).padStart(2, '0');
    const lastDayStr = String(daysInMonth).padStart(2, '0');
    const startOfMonth = new Date(`${year}-${mm}-01T00:00:00+05:30`);
    const endOfMonth = new Date(`${year}-${mm}-${lastDayStr}T23:59:59.999+05:30`);

    // Fetch user-entered DailyTarget records for this month
    const monthCustomTargets = await DailyTarget.find({
        date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: -1 }).populate({ path: "centre", select: "centreName", model: "CentreSchema" });

    const getDayOfMonthIST = (d) => {
        if (!d) return 1;
        const dateObj = typeof d === "string" ? new Date(d) : d;
        const istStr = dateObj.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        return Number(istStr.split("-")[2]);
    };

    // Build lookup for user-entered daily targets
    // Keyed by centre ID and centre name (uppercase), then by day number (1..31)
    const customTargetsByCentre = {};
    (monthCustomTargets || []).forEach(dt => {
        const cId = dt.centre?._id?.toString() || dt.centre?.toString();
        const cName = dt.centre?.centreName?.trim().toUpperCase();
        const dayNum = getDayOfMonthIST(dt.date);
        const amt = Number(dt.targetAmount);
        if (!isNaN(amt)) {
            if (cId) {
                if (!customTargetsByCentre[cId]) customTargetsByCentre[cId] = {};
                customTargetsByCentre[cId][dayNum] = amt;
            }
            if (cName) {
                if (!customTargetsByCentre[cName]) customTargetsByCentre[cName] = {};
                customTargetsByCentre[cName][dayNum] = amt;
            }
        }
    });

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

    // Helper to calculate target for a single day of the month for a centre based exclusively on user-entered targets
    const calculateDayTargetForCentre = (centreDoc, dayNum) => {
        const cId = centreDoc._id?.toString();
        const cName = centreDoc.centreName?.trim() || "";
        const cNameUpper = cName.toUpperCase();
        const dayMap = achievementMap[cNameUpper] || {};

        // Base target is strictly what user added in DailyTarget (0 if not set)
        const getBaseTargetForDay = (d) => {
            return customTargetsByCentre[cId]?.[d] ?? customTargetsByCentre[cNameUpper]?.[d] ?? 0;
        };

        for (const week of fixedWeeks) {
            // Check if dayNum belongs to this week
            const isDayInWeek = dayNum >= week.startDay && dayNum <= week.endDay;
            if (isDayInWeek) {
                const weekdayList = week.days.filter(d => !d.isWeekend);
                const hasSat = week.days.some(d => d.dayName === "Sat");
                const hasSun = week.days.some(d => d.dayName === "Sun");

                // Calculate weekday shortfall across all weekdays in this week based on user-entered targets
                let weekdayShortfall = 0;
                weekdayList.forEach(wDay => {
                    const wTarget = getBaseTargetForDay(wDay.day);
                    const wAchieved = dayMap[wDay.day] || 0;
                    weekdayShortfall += (wTarget - wAchieved);
                });

                const targetDayObj = week.days.find(d => d.day === dayNum);
                const dayName = targetDayObj?.dayName || "";
                const isWeekend = targetDayObj?.isWeekend || false;
                const baseTarget = getBaseTargetForDay(dayNum);

                // If weekday: strictly the manual base target (no shortfall adjustment)
                if (!isWeekend) {
                    const finalTarget = Math.round(Math.max(0, baseTarget));
                    return {
                        finalTarget,
                        baseTarget: finalTarget,
                        shortfallAdded: 0,
                        isWeekend: false,
                        dayName
                    };
                }

                // If no manual target is set for this weekend day, keep it at 0
                if (baseTarget <= 0) {
                    return {
                        finalTarget: 0,
                        baseTarget: 0,
                        shortfallAdded: 0,
                        isWeekend: true,
                        dayName
                    };
                }

                // On Saturday: adjust with total weekday shortfall
                if (dayName === "Sat") {
                    const shortfallToAdd = weekdayShortfall > 0 ? weekdayShortfall : 0;
                    const finalTarget = Math.round(baseTarget + shortfallToAdd);
                    return {
                        finalTarget,
                        baseTarget: Math.round(baseTarget),
                        shortfallAdded: Math.round(shortfallToAdd),
                        isWeekend: true,
                        dayName
                    };
                }

                // On Sunday: adjust with remaining shortfall or surplus after Saturday collection
                if (dayName === "Sun") {
                    const satDayObj = week.days.find(d => d.dayName === "Sat");
                    let shortfallAfterSat = weekdayShortfall;

                    if (satDayObj) {
                        const satBaseTarget = getBaseTargetForDay(satDayObj.day);
                        const satAchieved = dayMap[satDayObj.day] || 0;
                        if (satBaseTarget > 0) {
                            const satAdjustedTarget = satBaseTarget + (weekdayShortfall > 0 ? weekdayShortfall : 0);
                            shortfallAfterSat = satAdjustedTarget - satAchieved;
                        } else {
                            shortfallAfterSat = weekdayShortfall - satAchieved;
                        }
                    }

                    // If shortfallAfterSat is positive, target increases; if negative (surplus on Sat), target decreases
                    const finalTarget = Math.round(Math.max(0, baseTarget + shortfallAfterSat));
                    const adjDiff = finalTarget - baseTarget;

                    return {
                        finalTarget,
                        baseTarget: Math.round(baseTarget),
                        shortfallAdded: Math.round(adjDiff),
                        isWeekend: true,
                        dayName
                    };
                }
            }
        }

        // Fallback if day not matched
        const baseTarget = getBaseTargetForDay(dayNum);
        return {
            finalTarget: Math.round(baseTarget),
            baseTarget: Math.round(baseTarget),
            shortfallAdded: 0,
            isWeekend: false,
            dayName: ""
        };
    };

    const centreTargets = {};
    const centreTargetMeta = {};

    const isDateRange = startDate && endDate && cleanDateStr(startDate) !== cleanDateStr(endDate);

    if (isDateRange) {
        // Accumulate targets across the date range for each centre (timezone invariant)
        const sStr = cleanDateStr(startDate);
        const eStr = cleanDateStr(endDate);
        const [sYear, sMonth, sDay] = sStr.split('-').map(Number);
        const [eYear, eMonth, eDay] = eStr.split('-').map(Number);

        const daysInRange = [];
        let cur = new Date(Date.UTC(sYear, sMonth - 1, sDay));
        const endAnchor = new Date(Date.UTC(eYear, eMonth - 1, eDay));
        while (cur <= endAnchor) {
            if (cur.getUTCMonth() === monthIndex && cur.getUTCFullYear() === year) {
                daysInRange.push(cur.getUTCDate());
            }
            cur.setUTCDate(cur.getUTCDate() + 1);
        }

        allCentres.forEach(c => {
            if (!c.centreName) return;
            const name = c.centreName;
            if (centreIds || (!/franchise/i.test(name) && !/phsps/i.test(name) && !/rkm/i.test(name))) {
                let rangeSum = 0;
                daysInRange.forEach(dNum => {
                    const res = calculateDayTargetForCentre(c, dNum);
                    rangeSum += res.baseTarget;
                });
                centreTargets[name] = rangeSum;
                centreTargetMeta[name] = { baseTarget: rangeSum, shortfallAdded: 0, isWeekend: false, isRange: true };
            }
        });
    } else {
        // Single day target calculation (primary view for Today, Yesterday, or single date)
        allCentres.forEach(c => {
            if (!c.centreName) return;
            const name = c.centreName;
            if (centreIds || (!/franchise/i.test(name) && !/phsps/i.test(name) && !/rkm/i.test(name))) {
                const res = calculateDayTargetForCentre(c, selectedDayNum);
                centreTargets[name] = res.finalTarget;
                centreTargetMeta[name] = res;
            }
        });
    }

    // Fetch all zones with populated centres
    const zones = await Zone.find({ isActive: true }).populate("centres", "centreName").lean();

    // Fetch all users with role 'zonalManager'
    const zonalManagers = await User.find({ role: { $regex: /zonalManager/i } }).select("name centres").lean();

    return {
        date: selectedDateStr,
        totalCollection: summary.totalCollection || 0,
        transactionCount: summary.transactionCount || 0,
        paymentMethods,
        details,
        centreTargets,
        centreTargetMeta,
        zones,
        zonalManagers
    };
};

