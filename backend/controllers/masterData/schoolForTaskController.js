import mongoose from "mongoose";
import SchoolForTask from "../../models/Master_data/SchoolForTask.js";
import CentreSchema from "../../models/Master_data/Centre.js";
import Boards from "../../models/Master_data/Boards.js";
import Zone from "../../models/Zone.js";

// ─────────────────────────────────────────────
//  Populate helper
// ─────────────────────────────────────────────
const withPopulate = (query) =>
    query
        .populate("centerName", "centreName")
        .populate("board", "boardCourse name");

// ─────────────────────────────────────────────
//  Attach Zone helper
// ─────────────────────────────────────────────
const attachZonesToRecords = async (records) => {
    if (!records || records.length === 0) return records;
    try {
        const zones = await Zone.find({ isActive: { $ne: false } }).select("name centres").lean();
        const centreToZoneMap = new Map();
        zones.forEach(z => {
            (z.centres || []).forEach(cId => {
                centreToZoneMap.set(cId.toString(), { _id: z._id, name: z.name });
            });
        });

        return records.map(rec => {
            const recObj = rec.toObject ? rec.toObject() : { ...rec };
            const cId = recObj.centerName?._id ? recObj.centerName._id.toString() : (recObj.centerName ? recObj.centerName.toString() : null);
            if (cId && centreToZoneMap.has(cId)) {
                const z = centreToZoneMap.get(cId);
                recObj.zone = z;
                recObj.zoneName = z.name;
            } else {
                recObj.zone = null;
                recObj.zoneName = "—";
            }
            return recObj;
        });
    } catch (err) {
        console.error("Error attaching zones to school records:", err);
        return records;
    }
};

// ─────────────────────────────────────────────
//  Build filter query with User Centre Restriction & Zone
// ─────────────────────────────────────────────
const buildFilterQuery = async (filters = {}, user = null) => {
    const { search, schoolName, tier, schoolAccess, status, board, centerName, zone, remarks } = filters;
    const query = {};

    if (search) {
        query.$or = [
            { schoolName: { $regex: search, $options: "i" } },
            { remarks: { $regex: search, $options: "i" } }
        ];
    }

    // String enum filters (comma-separated multi-value)
    const addStringFilter = (field, val) => {
        if (!val) return;
        const vals = val.split(",").map((v) => v.trim()).filter(Boolean);
        query[field] =
            vals.length === 1
                ? { $regex: `^${vals[0]}$`, $options: "i" }
                : { $in: vals.map((v) => new RegExp(`^${v}$`, "i")) };
    };

    addStringFilter("schoolName", schoolName);
    addStringFilter("tier", tier);
    addStringFilter("schoolAccess", schoolAccess);
    addStringFilter("status", status);
    addStringFilter("remarks", remarks);

    // ObjectId filters (comma-separated IDs)
    const addIdFilter = (field, val) => {
        if (!val) return;
        const ids = val.split(",").map((v) => v.trim()).filter(Boolean);
        query[field] = ids.length === 1 ? ids[0] : { $in: ids };
    };

    addIdFilter("board", board);

    // SuperAdmin role check (robust for superadmin, Super Admin, superAdmin, etc.)
    const userRoleClean = (user?.role || "").toLowerCase().replace(/\s+/g, "");
    const isSuperAdmin = userRoleClean === "superadmin";

    // Centre restriction check based on assigned user centres (ignored for Superadmin)
    const userCentreIds = (user?.centres || []).map((c) => (c._id || c).toString()).filter(Boolean);

    // Zone filter processing
    let zoneCentreIds = null;
    if (zone) {
        const zoneIds = zone.split(",").map((v) => v.trim()).filter(Boolean);
        const validObjectZoneIds = zoneIds.filter(id => mongoose.Types.ObjectId.isValid(id));
        const zoneDocs = await Zone.find({
            $or: [
                { _id: { $in: validObjectZoneIds } },
                { name: { $in: zoneIds.map(z => new RegExp(`^${z}$`, "i")) } }
            ]
        }).select("centres").lean();

        const cIds = [];
        zoneDocs.forEach(z => {
            (z.centres || []).forEach(c => cIds.push(c.toString()));
        });
        zoneCentreIds = [...new Set(cIds)];
    }

    if (centerName) {
        let requestedIds = centerName.split(",").map((v) => v.trim()).filter(Boolean);
        if (zoneCentreIds !== null) {
            requestedIds = requestedIds.filter(id => zoneCentreIds.includes(id));
        }
        if (!isSuperAdmin && userCentreIds.length > 0) {
            const allowedRequestedIds = requestedIds.filter((id) => userCentreIds.includes(id));
            query.centerName = { $in: allowedRequestedIds.length > 0 ? allowedRequestedIds : userCentreIds };
        } else {
            query.centerName = requestedIds.length === 1 ? requestedIds[0] : { $in: requestedIds };
        }
    } else if (zoneCentreIds !== null) {
        if (!isSuperAdmin && userCentreIds.length > 0) {
            const allowedZoneCentres = zoneCentreIds.filter(id => userCentreIds.includes(id));
            query.centerName = { $in: allowedZoneCentres };
        } else {
            query.centerName = { $in: zoneCentreIds };
        }
    } else if (!isSuperAdmin && userCentreIds.length > 0) {
        query.centerName = { $in: userCentreIds };
    }

    return query;
};

