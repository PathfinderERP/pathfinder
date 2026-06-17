import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";
import Centre from "../../models/Master_data/Centre.js";
import Course from "../../models/Master_data/Courses.js";
import mongoose from "mongoose";

export const getAverageAdmissionFee = async (req, res) => {
    try {
        const {
            year,
            startDate,
            endDate,
            centreIds, // comma separated or array
            examTagIds, // comma separated or array
            programme,
            sessions
        } = req.query;

        console.log("Average Admission Fee Query:", req.query);

        let admissionQuery = {};

        // Date Filter (Range or Year)
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        } else {
            const targetYear = parseInt(year) || new Date().getFullYear();
            start = new Date(targetYear, 0, 1);
            end = new Date(targetYear, 11, 31, 23, 59, 59);
        }

        admissionQuery.admissionDate = { $gte: start, $lte: end };

        // Resolve Centre IDs for filtering
        let activeCentres = await Centre.find({ status: { $ne: "deactive" } }).select("centreName");
        let activeCentreIds = activeCentres.map(c => c._id.toString());
        let activeCentreNames = activeCentres.map(c => c.centreName);

        let allowedCentreIds = [];
        let allowedCentreNames = [];
        if (req.user.role !== 'superAdmin') {
            const userCentres = await Centre.find({ _id: { $in: req.user.centres || [] }, status: { $ne: "deactive" } }).select("centreName");
            allowedCentreIds = userCentres.map(c => c._id.toString());
            allowedCentreNames = userCentres.map(c => c.centreName);
        }

        if (centreIds) {
            const rawIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));

            if (req.user.role !== 'superAdmin') {
                const finalIds = validIds.filter(id => allowedCentreIds.includes(id));
                const finalObjectIds = finalIds.map(id => new mongoose.Types.ObjectId(id));
                const finalCentres = await Centre.find({ _id: { $in: finalObjectIds } }).select("centreName");
                const finalNames = finalCentres.map(c => c.centreName);
                admissionQuery.centre = { $in: finalNames.length > 0 ? finalNames : ["__NO_MATCH__"] };
            } else if (validIds.length > 0) {
                const finalIds = validIds.filter(id => activeCentreIds.includes(id));
                const objectIds = finalIds.map(id => new mongoose.Types.ObjectId(id));
                const centres = await Centre.find({ _id: { $in: objectIds } }).select("centreName");
                const centreNames = centres.map(c => c.centreName);
                admissionQuery.centre = { $in: centreNames.length > 0 ? centreNames : ["__NO_MATCH__"] };
            }
        } else {
            if (req.user.role !== 'superAdmin') {
                admissionQuery.centre = { $in: allowedCentreNames.length > 0 ? allowedCentreNames : ["__NO_MATCH__"] };
            } else {
                admissionQuery.centre = { $in: activeCentreNames.length > 0 ? activeCentreNames : ["__NO_MATCH__"] };
            }
        }

        // Exam Tag Filter
        if (examTagIds) {
            const rawTagIds = typeof examTagIds === 'string' ? examTagIds.split(',') : examTagIds;
            const validTagIds = rawTagIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validTagIds.length > 0) {
                const objectTagIds = validTagIds.map(id => new mongoose.Types.ObjectId(id));
                admissionQuery.examTag = { $in: objectTagIds };
            }
        }

        // Session Filter
        if (sessions) {
            const sessionList = typeof sessions === 'string' ? sessions.split(',').map(s => s.trim()) : sessions;
            if (sessionList.length > 0) {
                admissionQuery.academicSession = { $in: sessionList };
            }
        }

        let boardAdmissionQuery = { ...admissionQuery };

        // Programme Filter
        if (programme) {
            const studentsWithProg = await Student.find({ "studentsDetails.programme": programme }).select("_id").lean();
            const studentIdsWithProg = studentsWithProg.map(s => s._id);
            admissionQuery.student = { $in: studentIdsWithProg };
            
            delete boardAdmissionQuery.student;
            boardAdmissionQuery.studentId = { $in: studentIdsWithProg };
        }

        // Aggregate normal and board admission fees
        const reportData = await Admission.aggregate([
            { $match: admissionQuery },
            {
                $lookup: {
                    from: "examtags",
                    localField: "examTag",
                    foreignField: "_id",
                    as: "examTagInfo"
                }
            },
            { $unwind: { path: "$examTagInfo", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "courses",
                    localField: "course",
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
                    admissionFee: "$downPayment",
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
                                admissionFee: {
                                    $cond: {
                                        if: { $eq: ["$programme", "NCRP"] },
                                        then: {
                                            $add: [
                                                { $ifNull: ["$admissionFee", 0] },
                                                { $ifNull: ["$examFee", 0] },
                                                { $ifNull: ["$additionalThingsAmount", 0] }
                                            ]
                                        },
                                        else: {
                                            $ifNull: [
                                                { $arrayElemAt: ["$installments.paidAmount", 0] },
                                                { $ifNull: ["$admissionFee", 0] }
                                            ]
                                        }
                                    }
                                },
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
                    totalAdmissionFee: { $sum: { $ifNull: ["$admissionFee", 0] } },
                    averageAdmissionFee: { $avg: { $ifNull: ["$admissionFee", 0] } }
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
                    totalAdmissionFee: 1,
                    averageAdmissionFee: 1,
                    _id: 0
                }
            },
            { $sort: { date: -1, centre: 1, examTagName: 1 } }
        ]);

        // Calculate summary cards metrics
        const totalAdmissionsCount = reportData.reduce((sum, item) => sum + item.totalAdmissions, 0);
        const totalAdmissionFeeSum = reportData.reduce((sum, item) => sum + item.totalAdmissionFee, 0);
        const overallAverageAdmissionFee = totalAdmissionsCount > 0 ? (totalAdmissionFeeSum / totalAdmissionsCount) : 0;

        res.status(200).json({
            success: true,
            reportData,
            summary: {
                totalAdmissions: totalAdmissionsCount,
                totalAdmissionFee: totalAdmissionFeeSum,
                averageAdmissionFee: overallAverageAdmissionFee
            }
        });

    } catch (error) {
        console.error("Error in Average Admission Fee Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
