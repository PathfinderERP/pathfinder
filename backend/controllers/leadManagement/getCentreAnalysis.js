import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import mongoose from "mongoose";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";

/**
 * Get lead analysis grouped by centres and classes
 * Returns lead counts and follow-up counts for each centre
 */
export const getCentreLeadAnalysis = async (req, res) => {
    try {
        const query = await buildLeadQuery(req.query, req.user);

        // Access Control (Extra check for non-privileged)
        const curUserRole = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const privilegedRoles = ['superadmin', 'super admin', 'admin', 'centerincharge', 'zonalmanager', 'zonalhead', 'hr', 'class_coordinator', 'rm', 'hod'];
        const isPrivileged = privilegedRoles.includes(curUserRole);

        if (curUserRole !== 'superadmin' && curUserRole !== 'super admin') {
            if (!isPrivileged) {
                return res.status(200).json([]);
            }
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
