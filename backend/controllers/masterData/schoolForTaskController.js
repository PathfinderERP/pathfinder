import SchoolForTask from "../../models/Master_data/SchoolForTask.js";

// ─────────────────────────────────────────────
//  Populate helper
// ─────────────────────────────────────────────
const withPopulate = (query) =>
    query
        .populate("centerName", "centreName")
        .populate("board", "name");

// ─────────────────────────────────────────────
//  Build filter query
// ─────────────────────────────────────────────
const buildFilterQuery = (filters = {}) => {
    const { search, schoolName, tier, schoolAccess, board, centerName } = filters;
    const query = {};

    if (search) {
        query.$or = [
            { schoolName: { $regex: search, $options: "i" } },
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

    // ObjectId filters (comma-separated IDs)
    const addIdFilter = (field, val) => {
        if (!val) return;
        const ids = val.split(",").map((v) => v.trim()).filter(Boolean);
        query[field] = ids.length === 1 ? ids[0] : { $in: ids };
    };

    addIdFilter("board", board);
    addIdFilter("centerName", centerName);

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

        const school = new SchoolForTask(req.body);
        await school.save();

        const populated = await withPopulate(SchoolForTask.findById(school._id));
        res.status(201).json({ message: "School record created", data: populated });
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

        const query = buildFilterQuery(req.query);
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        const [total, records] = await Promise.all([
            SchoolForTask.countDocuments(query),
            withPopulate(
                SchoolForTask.find(query).sort(sort).skip(skip).limit(parseInt(limit))
            ),
        ]);

        res.status(200).json({
            data: records,
            totalItems: total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page),
        });
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
        const allowedFields = ["centerName", "schoolName", "board", "tier", "schoolAccess"];

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

        if (!record) return res.status(404).json({ message: "School not found" });
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
        const record = await SchoolForTask.findByIdAndDelete(req.params.id);
        if (!record) return res.status(404).json({ message: "School not found" });
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

        if (selectAllMatching) {
            query = buildFilterQuery(filters || {});
        } else {
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "No IDs provided for deletion" });
            }
            query = { _id: { $in: ids } };
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

        const allowedFields = ["centerName", "board", "tier", "schoolAccess"];
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
            query = buildFilterQuery(filters || {});
        } else {
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "No IDs provided for update" });
            }
            query = { _id: { $in: ids } };
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

        const clean = (val) => (val == null ? "" : String(val).trim());

        const results = { inserted: 0, failed: [], total: rows.length };
        const validRecords = [];

        for (const row of rows) {
            const schoolName  = clean(row.schoolName  || row["SchoolName"]  || row["School Name"]);
            const centerName  = row.centerName || row["CenterName"] || row["Center Name"] || null;
            const board       = row.board      || row["Board"]      || null;
            const tier        = clean(row.tier || row["Tier"]) || "Tier-1";
            const schoolAccess = clean(row.schoolAccess || row["SchoolAccess"] || row["SCHOOLACCESS"]) || "open";

            if (!schoolName || !centerName) {
                results.failed.push({ row, reason: "Missing required fields: schoolName, centerName" });
                continue;
            }

            validRecords.push({ schoolName, centerName, board: board || null, tier, schoolAccess });
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
        const [schools, tiers, accessLevels] = await Promise.all([
            SchoolForTask.distinct("schoolName"),
            SchoolForTask.distinct("tier"),
            SchoolForTask.distinct("schoolAccess"),
        ]);

        res.status(200).json({
            schools:      schools.filter(Boolean).sort(),
            tiers:        tiers.filter(Boolean).sort(),
            accessLevels: accessLevels.filter(Boolean).sort(),
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
