import ManpowerTarget from "../../models/Sales/ManpowerTarget.js";
import User from "../../models/User.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import BoardCourseCounselling from "../../models/Admission/BoardCourseCounselling.js";
import LeadManagement from "../../models/LeadManagement.js";
import Payment from "../../models/Payment/Payment.js";
import mongoose from "mongoose";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Helper to calculate date range based on month, year, and viewMode
const getDateRange = (month, year, viewMode) => {
    let startDate, endDate;
    const y = Number(year) || new Date().getFullYear();

    if (viewMode === "YEARLY") {
        startDate = new Date(y, 0, 1, 0, 0, 0, 0);
        endDate = new Date(y, 11, 31, 23, 59, 59, 999);
    } else if (viewMode === "QUARTERLY") {
        // Resolve quarter using financial year quarters
        // Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
        const m = month || monthNames[new Date().getMonth()];
        if (["April", "May", "June"].includes(m)) {
            startDate = new Date(y, 3, 1, 0, 0, 0, 0);
            endDate = new Date(y, 5, 30, 23, 59, 59, 999);
        } else if (["July", "August", "September"].includes(m)) {
            startDate = new Date(y, 6, 1, 0, 0, 0, 0);
            endDate = new Date(y, 8, 30, 23, 59, 59, 999);
        } else if (["October", "November", "December"].includes(m)) {
            startDate = new Date(y, 9, 1, 0, 0, 0, 0);
            endDate = new Date(y, 11, 31, 23, 59, 59, 999);
        } else {
            // January, February, March
            startDate = new Date(y, 0, 1, 0, 0, 0, 0);
            endDate = new Date(y, 2, 31, 23, 59, 59, 999);
        }
    } else {
        // MONTHLY
        const m = month || monthNames[new Date().getMonth()];
        const mIndex = monthNames.indexOf(m);
        const resolvedMonth = mIndex !== -1 ? mIndex : new Date().getMonth();
        startDate = new Date(y, resolvedMonth, 1, 0, 0, 0, 0);
        endDate = new Date(y, resolvedMonth + 1, 0, 23, 59, 59, 999);
    }

    return { startDate, endDate };
};

