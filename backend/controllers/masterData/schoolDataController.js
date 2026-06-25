import SchoolData from "../../models/Master_data/SchoolData.js";

// CREATE
export const createSchoolData = async (req, res) => {
    try {
        const { schoolName, studentName, className, board, area } = req.body;
        if (!schoolName || !studentName || !className || !board) {
            return res.status(400).json({ message: "Required fields: schoolName, studentName, className, board" });
        }
        const record = new SchoolData({ schoolName, studentName, className, board, area: area || "" });
        await record.save();
        res.status(201).json({ message: "School data record created", data: record });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// READ ALL (with search / multi-value filter / pagination)
export const getSchoolData = async (req, res) => {
    try {
        const { search, schoolName, className, board, area, page = 1, limit = 50 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { schoolName:  { $regex: search, $options: "i" } },
                { studentName: { $regex: search, $options: "i" } },
                { className:   { $regex: search, $options: "i" } },
                { board:       { $regex: search, $options: "i" } },
                { area:        { $regex: search, $options: "i" } }
            ];
        }

        // Support comma-separated multi-values from frontend multi-select dropdowns
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

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await SchoolData.countDocuments(query);
        const records = await SchoolData.find(query)
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
        const { schoolName, studentName, className, board, area } = req.body;
        const record = await SchoolData.findByIdAndUpdate(
            id,
            { schoolName, studentName, className, board, area: area || "" },
            { new: true, runValidators: true }
        );
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

        const results = { inserted: 0, failed: [], total: rows.length };
        for (const row of rows) {
            try {
                const schoolName = cleanVal(row.schoolName || row["School Name"]);
                const studentName = cleanVal(row.studentName || row["Student Name"]);
                const className = cleanVal(row.className || row["Class"]);
                const board = cleanVal(row.board || row["Board"]);
                const area = cleanVal(row.area || row["Area"]);

                if (!schoolName || !studentName || !className || !board) {
                    throw new Error("Missing required fields: School Name, Student Name, Class, Board");
                }

                const record = new SchoolData({
                    schoolName,
                    studentName,
                    className,
                    board,
                    area
                });
                await record.save();
                results.inserted++;
            } catch (e) {
                results.failed.push({ row, reason: e.message });
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
