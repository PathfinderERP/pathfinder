import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import { resolveAgentIdentifier } from "../../utils/leadQueryHelper.js";
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
        if (scheduledDate) {
            const start = new Date(scheduledDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(scheduledDate);
            end.setHours(23, 59, 59, 999);
            scheduledDateFilter.$gte = start;
            scheduledDateFilter.$lte = end;
        }

        // 4. Access Control & Base Matches
        const baseMatch = { isCounseled: { $ne: true } };

        if (centreIds.length > 0) baseMatch.centre = { $in: centreIds };

        const leadOwnerMatch = { ...baseMatch };
        if (leadResponsibilityQuery.$or && leadResponsibilityQuery.$or.length > 0) {
            leadOwnerMatch.$and = leadOwnerMatch.$and || [];
            leadOwnerMatch.$and.push(leadResponsibilityQuery);
        }

        const curUserRoleStr = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const privilegedRoles = ['superadmin', 'super admin', 'admin', 'centerincharge', 'zonalmanager', 'hr', 'class_coordinator', 'rm', 'hod'];
        const isPrivileged = privilegedRoles.includes(curUserRoleStr);

        if (curUserRoleStr !== 'superadmin' && curUserRoleStr !== 'super admin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (userDoc) {
                const userCentreIds = userDoc.centres || [];
                const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                const accessLimit = {
                    $or: [
                        { createdBy: userDoc._id },
                        { leadResponsibility: { $regex: new RegExp(`^${escapedName}$`, "i") } }
                    ]
                };

                if (isPrivileged && userCentreIds.length > 0) {
                    accessLimit.$or.push({ centre: { $in: userCentreIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id) } });
                }

                if (leadResponsibilityQuery.$or && leadResponsibilityQuery.$or.length > 0 && !isPrivileged) {
                    const filterNames = Array.isArray(leadResponsibility) ? leadResponsibility : [leadResponsibility];
                    const isFilteringSelf = filterNames.some(n => n.toLowerCase().trim() === userDoc.name.toLowerCase().trim());
                    if (!isFilteringSelf) {
                        leadResponsibilityQuery.$or = [
                            { leadResponsibility: { $regex: new RegExp(`^${escapedName}$`, "i") } }
                        ];
                    }
                }

                leadOwnerMatch.$and = leadOwnerMatch.$and || [];
                leadOwnerMatch.$and.push(accessLimit);

                baseMatch.$and = baseMatch.$and || [];
                baseMatch.$and.push(accessLimit);
            }
        }

        const stats = await LeadManagement.aggregate([
            {
                $facet: {
                    "activityStats": [
                        { $match: baseMatch },
                        { $unwind: "$followUps" },
                        {
                            $project: {
                                name: 1,
                                followUp: "$followUps",
                                leadType: 1,
                                leadResponsibility: 1,
                                phoneNumber: 1,
                                email: 1
                            }
                        },
                        {
                            $match: {
                                ...(Object.keys(activityDateFilter).length > 0 ? { "followUp.date": activityDateFilter } : {}),
                                ...timeMatch,
                                ...(followUpUserQuery.$or && followUpUserQuery.$or.length > 0 ? followUpUserQuery : {})
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalFollowUps: { $sum: 1 },
                                hotLeads: { $sum: { $cond: [{ $in: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, ["HOT LEAD", "ADMISSION TAKEN"]] }, 1, 0] } },
                                warmLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "WARM LEAD"] }, 1, 0] } },
                                coldLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "COLD LEAD"] }, 1, 0] } },
                                neutralLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "NEUTRAL LEAD"] }, 1, 0] } },
                                recentActivity: {
                                    $push: {
                                        leadId: "$_id",
                                        leadName: "$name",
                                        phoneNumber: "$phoneNumber",
                                        status: { $ifNull: ["$followUp.status", "$leadType"] },
                                        time: "$followUp.date",
                                        updatedBy: "$followUp.updatedBy",
                                        feedback: "$followUp.feedback"
                                    }
                                }
                            }
                        }
                    ],
                    "scheduledStats": [
                        { $match: { ...leadOwnerMatch, ...(Object.keys(scheduledDateFilter).length > 0 ? { nextFollowUpDate: scheduledDateFilter } : {}) } },
                        {
                            $group: {
                                _id: null,
                                totalScheduled: { $sum: 1 },
                                scheduledList: {
                                    $push: {
                                        leadId: "$_id",
                                        leadName: "$name",
                                        phoneNumber: "$phoneNumber",
                                        status: "$leadType",
                                        time: "$nextFollowUpDate",
                                        updatedBy: "$leadResponsibility"
                                    }
                                }
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
                                neutral: { $sum: { $cond: [{ $eq: ["$leadType", "NEUTRAL LEAD"] }, 1, 0] } }
                            }
                        }
                    ]
                }
            }
        ]);

        const aS = stats[0].activityStats[0] || {};
        const sS = stats[0].scheduledStats[0] || {};
        const lP = stats[0].leadPopulation[0] || {};

        // Increased limit to 500 to cover most cases while maintaining performance
        const recentActivity = (aS.recentActivity || [])
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 500);

        const scheduledList = (sS.scheduledList || [])
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            .slice(0, 500);

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
            totalFollowUps: aS.totalFollowUps || 0,
            hotLeads: aS.hotLeads || 0,
            warmLeads: aS.warmLeads || 0,
            coldLeads: aS.coldLeads || 0,
            neutralLeads: aS.neutralLeads || 0,
            recentActivity,
            totalScheduled: sS.totalScheduled || 0,
            scheduledList,
            leadPopulation: lP,
            walkInsCountToday
        });
    } catch (err) {
        console.error("Dashboard follow-up stats error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