// ─────────────────────────────────────────────
//  CREATE
// ─────────────────────────────────────────────
export const createSchoolForTask = async (req, res) => {
    try {
        const { schoolName, centerName } = req.body;
        if (!schoolName || !centerName) {
            return res.status(400).json({ message: "schoolName and centerName are required" });
        }

        const userRoleClean = (req.user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleClean === "superadmin";
        if (!isSuperAdmin && req.user) {
            const userCentreIds = (req.user.centres || []).map((c) => (c._id || c).toString());
            if (!userCentreIds.includes(centerName.toString())) {
                return res.status(403).json({ message: "Cannot create school for a centre not assigned to your account" });
            }
        }

        const school = new SchoolForTask(req.body);
        await school.save();

        const populated = await withPopulate(SchoolForTask.findById(school._id));
        const [recordWithZone] = await attachZonesToRecords([populated]);
        res.status(201).json({ message: "School record created", data: recordWithZone || populated });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  READ ALL  (paginated + filtered)
// ─────────────────────────────────────────────
export const getSchoolsForTask = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const query = await buildFilterQuery(req.query, req.user);
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        const [total, records] = await Promise.all([
            SchoolForTask.countDocuments(query),
            withPopulate(
                SchoolForTask.find(query).sort(sort).skip(skip).limit(parseInt(limit))
            ),
        ]);

        const recordsWithZone = await attachZonesToRecords(records);

        res.status(200).json({
            data: recordsWithZone,
            totalItems: total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  EXPORT ALL  (no pagination, respects filters)
// ─────────────────────────────────────────────
export const exportAllSchoolsForTask = async (req, res) => {
    try {
        const query = await buildFilterQuery(req.query, req.user);
        const records = await withPopulate(
            SchoolForTask.find(query).sort({ createdAt: -1 })
        );
        const recordsWithZone = await attachZonesToRecords(records);
        res.status(200).json({ data: recordsWithZone, totalItems: recordsWithZone.length });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  GET ALL IDs  (for select-all across pages)
// ─────────────────────────────────────────────
export const getAllSchoolForTaskIds = async (req, res) => {
    try {
        const query = await buildFilterQuery(req.query, req.user);
        const records = await SchoolForTask.find(query).select("_id").lean();
        res.status(200).json({ ids: records.map(r => r._id) });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  READ ONE
// ─────────────────────────────────────────────
export const getSchoolForTaskById = async (req, res) => {
    try {
        const school = await withPopulate(SchoolForTask.findById(req.params.id));
        if (!school) return res.status(404).json({ message: "School not found" });

        const userRoleClean = (req.user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleClean === "superadmin";
        if (!isSuperAdmin && req.user) {
            const userCentreIds = (req.user.centres || []).map((c) => (c._id || c).toString());
            const schoolCentreId = (school.centerName?._id || school.centerName)?.toString();
            if (!schoolCentreId || !userCentreIds.includes(schoolCentreId)) {
                return res.status(403).json({ message: "Access denied to school data for unassigned centre" });
            }
        }

        res.status(200).json({ data: school });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────
export const updateSchoolForTask = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await SchoolForTask.findById(id);
        if (!existing) return res.status(404).json({ message: "School not found" });

        const userRoleClean = (req.user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleClean === "superadmin";
        if (!isSuperAdmin && req.user) {
            const userCentreIds = (req.user.centres || []).map((c) => (c._id || c).toString());
            const currentCentreId = (existing.centerName?._id || existing.centerName)?.toString();
            if (!currentCentreId || !userCentreIds.includes(currentCentreId)) {
                return res.status(403).json({ message: "Access denied to update school for unassigned centre" });
            }
            if (req.body.centerName && !userCentreIds.includes(req.body.centerName.toString())) {
                return res.status(403).json({ message: "Cannot reassign school to a centre not assigned to your account" });
            }
        }

        const allowedFields = ["centerName", "schoolName", "board", "tier", "schoolAccess", "status", "remarks"];

        const updateDoc = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateDoc[field] = req.body[field];
            }
        }

        const record = await withPopulate(
            SchoolForTask.findByIdAndUpdate(
                id,
                { $set: updateDoc },
                { new: true, runValidators: true }
            )
        );

        res.status(200).json({ message: "School updated", data: record });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  DELETE
// ─────────────────────────────────────────────
export const deleteSchoolForTask = async (req, res) => {
    try {
        const existing = await SchoolForTask.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: "School not found" });

        const userRoleClean = (req.user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleClean === "superadmin";
        if (!isSuperAdmin && req.user) {
            const userCentreIds = (req.user.centres || []).map((c) => (c._id || c).toString());
            const currentCentreId = (existing.centerName?._id || existing.centerName)?.toString();
            if (!currentCentreId || !userCentreIds.includes(currentCentreId)) {
                return res.status(403).json({ message: "Access denied to delete school for unassigned centre" });
            }
        }

        await SchoolForTask.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "School deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  BULK DELETE
// ─────────────────────────────────────────────
export const bulkDeleteSchoolsForTask = async (req, res) => {
    try {
        const { ids, selectAllMatching, filters } = req.body;
        let query = {};

        const userRoleClean = (req.user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleClean === "superadmin";

        if (selectAllMatching) {
            query = buildFilterQuery(filters || {}, req.user);
        } else {
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "No IDs provided for deletion" });
            }
            query = { _id: { $in: ids } };
            if (!isSuperAdmin && req.user) {
                const userCentreIds = (req.user.centres || []).map((c) => (c._id || c).toString());
                query.centerName = { $in: userCentreIds };
            }
        }

        const result = await SchoolForTask.deleteMany(query);
        res.status(200).json({
            message: `Deleted ${result.deletedCount} records`,
            deletedCount: result.deletedCount,
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  BULK UPDATE
// ─────────────────────────────────────────────
export const bulkUpdateSchoolsForTask = async (req, res) => {
    try {
        const { ids, selectAllMatching, filters, updates } = req.body;

        if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No update fields provided" });
        }

        const userRoleClean = (req.user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleClean === "superadmin";

        if (!isSuperAdmin && req.user && updates.centerName) {
            const userCentreIds = (req.user.centres || []).map((c) => (c._id || c).toString());
            if (!userCentreIds.includes(updates.centerName.toString())) {
                return res.status(403).json({ message: "Cannot reassign schools to a centre not assigned to your account" });
            }
        }

        const allowedFields = ["centerName", "board", "tier", "schoolAccess", "status", "remarks"];
        const updateDoc = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateDoc[field] = updates[field] === "" ? null : updates[field];
            }
        }

        if (Object.keys(updateDoc).length === 0) {
            return res.status(400).json({ message: "No valid update fields provided" });
        }

        let query = {};
        if (selectAllMatching) {
            query = buildFilterQuery(filters || {}, req.user);
        } else {
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "No IDs provided for update" });
            }
            query = { _id: { $in: ids } };
            if (!isSuperAdmin && req.user) {
                const userCentreIds = (req.user.centres || []).map((c) => (c._id || c).toString());
                query.centerName = { $in: userCentreIds };
            }
        }

        const result = await SchoolForTask.updateMany(query, { $set: updateDoc });
        res.status(200).json({
            message: `Updated ${result.modifiedCount} records`,
            modifiedCount: result.modifiedCount,
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  BULK IMPORT
// ─────────────────────────────────────────────
export const bulkImportSchoolsForTask = async (req, res) => {
    try {
        const rows = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "No data provided for import" });
        }

        const userRoleClean = (req.user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleClean === "superadmin";
        const userCentreIds = (!isSuperAdmin && req.user)
            ? (req.user.centres || []).map((c) => (c._id || c).toString())
            : null;

        // Fetch active centres and boards to map names/IDs server-side
        const [allCentres, allBoards] = await Promise.all([
            CentreSchema.find({}, "_id centreName"),
            Boards.find({}, "_id boardCourse name")
        ]);

        const normalizeStr = (val) => {
            if (!val) return "";
            return String(val)
                .replace(/\u00A0/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();
        };

        const cleanAlphaNum = (val) => {
            return normalizeStr(val).replace(/[^a-z0-9]/gi, "");
        };

        const centreMap = new Map();
        const centreAlphaNumMap = new Map();
        allCentres.forEach(c => {
            if (c.centreName) {
                const norm = normalizeStr(c.centreName);
                const clean = cleanAlphaNum(c.centreName);
                centreMap.set(norm, c._id);
                if (clean) centreAlphaNumMap.set(clean, c._id);
            }
        });

        const boardMap = new Map();
        const boardAlphaNumMap = new Map();
        allBoards.forEach(b => {
            const names = [b.boardCourse, b.name].filter(Boolean);
            names.forEach(n => {
                const norm = normalizeStr(n);
                const clean = cleanAlphaNum(n);
                boardMap.set(norm, b._id);
                if (clean) boardAlphaNumMap.set(clean, b._id);
            });
        });

        const cleanField = (val) => (val == null ? "" : String(val).trim());

        const validStatuses = [
            "MOCK TEST TIE-UP",
            "CRP TIE-UP",
            "(INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT",
            "ONLY INFORMATION GIVEN TO STUDENTS",
            "OTHERS"
        ];

        const results = { inserted: 0, failed: [], total: rows.length };
        const validRecords = [];

        for (const row of rows) {
            const rawSchoolName = cleanField(row.schoolName || row["SchoolName"] || row["School Name"] || row["SchoolName*"] || row["School Name*"]);
            const rawCenter = cleanField(row.centerName || row["CenterName"] || row["Center Name"] || row["CenterName*"] || row["Center Name*"]);
            const rawBoard = cleanField(row.board || row["Board"] || row["Board Name"]);
            let rawTier = cleanField(row.tier || row["Tier"]).toUpperCase();
            let rawSchoolAccess = cleanField(row.schoolAccess || row["SchoolAccess"] || row["SCHOOLACCESS"] || row["School Access"]).toUpperCase();
            let rawStatus = cleanField(row.status || row["Status"] || row["STATUS"]);
            const remarks = cleanField(
                row["MOCK / CRP TIE-UP STATUS"] ||
                row["Mock / CRP Tie-Up Status"] ||
                row["MOCK/CRP TIE-UP STATUS"] ||
                row["Mock/CRP Tie-Up Status"] ||
                row["MOCK / CRP TIE UP STATUS"] ||
                row["Tie-Up Status"] ||
                row.remarks ||
                row["Remarks"] ||
                row["REMARKS"]
            );

            // Normalize Tier (Default to "A")
            const tier = ["A", "B", "C", "D", "E"].includes(rawTier) ? rawTier : "A";

            // Normalize SchoolAccess (Default to "YES")
            const schoolAccess = ["YES", "NO"].includes(rawSchoolAccess) ? rawSchoolAccess : "YES";

            // Normalize Status
            let status = "ONLY INFORMATION GIVEN TO STUDENTS";
            if (rawStatus) {
                const matchedStatus = validStatuses.find(s => normalizeStr(s) === normalizeStr(rawStatus));
                if (matchedStatus) {
                    status = matchedStatus;
                } else if (normalizeStr(rawStatus).includes("other")) {
                    status = "OTHERS";
                }
            }

            // Resolve Centre ObjectId
            let centreId = null;
            if (rawCenter) {
                if (mongoose.Types.ObjectId.isValid(rawCenter)) {
                    centreId = rawCenter;
                } else {
                    const norm = normalizeStr(rawCenter);
                    const clean = cleanAlphaNum(rawCenter);
                    centreId = centreMap.get(norm) || centreAlphaNumMap.get(clean) || null;
                }
            }

            // Resolve Board ObjectId (Board is optional)
            let boardId = null;
            let boardError = null;
            if (rawBoard) {
                if (mongoose.Types.ObjectId.isValid(rawBoard)) {
                    boardId = rawBoard;
                } else {
                    const norm = normalizeStr(rawBoard);
                    const clean = cleanAlphaNum(rawBoard);
                    const resolvedId = boardMap.get(norm) || boardAlphaNumMap.get(clean) || null;
                    if (resolvedId) {
                        boardId = resolvedId;
                    } else {
                        boardError = `Board '${rawBoard}' not found in Master Board data.`;
                    }
                }
            }

            if (!rawSchoolName || !centreId || boardError) {
                results.failed.push({
                    row,
                    reason: !rawSchoolName
                        ? "Missing required field: SchoolName"
                        : boardError
                        ? boardError
                        : `CenterName '${rawCenter}' not found in Master Centre data`
                });
                continue;
            }

            if (userCentreIds && !userCentreIds.includes(centreId.toString())) {
                results.failed.push({
                    row,
                    reason: `CenterName '${rawCenter}' is not assigned to your account under User Management.`
                });
                continue;
            }

            validRecords.push({
                schoolName: rawSchoolName,
                centerName: centreId,
                board: boardId,
                tier,
                schoolAccess,
                status,
                remarks
            });
        }

        if (validRecords.length > 0) {
            try {
                const docs = await SchoolForTask.insertMany(validRecords, { ordered: false });
                results.inserted = docs.length;
            } catch (error) {
                if (error.insertedDocs) results.inserted = error.insertedDocs.length;
                if (error.writeErrors) {
                    for (const we of error.writeErrors) {
                        results.failed.push({ row: validRecords[we.index], reason: we.errmsg });
                    }
                } else {
                    return res.status(500).json({ message: "Bulk insert error", error: error.message });
                }
            }
        }

        res.status(200).json({
            message: `Bulk import complete. Inserted: ${results.inserted}, Failed: ${results.failed.length}`,
            ...results,
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// ─────────────────────────────────────────────
//  DISTINCT FIELDS  (dropdown options)
// ─────────────────────────────────────────────
export const getSchoolForTaskDistinctFields = async (req, res) => {
    try {
        const userRoleClean = (req.user?.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = userRoleClean === "superadmin";
        let filter = {};

        if (!isSuperAdmin && req.user) {
            const userCentreIds = (req.user.centres || []).map((c) => (c._id || c).toString());
            filter = { centerName: { $in: userCentreIds } };
        }

        const [schools, tiers, accessLevels, statuses] = await Promise.all([
            SchoolForTask.distinct("schoolName", filter),
            SchoolForTask.distinct("tier", filter),
            SchoolForTask.distinct("schoolAccess", filter),
            SchoolForTask.distinct("status", filter),
        ]);

        res.status(200).json({
            schools: schools.filter(Boolean).sort(),
            tiers: tiers.filter(Boolean).sort(),
            accessLevels: accessLevels.filter(Boolean).sort(),
            statuses: statuses.filter(Boolean).sort(),
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
