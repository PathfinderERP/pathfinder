import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import User from "../../models/User.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getAdmissionPerformanceReport = async (req, res) => {
    try {
        const { fromDate, toDate, centre } = req.query;

        // Date calculation
        const now = new Date();
        let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        if (fromDate) {
            startDate = new Date(fromDate);
            startDate.setHours(0, 0, 0, 0);
        }
        if (toDate) {
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
        }

        // Centre Filter
        let allowedCentreNames = [];
        if (req.user.role !== 'superAdmin') {
            const userCentres = await CentreSchema.find({
                _id: { $in: req.user.centres }
            }).select('centreName');
            allowedCentreNames = userCentres.map(c => c.centreName);
        }

        const matchStage = {
            admissionDate: { $gte: startDate, $lte: endDate }
        };

        if (allowedCentreNames.length > 0) {
            matchStage.centre = { $in: allowedCentreNames };
        }

        if (centre) {
            const requestedCentres = Array.isArray(centre) ? centre : centre.split(',');
            // If superadmin, use requested. If others, intersect.
            if (req.user.role === 'superAdmin') {
                matchStage.centre = { $in: requestedCentres };
            } else {
                const valid = requestedCentres.filter(c => allowedCentreNames.includes(c));
                matchStage.centre = { $in: valid };
            }
        }

        // Aggregation for Normal Admissions
        const normalAgg = await Admission.aggregate([
            { $match: matchStage },
            { $group: { _id: "$createdBy", count: { $sum: 1 } } }
        ]);

        // Aggregation for Board Admissions
        const boardAgg = await BoardCourseAdmission.aggregate([
            { $match: matchStage },
            { $group: { _id: "$createdBy", count: { $sum: 1 } } }
        ]);

        // Merge results
        const userStats = {};

        normalAgg.forEach(item => {
            if (item._id) {
                const userId = item._id.toString();
                if (!userStats[userId]) userStats[userId] = { normal: 0, board: 0 };
                userStats[userId].normal = item.count;
            }
        });

        boardAgg.forEach(item => {
            if (item._id) {
                const userId = item._id.toString();
                if (!userStats[userId]) userStats[userId] = { normal: 0, board: 0 };
                userStats[userId].board = item.count;
            }
        });

        // Get User details
        const users = await User.find({
            _id: { $in: Object.keys(userStats) }
        }).select('name role centres').populate('centres', 'centreName');

        const report = users.map(u => {
            const stats = userStats[u._id.toString()];
            return {
                userId: u._id,
                name: u.name,
                role: u.role,
                centres: u.centres.map(c => c.centreName).join(', '),
                normalAdmissions: stats.normal,
                boardAdmissions: stats.board,
                totalAdmissions: stats.normal + stats.board
            };
        });

        res.status(200).json(report);
    } catch (err) {
        console.error("Admission Performance Report Error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
