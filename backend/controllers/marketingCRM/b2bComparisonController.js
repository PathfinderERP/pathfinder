import B2BComparison from "../../models/MarketingCRM/B2BComparison.js";
import SchoolForTask from "../../models/Master_data/SchoolForTask.js";
import Centre from "../../models/Master_data/Centre.js";
import { syncB2BComparisonFromExcel } from "../../utils/seedB2BComparison.js";
import fs from "fs";

export const getB2BComparisonData = async (req, res) => {
    try {
        const {
            category,
            centerNames,
            priority,
            currentMockTieUp,
            visitedThisYear,
            hoHelpNeeded,
            search,
            page = 1,
            limit = 50,
            sortBy = "centerName",
            sortOrder = "asc"
        } = req.query;

        // Build base query
        const query = {};

        if (category && category !== "All") {
            const categories = typeof category === "string" ? category.split(",") : category;
            query.category = { $in: categories };
        }

        if (centerNames && centerNames !== "All") {
            const centres = typeof centerNames === "string" ? centerNames.split(",").map(c => c.trim()) : centerNames;
            query.centerName = { $in: centres.map(c => new RegExp(`^${c}$`, "i")) };
        }

        if (priority && priority !== "All") {
            const priorities = typeof priority === "string" ? priority.split(",") : priority;
            query.priority = { $in: priorities };
        }

        if (currentMockTieUp && currentMockTieUp !== "All") {
            const statuses = typeof currentMockTieUp === "string" ? currentMockTieUp.split(",") : currentMockTieUp;
            query.currentMockTieUp = { $in: statuses };
        }

        if (visitedThisYear && visitedThisYear !== "All") {
            query.visitedThisYear = visitedThisYear;
        }

        if (hoHelpNeeded && hoHelpNeeded !== "All") {
            query.hoHelpNeeded = hoHelpNeeded;
        }

        if (search) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [
                { schoolName: regex },
                { centerName: regex },
                { lastExecutive: regex },
                { nextAction: regex },
                { simpleInference: regex },
                { currentStatus: regex },
                { visitNotes: regex }
            ];
        }

        // Pagination & Export handling
        const isExportAll = limit === "all" || limit === "0" || req.query.exportAll === "true";
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = isExportAll ? 0 : Math.max(1, parseInt(limit, 10));
        const skip = isExportAll ? 0 : (pageNum - 1) * limitNum;

        // Sort configuration
        const sortConfig = {};
        sortConfig[sortBy] = sortOrder === "desc" ? -1 : 1;

        let queryBuilder = B2BComparison.find(query)
            .populate("schoolRef", "status schoolAccess tier board")
            .populate("centerRef", "centreName")
            .sort(sortConfig);

        if (!isExportAll) {
            queryBuilder = queryBuilder.skip(skip).limit(limitNum);
        }

        // Execute data fetch & KPIs in parallel
        const [
            records,
            totalFiltered,
            totalLostTieUps,
            totalNewTieUps,
            totalHighTurnoutNoVisit,
            totalP1Schools,
            totalPendingVisits,
            allDistinctCentres
        ] = await Promise.all([
            queryBuilder.lean(),
            B2BComparison.countDocuments(query),
            B2BComparison.countDocuments({ category: "Lost Tie-ups" }),
            B2BComparison.countDocuments({ category: "New Tie-ups" }),
            B2BComparison.countDocuments({ category: "High Turnout No Visit" }),
            B2BComparison.countDocuments({ category: "P1 Schools" }),
            B2BComparison.countDocuments({ category: "Pending Visits" }),
            B2BComparison.distinct("centerName")
        ]);

        // Enrich records with latest SchoolForTask status and dynamically correlate Mock Tie-Up
        const enrichedRecords = records.map(r => {
            const liveStatus = r.schoolRef?.status || r.currentStatus || "—";
            const isMockTieUp = Boolean(liveStatus && (/mock/i.test(liveStatus) || liveStatus === "MOCK TEST TIE-UP"));
            const liveMockTieUp = isMockTieUp ? "Confirmed" : "Not confirmed";
            return {
                ...r,
                liveStatus,
                currentMockTieUp: liveMockTieUp,
                liveMockTieUp
            };
        });

        // Summary metrics
        const summary = {
            totalRecords: totalLostTieUps + totalNewTieUps + totalHighTurnoutNoVisit + totalP1Schools + totalPendingVisits,
            lostTieUps: totalLostTieUps,
            newTieUps: totalNewTieUps,
            highTurnoutNoVisit: totalHighTurnoutNoVisit,
            p1Schools: totalP1Schools,
            pendingVisits: totalPendingVisits,
            distinctCentresCount: allDistinctCentres.length
        };

        return res.status(200).json({
            success: true,
            summary,
            centres: allDistinctCentres.sort(),
            pagination: {
                total: totalFiltered,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(totalFiltered / limitNum) || 1
            },
            data: enrichedRecords
        });
    } catch (error) {
        console.error("Error in getB2BComparisonData:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve B2B comparison data",
            error: error.message
        });
    }
};

export const updateB2BRecord = async (req, res) => {
    try {
        const { id } = req.params;
        let updates = { ...req.body };

        // Automatically harmonize Mock Tie-Up and B2B Status
        if (updates.currentStatus) {
            const isMock = /mock/i.test(updates.currentStatus) || updates.currentStatus === "MOCK TEST TIE-UP";
            updates.currentMockTieUp = isMock ? "Confirmed" : "Not confirmed";
        } else if (updates.currentMockTieUp === "Confirmed") {
            updates.currentStatus = "MOCK TEST TIE-UP";
        }

        const record = await B2BComparison.findByIdAndUpdate(id, updates, { new: true });
        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found" });
        }

        // If status or schoolAccess changed and linked to SchoolForTask, sync back to master data
        if (record.schoolRef && (updates.currentStatus || updates.schoolAccess)) {
            const schoolUpdates = {};
            if (updates.currentStatus) schoolUpdates.status = updates.currentStatus;
            if (updates.schoolAccess) schoolUpdates.schoolAccess = updates.schoolAccess;
            await SchoolForTask.findByIdAndUpdate(record.schoolRef, schoolUpdates);
        }

        return res.status(200).json({
            success: true,
            message: "Record updated successfully",
            data: record
        });
    } catch (error) {
        console.error("Error in updateB2BRecord:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update record",
            error: error.message
        });
    }
};

export const syncB2BExcelData = async (req, res) => {
    try {
        const filePath = req.file?.path || null;
        const result = await syncB2BComparisonFromExcel(filePath);

        // Remove uploaded temp file if exists
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(200).json({
            success: true,
            message: `Successfully synchronized ${result.count} B2B comparison records`,
            count: result.count
        });
    } catch (error) {
        console.error("Error in syncB2BExcelData:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to sync Excel data",
            error: error.message
        });
    }
};
