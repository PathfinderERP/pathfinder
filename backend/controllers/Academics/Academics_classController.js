import AcademicsClass from "../../models/Academics/Academics_class.js";

// Create Class
export const createClass = async (req, res) => {
    try {
        const { className } = req.body;
        if (!className) {
            return res.status(400).json({ message: "Class Name is required" });
        }
        const newClass = new AcademicsClass({ className });
        await newClass.save();
        res.status(201).json({ message: "Class created successfully", data: newClass });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Get All Classes
export const getAllClasses = async (req, res) => {
    try {
        const classes = await AcademicsClass.find().sort({ createdAt: -1 });
        res.status(200).json(classes);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Update Class
export const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { className } = req.body;
        const updatedClass = await AcademicsClass.findByIdAndUpdate(
            id,
            { className },
            { new: true }
        );
        if (!updatedClass) return res.status(404).json({ message: "Class not found" });
        res.status(200).json({ message: "Class updated successfully", data: updatedClass });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Delete Class
export const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedClass = await AcademicsClass.findByIdAndDelete(id);
        if (!deletedClass) return res.status(404).json({ message: "Class not found" });
        res.status(200).json({ message: "Class deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// Bulk Import Classes
export const bulkImportClasses = async (req, res) => {
    try {
        if (!req.body || !Array.isArray(req.body) || req.body.length === 0) {
            return res.status(400).json({ message: "No data provided" });
        }

        const importData = req.body;
        const results = {
            successCount: 0,
            failedCount: 0,
            errors: []
        };

        for (const row of importData) {
            try {
                // Determine class name from row keys (case-insensitive 'name' or first value)
                const keys = Object.keys(row);
                const nameKey = keys.find(k => k.trim().toLowerCase().includes("name"));

                let className = row[nameKey];

                // Fallback to first value if needed
                if (!className || String(className).trim() === "") {
                    const values = Object.values(row);
                    if (values.length > 0) className = values[0];
                }

                if (!className || String(className).trim() === "") {
                    results.failedCount++;
                    results.errors.push({ row, error: "Missing Class Name" });
                    continue;
                }

                className = String(className).trim();

                // Check for duplicate (case-insensitive regex)
                const existing = await AcademicsClass.findOne({
                    className: { $regex: new RegExp(`^${className}$`, "i") }
                });

                if (existing) {
                    results.errors.push({ row, error: `Class '${className}' already exists` });
                    continue;
                }

                const newClass = new AcademicsClass({ className });
                await newClass.save();
                results.successCount++;

            } catch (err) {
                results.failedCount++;
                results.errors.push({ row, error: err.message });
            }
        }

        res.status(200).json({
            message: "Import processed",
            results
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
