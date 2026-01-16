
import Admission from "../../models/Admission/Admission.js";
import Boards from "../../models/Master_data/Boards.js";
import Subject from "../../models/Master_data/Subject.js";
import Centre from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getBoardReport = async (req, res) => {
    try {
        const {
            year,
            startDate,
            endDate,
            centreIds,
            boardIds,
            subjectIds,
            session
        } = req.query;

        let matchStage = { admissionType: "BOARD" };

        // 1. Date Filter
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

        // 2. Session Filter
        if (session) {
            matchStage.academicSession = session;
        }

        // 3. Centre Filter
        if (centreIds) {
            const rawIds = typeof centreIds === 'string' ? centreIds.split(',') : centreIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length > 0) {
                const centres = await Centre.find({ _id: { $in: validIds } }).select("centreName");
                matchStage.centre = { $in: centres.map(c => c.centreName) };
            }
        }

        // 4. Board Filter
        if (boardIds) {
            const rawIds = typeof boardIds === 'string' ? boardIds.split(',') : boardIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length > 0) {
                matchStage.board = { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        // 5. Subject Filter
        if (subjectIds) {
            const rawIds = typeof subjectIds === 'string' ? subjectIds.split(',') : subjectIds;
            const validIds = rawIds.map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length > 0) {
                matchStage["selectedSubjects.subject"] = { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        const [boardStats, subjectStats, trendStats, centreStats] = await Promise.all([
            // 1. Board Stats
            Admission.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$board",
                        enrollments: { $sum: 1 },
                        revenue: { $sum: "$totalPaidAmount" }
                    }
                },
                {
                    $lookup: {
                        from: "boards",
                        localField: "_id",
                        foreignField: "_id",
                        as: "boardDetails"
                    }
                },
                { $unwind: "$boardDetails" },
                {
                    $project: {
                        name: "$boardDetails.boardCourse",
                        enrollments: 1,
                        revenue: 1
                    }
                }
            ]),

            // 2. Subject Stats (Overall or within filtered boards)
            Admission.aggregate([
                { $match: matchStage },
                { $unwind: "$selectedSubjects" },
                {
                    $group: {
                        _id: "$selectedSubjects.subject",
                        subjectName: { $first: "$selectedSubjects.name" },
                        count: { $sum: 1 },
                        revenue: { $sum: "$selectedSubjects.price" }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // 3. Trend Stats
            Admission.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: { $month: "$admissionDate" },
                        count: { $sum: 1 },
                        revenue: { $sum: "$totalPaidAmount" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]),

            // 4. Centre Stats
            Admission.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$centre",
                        count: { $sum: 1 },
                        revenue: { $sum: "$totalPaidAmount" }
                    }
                },
                { $sort: { revenue: -1 } }
            ])
        ]);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formattedTrend = monthNames.map((name, index) => {
            const data = trendStats.find(t => t._id === index + 1);
            return {
                month: name,
                enrollments: data ? data.count : 0,
                revenue: data ? data.revenue : 0
            };
        });

        res.status(200).json({
            boardStats,
            subjectStats,
            trendData: formattedTrend,
            centreStats: centreStats.map(c => ({ name: c._id, enrollments: c.count, revenue: c.revenue }))
        });

    } catch (error) {
        console.error("Error in Board Report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
