import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

export const getFollowUpStats = async (req, res) => {
    try {
        const { fromDate, toDate, centre, leadResponsibility } = req.query;

        // Base match for the Lead entries
        const baseMatch = {};

        // Date filter for the follow-up entries
        const dateFilter = {};
        if (fromDate || toDate) {
            if (fromDate) dateFilter.$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                dateFilter.$lte = end;
            }
        } else {
            // Default to today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateFilter.$gte = today;
            dateFilter.$lt = tomorrow;
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

        const stats = await LeadManagement.aggregate([
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
                    "followUp.date": dateFilter,
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
                                1,
                                0
                            ]
                        }
                    },
                    coldLeads: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "COLD LEAD"] },
                                1,
                                0
                            ]
                        }
                    },
                    negativeLeads: {
                        $sum: {
                            $cond: [
                                { $eq: [{ $toUpper: { $ifNull: ["$followUp.status", "$leadType"] } }, "NEGATIVE"] },
                                1,
                                0
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
            },
            {
                $project: {
                    _id: 0,
                    totalFollowUps: 1,
                    hotLeads: 1,
                    coldLeads: 1,
                    negativeLeads: 1,
                    recentActivity: 1 // Full list for frontend filtering/modals
                }
            }
        ]);

        const result = stats[0] || {
            totalFollowUps: 0,
            hotLeads: 0,
            coldLeads: 0,
            negativeLeads: 0,
            recentActivity: []
        };

        result.recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.status(200).json(result);

    } catch (err) {
        console.error("Error fetching follow-up stats:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