// GET /sales/manpower-target
export const getManpowerTargets = async (req, res) => {
    try {
        const { month, year, viewMode = "MONTHLY", startDate: qStartDate, endDate: qEndDate } = req.query;
        
        let startDate, endDate;
        if (qStartDate && qEndDate) {
            startDate = new Date(qStartDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(qEndDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
            const range = getDateRange(month, year, viewMode);
            startDate = range.startDate;
            endDate = range.endDate;
        }
        const dateRange = { $gte: startDate, $lte: endDate };

        // Fetch active users with operational roles
        const users = await User.find({ isActive: true }).select("_id name role").lean();
        if (!users.length) {
            return res.status(200).json({ data: [] });
        }

        const userIds = users.map(u => u._id);
        const userNames = users.map(u => u.name).filter(Boolean);

        // Fetch configured targets
        const targets = await ManpowerTarget.find({
            month: month || monthNames[new Date().getMonth()],
            year: Number(year) || new Date().getFullYear(),
            viewMode
        }).lean();

        const targetsMap = {};
        targets.forEach(t => {
            targetsMap[t.userId.toString()] = t;
        });

        // Run aggregations for achieved metrics in parallel
        const [
            followUpsAgg,
            boardCounsellingAgg,
            leadCounsellingAgg,
            normalAdmissionsAgg,
            boardAdmissionsAgg,
            revenueAgg
        ] = await Promise.all([
            // 1. Calls (Follow-ups updated by username)
            LeadManagement.aggregate([
                { $unwind: "$followUps" },
                { $match: { "followUps.date": dateRange, "followUps.updatedBy": { $in: userNames } } },
                { $group: { _id: { $trim: { input: "$followUps.updatedBy" } }, count: { $sum: 1 } } }
            ]),

            // 2. Board counselling - counselledBy (ObjectId)
            BoardCourseCounselling.aggregate([
                { $match: { counselledDate: dateRange, counselledBy: { $in: userIds } } },
                { $group: { _id: "$counselledBy", count: { $sum: 1 } } }
            ]),

            // 3. Regular lead counselling - leadResponsibility (string name) and isCounseled true
            LeadManagement.aggregate([
                { $match: { isCounseled: true, updatedAt: dateRange, leadResponsibility: { $in: userNames } } },
                { $group: { _id: { $trim: { input: "$leadResponsibility" } }, count: { $sum: 1 } } }
            ]),

            // 4. Normal admissions - createdBy (ObjectId)
            Admission.aggregate([
                { $match: { createdAt: dateRange, createdBy: { $in: userIds } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ]),

            // 5. Board course admissions - createdBy (ObjectId)
            BoardCourseAdmission.aggregate([
                { $match: { createdAt: dateRange, createdBy: { $in: userIds } } },
                { $group: { _id: "$createdBy", count: { $sum: 1 } } }
            ]),

            // 6. Revenue/collection - recordedBy (ObjectId)
            Payment.aggregate([
                {
                    $match: {
                        billId: { $regex: /^PATH/i },
                        paidAmount: { $gt: 0 },
                        recordedBy: { $in: userIds },
                        // Only include cleared/paid transactions (PENDING_CLEARANCE excluded until cheque clearance)
                        status: { $in: ["PAID", "PARTIAL"] }
                    }
                },
                {
                    $addFields: {
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
                        effectiveDate: dateRange
                    }
                },
                { $group: { _id: "$recordedBy", total: { $sum: "$revenueBase" } } }
            ])
        ]);

        // Build lookup maps for achievements
        const callsMap = {};
        followUpsAgg.forEach(item => {
            if (item._id) callsMap[item._id.toLowerCase().trim()] = item.count;
        });

        const boardCounsellingMap = {};
        boardCounsellingAgg.forEach(item => {
            if (item._id) boardCounsellingMap[item._id.toString()] = item.count;
        });

        const leadCounsellingMap = {};
        leadCounsellingAgg.forEach(item => {
            if (item._id) leadCounsellingMap[item._id.toLowerCase().trim()] = item.count;
        });

        const normalAdmissionsMap = {};
        normalAdmissionsAgg.forEach(item => {
            if (item._id) normalAdmissionsMap[item._id.toString()] = item.count;
        });

        const boardAdmissionsMap = {};
        boardAdmissionsAgg.forEach(item => {
            if (item._id) boardAdmissionsMap[item._id.toString()] = item.count;
        });

        const revenueMap = {};
        revenueAgg.forEach(item => {
            if (item._id) revenueMap[item._id.toString()] = item.total;
        });

        // Map targets and achieved metrics for each user
        const resultData = users.map(user => {
            const userIdStr = user._id.toString();
            const nameLower = (user.name || "").toLowerCase().trim();

            const targetObj = targetsMap[userIdStr] || {};

            const callsAchieved = callsMap[nameLower] || 0;
            const counsellingAchieved = (boardCounsellingMap[userIdStr] || 0) + (leadCounsellingMap[nameLower] || 0);
            const admissionsAchieved = (normalAdmissionsMap[userIdStr] || 0) + (boardAdmissionsMap[userIdStr] || 0);
            const collectionAchieved = Math.round(revenueMap[userIdStr] || 0);

            return {
                userId: userIdStr,
                calls: targetObj.calls || 0,
                callsAchieved,
                counselling: targetObj.counselling || 0,
                counsellingAchieved,
                admissions: targetObj.admissions || 0,
                admissionsAchieved,
                collection: targetObj.collection || 0,
                collectionAchieved
            };
        });

        return res.status(200).json({ data: resultData });
    } catch (error) {
        console.error("Error in getManpowerTargets:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

// POST /sales/manpower-target
export const saveManpowerTarget = async (req, res) => {
    try {
        const { userId, month, year, viewMode, calls, counselling, admissions, collection } = req.body;

        if (!userId || !month || !year || !viewMode) {
            return res.status(400).json({ message: "userId, month, year, and viewMode are required." });
        }

        const query = { userId, month, year, viewMode };
        const updateData = {};

        if (calls !== undefined) updateData.calls = calls;
        if (counselling !== undefined) updateData.counselling = counselling;
        if (admissions !== undefined) updateData.admissions = admissions;
        if (collection !== undefined) updateData.collection = collection;
        
        updateData.createdBy = req.user?.id;

        const updatedTarget = await ManpowerTarget.findOneAndUpdate(
            query,
            { $set: updateData },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            message: "Manpower target saved successfully",
            target: updatedTarget
        });
    } catch (error) {
        console.error("Error in saveManpowerTarget:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
