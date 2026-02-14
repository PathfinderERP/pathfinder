import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

/**
 * Get lead analysis grouped by centres and classes
 * Returns lead counts and follow-up counts for each centre
 */
export const getCentreLeadAnalysis = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const query = { isCounseled: { $ne: true } };

        // Handle date filtering
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Access Control
        const curUserRole = req.user.role?.toLowerCase();
        if (curUserRole !== 'superadmin' && curUserRole !== 'super admin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (!userDoc) return res.status(401).json({ message: "User not found" });

            if (userDoc.role === 'telecaller') {
                const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                query.leadResponsibility = { $regex: new RegExp(`^${escapedName}$`, "i") };
            }

            const userCentreIds = userDoc.centres || [];
            if (userCentreIds.length === 0) {
                return res.status(200).json([]);
            }
            query.centre = { $in: userCentreIds };
        }

        const analysis = await LeadManagement.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { centreId: "$centre", classId: "$className" },
                    leadCount: { $sum: 1 },
                    followUpCount: { $sum: { $size: { $ifNull: ["$followUps", []] } } }
                }
            },
            {
                $lookup: {
                    from: "centreschemas",
                    localField: "_id.centreId",
                    foreignField: "_id",
                    as: "centre"
                }
            },
            {
                $lookup: {
                    from: "classes",
                    localField: "_id.classId",
                    foreignField: "_id",
                    as: "class"
                }
            },
            { $unwind: { path: "$centre", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$class", preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: "$_id.centreId",
                    centreName: { $first: { $ifNull: ["$centre.centreName", "Unknown Center"] } },
                    totalLeads: { $sum: "$leadCount" },
                    totalFollowUps: { $sum: "$followUpCount" },
                    classBreakdown: {
                        $push: {
                            className: { $ifNull: ["$class.name", "Unknown Class"] },
                            leads: "$leadCount",
                            followUps: "$followUpCount"
                        }
                    }
                }
            },
            { $sort: { totalLeads: -1 } }
        ]);

        res.status(200).json(analysis);
    } catch (err) {
        console.error("Centre analysis error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
