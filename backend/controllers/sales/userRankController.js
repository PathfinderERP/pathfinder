import User from "../../models/User.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import LeadManagement from "../../models/LeadManagement.js";
import Centre from "../../models/Master_data/Centre.js";
import StudentFollowUp from "../../models/StudentFollowUp.js";
import StudentServiceCall from "../../models/StudentServiceCall.js";
import PNTSEStudent from "../../models/PNTSEStudent.js";
import PMOStudent from "../../models/PMOStudent.js";
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
            studentFollowUpsAgg,
            serviceCallsAgg,
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

            // 7b. PNTSE & PMO Follow-ups / Calling
            StudentFollowUp.aggregate([
                {
                    $match: {
                        $or: [
                            { callDate: dateRange },
                            { createdAt: dateRange }
                        ],
                        calledBy: { $in: userIds }
                    }
                },
                { $group: { _id: "$calledBy", count: { $sum: 1 } } }
            ]),

            // 7c. Student Service Calls
            StudentServiceCall.aggregate([
                {
                    $match: {
                        $or: [
                            { callDate: dateRange },
                            { createdAt: dateRange }
                        ],
                        $or: [
                            { user: { $in: userIds } },
                            { userName: { $in: userNames } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: { $ifNull: ["$user", "$userName"] },
                        count: { $sum: 1 }
                    }
                }
            ]),

            // 8. Walk-ins query
            LeadManagement.find({
                $or: [
                    { isWalkIn: true },
                    { source: { $regex: /walk[- ]?in/i } }
                ],
                centre: { $in: allowedIds }
            }).select("walkInBy createdBy leadResponsibility walkInDate createdAt").lean()
        ]);

        // Process Walk-ins per lead to avoid double-counting
        const walkInMap = {};
        walkInAgg.forEach(lead => {
            const wDate = lead.walkInDate || lead.createdAt;
            if (!wDate) return;
            const dObj = new Date(wDate);
            if (dObj < startDate || dObj > endDate) return;

            let assignedUid = null;
            if (lead.walkInBy) {
                assignedUid = lead.walkInBy.toString();
            } else if (lead.createdBy) {
                assignedUid = lead.createdBy.toString();
            } else if (lead.leadResponsibility) {
                const respLower = lead.leadResponsibility.toLowerCase().trim();
                const matchedUser = users.find(u => (u.name || "").toLowerCase().trim() === respLower);
                if (matchedUser) {
                    assignedUid = matchedUser._id.toString();
                }
            }

            if (assignedUid) {
                walkInMap[assignedUid] = (walkInMap[assignedUid] || 0) + 1;
            }
        });

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

        // PNTSE & PMO Follow-up map (ObjectId-keyed)
        const studentFollowUpMap = {};
        studentFollowUpsAgg.forEach(r => { if (r._id) studentFollowUpMap[r._id.toString()] = r.count; });

        // Student Service Calls map (ObjectId or name-keyed)
        const serviceCallMap = {};
        serviceCallsAgg.forEach(r => {
            if (r._id) {
                const key = r._id.toString().toLowerCase().trim();
                serviceCallMap[key] = (serviceCallMap[key] || 0) + r.count;
            }
        });

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
            const totalCalls = (followUpMap[nameLower] || 0) + (studentFollowUpMap[uid] || 0) + (serviceCallMap[uid] || serviceCallMap[nameLower] || 0);
            const calling = totalCalls;
            const walkIn = walkInMap[uid] || 0;
            const followUps = totalCalls;
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

        // Do not filter out 0-activity users so total users for each role are returned
        // rankData = rankData.filter(...)

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

