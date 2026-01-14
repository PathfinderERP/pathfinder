import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import mongoose from "mongoose";

export const getLeadDashboardStats = async (req, res) => {
    try {
        const { search, centre, course, leadResponsibility, fromDate, toDate } = req.query;
        
        // Build base query
        const query = {};

        // Date filter
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) query.createdAt.$lte = new Date(toDate);
        }

        // Search by student name
        if (search) {
            query.name = { $regex: search, $options: "i" };
        }

        // Centre filter
        if (centre) {
            query.centre = mongoose.Types.ObjectId.isValid(centre) ? new mongoose.Types.ObjectId(centre) : centre;
        }

        // Course filter
        if (course) {
            query.course = mongoose.Types.ObjectId.isValid(course) ? new mongoose.Types.ObjectId(course) : course;
        }

        // Telecaller filter (leadResponsibility)
        if (leadResponsibility) {
            query.leadResponsibility = leadResponsibility;
        }

        // Access Control (Same as getLeads.js)
        if (req.user.role !== 'superAdmin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (!userDoc) return res.status(401).json({ message: "User not found" });

            if (userDoc.role === 'telecaller') {
                query.leadResponsibility = userDoc.name;
            }

            const userCentreIds = userDoc.centres || [];
            if (userCentreIds.length === 0) {
                return res.status(200).json({
                    summary: { totalLeads: 0, hotLeads: 0, coldLeads: 0, negativeLeads: 0 },
                    telecallers: [],
                    nextCalls: []
                });
            }

            if (centre) {
                if (!userCentreIds.map(c => c.toString()).includes(centre)) {
                    return res.status(403).json({ message: "Access denied to this centre" });
                }
            } else {
                query.centre = { $in: userCentreIds };
            }
        }

        // Total Counts Aggregation
        const summary = await LeadManagement.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalLeads: { $sum: 1 },
                    hotLeads: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                    coldLeads: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                    negativeLeads: { $sum: { $cond: [{ $eq: ["$leadType", "NEGATIVE"] }, 1, 0] } }
                }
            }
        ]);

        // Telecaller Performance Aggregation
        const telecallers = await LeadManagement.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$leadResponsibility",
                    totalLeads: { $sum: 1 },
                    hotLeads: { $sum: { $cond: [{ $eq: ["$leadType", "HOT LEAD"] }, 1, 0] } },
                    coldLeads: { $sum: { $cond: [{ $eq: ["$leadType", "COLD LEAD"] }, 1, 0] } },
                    negativeLeads: { $sum: { $cond: [{ $eq: ["$leadType", "NEGATIVE"] }, 1, 0] } },
                    totalFollowUps: { $sum: { $size: { $ifNull: ["$followUps", []] } } }
                }
            },
            { $sort: { totalLeads: -1 } }
        ]);

        // Next Calls (Upcoming follow-ups)
        const nextCalls = await LeadManagement.find({
            ...query,
            nextFollowUpDate: { $gte: new Date() }
        })
        .select('name phoneNumber nextFollowUpDate leadType leadResponsibility')
        .sort({ nextFollowUpDate: 1 })
        .limit(20);

        res.status(200).json({
            summary: summary[0] || { totalLeads: 0, hotLeads: 0, coldLeads: 0, negativeLeads: 0 },
            telecallers,
            nextCalls
        });

    } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
