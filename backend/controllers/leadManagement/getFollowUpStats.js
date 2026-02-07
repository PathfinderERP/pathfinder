import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

export const getFollowUpStats = async (req, res) => {
    try {
        const { fromDate, toDate, centre, leadResponsibility, scheduledDate, startTime, endTime } = req.query;

        // Base match for the Lead entries (Access Control)
        const baseMatch = {};

        // 1. Date filter for RECORDED ACTIVITY (followUps.date)
        const activityDateFilter = {};
        if (fromDate || toDate) {
            if (fromDate) activityDateFilter.$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                activityDateFilter.$lte = end;
            }
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            activityDateFilter.$gte = today;
            activityDateFilter.$lt = tomorrow;
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
                        startMinutes - 330 // Adjusting for IST (UTC+5:30) if stored in UTC
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

        // 2. Date filter for SCHEDULED WORK (nextFollowUpDate)
        const scheduledDateFilter = {};
        if (scheduledDate) {
            const start = new Date(scheduledDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(scheduledDate);
            end.setHours(23, 59, 59, 999);
            scheduledDateFilter.$gte = start;
            scheduledDateFilter.$lte = end;
        } else {
            // Default scheduled to today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            scheduledDateFilter.$gte = today;
            scheduledDateFilter.$lt = tomorrow;
        }

        // Access Control
        if (req.user.role !== 'superAdmin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (!userDoc) return res.status(401).json({ message: "User not found" });

            if (userDoc.role === 'telecaller') {
                const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                baseMatch.leadResponsibility = { $regex: new RegExp(`^${escapedName}$`, "i") };
            } else {
                const userCentreIds = userDoc.centres || [];
                if (centre) {
                    baseMatch.centre = new mongoose.Types.ObjectId(centre);
                } else {
                    baseMatch.centre = { $in: userCentreIds };
                }
            }
        } else {
            if (centre) baseMatch.centre = new mongoose.Types.ObjectId(centre);
            if (leadResponsibility) baseMatch.leadResponsibility = { $regex: new RegExp(`^${leadResponsibility}$`, "i") };
        }

        // REFINED AGGREGATION: Faceted approach for Recorded vs Scheduled
        const stats = await LeadManagement.aggregate([
            { $match: baseMatch },
            {
                $facet: {
                    // Branch A: Recorded Activity (Unwinding followUps)
                    "activityStats": [
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
                                "followUp.date": activityDateFilter,
                                ...timeMatch,
                                ...(leadResponsibility ? { "leadResponsibility": { $regex: new RegExp(`^${leadResponsibility}$`, "i") } } : {})
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalFollowUps: { $sum: 1 },
                                hotLeads: {
                                    $sum: {
                                        $cond: [
                                            { $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "HOT LEAD"] },
                                            1, 0
                                        ]
                                    }
                                },
                                coldLeads: {
                                    $sum: {
                                        $cond: [
                                            { $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "COLD LEAD"] },
                                            1, 0
                                        ]
                                    }
                                },
                                negativeLeads: {
                                    $sum: {
                                        $cond: [
                                            { $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "NEGATIVE"] },
                                            1, 0
                                        ]
                                    }
                                },
                                recentActivity: {
                                    $push: {
                                        leadName: "$name",
                                        phoneNumber: "$phoneNumber",
                                        email: "$email",
                                        feedback: "$followUp.feedback",
                                        remarks: "$followUp.remarks",
                                        status: { $ifNull: ["$followUp.status", "$leadType"] },
                                        time: "$followUp.date",
                                        updatedBy: { $ifNull: ["$followUp.updatedBy", "Unknown"] },
                                        callDuration: "$followUp.callDuration"
                                    }
                                }
                            }
                        }
                    ],
                    // Branch B: Scheduled Follow-ups (Matching nextFollowUpDate)
                    "scheduledStats": [
                        { $match: { nextFollowUpDate: scheduledDateFilter } },
                        {
                            $project: {
                                name: 1,
                                phoneNumber: 1,
                                email: 1,
                                leadType: 1,
                                leadResponsibility: 1,
                                nextFollowUpDate: 1,
                                followUps: { $slice: ["$followUps", -1] } // Get last feedback for context
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalScheduled: { $sum: 1 },
                                scheduledList: {
                                    $push: {
                                        leadName: "$name",
                                        phoneNumber: "$phoneNumber",
                                        email: "$email",
                                        status: "$leadType",
                                        time: "$nextFollowUpDate",
                                        feedback: { $arrayElemAt: ["$followUps.feedback", 0] },
                                        updatedBy: "$leadResponsibility"
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ]);

        // Process faceted results
        const rawActivity = stats[0].activityStats[0] || {};
        const rawScheduled = stats[0].scheduledStats[0] || {};

        const result = {
            totalFollowUps: rawActivity.totalFollowUps || 0,
            hotLeads: rawActivity.hotLeads || 0,
            coldLeads: rawActivity.coldLeads || 0,
            negativeLeads: rawActivity.negativeLeads || 0,
            recentActivity: rawActivity.recentActivity || [],
            totalScheduled: rawScheduled.totalScheduled || 0,
            scheduledList: rawScheduled.scheduledList || []
        };

        // Sort both lists by date/time
        result.recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
        result.scheduledList.sort((a, b) => new Date(a.time) - new Date(b.time));

        res.status(200).json(result);

    } catch (err) {
        console.error("Error fetching follow-up stats:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
