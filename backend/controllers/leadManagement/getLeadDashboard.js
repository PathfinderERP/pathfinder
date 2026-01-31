import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import Boards from "../../models/Master_data/Boards.js";
import Course from "../../models/Master_data/Courses.js";
import mongoose from "mongoose";

export const getLeadDashboardStats = async (req, res) => {
    try {
        const { search, centre, course, leadResponsibility, fromDate, toDate, leadType, board, className } = req.query;

        // Build base query
        const query = {};

        if (leadType) query.leadType = Array.isArray(leadType) ? { $in: leadType } : leadType;
        if (course) query.course = mongoose.Types.ObjectId.isValid(course) ? new mongoose.Types.ObjectId(course) : course;
        if (board) query.board = mongoose.Types.ObjectId.isValid(board) ? new mongoose.Types.ObjectId(board) : board;
        if (className) query.className = mongoose.Types.ObjectId.isValid(className) ? new mongoose.Types.ObjectId(className) : className;

        // Date filter
        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) {
                const end = new Date(toDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Search by student name
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phoneNumber: { $regex: search, $options: "i" } }
            ];
        }

        // Feedback filter - Check if the latest follow-up's feedback matches
        if (req.query.feedback) {
            query.followUps = {
                $elemMatch: { feedback: { $regex: req.query.feedback, $options: "i" } }
            };
        }

        // Centre filter
        if (centre) {
            query.centre = mongoose.Types.ObjectId.isValid(centre) ? new mongoose.Types.ObjectId(centre) : centre;
        }


        // Telecaller filter (leadResponsibility) - Using Regex as requested
        if (leadResponsibility) {
            query.leadResponsibility = { $regex: leadResponsibility, $options: "i" };
        }

        // Exclude counseled leads from dashboard stats to match lead list logic
        query.isCounseled = { $ne: true };

        // Access Control (Same as getLeads.js)
        if (req.user.role !== 'superAdmin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (!userDoc) return res.status(401).json({ message: "User not found" });

            if (userDoc.role === 'telecaller') {
                const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                query.leadResponsibility = { $regex: new RegExp(`^${escapedName}$`, "i") };
            }

            const userCentreIds = userDoc.centres || [];
            if (userCentreIds.length === 0) {
                return res.status(200).json({
                    summary: { totalLeads: 0, hotLeads: 0, coldLeads: 0, negativeLeads: 0 },
                    telecallers: [],
                    nextCalls: [],
                    dailyLeads: []
                });
            }

            if (centre) {
                if (!userCentreIds.map(c => c.toString()).includes(centre)) {
                    return res.status(403).json({ message: "Access denied to this centre" });
                }
                // Fix: Actually apply the centre filter!
                query.centre = mongoose.Types.ObjectId.isValid(centre) ? new mongoose.Types.ObjectId(centre) : centre;
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
            .populate('course', 'courseName')
            .sort({ nextFollowUpDate: 1 })
            .limit(20);

        // Daily Leads Trend (Last 30 Days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const dailyLeads = await LeadManagement.aggregate([
            {
                $match: {
                    ...query,
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing dates with 0
        const filledDailyLeads = [];
        for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const found = dailyLeads.find(item => item._id === dateStr);
            filledDailyLeads.push({
                date: dateStr,
                count: found ? found.count : 0
            });
        }

        res.status(200).json({
            summary: summary[0] || { totalLeads: 0, hotLeads: 0, coldLeads: 0, negativeLeads: 0 },
            telecallers,
            nextCalls,
            dailyLeads: filledDailyLeads
        });

    } catch (err) {
        console.error("Dashboard stats error:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
