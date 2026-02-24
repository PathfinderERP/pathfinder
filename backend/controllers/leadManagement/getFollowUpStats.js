import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

export const getFollowUpStats = async (req, res) => {
    try {
        const { fromDate, toDate, centre, leadResponsibility, scheduledDate, startTime, endTime } = req.query;
        const curUserRole = req.user.role?.toLowerCase();

        // 1. Resolve potential telecaller names (handling arrays or single strings)
        let telecallerNames = [];
        if (leadResponsibility) {
            const namesToSearch = Array.isArray(leadResponsibility) ? leadResponsibility : [leadResponsibility];
            // Match exactly or via regex for safety, ensuring we get normalized names
            const users = await User.find({ name: { $in: namesToSearch.map(n => new RegExp(`^${n}$`, "i")) } });
            telecallerNames = users.length > 0 ? users.map(u => u.name) : namesToSearch;
        }

        // 2. Resolve Centre IDs
        let centreIds = [];
        if (centre) {
            const cRaw = Array.isArray(centre) ? centre : [centre];
            centreIds = cRaw.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
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
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            scheduledDateFilter.$gte = today;
            scheduledDateFilter.$lt = tomorrow;
        }

        // 4. Access Control & Base Matches
        const baseMatch = { isCounseled: { $ne: true } };

        // Everyone (even superadmin) should respect the specific filters passed from UI
        if (centreIds.length > 0) baseMatch.centre = { $in: centreIds };

        // This is key: Lead owner filter vs Activity filter
        const leadOwnerMatch = { ...baseMatch };
        if (telecallerNames.length > 0) {
            leadOwnerMatch.leadResponsibility = { $in: telecallerNames };
        }

        // Non-Admin access restriction
        if (!['superadmin', 'super admin', 'admin'].includes(curUserRole)) {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (userDoc) {
                const userCentres = (userDoc.centres || []).map(id => id.toString());
                const accessLimit = { $or: [{ createdBy: userDoc._id }, { centre: { $in: userCentres.map(id => new mongoose.Types.ObjectId(id)) } }] };

                if (userDoc.role === 'telecaller') {
                    accessLimit.$or.push({ leadResponsibility: { $regex: new RegExp(`^${userDoc.name}$`, "i") } });
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
                    // Branch A: Recorded Activity (Who CALLED - filters by followUps.updatedBy)
                    "activityStats": [
                        { $match: baseMatch }, // Respect centre/access filters
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
                                ...(telecallerNames.length > 0 ? { "followUp.updatedBy": { $in: telecallerNames } } : {})
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalFollowUps: { $sum: 1 },
                                hotLeads: { $sum: { $cond: [{ $in: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, ["HOT LEAD", "ADMISSION TAKEN"]] }, 1, 0] } },
                                coldLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "COLD LEAD"] }, 1, 0] } },
                                negativeLeads: { $sum: { $cond: [{ $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "NEGATIVE"] }, 1, 0] } },
                                recentActivity: {
                                    $push: {
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
                    // Branch B: Scheduled Tasks (Who is RESPONSIBLE - filters by leadResponsibility)
                    "scheduledStats": [
                        { $match: { ...leadOwnerMatch, nextFollowUpDate: scheduledDateFilter } },
                        {
                            $group: {
                                _id: null,
                                totalScheduled: { $sum: 1 },
                                scheduledList: {
                                    $push: {
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
                    // Branch C: Filtered Lead Population (Current status of leads matching search)
                    "leadPopulation": [
                        { $match: leadOwnerMatch },
                        {
                            $group: {
                                _id: null,
                                totalLeads: { $sum: 1 },
                                hot: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                                cold: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                                negative: { $sum: { $cond: [{ $eq: ["$leadType", "NEGATIVE"] }, 1, 0] } }
                            }
                        }
                    ]
                }
            }
        ]);

        const aS = stats[0].activityStats[0] || {};
        const sS = stats[0].scheduledStats[0] || {};
        const lP = stats[0].leadPopulation[0] || {};

        res.status(200).json({
            totalFollowUps: aS.totalFollowUps || 0,
            hotLeads: aS.hotLeads || 0,
            coldLeads: aS.coldLeads || 0,
            negativeLeads: aS.negativeLeads || 0,
            recentActivity: aS.recentActivity || [],
            totalScheduled: sS.totalScheduled || 0,
            scheduledList: sS.scheduledList || [],
            leadPopulation: lP
        });
    } catch (err) {
        console.error("Dashboard follow-up stats error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
