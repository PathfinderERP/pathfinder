import B2BComparison from "../../models/MarketingCRM/B2BComparison.js";
import SchoolForTask from "../../models/Master_data/SchoolForTask.js";
import Centre from "../../models/Master_data/Centre.js";
import { syncB2BComparisonFromExcel } from "../../utils/seedB2BComparison.js";
import fs from "fs";

// Helper to resolve a user's accessible B2B centre names based on assigned centres and role
export const resolveUserAllowedB2BCentres = async (user) => {
    if (!user) return [];

    const isSuperAdmin = user.role === "superAdmin" || user.role === "Super Admin";
    if (isSuperAdmin) {
        return null; // null = full access to all centres
    }

    const assignedIds = (user.centres || []).concat(user.primaryCentre ? [user.primaryCentre] : []);

    // Global admin with no specific centres assigned gets full access
    if (user.role === "admin" && assignedIds.length === 0) {
        return null;
    }

    if (assignedIds.length === 0) {
        return []; // Non-superadmin with no centres assigned has no centre access
    }

    // Retrieve centre names from CentreSchema
    const dbCentres = await Centre.find({ _id: { $in: assignedIds } }).select("centreName").lean();
    const userCentreNames = dbCentres
        .map(c => (c.centreName || "").trim().toUpperCase())
        .filter(Boolean);

    if (userCentreNames.length === 0) {
        return [];
    }

    // Match against distinct B2B comparison centre names
    const b2bCentres = await B2BComparison.distinct("centerName");

    const matchedB2BCentres = b2bCentres.filter(bCenter => {
        const bUpper = (bCenter || "").trim().toUpperCase();
        const bParts = bUpper.split("+").map(p => p.trim());
        return userCentreNames.some(uName => {
            const uClean = uName.replace(/^PHSPS[_\s]+/, "").trim();
            return (
                bUpper === uName ||
                bParts.includes(uName) ||
                bUpper === uClean ||
                bParts.includes(uClean)
            );
        });
    });

    return matchedB2BCentres;
};

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

        // Resolve centre access for current logged-in user
        const allowedCentres = await resolveUserAllowedB2BCentres(req.user);

        // If user is restricted and has 0 accessible centres, return empty state immediately
        if (allowedCentres !== null && allowedCentres.length === 0) {
            return res.status(200).json({
                success: true,
                summary: {
                    totalRecords: 0,
                    lostTieUps: 0,
                    newTieUps: 0,
                    highTurnoutNoVisit: 0,
                    p1Schools: 0,
                    pendingVisits: 0,
                    distinctCentresCount: 0
                },
                centres: [],
                pagination: {
                    total: 0,
                    page: Math.max(1, parseInt(page, 10)),
                    limit: Math.max(1, parseInt(limit, 10)),
                    pages: 1
                },
                data: []
            });
        }

        // Base scope query for counts and filtering
        const baseScopeQuery = allowedCentres !== null
            ? { centerName: { $in: allowedCentres.map(c => new RegExp(`^${c}$`, "i")) } }
            : {};

        // Build filtered query
        const query = { ...baseScopeQuery };

        if (category && category !== "All") {
            const categories = typeof category === "string" ? category.split(",") : category;
            query.category = { $in: categories };
        }

        if (centerNames && centerNames !== "All") {
            const requested = typeof centerNames === "string" ? centerNames.split(",").map(c => c.trim()) : centerNames;
            if (allowedCentres !== null) {
                // Intersect with user's allowed centres
                const validCentres = requested.filter(rc =>
                    allowedCentres.some(ac => ac.toLowerCase() === rc.toLowerCase())
                );
                query.centerName = { $in: validCentres.map(c => new RegExp(`^${c}$`, "i")) };
            } else {
                query.centerName = { $in: requested.map(c => new RegExp(`^${c}$`, "i")) };
            }
        } else if (allowedCentres !== null) {
            query.centerName = baseScopeQuery.centerName;
        }

        if (priority && priority !== "All") {
            const priorities = typeof priority === "string" ? priority.split(",") : priority;
            query.priority = { $in: priorities };
        }

        if (currentMockTieUp && currentMockTieUp !== "All") {
            const isConfirmedSearch = /^confirmed$/i.test(String(currentMockTieUp).trim());
            const isNotConfirmedSearch = /not\s*confirmed/i.test(String(currentMockTieUp).trim());

            if (isConfirmedSearch) {
                query.$or = [
                    { currentMockTieUp: /^confirmed$/i },
                    { currentStatus: /mock/i }
                ];
            } else if (isNotConfirmedSearch) {
                query.currentMockTieUp = { $not: /^confirmed$/i };
                query.currentStatus = { $not: /mock/i };
            } else {
                const statuses = typeof currentMockTieUp === "string" ? currentMockTieUp.split(",") : currentMockTieUp;
                query.currentMockTieUp = { $in: statuses };
            }
        }

        if (visitedThisYear && visitedThisYear !== "All") {
            query.visitedThisYear = visitedThisYear;
        }

        if (hoHelpNeeded && hoHelpNeeded !== "All") {
            query.hoHelpNeeded = hoHelpNeeded;
        }

        if (search) {
            const regex = new RegExp(search.trim(), "i");
            const searchConditions = [
                { schoolName: regex },
                { centerName: regex },
                { lastExecutive: regex },
                { nextAction: regex },
                { simpleInference: regex },
                { currentStatus: regex },
                { visitNotes: regex }
            ];

            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchConditions }
                ];
                delete query.$or;
            } else {
                query.$or = searchConditions;
            }
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
            B2BComparison.countDocuments({ ...baseScopeQuery, category: "Lost Tie-ups" }),
            B2BComparison.countDocuments({ ...baseScopeQuery, category: "New Tie-ups" }),
            B2BComparison.countDocuments({ ...baseScopeQuery, category: "High Turnout No Visit" }),
            B2BComparison.countDocuments({ ...baseScopeQuery, category: "P1 Schools" }),
            B2BComparison.countDocuments({ ...baseScopeQuery, category: "Pending Visits" }),
            B2BComparison.distinct("centerName", baseScopeQuery)
        ]);

        // Enrich records with latest SchoolForTask status and dynamically correlate Mock Tie-Up
        const enrichedRecords = records.map(r => {
            const liveStatus = r.schoolRef?.status || r.currentStatus || "—";
            const isDbConfirmed = r.currentMockTieUp && /^confirmed$/i.test(String(r.currentMockTieUp).trim()) && !/not/i.test(String(r.currentMockTieUp));
            const isLiveMock = Boolean(liveStatus && (/mock/i.test(liveStatus) || liveStatus === "MOCK TEST TIE-UP"));
            const liveMockTieUp = (isDbConfirmed || isLiveMock) ? "Confirmed" : "Not confirmed";
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

        // Verify user has access to modify this centre's record
        const allowedCentres = await resolveUserAllowedB2BCentres(req.user);
        if (allowedCentres !== null) {
            const existing = await B2BComparison.findById(id).select("centerName");
            if (!existing) {
                return res.status(404).json({ success: false, message: "Record not found" });
            }
            const hasAccess = allowedCentres.some(ac => ac.toLowerCase() === (existing.centerName || "").toLowerCase());
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied: You do not have permission to modify records for this centre"
                });
            }
        }

        // Automatically harmonize Mock Tie-Up and B2B Status
        if (updates.currentMockTieUp) {
            if (updates.currentMockTieUp === "Confirmed" && (!updates.currentStatus || updates.currentStatus === "—")) {
                updates.currentStatus = "MOCK TEST TIE-UP";
            }
        } else if (updates.currentStatus) {
            const isMock = /mock/i.test(updates.currentStatus) || updates.currentStatus === "MOCK TEST TIE-UP";
            updates.currentMockTieUp = isMock ? "Confirmed" : "Not confirmed";
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
        const isSuperOrAdmin = req.user?.role === "superAdmin" || req.user?.role === "Super Admin" || req.user?.role === "admin";
        if (!isSuperOrAdmin) {
            return res.status(403).json({
                success: false,
                message: "Access denied: Only administrators can synchronize Excel data"
            });
        }

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
