import SystemLog from "../models/SystemLog.js";

export const getSystemLogs = async (req, res) => {
    try {
        const { module, action, userName, startDate, endDate, page = 1, limit = 50 } = req.query;
        
        const query = {};
        if (module) query.module = module;
        if (action) query.action = { $regex: action, $options: 'i' };
        if (userName) query.userName = { $regex: userName, $options: 'i' };
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const logs = await SystemLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user', 'name email role');
            
        const total = await SystemLog.countDocuments(query);
        
        res.status(200).json({
            logs,
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error("Error fetching system logs:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getLogStats = async (req, res) => {
    try {
        // 1. Module Distribution (for Pie Chart)
        const moduleStats = await SystemLog.aggregate([
            { $group: { _id: "$module", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 }
        ]);
        
        // 2. Risk Distribution (for Bar Chart)
        const riskStats = await SystemLog.aggregate([
            { $group: { _id: "$riskLevel", count: { $sum: 1 } } }
        ]);

        // 3. Activity Trend (last 7 days - for Area Chart)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const trendStats = await SystemLog.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    total: { $sum: 1 },
                    highRisk: { $sum: { $cond: [{ $eq: ["$riskLevel", "high"] }, 1, 0] } }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // 4. Top Users (for Bar Chart)
        const topUsers = await SystemLog.aggregate([
            { $group: { _id: "$userName", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        
        res.status(200).json({ 
            moduleStats, 
            riskStats, 
            trendStats, 
            topUsers 
        });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deleteMultipleLogs = async (req, res) => {
    try {
        const { logIds } = req.body;
        if (!logIds || !Array.isArray(logIds)) {
            return res.status(400).json({ message: "Invalid log IDs provided" });
        }
        
        await SystemLog.deleteMany({ _id: { $in: logIds } });
        res.status(200).json({ message: `Successfully deleted ${logIds.length} logs` });
    } catch (error) {
        res.status(500).json({ message: "Error deleting logs", error: error.message });
    }
};
