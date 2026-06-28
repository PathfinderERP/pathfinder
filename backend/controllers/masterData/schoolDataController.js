import SchoolData from "../../models/Master_data/SchoolData.js";
import CentreSchema from "../../models/Master_data/Centre.js";

// CREATE
export const createSchoolData = async (req, res) => {
    try {
        const { schoolName, studentName, className, board, phoneNumber, secondaryPhoneNumber, year, area, centre } = req.body;
        if (!schoolName || !studentName || !className || !board) {
            return res.status(400).json({ message: "Required fields: schoolName, studentName, className, board" });
        }
        const record = new SchoolData({
            schoolName,
            studentName,
            className,
            board,
            phoneNumber: phoneNumber || "",
            secondaryPhoneNumber: secondaryPhoneNumber || "",
            year: year || "",
            area: area || "",
            centre: centre || null
        });
        await record.save();
        await record.populate("centre", "centreName");
        res.status(201).json({ message: "School data record created", data: record });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// READ ALL (with search / multi-value filter / pagination)
const buildFilterQuery = async (filters) => {
    const { search, schoolName, className, board, area, centre, year, onlyDuplicates } = filters;
    const query = {};

    if (onlyDuplicates === "true" || onlyDuplicates === true) {
        const duplicatePhones = await SchoolData.aggregate([
            { $match: { phoneNumber: { $ne: "", $exists: true } } },
            { $group: { _id: "$phoneNumber", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        const phoneList = duplicatePhones.map(item => item._id);
        query.phoneNumber = { $in: phoneList };
    }

    if (search) {
        query.$or = [
            { schoolName:  { $regex: search, $options: "i" } },
            { studentName: { $regex: search, $options: "i" } },
            { className:   { $regex: search, $options: "i" } },
            { board:       { $regex: search, $options: "i" } },
            { area:        { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            { year:        { $regex: search, $options: "i" } }
        ];
    }

    if (schoolName) {
        const vals = schoolName.split(",").map(v => v.trim()).filter(Boolean);
        query.schoolName = vals.length === 1 ? { $regex: vals[0], $options: "i" } : { $in: vals.map(v => new RegExp(`^${v}$`, "i")) };
    }
    if (className) {
        const vals = className.split(",").map(v => v.trim()).filter(Boolean);
        query.className = vals.length === 1 ? { $regex: `^${vals[0]}$`, $options: "i" } : { $in: vals.map(v => new RegExp(`^${v}$`, "i")) };
    }
    if (board) {
        const vals = board.split(",").map(v => v.trim()).filter(Boolean);
        query.board = vals.length === 1 ? { $regex: `^${vals[0]}$`, $options: "i" } : { $in: vals.map(v => new RegExp(`^${v}$`, "i")) };
    }
    if (area) {
        const vals = area.split(",").map(v => v.trim()).filter(Boolean);
        query.area = vals.length === 1 ? { $regex: `^${vals[0]}$`, $options: "i" } : { $in: vals.map(v => new RegExp(`^${v}$`, "i")) };
    }
    if (year) {
        const vals = year.split(",").map(v => v.trim()).filter(Boolean);
        query.year = vals.length === 1 ? { $regex: `^${vals[0]}$`, $options: "i" } : { $in: vals.map(v => new RegExp(`^${v}$`, "i")) };
    }
    if (centre) {
        const ids = centre.split(",").map(v => v.trim()).filter(Boolean);
        query.centre = ids.length === 1 ? ids[0] : { $in: ids };
    }
    return query;
};

// READ ALL (with search / multi-value filter / pagination)
export const getSchoolData = async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const query = await buildFilterQuery(req.query);

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await SchoolData.countDocuments(query);
        const records = await SchoolData.find(query)
            .populate("centre", "centreName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            data: records,
            totalItems: total,
            totalPages: Math.ceil(total / parseInt(limit)),
            currentPage: parseInt(page)
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// UPDATE
export const updateSchoolData = async (req, res) => {
    try {
        const { id } = req.params;
        const { schoolName, studentName, className, board, phoneNumber, secondaryPhoneNumber, year, area, centre } = req.body;
        const record = await SchoolData.findByIdAndUpdate(
            id,
            {
                schoolName, studentName, className, board,
                phoneNumber: phoneNumber || "",
                secondaryPhoneNumber: secondaryPhoneNumber || "",
                year: year || "",
                area: area || "",
                centre: centre || null
            },
            { new: true, runValidators: true }
        ).populate("centre", "centreName");
        if (!record) return res.status(404).json({ message: "Record not found" });
        res.status(200).json({ message: "School data updated", data: record });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// DELETE
export const deleteSchoolData = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await SchoolData.findByIdAndDelete(id);
        if (!record) return res.status(404).json({ message: "Record not found" });
        res.status(200).json({ message: "School data deleted" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// BULK IMPORT
export const bulkImportSchoolData = async (req, res) => {
    try {
        const rows = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "No data provided for import" });
        }

        const cleanVal = (val) => {
            if (val === undefined || val === null) return "";
            return String(val).trim();
        };

        // Pre-fetch all active centres for name→ID resolution
        const allCentres = await CentreSchema.find({ status: { $ne: "deactive" } }, "_id centreName");
        const centreNameMap = {};
        for (const c of allCentres) {
            if (c.centreName) centreNameMap[c.centreName.trim().toLowerCase()] = c._id;
        }

        const results = { inserted: 0, failed: [], total: rows.length };
        const validRecords = [];

        for (const row of rows) {
            const schoolName = cleanVal(row.schoolName || row["School Name"]);
            const studentName = cleanVal(row.studentName || row["Student Name"]);
            const className = cleanVal(row.className || row["Class"]);
            const board = cleanVal(row.board || row["Board"]);
            const phoneNumber = cleanVal(row.phoneNumber || row["Phone Number"]);
            const secondaryPhoneNumber = cleanVal(row.secondaryPhoneNumber || row["Secondary Phone Number"]);
            const year = cleanVal(row.year || row["Year"]);
            const area = cleanVal(row.area || row["Area"]);
            const centreName = cleanVal(row.centreName || row["Centre Name"] || row["centre"]);

            if (!schoolName || !studentName || !className || !board) {
                results.failed.push({ row, reason: "Missing required fields: School Name, Student Name, Class, Board" });
                continue;
            }

            // Resolve centre name to ObjectId (case-insensitive)
            const centreId = centreName ? (centreNameMap[centreName.toLowerCase()] || null) : null;

            validRecords.push({
                schoolName,
                studentName,
                className,
                board,
                phoneNumber,
                secondaryPhoneNumber,
                year,
                area,
                centre: centreId
            });
        }

        if (validRecords.length > 0) {
            try {
                const insertedDocs = await SchoolData.insertMany(validRecords, { ordered: false });
                results.inserted = insertedDocs.length;
            } catch (error) {
                if (error.insertedDocs) {
                    results.inserted = error.insertedDocs.length;
                }
                if (error.writeErrors) {
                    for (const we of error.writeErrors) {
                        const failedRow = validRecords[we.index];
                        results.failed.push({ row: failedRow, reason: we.errmsg });
                    }
                } else {
                    return res.status(500).json({ message: "Server error during bulk insert", error: error.message });
                }
            }
        }

        res.status(200).json({
            message: `Bulk import complete. Inserted: ${results.inserted}, Failed: ${results.failed.length}`,
            ...results
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// BULK DELETE
export const bulkDeleteSchoolData = async (req, res) => {
    try {
        const { ids, selectAllMatching, filters } = req.body;
        let query = {};
        
        if (selectAllMatching) {
            query = await buildFilterQuery(filters || {});
        } else {
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "No IDs provided for deletion" });
            }
            query = { _id: { $in: ids } };
        }

        const result = await SchoolData.deleteMany(query);
        res.status(200).json({ message: `Deleted ${result.deletedCount} records`, deletedCount: result.deletedCount });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// BULK UPDATE — only applies fields that are explicitly set (non-empty string / truthy)
export const bulkUpdateSchoolData = async (req, res) => {
    try {
        const { ids, selectAllMatching, filters, updates } = req.body;
        if (!updates || typeof updates !== "object") {
            return res.status(400).json({ message: "No update fields provided" });
        }

        // Only include fields explicitly sent and non-empty (except centre which can be null to clear)
        const allowedFields = ["schoolName", "studentName", "className", "board", "phoneNumber", "secondaryPhoneNumber", "year", "area", "centre"];
        const updateDoc = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updateDoc[field] = updates[field] === "" ? (field === "centre" ? null : "") : updates[field];
            }
        }

        if (Object.keys(updateDoc).length === 0) {
            return res.status(400).json({ message: "No valid update fields provided" });
        }

        let query = {};
        if (selectAllMatching) {
            query = await buildFilterQuery(filters || {});
        } else {
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: "No IDs provided for update" });
            }
            query = { _id: { $in: ids } };
        }

        const result = await SchoolData.updateMany(
            query,
            { $set: updateDoc }
        );

        res.status(200).json({
            message: `Updated ${result.modifiedCount} records`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// GET DISTINCT FIELDS (Schools & Areas)
export const getSchoolDataDistinctFields = async (req, res) => {
    try {
        const schools = await SchoolData.distinct("schoolName");
        const areas = await SchoolData.distinct("area");
        res.status(200).json({
            schools: schools.filter(Boolean).sort(),
            areas: areas.filter(Boolean).sort()
        });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


