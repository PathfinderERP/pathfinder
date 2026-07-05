import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";
import Centre from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getDiscountReport = async (req, res) => {
    try {
        const {
            year,
            startDate,
            endDate,
            centreIds,
            examTagId,
            programme,
            reportType, // monthly or daily
            sessions
        } = req.query;

        console.log("Discount Report Query:", req.query);

        let matchStage = {};

        // 1. Time Period / Date Filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchStage.admissionDate = { $gte: start, $lte: end };
        } else if (year) {
            const targetYear = parseInt(year);
            if (!isNaN(targetYear)) {
                const startOfYear = new Date(targetYear, 0, 1);
                const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
                matchStage.admissionDate = { $gte: startOfYear, $lte: endOfYear };
            }
        }

        // 2. Centre Filter (Resolve IDs to Names)
        let allowedCentreNames = [];
        if (req.user.role !== 'superAdmin') {
            const userCentres = await Centre.find({ _id: { $in: req.user.centres || [] } }).select("centreName");
            allowedCentreNames = userCentres.map(c => c.centreName);
        }

        if (centreIds) {
            const rawIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));

            if (validIds.length > 0) {
                const requestedCentres = await Centre.find({ _id: { $in: validIds } }).select("centreName");
                const requestedNames = requestedCentres.map(c => c.centreName);

                if (req.user.role !== 'superAdmin') {
                    const finalNames = requestedNames.filter(name => allowedCentreNames.includes(name));
                    matchStage.centre = { $in: finalNames.length > 0 ? finalNames : ["__NO_MATCH__"] };
                } else if (requestedNames.length > 0) {
                    matchStage.centre = { $in: requestedNames };
                }
            }
        } else {
            let defaultNames = [];
            if (req.user.role !== 'superAdmin') {
                defaultNames = allowedCentreNames.filter(name => name && !/phsps/i.test(name) && !/franchise/i.test(name) && !/rkm/i.test(name));
            } else {
                const activeCentres = await Centre.find({ status: { $ne: "deactive" } }).select("centreName");
                defaultNames = activeCentres.map(c => c.centreName).filter(name => name && !/phsps/i.test(name) && !/franchise/i.test(name) && !/rkm/i.test(name));
            }
            matchStage.centre = { $in: defaultNames.length > 0 ? defaultNames : ["__NO_MATCH__"] };
        }

        // 3. Exam Tag Filter (Support multiple tags comma separated)
        let boardAdmissionQuery = {};
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            boardAdmissionQuery.admissionDate = { $gte: start, $lte: end };
        } else if (year) {
            const targetYear = parseInt(year);
            if (!isNaN(targetYear)) {
                const startOfYear = new Date(targetYear, 0, 1);
                const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59);
                boardAdmissionQuery.admissionDate = { $gte: startOfYear, $lte: endOfYear };
            }
        }
        if (matchStage.centre) {
            boardAdmissionQuery.centre = matchStage.centre;
        }

        if (examTagId) {
            const rawTagIds = typeof examTagId === 'string' ? examTagId.split(',') : examTagId;
            const validTagIds = rawTagIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validTagIds.length > 0) {
                const objectTagIds = validTagIds.map(id => new mongoose.Types.ObjectId(id));
                matchStage.examTag = { $in: objectTagIds };
                // Board admissions do not have examTag, so if tags are specified, board admissions yield empty
                boardAdmissionQuery._id = null;
            }
        }

        // 4. Programme Filter
        if (programme) {
            const studentsWithProg = await Student.find({ "studentsDetails.programme": programme }).select("_id").lean();
            const studentIdsWithProg = studentsWithProg.map(s => s._id);
            matchStage.student = { $in: studentIdsWithProg };
            boardAdmissionQuery.studentId = { $in: studentIdsWithProg };
        }

        // 5. Session Filter
        if (sessions) {
            const sessionList = typeof sessions === 'string' ? sessions.split(',').map(s => s.trim()) : sessions;
            if (sessionList.length > 0) {
                matchStage.academicSession = { $in: sessionList };
                boardAdmissionQuery.academicSession = { $in: sessionList };
            }
        }

        // Parallel Aggregations
        const [centreStats, trendStats, detailedStatsNormal, detailedStatsBoard, pivotStats] = await Promise.all([
            // 1. Aggregation: Group by Centre (Union of Normal and Board)
            Admission.aggregate([
                { $match: matchStage },
                {
                    $project: {
                        centre: "$centre",
                        originalFees: { $multiply: [{ $ifNull: ["$baseFees", 0] }, 1.18] }, // with GST
                        committedFees: { $ifNull: ["$totalFees", 0] },
                        discountGiven: { $ifNull: ["$discountAmount", 0] }
                    }
                },
                {
                    $unionWith: {
                        coll: "boardcourseadmissions",
                        pipeline: [
                            { $match: boardAdmissionQuery },
                            {
                                $project: {
                                    centre: "$centre",
                                    originalFees: { $add: [{ $ifNull: ["$totalExpectedAmount", 0] }, { $ifNull: ["$totalWaiver", 0] }] },
                                    committedFees: { $ifNull: ["$totalExpectedAmount", 0] },
                                    discountGiven: { $ifNull: ["$totalWaiver", 0] }
                                }
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: "$centre",
                        originalFees: { $sum: "$originalFees" },
                        committedFees: { $sum: "$committedFees" },
                        discountGiven: { $sum: "$discountGiven" },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // 2. Aggregation: Group by Date/Month Trend (Union of Normal and Board)
            (async () => {
                const type = reportType || 'monthly';
                if (type === 'daily') {
                    return Admission.aggregate([
                        { $match: matchStage },
                        {
                            $project: {
                                dateStr: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
                                discountGiven: { $ifNull: ["$discountAmount", 0] }
                            }
                        },
                        {
                            $unionWith: {
                                coll: "boardcourseadmissions",
                                pipeline: [
                                    { $match: boardAdmissionQuery },
                                    {
                                        $project: {
                                            dateStr: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
                                            discountGiven: { $ifNull: ["$totalWaiver", 0] }
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: "$dateStr",
                                discountGiven: { $sum: "$discountGiven" },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { "_id": 1 } }
                    ]);
                } else {
                    return Admission.aggregate([
                        { $match: matchStage },
                        {
                            $project: {
                                monthVal: { $month: "$admissionDate" },
                                discountGiven: { $ifNull: ["$discountAmount", 0] }
                            }
                        },
                        {
                            $unionWith: {
                                coll: "boardcourseadmissions",
                                pipeline: [
                                    { $match: boardAdmissionQuery },
                                    {
                                        $project: {
                                            monthVal: { $month: "$admissionDate" },
                                            discountGiven: { $ifNull: ["$totalWaiver", 0] }
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $group: {
                                _id: "$monthVal",
                                discountGiven: { $sum: "$discountGiven" },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { "_id": 1 } }
                    ]);
                }
            })(),

            // 3. Detailed Report (Normal student-wise)
            Admission.find(matchStage)
                .populate({ path: 'student', select: 'studentsDetails' })
                .populate('course', 'courseName')
                .populate('examTag', 'name')
                .sort({ admissionDate: -1 })
                .lean(),

            // 4. Detailed Report (Board student-wise)
            BoardCourseAdmission.find(boardAdmissionQuery)
                .populate({ path: 'studentId', select: 'studentsDetails' })
                .populate('boardId', 'boardCourse')
                .sort({ admissionDate: -1 })
                .lean(),

            // 5. Fine-grained stats for Pivot table
            Admission.aggregate([
                { $match: matchStage },
                {
                    $addFields: {
                        courseObjectId: {
                            $cond: {
                                if: { $and: [
                                    { $ne: ["$course", null] },
                                    { $ne: ["$course", ""] }
                                ] },
                                then: { $toObjectId: "$course" },
                                else: null
                            }
                        },
                        examTagObjectId: {
                            $cond: {
                                if: { $and: [
                                    { $ne: ["$examTag", null] },
                                    { $ne: ["$examTag", ""] }
                                ] },
                                then: { $toObjectId: "$examTag" },
                                else: null
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: "examtags",
                        localField: "examTagObjectId",
                        foreignField: "_id",
                        as: "examTagInfo"
                    }
                },
                { $unwind: { path: "$examTagInfo", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "courses",
                        localField: "courseObjectId",
                        foreignField: "_id",
                        as: "courseInfo"
                    }
                },
                { $unwind: { path: "$courseInfo", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
                        centre: "$centre",
                        examTagName: { $ifNull: ["$examTagInfo.name", "Generic Tag"] },
                        courseName: { $ifNull: ["$courseInfo.courseName", "Generic Course"] },
                        originalFees: { $multiply: [{ $ifNull: ["$baseFees", 0] }, 1.18] }, // with GST
                        committedFees: { $ifNull: ["$totalFees", 0] },
                        discountGiven: { $ifNull: ["$discountAmount", 0] },
                        type: { $literal: "Normal" }
                    }
                },
                {
                    $unionWith: {
                        coll: "boardcourseadmissions",
                        pipeline: [
                            { $match: boardAdmissionQuery },
                            {
                                $lookup: {
                                    from: "boards",
                                    localField: "boardId",
                                    foreignField: "_id",
                                    as: "boardInfo"
                                }
                            },
                            { $unwind: { path: "$boardInfo", preserveNullAndEmptyArrays: true } },
                            {
                                $project: {
                                    date: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
                                    centre: "$centre",
                                    examTagName: { $ifNull: ["$boardCourseName", "$boardInfo.boardCourse", "Board Course"] },
                                    courseName: { $ifNull: ["$boardCourseName", "$boardInfo.boardCourse", "Board Course"] },
                                    originalFees: { $add: [{ $ifNull: ["$totalExpectedAmount", 0] }, { $ifNull: ["$totalWaiver", 0] }] },
                                    committedFees: { $ifNull: ["$totalExpectedAmount", 0] },
                                    discountGiven: { $ifNull: ["$totalWaiver", 0] },
                                    type: { $literal: "Board" }
                                }
                            }
                        ]
                    }
                },
                {
                    $group: {
                        _id: {
                            date: "$date",
                            centre: "$centre",
                            examTagName: "$examTagName",
                            courseName: "$courseName",
                            type: "$type"
                        },
                        totalAdmissions: { $sum: 1 },
                        originalFees: { $sum: "$originalFees" },
                        committedFees: { $sum: "$committedFees" },
                        discountGiven: { $sum: "$discountGiven" }
                    }
                },
                {
                    $project: {
                        date: "$_id.date",
                        centre: "$_id.centre",
                        examTagName: "$_id.examTagName",
                        courseName: "$_id.courseName",
                        type: "$_id.type",
                        totalAdmissions: 1,
                        originalFees: 1,
                        committedFees: 1,
                        discountGiven: 1,
                        _id: 0
                    }
                },
                { $sort: { date: -1, centre: 1, examTagName: 1 } }
            ])
        ]);

        // Map Centre IDs to Names
        const allCentres = await Centre.find({}, 'centreName _id');
        const centreMap = {};
        allCentres.forEach(c => {
            centreMap[c._id.toString()] = c.centreName;
        });

        const reportData = centreStats.map(item => {
            const name = centreMap[item._id] || item._id;
            const original = item.originalFees || 0;
            const discount = item.discountGiven || 0;
            const efficiency = original > 0 ? ((discount / original) * 100).toFixed(2) : 0;

            return {
                name,
                originalFees: original,
                committedFees: item.committedFees || 0,
                discountGiven: discount,
                efficiency: parseFloat(efficiency),
                count: item.count
            };
        });

        // Process Trend Data
        const type = reportType || 'monthly';
        let trendData = [];
        if (type === 'daily') {
            trendData = trendStats.map(t => ({
                date: t._id,
                discountGiven: t.discountGiven || 0,
                count: t.count
            }));
        } else {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            trendData = trendStats.map(t => ({
                month: monthNames[t._id - 1],
                discountGiven: t.discountGiven || 0,
                count: t.count
            }));
        }

        const totalDiscount = reportData.reduce((acc, curr) => acc + curr.discountGiven, 0);

        // Process student-wise details
        const detailedReportNormal = detailedStatsNormal.map(adm => {
            const details = adm.student?.studentsDetails?.[0] || {};
            return {
                admissionNumber: adm.admissionNumber || "-",
                studentName: details.studentName || "Unknown",
                centre: adm.centre || "Unknown",
                course: adm.course?.courseName || "Unknown",
                examTag: adm.examTag?.name || "Generic Tag",
                admissionDate: adm.admissionDate ? new Date(adm.admissionDate).toLocaleDateString() : "-",
                originalFees: (adm.baseFees || 0) * 1.18, // with GST
                discountGiven: adm.discountAmount || 0,
                committedFees: adm.totalFees || 0,
                remarks: adm.remarks || "",
                type: "Normal"
            };
        });

        const detailedReportBoard = detailedStatsBoard.map(adm => {
            const details = adm.studentId?.studentsDetails?.[0] || {};
            return {
                admissionNumber: adm.admissionNumber || "-",
                studentName: details.studentName || adm.studentName || "Unknown",
                centre: adm.centre || "Unknown",
                course: adm.boardCourseName || (adm.boardId?.boardCourse ? adm.boardId.boardCourse : "Board Course"),
                examTag: adm.boardCourseName || (adm.boardId?.boardCourse ? adm.boardId.boardCourse : "Board Course"),
                admissionDate: adm.admissionDate ? new Date(adm.admissionDate).toLocaleDateString() : "-",
                originalFees: (adm.totalExpectedAmount || 0) + (adm.totalWaiver || 0),
                discountGiven: adm.totalWaiver || 0,
                committedFees: adm.totalExpectedAmount || 0,
                remarks: adm.remarks || "",
                type: "Board"
            };
        });

        const detailedReport = [...detailedReportNormal, ...detailedReportBoard].sort((a, b) => {
            return new Date(b.admissionDate) - new Date(a.admissionDate);
        });

        res.status(200).json({
            data: reportData,
            trend: trendData,
            detailedReport,
            totalDiscount,
            pivotData: pivotStats
        });

    } catch (error) {
        console.error("Error in Discount Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
