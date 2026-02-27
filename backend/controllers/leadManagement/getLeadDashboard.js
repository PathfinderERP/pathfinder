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

        if (course) {
            const courseIds = Array.isArray(course) ? course : [course];
            query.course = { $in: courseIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id) };
        }
        if (board) {
            const boardIds = Array.isArray(board) ? board : [board];
            query.board = { $in: boardIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id) };
        }
        if (className) {
            const classIds = Array.isArray(className) ? className : [className];
            query.className = { $in: classIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id) };
        }

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
            const feedbackArr = Array.isArray(req.query.feedback) ? req.query.feedback : [req.query.feedback];
            query.followUps = {
                $elemMatch: { feedback: { $in: feedbackArr } }
            };
        }

        // Centre filter
        if (centre) {
            const centreIds = Array.isArray(centre) ? centre : [centre];
            query.centre = { $in: centreIds.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id) };
        }


        // Telecaller filter (leadResponsibility)
        if (leadResponsibility) {
            query.leadResponsibility = Array.isArray(leadResponsibility)
                ? { $in: leadResponsibility }
                : { $regex: leadResponsibility, $options: "i" };
        }

        // Exclude counseled leads from dashboard stats to match lead list logic
        query.isCounseled = { $ne: true };

        // Access Control (Sync with getLeads.js)
        if (req.user.role !== 'superAdmin') {
            const userDoc = await User.findById(req.user.id).select('centres role name');
            if (!userDoc) return res.status(401).json({ message: "User not found" });

            const userCentreIds = userDoc.centres || [];
            const orConditions = [
                { createdBy: userDoc._id }
            ];

            if (userDoc.role === 'telecaller') {
                const escapedName = userDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                orConditions.push({ leadResponsibility: { $regex: new RegExp(`^${escapedName}$`, "i") } });
            }

            if (userCentreIds.length > 0) {
                // If specific centre filter is requested, we apply it inside orConditions for relevant branches
                // But for simplicity and to match getLeads.js, we refine the main query with centre if provided.
                orConditions.push({ centre: { $in: userCentreIds } });
            }

            query.$and = query.$and || [];
            query.$and.push({ $or: orConditions });

            // Handle specific centre filter from query if requested
            if (centre) {
                const requestedCentres = Array.isArray(centre) ? centre : [centre];
                const validRequestedCentres = requestedCentres.filter(reqCentre =>
                    userCentreIds.some(allowedCentre => allowedCentre.toString() === reqCentre.toString())
                );
                query.centre = { $in: validRequestedCentres.map(id => mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : id) };
            } else {
                // Filter requested but none allowed, return 0 counts (via centre empty)
                query.centre = { $in: [] };
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
