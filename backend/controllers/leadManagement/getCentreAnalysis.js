import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

/**
 * Get lead analysis grouped by centres and classes
 * Returns lead counts and follow-up counts for each centre
 */
export const getCentreLeadAnalysis = async (req, res) => {
    try {
        const { fromDate, toDate, centre, leadResponsibility } = req.query;
        const query = { isCounseled: { $ne: true } };

        // 1. Resolve potential telecaller names
        let telecallerNames = [];
        if (leadResponsibility) {
            const namesToSearch = Array.isArray(leadResponsibility) ? leadResponsibility : [leadResponsibility];
            // Resolve names to ensure case consistency
            const users = await User.find({ name: { $in: namesToSearch.map(n => new RegExp(`^${n}$`, "i")) } });
            telecallerNames = users.length > 0 ? users.map(u => u.name) : namesToSearch;
            query.leadResponsibility = { $in: telecallerNames };
        }

        // 2. Resolve Centre IDs
        if (centre) {
            const rawCentres = Array.isArray(centre) ? centre : [centre];
            query.centre = { $in: rawCentres.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id) };
        }

        // Handle date filtering",
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
        if (curUserRole !== 'superadmin' && curUserRole !== 'super admin' && curUserRole !== 'admin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (!userDoc) return res.status(401).json({ message: "User not found" });

            if (userDoc.role === 'telecaller') {
                const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Ensure telecaller can only see their own leads, even if they try to filter for someone else
                query.leadResponsibility = { $regex: new RegExp(`^${escapedName}$`, "i") };
            }

            const userCentreIds = userDoc.centres || [];
            if (userCentreIds.length === 0) return res.status(200).json([]);

            // Intersection of requested centres and allowed centres
            if (query.centre) {
                const allowedStrings = userCentreIds.map(id => id.toString());
                const requested = (query.centre.$in || []).filter(id => allowedStrings.includes(id.toString()));
                query.centre = { $in: requested.length > 0 ? requested : userCentreIds };
            } else {
                query.centre = { $in: userCentreIds };
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
