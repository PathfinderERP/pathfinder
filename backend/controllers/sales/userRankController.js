import User from "../../models/User.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import LeadManagement from "../../models/LeadManagement.js";
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

        // Fetch active users (excluding superAdmin, teacher, digital, accounts)
        const EXCLUDED_ROLES = ["superAdmin", "super admin", "teacher", "digital", "accounts", "SuperAdmin", "Teacher", "Digital", "Accounts"];
        const userQuery = {
            isActive: true,
            role: { $nin: EXCLUDED_ROLES }
        };
        if (roles) {
            const roleList = roles.split(",").map(r => r.trim()).filter(Boolean);
            if (roleList.length > 0) {
                userQuery.role = { $in: roleList, $nin: EXCLUDED_ROLES };
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

        // Run aggregations in parallel
        const [
            boardCounsellingAgg,
            leadCounsellingAgg,
            normalAdmissionsAgg,
            boardAdmissionsAgg,
            leadUploadsAgg,
            leadManualAgg,
            followUpsAgg,
            walkInAgg,
            walkInNameAgg
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

            // 3. Normal admissions by createdBy with down payment calculation
            Admission.aggregate([
                {
                    $match: {
                        $or: [
                            { createdAt: dateRange },
                            { admissionDate: dateRange }
                        ],
                        createdBy: { $in: userIds },
                        centre: { $in: allowedNames }
                    }
                },
                {
                    $group: {
                        _id: "$createdBy",
                        count: { $sum: 1 },
                        downPaymentSum: {
                            $sum: {
                                $cond: [
                                    { $gt: ["$downPayment", 0] },
                                    "$downPayment",
                                    { $ifNull: ["$totalPaidAmount", 0] }
                                ]
                            }
                        }
                    }
                }
            ]),

            // 4. Board course admissions by createdBy with down payment calculation
            BoardCourseAdmission.aggregate([
                {
                    $match: {
                        $or: [
                            { createdAt: dateRange },
                            { admissionDate: dateRange }
                        ],
                        createdBy: { $in: userIds },
                        centre: { $in: allowedNames }
                    }
                },
                {
                    $group: {
                        _id: "$createdBy",
                        count: { $sum: 1 },
                        downPaymentSum: {
                            $sum: {
                                $cond: [
                                    { $gt: ["$downPayment", 0] },
                                    "$downPayment",
                                    {
                                        $cond: [
                                            { $gt: ["$admissionFee", 0] },
                                            "$admissionFee",
                                            { $ifNull: ["$totalPaidAmount", 0] }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
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

            // 7. Follow-ups / Calling by updatedBy (stored as string name)
            LeadManagement.aggregate([
                { $match: { centre: { $in: allowedIds } } },
                { $unwind: "$followUps" },
                { $match: { "followUps.date": dateRange, "followUps.updatedBy": { $in: userNames } } },
                { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
            ]),

            // 8. Walk-ins by walkInBy or createdBy ObjectId
            LeadManagement.aggregate([
                {
                    $match: {
                        $or: [
                            { isWalkIn: true },
                            { source: { $regex: /walk[- ]?in/i } }
                        ],
                        $or: [
                            { walkInDate: dateRange },
                            { createdAt: dateRange }
                        ],
                        centre: { $in: allowedIds }
                    }
                },
                { $group: { _id: { $ifNull: ["$walkInBy", "$createdBy"] }, count: { $sum: 1 } } }
            ]),

            // 9. Walk-ins by leadResponsibility string name
            LeadManagement.aggregate([
                {
                    $match: {
                        $or: [
                            { isWalkIn: true },
                            { source: { $regex: /walk[- ]?in/i } }
                        ],
                        $or: [
                            { walkInDate: dateRange },
                            { createdAt: dateRange }
                        ],
                        leadResponsibility: { $in: userNames },
                        centre: { $in: allowedIds }
                    }
                },
                { $group: { _id: { $trim: { input: "$leadResponsibility" } }, count: { $sum: 1 } } }
            ])
        ]);

        // Build ObjectId-keyed lookup maps
        const normalAdmMap = {};
        const normalDpMap = {};
        normalAdmissionsAgg.forEach(r => {
            if (r._id) {
                const uid = r._id.toString();
                normalAdmMap[uid] = r.count;
                normalDpMap[uid] = r.downPaymentSum || 0;
            }
        });

        const boardAdmMap = {};
        const boardDpMap = {};
        boardAdmissionsAgg.forEach(r => {
            if (r._id) {
                const uid = r._id.toString();
                boardAdmMap[uid] = r.count;
                boardDpMap[uid] = r.downPaymentSum || 0;
            }
        });

        const boardCounselMap = {};
        boardCounsellingAgg.forEach(r => { if (r._id) boardCounselMap[r._id.toString()] = r.count; });

        const uploadMap = {};
        leadUploadsAgg.forEach(r => { if (r._id) uploadMap[r._id.toString()] = r.count; });

        const manualMap = {};
        leadManualAgg.forEach(r => { if (r._id) manualMap[r._id.toString()] = r.count; });

        const walkInIdMap = {};
        walkInAgg.forEach(r => { if (r._id) walkInIdMap[r._id.toString()] = r.count; });

        // Build name-keyed lookup maps (for string-based fields)
        const followUpMap = {};
        followUpsAgg.forEach(r => { if (r._id) followUpMap[r._id.toLowerCase().trim()] = r.count; });

        const leadCounselMap = {};
        leadCounsellingAgg.forEach(r => { if (r._id) leadCounselMap[r._id.toLowerCase().trim()] = r.count; });

        const walkInNameMap = {};
        walkInNameAgg.forEach(r => { if (r._id) walkInNameMap[r._id.toLowerCase().trim()] = r.count; });

        // Assemble per-user stats
        let rankData = users.map(user => {
            const uid = user._id.toString();
            const nameLower = (user.name || "").toLowerCase().trim();

            const counselling = (boardCounselMap[uid] || 0) + (leadCounselMap[nameLower] || 0);
            const admissions = (normalAdmMap[uid] || 0) + (boardAdmMap[uid] || 0);
            const calling = followUpMap[nameLower] || 0;
            const walkIn = (walkInIdMap[uid] || 0) + (walkInNameMap[nameLower] || 0);
            const followUps = followUpMap[nameLower] || 0;
            const leadUploads = uploadMap[uid] || 0;
            const leadManual = manualMap[uid] || 0;
            const revenue = (normalDpMap[uid] || 0) + (boardDpMap[uid] || 0); // Admission Amount (Total Down Payment)

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
                calling,
                walkIn,
                followUps,
                leadUploads,
                leadManual,
                revenue: parseFloat(revenue.toFixed(2))
            };
        });

        // Only include users with at least one activity
        rankData = rankData.filter(u =>
            u.counselling > 0 || u.admissions > 0 || u.calling > 0 || u.walkIn > 0 ||
            u.followUps > 0 || u.revenue > 0 || u.leadUploads > 0 || u.leadManual > 0
        );

        // Sort by the requested metric
        const metricKey = {
            counselling: "counselling",
            admissions: "admissions",
            calling: "calling",
            walkIn: "walkIn",
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

export const getUserAdmissionDetails = async (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "userId is required" });
        }

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
        const userObjId = new mongoose.Types.ObjectId(userId);

        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({
                createdBy: userObjId,
                $or: [
                    { createdAt: dateRange },
                    { admissionDate: dateRange }
                ]
            })
                .populate("student", "name studentName rollNumber mobileNum")
                .populate("course", "courseName")
                .populate("class", "name className")
                .lean(),

            BoardCourseAdmission.find({
                createdBy: userObjId,
                $or: [
                    { createdAt: dateRange },
                    { admissionDate: dateRange }
                ]
            })
                .populate("studentId", "name studentName rollNumber mobileNum")
                .populate("boardId", "boardCourse name boardName")
                .lean()
        ]);

        const list = [];

        normalAdmissions.forEach(adm => {
            const admDate = adm.admissionDate || adm.createdAt;
            const dateObj = new Date(admDate);

            const day = String(dateObj.getDate()).padStart(2, '0');
            const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const dateStr = `${day}-${monthNum}-${year}`;

            const monthShort = dateObj.toLocaleString("en-US", { month: "short" });

            const studentName = adm.student?.name || adm.student?.studentName || adm.studentName || "N/A";
            const courseName = adm.course?.courseName || adm.courseName || "Regular Course";
            const className = adm.class?.className || adm.class?.name || (typeof adm.class === 'string' ? adm.class : "") || adm.targetClass || "-";
            const enrollmentNo = adm.admissionNumber || adm.enrollmentNo || adm.enrollmentNumber || "N/A";

            const downPayment = adm.downPayment > 0 ? adm.downPayment : (adm.totalPaidAmount || 0);

            list.push({
                id: adm._id,
                type: "NORMAL",
                date: dateStr,
                rawDate: admDate,
                enrollmentNo,
                studentName,
                courseName,
                className,
                month: monthShort,
                downPayment
            });
        });

        boardAdmissions.forEach(adm => {
            const admDate = adm.admissionDate || adm.createdAt;
            const dateObj = new Date(admDate);

            const day = String(dateObj.getDate()).padStart(2, '0');
            const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            const dateStr = `${day}-${monthNum}-${year}`;

            const monthShort = dateObj.toLocaleString("en-US", { month: "short" });

            const studentName = adm.studentId?.name || adm.studentId?.studentName || adm.studentName || "N/A";
            const courseName = adm.boardCourseName || adm.boardId?.boardCourse || adm.boardId?.name || adm.boardId?.boardName || "Board Course";
            const className = adm.lastClass || adm.targetClass || adm.class || "-";
            const enrollmentNo = adm.admissionNumber || adm.enrollmentNo || "N/A";

            const downPayment = adm.downPayment > 0 ? adm.downPayment : (adm.admissionFee > 0 ? adm.admissionFee : (adm.totalPaidAmount || 0));

            list.push({
                id: adm._id,
                type: "BOARD",
                date: dateStr,
                rawDate: admDate,
                enrollmentNo,
                studentName,
                courseName,
                className,
                month: monthShort,
                downPayment
            });
        });

        list.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

        const totalDownPayment = list.reduce((sum, item) => sum + (item.downPayment || 0), 0);

        res.status(200).json({
            data: list,
            totalDownPayment,
            totalCount: list.length
        });
    } catch (error) {
        console.error("Error in getUserAdmissionDetails:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
