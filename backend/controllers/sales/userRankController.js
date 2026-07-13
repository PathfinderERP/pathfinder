import User from "../../models/User.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import LeadManagement from "../../models/LeadManagement.js";
import Payment from "../../models/Payment/Payment.js";
import Centre from "../../models/Master_data/Centre.js";
import mongoose from "mongoose";

export const getUserRankings = async (req, res) => {
    try {
        const { fromDate, toDate, metric = "admissions", roles } = req.query;

        const now = new Date();
        let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        if (fromDate) {
            startDate = new Date(fromDate);
            startDate.setHours(0, 0, 0, 0);
        }
        if (toDate) {
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
        }

        const dateRange = { $gte: startDate, $lte: endDate };

        // Fetch active users (optionally filtered by roles)
        const userQuery = { isActive: true };
        if (roles) {
            const roleList = roles.split(",").map(r => r.trim()).filter(Boolean);
            if (roleList.length > 0) {
                userQuery.role = { $in: roleList };
            }
        }

        const users = await User.find(userQuery).populate("centres", "centreName").select("_id name role centres").lean();
        if (!users || users.length === 0) {
            return res.status(200).json({ rankings: [] });
        }

        const allowedCentres = await Centre.find({
            status: { $ne: "deactive" },
            centreName: { $nin: [/phsps/i, /franchise/i, /rkm/i] }
        }).select("_id centreName");
        const allowedIds = allowedCentres.map(c => c._id);
        const allowedNames = allowedCentres.map(c => c.centreName);

        const userIds = users.map(u => u._id);
        const userNames = users.map(u => u.name).filter(Boolean);

        // Run all 8 aggregations in parallel
        const [
            boardCounsellingAgg,
            leadCounsellingAgg,
            normalAdmissionsAgg,
            boardAdmissionsAgg,
            leadUploadsAgg,
            leadManualAgg,
            followUpsAgg,
            revenueAgg
        ] = await Promise.all([

            // 1. Board counselling - tracked by ObjectId
            BoardCourseCounselling.aggregate([
                { $match: { counselledDate: dateRange, counselledBy: { $in: userIds }, centre: { $in: allowedNames } } },
                { $group: { _id: "$counselledBy", count: { $sum: 1 } } }
            ]),

            // 2. Regular lead counselling - tracked by name (leadResponsibility string)
            LeadManagement.aggregate([
                { $match: { isCounseled: true, updatedAt: dateRange, leadResponsibility: { $in: userNames }, centre: { $in: allowedIds } } },
                { $group: { _id: { $trim: { input: "$leadResponsibility" } }, count: { $sum: 1 } } }
            ]),

            // 3. Normal admissions by createdBy
            Admission.aggregate([
                { $match: { createdAt: dateRange, createdBy: { $in: userIds }, centre: { $in: allowedNames } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ]),

            // 4. Board course admissions by createdBy
            BoardCourseAdmission.aggregate([
                { $match: { createdAt: dateRange, createdBy: { $in: userIds }, centre: { $in: allowedNames } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ]),

            // 5. Bulk lead uploads by createdBy
            LeadManagement.aggregate([
                { $match: { isBulkUpload: true, createdAt: dateRange, createdBy: { $in: userIds }, centre: { $in: allowedIds } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ]),

            // 6. Manually created leads by createdBy (isBulkUpload is false or missing)
            LeadManagement.aggregate([
                {
                    $match: {
                        $or: [{ isBulkUpload: false }, { isBulkUpload: { $exists: false } }],
                        createdAt: dateRange,
                        createdBy: { $in: userIds },
                        centre: { $in: allowedIds }
                    }
                },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ]),

            // 7. Follow-ups by updatedBy (stored as string name)
            LeadManagement.aggregate([
                { $match: { centre: { $in: allowedIds } } },
                { $unwind: "$followUps" },
                { $match: { "followUps.date": dateRange, "followUps.updatedBy": { $in: userNames } } },
                { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
            ]),

            // 8. Revenue generated — mirrors exact transaction report logic
            Payment.aggregate([
                {
                    $match: {
                        billId: { $regex: /^PATH/i },
                        paidAmount: { $gt: 0 },
                        recordedBy: { $in: userIds },
                        $or: [
                            { status: { $in: ["PAID", "PARTIAL"] } },
                            {
                                paymentMethod: "CHEQUE",
                                status: { $in: ["PAID", "PARTIAL", "PENDING", "PENDING_CLEARANCE", "REJECTED"] }
                            }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "admissions",
                        localField: "admission",
                        foreignField: "_id",
                        as: "admNormal"
                    }
                },
                {
                    $lookup: {
                        from: "boardcourseadmissions",
                        localField: "admission",
                        foreignField: "_id",
                        as: "admBoard"
                    }
                },
                {
                    $addFields: {
                        adm: {
                            $ifNull: [
                                { $arrayElemAt: ["$admNormal", 0] },
                                { $arrayElemAt: ["$admBoard", 0] }
                            ]
                        }
                    }
                },
                {
                    $match: {
                        "adm.centre": { $in: allowedNames }
                    }
                },
                {
                    $addFields: {
                        // Use same date priority as transaction report: paidDate → receivedDate → createdAt
                        effectiveDate: { $ifNull: [{ $toDate: "$paidDate" }, { $toDate: "$receivedDate" }, "$createdAt"] },
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
                { $group: { _id: "$recordedBy", total: { $sum: "$revenueBase" } } }
            ])
        ]);

        // Build ObjectId-keyed lookup maps
        const normalAdmMap = {};
        normalAdmissionsAgg.forEach(r => { if (r._id) normalAdmMap[r._id.toString()] = r.count; });

        const boardAdmMap = {};
        boardAdmissionsAgg.forEach(r => { if (r._id) boardAdmMap[r._id.toString()] = r.count; });

        const boardCounselMap = {};
        boardCounsellingAgg.forEach(r => { if (r._id) boardCounselMap[r._id.toString()] = r.count; });

        const uploadMap = {};
        leadUploadsAgg.forEach(r => { if (r._id) uploadMap[r._id.toString()] = r.count; });

        const manualMap = {};
        leadManualAgg.forEach(r => { if (r._id) manualMap[r._id.toString()] = r.count; });

        const revenueMap = {};
        revenueAgg.forEach(r => { if (r._id) revenueMap[r._id.toString()] = r.total; });

        // Build name-keyed lookup maps (for string-based fields)
        const followUpMap = {};
        followUpsAgg.forEach(r => { if (r._id) followUpMap[r._id.toLowerCase().trim()] = r.count; });

        const leadCounselMap = {};
        leadCounsellingAgg.forEach(r => { if (r._id) leadCounselMap[r._id.toLowerCase().trim()] = r.count; });

        // Assemble per-user stats
        let rankData = users.map(user => {
            const uid = user._id.toString();
            const nameLower = (user.name || "").toLowerCase().trim();

            const counselling = (boardCounselMap[uid] || 0) + (leadCounselMap[nameLower] || 0);
            const admissions = (normalAdmMap[uid] || 0) + (boardAdmMap[uid] || 0);
            const leadUploads = uploadMap[uid] || 0;
            const leadManual = manualMap[uid] || 0;
            const followUps = followUpMap[nameLower] || 0;
            const revenue = revenueMap[uid] || 0;

            const center = user.centres && user.centres.length > 0
                ? user.centres.map(c => c.centreName).join(", ")
                : "—";

            return {
                userId: uid,
                name: user.name || "Unknown",
                role: user.role || "—",
                center,
                counselling,
                admissions,
                leadUploads,
                leadManual,
                followUps,
                revenue: parseFloat(revenue.toFixed(2))
            };
        });

        // Only include users with at least one activity
        rankData = rankData.filter(u =>
            u.counselling > 0 || u.admissions > 0 || u.leadUploads > 0 ||
            u.leadManual > 0 || u.followUps > 0 || u.revenue > 0
        );

        // Sort by the requested metric
        const metricKey = {
            counselling: "counselling",
            admissions: "admissions",
            leadUploads: "leadUploads",
            leadManual: "leadManual",
            followUps: "followUps",
            revenue: "revenue"
        }[metric] || "admissions";

        rankData.sort((a, b) => b[metricKey] - a[metricKey]);

        const rankedData = rankData.map((item, index) => ({
            ...item,
            rank: index + 1
        }));

        res.status(200).json({
            rankings: rankedData,
            dateRange: { from: startDate, to: endDate },
            metric: metricKey
        });

    } catch (error) {
        console.error("Error in getUserRankings:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
