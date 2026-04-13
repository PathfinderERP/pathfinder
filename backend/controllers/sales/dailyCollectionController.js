import { getDailyCollectionReportData } from "../../services/dailyCollectionService.js";

export const getDailyCollectionReport = async (req, res) => {
    try {
        const reportData = await getDailyCollectionReportData({ query: req.query, user: req.user });
        return res.status(200).json(reportData);
    } catch (error) {
        console.error("Daily collection report error:", error);
        return res.status(500).json({ message: "Unable to fetch daily collection report." });
    }
};
