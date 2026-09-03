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
        const rawRole = req.user.role || "";
        const userRole = rawRole.toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRole === "superadmin" || userRole === "admin" || userRole === "ceo" || userRole.includes("admin") || rawRole === "superAdmin";
        const isDigital = userRole === "digital" || userRole === "digitalmarketing" || userRole.includes("digital");

        if (!isSuperAdmin && !isDigital) {
            return res.status(403).json({ message: "Access denied. SuperAdmin, Admin, or Digital role required." });
        }

        const { date, centreName, targetAmount } = req.body;

        if (!date || !centreName || targetAmount === undefined) {
            return res.status(400).json({ message: "Missing required fields: date, centreName, targetAmount" });
        }

        const cleanDate = typeof date === "string" ? (date.includes("T") ? date.split("T")[0] : date) : new Date(date).toISOString().split("T")[0];
        const targetDate = new Date(`${cleanDate}T00:00:00+05:30`);

        // Escape regex special chars and allow leading/trailing whitespace in DB centreName field
        const cleanName = centreName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const centreDoc = await Centre.findOne({ centreName: { $regex: new RegExp(`^\\s*${cleanName}\\s*$`, "i") } });
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

export const saveBulkDailyTargets = async (req, res) => {
    try {
        const rawRole = req.user.role || "";
        const userRole = rawRole.toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRole === "superadmin" || userRole === "admin" || userRole === "ceo" || userRole.includes("admin") || rawRole === "superAdmin";
        const isDigital = userRole === "digital" || userRole === "digitalmarketing" || userRole.includes("digital");

        if (!isSuperAdmin && !isDigital) {
            return res.status(403).json({ message: "Access denied. SuperAdmin, Admin, or Digital role required." });
        }

        const { date, dates, targets } = req.body;

        const dateList = Array.isArray(dates) && dates.length > 0 
            ? dates 
            : (date ? [date] : []);

        if (dateList.length === 0 || !Array.isArray(targets) || targets.length === 0) {
            return res.status(400).json({ message: "Missing required fields: date/dates and non-empty targets array" });
        }

        // Preload all centres to map names/ids quickly
        const allCentres = await Centre.find({}).select("_id centreName");
        const centreMapByName = new Map();
        const centreMapById = new Map();
        allCentres.forEach(c => {
            if (c.centreName) {
                centreMapByName.set(c.centreName.trim().toUpperCase(), c._id);
            }
            centreMapById.set(c._id.toString(), c._id);
        });

        const bulkOps = [];
        for (const rawDate of dateList) {
            const cleanDate = typeof rawDate === "string" ? (rawDate.includes("T") ? rawDate.split("T")[0] : rawDate) : new Date(rawDate).toISOString().split("T")[0];
            const targetDate = new Date(`${cleanDate}T00:00:00+05:30`);

            for (const item of targets) {
                const targetAmount = Number(item.targetAmount);
                if (isNaN(targetAmount)) continue;

                let resolvedCentreId = null;
                if (item.centreId && centreMapById.has(item.centreId.toString())) {
                    resolvedCentreId = centreMapById.get(item.centreId.toString());
                } else if (item.centreName && centreMapByName.has(item.centreName.trim().toUpperCase())) {
                    resolvedCentreId = centreMapByName.get(item.centreName.trim().toUpperCase());
                }

                if (!resolvedCentreId) continue;

                bulkOps.push({
                    updateOne: {
                        filter: { centre: resolvedCentreId, date: targetDate },
                        update: {
                            $set: {
                                targetAmount,
                                createdBy: req.user.id || req.user._id
                            }
                        },
                        upsert: true
                    }
                });
            }
        }

        if (bulkOps.length === 0) {
            return res.status(400).json({ message: "No valid targets found to save" });
        }

        await DailyTarget.bulkWrite(bulkOps);

        return res.status(200).json({
            message: `Successfully saved daily targets for ${targets.length} centres across ${dateList.length} date(s)`,
            count: bulkOps.length
        });
    } catch (error) {
        console.error("Save bulk daily targets error:", error);
        return res.status(500).json({ message: "Unable to save bulk daily targets.", error: error.message });
    }
};

