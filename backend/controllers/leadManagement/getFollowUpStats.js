import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import { resolveAgentIdentifier, buildLeadQuery } from "../../utils/leadQueryHelper.js";
import mongoose from "mongoose";

export const getFollowUpStats = async (req, res) => {
    try {
        const { fromDate, toDate, centre, leadResponsibility, scheduledDate, startTime, endTime } = req.query;

        // 1. Resolve potential telecaller names
        const leadResponsibilityQuery = { $or: [] };
        const followUpUserQuery = { $or: [] };

        if (leadResponsibility) {
            const identifiers = Array.isArray(leadResponsibility) ? leadResponsibility : [leadResponsibility];
            for (const val of identifiers) {
                const resolved = await resolveAgentIdentifier(val, req.user);
                if (resolved) {
                    if (resolved.leadMatch) {
                        leadResponsibilityQuery.$or.push(resolved.leadMatch);
                    }
                    if (resolved.followUpMatch) {
                        const fMatch = { ...resolved.followUpMatch };
                        if (fMatch["followUps.updatedBy"]) {
                            fMatch["followUp.updatedBy"] = fMatch["followUps.updatedBy"];
                            delete fMatch["followUps.updatedBy"];
                        }
                        followUpUserQuery.$or.push(fMatch);
                    }
                }
            }
        }

        // 2. Resolve Centre IDs
        let centreIds = [];
        if (centre) {
            const cRaw = Array.isArray(centre) ? centre : [centre];
            centreIds = cRaw.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id);
        }

        // 3. Date filters
        const activityDateFilter = {};
        if (fromDate || toDate) {
            if (fromDate) activityDateFilter.$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                activityDateFilter.$lte = end;
            }
        }

        const buildTimeMatch = () => {
            if (!startTime && !endTime) return {};
            const match = { $and: [] };
            if (startTime) {
                const [h, m] = startTime.split(':').map(Number);
                const startMinutes = h * 60 + (m || 0);
                match.$and.push({
                    $gte: [
                        { $add: [{ $multiply: [{ $hour: "$followUp.date" }, 60] }, { $minute: "$followUp.date" }] },
                        startMinutes - 330 // IST adjustment
                    ]
                });
            }
            if (endTime) {
                const [h, m] = endTime.split(':').map(Number);
                const endMinutes = h * 60 + (m || 0);
                match.$and.push({
                    $lte: [
                        { $add: [{ $multiply: [{ $hour: "$followUp.date" }, 60] }, { $minute: "$followUp.date" }] },
                        endMinutes - 330
                    ]
                });
            }
            return { $expr: match };
        };
        const timeMatch = buildTimeMatch();

        const scheduledDateFilter = {};
        if (fromDate || toDate) {
            if (fromDate) scheduledDateFilter.$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                scheduledDateFilter.$lte = end;
            }
        } else if (scheduledDate) {
            const start = new Date(scheduledDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(scheduledDate);
            end.setHours(23, 59, 59, 999);
            scheduledDateFilter.$gte = start;
            scheduledDateFilter.$lte = end;
        }

        // Build Base query ignoring follow-up activity parameters
        const queryParams = { ...req.query };
        delete queryParams.fromDate;
        delete queryParams.toDate;
        delete queryParams.scheduledDate;
        delete queryParams.followUpStatus;
        queryParams.includeInvalid = true;
        
        const baseMatch = await buildLeadQuery(queryParams, req.user);

        const leadOwnerMatch = { ...baseMatch };
        if (baseMatch.$and) {
            leadOwnerMatch.$and = [...baseMatch.$and];
        }
        if (leadResponsibilityQuery.$or && leadResponsibilityQuery.$or.length > 0) {
            leadOwnerMatch.$and = leadOwnerMatch.$and || [];
            leadOwnerMatch.$and.push(leadResponsibilityQuery);
        }

        let backlogStartDate = new Date();
        if (fromDate) {
            backlogStartDate = new Date(fromDate);
        } else if (scheduledDate) {
            backlogStartDate = new Date(scheduledDate);
        }
        backlogStartDate.setHours(0, 0, 0, 0);

        const previousPendingMatch = { 
            ...leadOwnerMatch, 
            nextFollowUpDate: { $lt: backlogStartDate } 
        };
        if (leadOwnerMatch.$and) {
            previousPendingMatch.$and = [...leadOwnerMatch.$and];
        }

        const stats = await LeadManagement.aggregate([
            {
                $facet: {
                    "activityCounts": [
                        { $match: baseMatch },
                        {
                            $project: {
                                followUp: "$followUps",
                                leadType: 1
                            }
                        },
                        { $unwind: "$followUp" },
                        {
                            $match: {
                                ...(Object.keys(activityDateFilter).length > 0 ? { "followUp.date": activityDateFilter } : {}),
                                ...timeMatch,
                                ...(followUpUserQuery.$or && followUpUserQuery.$or.length > 0 ? followUpUserQuery : {})
                            }
                        },
                        {
                            $group: {
                                _id: "$_id",
                                leadType: { $first: "$leadType" }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalFollowUps: { $sum: 1 },
                                hotLeads: { $sum: { $cond: [{ $in: [{ $toUpper: "$leadType" }, ["HOT LEAD", "ADMISSION TAKEN"]] }, 1, 0] } },
                                warmLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: "$leadType" }, "WARM LEAD"] }, 1, 0] } },
                                coldLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: "$leadType" }, "COLD LEAD"] }, 1, 0] } },
                                neutralLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: "$leadType" }, "NEUTRAL LEAD"] }, 1, 0] } },
                                invalidLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: "$leadType" }, "INVALID LEAD"] }, 1, 0] } }
                            }
                        }
                    ],
                    "recentActivity": [
                        { $match: baseMatch },
                        {
                            $project: {
                                name: 1,
                                followUpsHistory: "$followUps",
                                followUp: "$followUps",
                                leadType: 1,
                                leadResponsibility: 1,
                                phoneNumber: 1,
                                email: 1,
                                className: 1,
                                board: 1,
                                course: 1,
                                source: 1,
                                centre: 1
                            }
                        },
                        { $unwind: "$followUp" },
                        {
                            $match: {
                                ...(Object.keys(activityDateFilter).length > 0 ? { "followUp.date": activityDateFilter } : {}),
                                ...timeMatch,
                                ...(followUpUserQuery.$or && followUpUserQuery.$or.length > 0 ? followUpUserQuery : {})
                            }
                        },
                        { $sort: { "followUp.date": -1 } },
                        { $limit: 500 },
                        { $lookup: { from: "classes", localField: "className", foreignField: "_id", as: "classInfo" } },
                        { $lookup: { from: "boards", localField: "board", foreignField: "_id", as: "boardInfo" } },
                        { $lookup: { from: "courses", localField: "course", foreignField: "_id", as: "courseInfo" } },
                        { $lookup: { from: "centreschemas", localField: "centre", foreignField: "_id", as: "centreInfo" } },
                        {
                            $project: {
                                leadId: "$_id",
                                leadName: "$name",
                                phoneNumber: "$phoneNumber",
                                email: "$email",
                                status: { $ifNull: ["$followUp.status", "$leadType"] },
                                time: "$followUp.date",
                                updatedBy: "$followUp.updatedBy",
                                feedback: "$followUp.feedback",
                                remarks: "$followUp.remarks",
                                callDuration: "$followUp.callDuration",
                                history: "$followUpsHistory",
                                className: { $arrayElemAt: ["$classInfo.name", 0] },
                                board: { $arrayElemAt: ["$boardInfo.boardCourse", 0] },
                                course: { $arrayElemAt: ["$courseInfo.courseName", 0] },
                                centreName: { $arrayElemAt: ["$centreInfo.centreName", 0] },
                                source: "$source"
                            }
                        }
                    ],
                    "scheduledCounts": [
                        { $match: { ...leadOwnerMatch, ...(Object.keys(scheduledDateFilter).length > 0 ? { nextFollowUpDate: scheduledDateFilter } : {}) } },
                        {
                            $group: {
                                _id: null,
                                totalScheduled: { $sum: 1 }
                            }
                        }
                    ],
                    "scheduledList": [
                        { $match: { ...leadOwnerMatch, ...(Object.keys(scheduledDateFilter).length > 0 ? { nextFollowUpDate: scheduledDateFilter } : {}) } },
                        { $sort: { nextFollowUpDate: 1 } },
                        { $limit: 500 },
                        { $lookup: { from: "classes", localField: "className", foreignField: "_id", as: "classInfo" } },
                        { $lookup: { from: "boards", localField: "board", foreignField: "_id", as: "boardInfo" } },
                        { $lookup: { from: "courses", localField: "course", foreignField: "_id", as: "courseInfo" } },
                        { $lookup: { from: "centreschemas", localField: "centre", foreignField: "_id", as: "centreInfo" } },
                        {
                            $project: {
                                leadId: "$_id",
                                leadName: "$name",
                                phoneNumber: "$phoneNumber",
                                email: "$email",
                                status: "$leadType",
                                time: "$nextFollowUpDate",
                                updatedBy: "$leadResponsibility",
                                history: "$followUps",
                                className: { $arrayElemAt: ["$classInfo.name", 0] },
                                board: { $arrayElemAt: ["$boardInfo.boardCourse", 0] },
                                course: { $arrayElemAt: ["$courseInfo.courseName", 0] },
                                centreName: { $arrayElemAt: ["$centreInfo.centreName", 0] },
                                source: "$source"
                            }
                        }
                    ],
                    "previousPendingCounts": [
                        { $match: previousPendingMatch },
                        {
                            $group: {
                                _id: null,
                                totalPreviousPending: { $sum: 1 }
                            }
                        }
                    ],
                    "previousPendingList": [
                        { $match: previousPendingMatch },
                        { $sort: { nextFollowUpDate: 1 } },
                        { $limit: 500 },
                        { $lookup: { from: "classes", localField: "className", foreignField: "_id", as: "classInfo" } },
                        { $lookup: { from: "boards", localField: "board", foreignField: "_id", as: "boardInfo" } },
                        { $lookup: { from: "courses", localField: "course", foreignField: "_id", as: "courseInfo" } },
                        { $lookup: { from: "centreschemas", localField: "centre", foreignField: "_id", as: "centreInfo" } },
                        {
                            $project: {
                                leadId: "$_id",
                                leadName: "$name",
                                phoneNumber: "$phoneNumber",
                                email: "$email",
                                status: "$leadType",
                                time: "$nextFollowUpDate",
                                updatedBy: "$leadResponsibility",
                                history: "$followUps",
                                className: { $arrayElemAt: ["$classInfo.name", 0] },
                                board: { $arrayElemAt: ["$boardInfo.boardCourse", 0] },
                                course: { $arrayElemAt: ["$courseInfo.courseName", 0] },
                                centreName: { $arrayElemAt: ["$centreInfo.centreName", 0] },
                                source: "$source"
                            }
                        }
                    ],
                    "leadPopulation": [
                        { $match: leadOwnerMatch },
                        {
                            $group: {
                                _id: null,
                                totalLeads: { $sum: 1 },
                                hot: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                                warm: { $sum: { $cond: [{ $eq: ["$leadType", "WARM LEAD"] }, 1, 0] } },
                                cold: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                                neutral: { $sum: { $cond: [{ $eq: ["$leadType", "NEUTRAL LEAD"] }, 1, 0] } },
                                invalid: { $sum: { $cond: [{ $eq: ["$leadType", "INVALID LEAD"] }, 1, 0] } }
                            }
                        }
                    ]
                }
            }
        ]);

        const aC = stats[0].activityCounts[0] || {};
        const recentActivity = stats[0].recentActivity || [];
        const sC = stats[0].scheduledCounts[0] || {};
        const scheduledList = stats[0].scheduledList || [];
        const pC = stats[0].previousPendingCounts[0] || {};
        const previousPendingList = stats[0].previousPendingList || [];
        const lP = stats[0].leadPopulation[0] || {};

        // Count walk-ins tagged by the logged-in user today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const userId = req.user?.id || req.user?._id;

        const walkInsCountToday = await LeadManagement.countDocuments({
            walkInBy: userId,
            isWalkIn: true,
            walkInDate: { $gte: todayStart, $lte: todayEnd }
        });

        res.status(200).json({
            totalFollowUps: aC.totalFollowUps || 0,
            hotLeads: aC.hotLeads || 0,
            warmLeads: aC.warmLeads || 0,
            coldLeads: aC.coldLeads || 0,
            neutralLeads: aC.neutralLeads || 0,
            invalidLeads: aC.invalidLeads || 0,
            recentActivity,
            totalScheduled: sC.totalScheduled || 0,
            scheduledList,
            totalPreviousPending: pC.totalPreviousPending || 0,
            previousPendingList,
            leadPopulation: lP,
            walkInsCountToday
        });
    } catch (err) {
        console.error("Dashboard follow-up stats error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

