import { getDailyCollectionReportData } from "../../services/dailyCollectionService.js";
import { getCache, setCache, generateCacheKey } from "../../utils/redisCache.js";

export const getDailyCollectionReport = async (req, res) => {
    try {
        // REDIS CACHING START
        const cacheKey = generateCacheKey("finance:daily_collection", {
            query: req.query,
            userId: req.user._id,
            role: req.user.role,
            centres: req.user.centres
        });

        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return res.status(200).json(cachedData);
        }
        // REDIS CACHING END

        const reportData = await getDailyCollectionReportData({ query: req.query, user: req.user });

        // Cache for 10 minutes
        await setCache(cacheKey, reportData, 600);

        return res.status(200).json(reportData);
    } catch (error) {
        console.error("Daily collection report error:", error);
        return res.status(500).json({ message: "Unable to fetch daily collection report." });
    }
};
