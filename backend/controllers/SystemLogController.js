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
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        const skip = (page - 1) * limit;
        
        const logs = await SystemLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user', 'name email role');
            
        const total = await SystemLog.countDocuments(query);
        
        res.status(200).json({
            logs,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error("Error fetching system logs:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getLogStats = async (req, res) => {
    try {
        const stats = await SystemLog.aggregate([
            {
                $group: {
                    _id: "$module",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        const userStats = await SystemLog.aggregate([
            {
                $group: {
                    _id: "$userName",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        res.status(200).json({ moduleStats: stats, topUsers: userStats });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
