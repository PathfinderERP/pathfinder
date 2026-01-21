export const bulkImport = (Model) => async (req, res) => {
    try {
        const data = req.body;
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ message: "Invalid data format. Expected an array." });
        }

        // Optional: Perform any model-specific validation or cleaning here
        // For now, we'll use insertMany which handles Mongoose validation
        const results = await Model.insertMany(data, { ordered: false });

        res.status(201).json({
            message: `${results.length} records imported successfully`,
            count: results.length
        });
    } catch (err) {
        console.error(`Bulk import error for ${Model.modelName}:`, err);

        // Handle partial success if ordered: false
        if (err.name === 'BulkWriteError' || err.code === 11000) {
            return res.status(207).json({
                message: "Partial import success. Some records might be duplicates or invalid.",
                importedCount: err.result?.nInserted || 0,
                error: err.message
            });
        }

        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const bulkExport = (Model) => async (req, res) => {
    try {
        const data = await Model.find().sort({ createdAt: -1 });
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};
