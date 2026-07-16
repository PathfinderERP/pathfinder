import { getDailyCollectionReportData } from "../../services/dailyCollectionService.js";
import { getCache, setCache, generateCacheKey } from "../../utils/redisCache.js";
import Centre from "../../models/Master_data/Centre.js";
import DailyTarget from "../../models/Sales/DailyTarget.js";

export const getDailyCollectionReport = async (req, res) => {
    try {
        console.log("Daily Collection query:", req.query);
        const reportData = await getDailyCollectionReportData({ query: req.query, user: req.user });
        return res.status(200).json(reportData);
    } catch (error) {
        console.error("Daily collection report error:", error);
        return res.status(500).json({ message: "Unable to fetch daily collection report." });
    }
};

export const saveDailyTarget = async (req, res) => {
    try {
        const userRole = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        if (userRole !== "superadmin") {
            return res.status(403).json({ message: "Access denied. SuperAdmin only." });
        }

        const { date, centreName, targetAmount } = req.body;

        if (!date || !centreName || targetAmount === undefined) {
            return res.status(400).json({ message: "Missing required fields: date, centreName, targetAmount" });
        }

        // Set hours to midnight UTC or local time? 
        // Start of day logic should match the query retrieval logic.
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        // Find centre
        const centreDoc = await Centre.findOne({ centreName: { $regex: new RegExp(`^${centreName.trim()}$`, "i") } });
        if (!centreDoc) {
            return res.status(404).json({ message: `Centre '${centreName}' not found` });
        }

        // Upsert daily target
        const dailyTarget = await DailyTarget.findOneAndUpdate(
            { centre: centreDoc._id, date: targetDate },
            { 
                targetAmount: Number(targetAmount),
                createdBy: req.user.id || req.user._id
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            message: "Daily target saved successfully",
            dailyTarget
        });
    } catch (error) {
        console.error("Save daily target error:", error);
        return res.status(500).json({ message: "Unable to save daily target.", error: error.message });
    }
};