export const getUserCounsellingDetails = async (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.query;
        if (!userId) return res.status(400).json({ message: "userId is required" });

        const user = await User.findById(userId).select("name").lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const now = new Date();
        let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        if (fromDate) { startDate = new Date(fromDate); startDate.setHours(0, 0, 0, 0); }
        if (toDate) { endDate = new Date(toDate); endDate.setHours(23, 59, 59, 999); }
        const dateRange = { $gte: startDate, $lte: endDate };

        const userObjId = new mongoose.Types.ObjectId(userId);
        const userNameRegex = new RegExp(`^${user.name.trim()}$`, "i");

        const [boardCounsellings, leadCounsellings] = await Promise.all([
            BoardCourseCounselling.find({
                counselledBy: userObjId,
                counselledDate: dateRange
            }).populate("studentId", "name studentName mobileNum").lean(),

            LeadManagement.find({
                isCounseled: true,
                updatedAt: dateRange,
                leadResponsibility: userNameRegex
            }).populate("centre", "centreName").populate("course", "courseName").populate("className", "className name").lean()
        ]);

        const list = [];
        boardCounsellings.forEach(bc => {
            const dateObj = new Date(bc.counselledDate || bc.createdAt);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            list.push({
                id: bc._id,
                type: "BOARD",
                date: `${day}-${monthNum}-${year}`,
                rawDate: bc.counselledDate || bc.createdAt,
                studentName: bc.studentName || bc.studentId?.name || bc.studentId?.studentName || "N/A",
                mobile: bc.mobileNum || bc.studentId?.mobileNum || "-",
                courseOrClass: bc.programme || bc.lastClass || "Board Course",
                centre: bc.centre || "-",
                remarks: bc.remarks || bc.status || "Counselled"
            });
        });

        leadCounsellings.forEach(lc => {
            const dateObj = new Date(lc.updatedAt || lc.createdAt);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            list.push({
                id: lc._id,
                type: "LEAD",
                date: `${day}-${monthNum}-${year}`,
                rawDate: lc.updatedAt || lc.createdAt,
                studentName: lc.name || "N/A",
                mobile: lc.phoneNumber || lc.secondPhoneNumber || "-",
                courseOrClass: lc.course?.courseName || lc.courseText || lc.className?.className || lc.className?.name || "-",
                centre: lc.centre?.centreName || lc.centre || "-",
                remarks: lc.leadType || "Counselled Lead"
            });
        });

        list.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
        res.status(200).json({ data: list, totalCount: list.length });
    } catch (error) {
        console.error("Error in getUserCounsellingDetails:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getUserCallingDetails = async (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.query;
        if (!userId) return res.status(400).json({ message: "userId is required" });

        const user = await User.findById(userId).select("name").lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const now = new Date();
        let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        if (fromDate) { startDate = new Date(fromDate); startDate.setHours(0, 0, 0, 0); }
        if (toDate) { endDate = new Date(toDate); endDate.setHours(23, 59, 59, 999); }
        const dateRange = { $gte: startDate, $lte: endDate };

        const userNameLower = (user.name || "").toLowerCase().trim();
        const userObjId = new mongoose.Types.ObjectId(userId);

        const [leads, studentFollowUps, serviceCalls] = await Promise.all([
            LeadManagement.find({
                "followUps.date": dateRange,
                "followUps.updatedBy": { $regex: new RegExp(`^${user.name.trim()}$`, "i") }
            }).populate("centre", "centreName").lean(),

            StudentFollowUp.find({
                calledBy: userObjId,
                $or: [
                    { callDate: dateRange },
                    { createdAt: dateRange }
                ]
            }).populate("centre", "centreName").lean(),

            StudentServiceCall.find({
                $or: [
                    { user: userObjId },
                    { userName: { $regex: new RegExp(`^${user.name.trim()}$`, "i") } }
                ],
                $or: [
                    { callDate: dateRange },
                    { createdAt: dateRange }
                ]
            }).populate("centre", "centreName").lean()
        ]);

        const list = [];
        leads.forEach(lead => {
            const allFollowUps = lead.followUps || [];
            const totalFollowUps = allFollowUps.length;

            allFollowUps.forEach((fu, index) => {
                const fuUpdatedBy = (fu.updatedBy || "").toLowerCase().trim();
                const fuDate = new Date(fu.date);
                if (fuUpdatedBy === userNameLower && fuDate >= startDate && fuDate <= endDate) {
                    const day = String(fuDate.getDate()).padStart(2, '0');
                    const monthNum = String(fuDate.getMonth() + 1).padStart(2, '0');
                    const year = fuDate.getFullYear();

                    let prevFollowUp = null;
                    if (index > 0) {
                        const pFu = allFollowUps[index - 1];
                        const pDateObj = new Date(pFu.date);
                        const pDay = String(pDateObj.getDate()).padStart(2, '0');
                        const pMonth = String(pDateObj.getMonth() + 1).padStart(2, '0');
                        const pYear = pDateObj.getFullYear();
                        prevFollowUp = {
                            date: `${pDay}-${pMonth}-${pYear}`,
                            status: pFu.status || "-",
                            remarks: pFu.remarks || pFu.feedback || "-",
                            updatedBy: pFu.updatedBy || "-"
                        };
                    }

                    list.push({
                        id: fu._id || `${lead._id}_${fuDate.getTime()}`,
                        date: `${day}-${monthNum}-${year}`,
                        rawDate: fuDate,
                        studentName: lead.name || "N/A",
                        mobile: lead.phoneNumber || lead.secondPhoneNumber || "-",
                        status: fu.status || lead.leadType || "-",
                        remarks: fu.remarks || fu.feedback || "-",
                        duration: fu.callDuration || "-",
                        centre: lead.centre?.centreName || lead.centre || "-",
                        totalFollowUps,
                        followUpSeq: index + 1,
                        prevFollowUp
                    });
                }
            });
        });

        // 2. Process PNTSE & PMO student follow-up calls
        if (studentFollowUps && studentFollowUps.length > 0) {
            const pntseIds = studentFollowUps.filter(f => f.studentType === 'PNTSE').map(f => f.studentId).filter(Boolean);
            const pmoIds = studentFollowUps.filter(f => f.studentType === 'PMO').map(f => f.studentId).filter(Boolean);

            const [pntseStudents, pmoStudents] = await Promise.all([
                pntseIds.length > 0 ? PNTSEStudent.find({ _id: { $in: pntseIds } }).populate("centre", "centreName").lean() : [],
                pmoIds.length > 0 ? PMOStudent.find({ _id: { $in: pmoIds } }).populate("centre", "centreName").lean() : []
            ]);

            const studentMap = {};
            pntseStudents.forEach(s => { studentMap[s._id.toString()] = { ...s, type: 'PNTSE' }; });
            pmoStudents.forEach(s => { studentMap[s._id.toString()] = { ...s, type: 'PMO' }; });

            studentFollowUps.forEach((fu, idx) => {
                const st = studentMap[fu.studentId?.toString()] || {};
                const fuDate = new Date(fu.callDate || fu.createdAt);
                const day = String(fuDate.getDate()).padStart(2, '0');
                const monthNum = String(fuDate.getMonth() + 1).padStart(2, '0');
                const year = fuDate.getFullYear();

                list.push({
                    id: fu._id || `sfu_${idx}`,
                    date: `${day}-${monthNum}-${year}`,
                    rawDate: fuDate,
                    studentName: st.name || "Student",
                    mobile: st.mobile || st.secondaryMobile || "-",
                    status: `${fu.studentType || 'PNTSE'} Call (${fu.feedback || 'Follow-up'})`,
                    remarks: fu.notes ? `${fu.feedback || ''} - ${fu.notes}` : (fu.feedback || `${fu.studentType} Call`),
                    duration: fu.callDuration ? `${fu.callDuration}s` : "-",
                    centre: fu.centre?.centreName || st.centre?.centreName || "-",
                    totalFollowUps: 1,
                    followUpSeq: 1,
                    prevFollowUp: null
                });
            });
        }

        // 3. Process StudentServiceCalls
        if (serviceCalls && serviceCalls.length > 0) {
            serviceCalls.forEach((sc, idx) => {
                const scDate = new Date(sc.callDate || sc.createdAt);
                const day = String(scDate.getDate()).padStart(2, '0');
                const monthNum = String(scDate.getMonth() + 1).padStart(2, '0');
                const year = scDate.getFullYear();

                list.push({
                    id: sc._id || `sc_${idx}`,
                    date: `${day}-${monthNum}-${year}`,
                    rawDate: scDate,
                    studentName: sc.studentName || "Student",
                    mobile: sc.studentPhone || "-",
                    status: `Service Call (${sc.servicePurpose || sc.status || 'General'})`,
                    remarks: sc.remarks || sc.servicePurpose || "Service Call",
                    duration: "-",
                    centre: sc.centreName || sc.centre?.centreName || "-",
                    totalFollowUps: 1,
                    followUpSeq: 1,
                    prevFollowUp: null
                });
            });
        }

        list.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
        res.status(200).json({ data: list, totalCount: list.length });
    } catch (error) {
        console.error("Error in getUserCallingDetails:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getUserWalkInDetails = async (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.query;
        if (!userId) return res.status(400).json({ message: "userId is required" });

        const user = await User.findById(userId).select("name").lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const now = new Date();
        let startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        if (fromDate) { startDate = new Date(fromDate); startDate.setHours(0, 0, 0, 0); }
        if (toDate) { endDate = new Date(toDate); endDate.setHours(23, 59, 59, 999); }

        const userObjId = new mongoose.Types.ObjectId(userId);
        const userNameLower = (user.name || "").toLowerCase().trim();

        const candidateLeads = await LeadManagement.find({
            $or: [
                { isWalkIn: true },
                { source: { $regex: /walk[- ]?in/i } }
            ],
            $or: [
                { walkInBy: userObjId },
                { createdBy: userObjId },
                { leadResponsibility: { $regex: new RegExp(`^${user.name.trim()}$`, "i") } }
            ]
        }).populate("centre", "centreName").lean();

        const list = [];
        candidateLeads.forEach(lead => {
            const wDate = lead.walkInDate || lead.createdAt;
            if (!wDate) return;
            const dateObj = new Date(wDate);
            if (dateObj < startDate || dateObj > endDate) return;

            let isOwned = false;
            if (lead.walkInBy) {
                isOwned = lead.walkInBy.toString() === userId.toString();
            } else if (lead.createdBy) {
                isOwned = lead.createdBy.toString() === userId.toString();
            } else if (lead.leadResponsibility) {
                isOwned = lead.leadResponsibility.toLowerCase().trim() === userNameLower;
            }

            if (isOwned) {
                const day = String(dateObj.getDate()).padStart(2, '0');
                const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year = dateObj.getFullYear();
                list.push({
                    id: lead._id,
                    date: `${day}-${monthNum}-${year}`,
                    rawDate: wDate,
                    studentName: lead.name || "N/A",
                    mobile: lead.phoneNumber || lead.secondPhoneNumber || "-",
                    source: lead.isWalkIn ? "Walked In (Button Tagged)" : (lead.source || "Walk In"),
                    status: lead.leadType || "Walk In Lead",
                    centre: lead.centre?.centreName || lead.centre || "-"
                });
            }
        });

        list.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
        res.status(200).json({ data: list, totalCount: list.length });
    } catch (error) {
        console.error("Error in getUserWalkInDetails:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
