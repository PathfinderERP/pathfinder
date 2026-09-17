import ExamSchedule from "../../models/Operations/ExamSchedule.js";

/**
 * Normalizes input that could be a comma-separated string or array into a clean array of strings
 */
const normalizeArray = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) {
        return input.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof input === "string") {
        return input
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);
    }
    return [String(input).trim()];
};

/**
 * GET /api/operations/exam-schedule
 * List exam schedules with filtering, search, pagination, and KPI stats
 */
export const getExamSchedules = async (req, res) => {
    try {
        const {
            search = "",
            session,
            className,
            center,
            status,
            fromDate,
            toDate,
            page = 1,
            limit = 10,
            sortBy = "fromDate",
            sortOrder = "desc"
        } = req.query;

        const filter = {};

        // Free-text search
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { examName: searchRegex },
                { description: searchRegex },
                { session: searchRegex },
                { className: searchRegex },
                { centers: searchRegex }
            ];
        }

        // Session filter
        if (session && session !== "all") {
            if (Array.isArray(session)) {
                filter.session = { $in: session };
            } else {
                filter.session = session;
            }
        }

        // Class filter
        if (className && className !== "all") {
            const classList = normalizeArray(className);
            if (classList.length > 0) {
                filter.className = { $in: classList };
            }
        }

        // Centre filter (multi-centre support)
        if (center && center !== "all") {
            const centerList = normalizeArray(center);
            if (centerList.length > 0) {
                filter.centers = { $in: centerList };
            }
        }

        // Status filter
        if (status && status !== "all") {
            filter.status = status;
        }

        // Date range filter
        if (fromDate || toDate) {
            const dateFilter = {};
            if (fromDate) {
                dateFilter.$gte = new Date(fromDate);
            }
            if (toDate) {
                // Include entire end date till 23:59:59.999
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                dateFilter.$lte = endOfDay;
            }
            filter.fromDate = dateFilter;
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        const [schedules, totalCount, statsData] = await Promise.all([
            ExamSchedule.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .populate("createdBy", "name email")
                .populate("updatedBy", "name email")
                .lean(),
            ExamSchedule.countDocuments(filter),
            ExamSchedule.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        scheduled: {
                            $sum: { $cond: [{ $eq: ["$status", "Scheduled"] }, 1, 0] }
                        },
                        ongoing: {
                            $sum: { $cond: [{ $eq: ["$status", "Ongoing"] }, 1, 0] }
                        },
                        completed: {
                            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
                        },
                        cancelled: {
                            $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] }
                        },
                        allCenters: { $push: "$centers" }
                    }
                }
            ])
        ]);

        // Calculate unique centres count from aggregated data
        let uniqueCentresCount = 0;
        if (statsData.length > 0 && Array.isArray(statsData[0].allCenters)) {
            const set = new Set();
            statsData[0].allCenters.flat().forEach(c => {
                if (c) set.add(c.trim());
            });
            uniqueCentresCount = set.size;
        }

        const stats = statsData[0] || {
            total: 0,
            scheduled: 0,
            ongoing: 0,
            completed: 0,
            cancelled: 0
        };

        return res.status(200).json({
            success: true,
            data: schedules,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount / limitNum) || 1
            },
            stats: {
                total: stats.total,
                scheduled: stats.scheduled,
                ongoing: stats.ongoing,
                completed: stats.completed,
                cancelled: stats.cancelled,
                uniqueCentres: uniqueCentresCount
            }
        });
    } catch (error) {
        console.error("Error in getExamSchedules:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch exam schedules",
            error: error.message
        });
    }
};

/**
 * GET /api/operations/exam-schedule/:id
 * Retrieve single exam schedule
 */
export const getExamScheduleById = async (req, res) => {
    try {
        const schedule = await ExamSchedule.findById(req.params.id)
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email")
            .lean();

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Exam schedule not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error("Error in getExamScheduleById:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch exam schedule",
            error: error.message
        });
    }
};

/**
 * POST /api/operations/exam-schedule
 * Create new exam schedule
 */
export const createExamSchedule = async (req, res) => {
    try {
        const {
            examName,
            className,
            session,
            centers,
            fromDate,
            toDate,
            fromTime,
            toTime,
            days,
            status = "Scheduled",
            description = ""
        } = req.body;

        const normalizedClasses = normalizeArray(className);
        const normalizedCenters = normalizeArray(centers);
        const normalizedDays = normalizeArray(days);

        if (!examName || !examName.trim()) {
            return res.status(400).json({ success: false, message: "Exam name is required" });
        }
        if (normalizedClasses.length === 0) {
            return res.status(400).json({ success: false, message: "At least one class is required" });
        }
        if (!session || !session.trim()) {
            return res.status(400).json({ success: false, message: "Session is required" });
        }
        if (normalizedCenters.length === 0) {
            return res.status(400).json({ success: false, message: "At least one center is required" });
        }
        if (!fromDate) {
            return res.status(400).json({ success: false, message: "From date is required" });
        }
        if (!toDate) {
            return res.status(400).json({ success: false, message: "To date is required" });
        }
        if (!fromTime || !fromTime.trim()) {
            return res.status(400).json({ success: false, message: "From time is required" });
        }
        if (!toTime || !toTime.trim()) {
            return res.status(400).json({ success: false, message: "To time is required" });
        }

        const newSchedule = new ExamSchedule({
            examName: examName.trim(),
            className: normalizedClasses,
            session: session.trim(),
            centers: normalizedCenters,
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            fromTime: fromTime.trim(),
            toTime: toTime.trim(),
            days: normalizedDays,
            status,
            description: description ? description.trim() : "",
            createdBy: req.user?._id || req.user?.id,
            updatedBy: req.user?._id || req.user?.id
        });

        await newSchedule.save();

        return res.status(201).json({
            success: true,
            message: "Exam schedule created successfully",
            data: newSchedule
        });
    } catch (error) {
        console.error("Error in createExamSchedule:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create exam schedule",
            error: error.message
        });
    }
};

/**
 * PUT /api/operations/exam-schedule/:id
 * Update existing exam schedule
 */
export const updateExamSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await ExamSchedule.findById(id);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Exam schedule not found"
            });
        }

        const {
            examName,
            className,
            session,
            centers,
            fromDate,
            toDate,
            fromTime,
            toTime,
            days,
            status,
            description
        } = req.body;

        if (examName !== undefined) schedule.examName = examName.trim();
        if (className !== undefined) schedule.className = normalizeArray(className);
        if (session !== undefined) schedule.session = session.trim();
        if (centers !== undefined) schedule.centers = normalizeArray(centers);
        if (fromDate !== undefined) schedule.fromDate = new Date(fromDate);
        if (toDate !== undefined) schedule.toDate = new Date(toDate);
        if (fromTime !== undefined) schedule.fromTime = fromTime.trim();
        if (toTime !== undefined) schedule.toTime = toTime.trim();
        if (days !== undefined) schedule.days = normalizeArray(days);
        if (status !== undefined) schedule.status = status;
        if (description !== undefined) schedule.description = description.trim();

        schedule.updatedBy = req.user?._id || req.user?.id;

        await schedule.save();

        return res.status(200).json({
            success: true,
            message: "Exam schedule updated successfully",
            data: schedule
        });
    } catch (error) {
        console.error("Error in updateExamSchedule:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update exam schedule",
            error: error.message
        });
    }
};

/**
 * DELETE /api/operations/exam-schedule/:id
 * Delete single exam schedule
 */
export const deleteExamSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await ExamSchedule.findByIdAndDelete(id);

        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: "Exam schedule not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Exam schedule deleted successfully"
        });
    } catch (error) {
        console.error("Error in deleteExamSchedule:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete exam schedule",
            error: error.message
        });
    }
};

/**
 * POST /api/operations/exam-schedule/bulk-delete
 * Delete multiple exam schedules
 */
export const bulkDeleteExamSchedules = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of IDs to delete"
            });
        }

        const result = await ExamSchedule.deleteMany({ _id: { $in: ids } });

        return res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} exam schedule(s)`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Error in bulkDeleteExamSchedules:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to bulk delete exam schedules",
            error: error.message
        });
    }
};

/**
 * POST /api/operations/exam-schedule/import
 * Bulk import exam schedules from Excel/CSV parsed records
 */
export const importExamSchedules = async (req, res) => {
    try {
        const records = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid data format. Expected an array of records."
            });
        }

        const validDocs = [];
        const errors = [];

        records.forEach((row, index) => {
            const rowNum = index + 1;
            const examName = row.examName || row["Exam Name"] || row["exam_name"];
            const className = row.className || row["Class"] || row["class_name"] || row["Classes"];
            const session = row.session || row["Session"] || row["session_name"];
            const centers = row.centers || row.center || row["Center"] || row["Centers"] || row["center_name"];
            const fromDate = row.fromDate || row["From Date"] || row["from_date"];
            const toDate = row.toDate || row["To Date"] || row["to_date"];
            const fromTime = row.fromTime || row["From Time"] || row["from_time"] || "10:00 AM";
            const toTime = row.toTime || row["To Time"] || row["to_time"] || "01:00 PM";
            const days = row.days || row["Days"] || row["Week Days"] || row["days_of_week"] || [];
            const status = row.status || row["Status"] || "Scheduled";
            const description = row.description || row["Remarks"] || row["Description"] || "";

            const normalizedClasses = normalizeArray(className);
            const normalizedCenters = normalizeArray(centers);
            const normalizedDays = normalizeArray(days);

            if (!examName || !String(examName).trim()) {
                errors.push(`Row ${rowNum}: Exam name is missing`);
                return;
            }
            if (normalizedClasses.length === 0) {
                errors.push(`Row ${rowNum}: Class is missing`);
                return;
            }
            if (!session || !String(session).trim()) {
                errors.push(`Row ${rowNum}: Session is missing`);
                return;
            }
            if (normalizedCenters.length === 0) {
                errors.push(`Row ${rowNum}: Center(s) missing`);
                return;
            }
            if (!fromDate || isNaN(new Date(fromDate).getTime())) {
                errors.push(`Row ${rowNum}: Valid 'From Date' is required`);
                return;
            }
            if (!toDate || isNaN(new Date(toDate).getTime())) {
                errors.push(`Row ${rowNum}: Valid 'To Date' is required`);
                return;
            }

            validDocs.push({
                examName: String(examName).trim(),
                className: normalizedClasses,
                session: String(session).trim(),
                centers: normalizedCenters,
                fromDate: new Date(fromDate),
                toDate: new Date(toDate),
                fromTime: String(fromTime).trim(),
                toTime: String(toTime).trim(),
                days: normalizedDays,
                status: ["Scheduled", "Ongoing", "Completed", "Cancelled"].includes(status) ? status : "Scheduled",
                description: String(description || "").trim(),
                createdBy: req.user?._id || req.user?.id,
                updatedBy: req.user?._id || req.user?.id
            });
        });

        if (validDocs.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid records found to import",
                errors
            });
        }

        const inserted = await ExamSchedule.insertMany(validDocs, { ordered: false });

        return res.status(201).json({
            success: true,
            message: `Successfully imported ${inserted.length} exam schedule(s)`,
            importedCount: inserted.length,
            errorsCount: errors.length,
            errors: errors.slice(0, 10)
        });
    } catch (error) {
        console.error("Error in importExamSchedules:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to import exam schedules",
            error: error.message
        });
    }
};

/**
 * GET /api/operations/exam-schedule/export
 * Fetch all matching exam schedules formatted for Excel/CSV export
 */
export const exportExamSchedules = async (req, res) => {
    try {
        const {
            search = "",
            session,
            className,
            center,
            status,
            fromDate,
            toDate
        } = req.query;

        const filter = {};

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { examName: searchRegex },
                { description: searchRegex },
                { session: searchRegex },
                { className: searchRegex },
                { centers: searchRegex }
            ];
        }

        if (session && session !== "all") {
            filter.session = session;
        }

        if (className && className !== "all") {
            const classList = normalizeArray(className);
            if (classList.length > 0) filter.className = { $in: classList };
        }

        if (center && center !== "all") {
            const centerList = normalizeArray(center);
            if (centerList.length > 0) filter.centers = { $in: centerList };
        }

        if (status && status !== "all") {
            filter.status = status;
        }

        if (fromDate || toDate) {
            const dateFilter = {};
            if (fromDate) dateFilter.$gte = new Date(fromDate);
            if (toDate) {
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                dateFilter.$lte = endOfDay;
            }
            filter.fromDate = dateFilter;
        }

        const schedules = await ExamSchedule.find(filter)
            .sort({ fromDate: 1 })
            .lean();

        const exportData = schedules.map(item => ({
            "Exam Name": item.examName,
            "Class": Array.isArray(item.className) ? item.className.join(", ") : item.className,
            "Session": item.session,
            "Centers": Array.isArray(item.centers) ? item.centers.join(", ") : item.centers,
            "From Date": item.fromDate ? new Date(item.fromDate).toISOString().split("T")[0] : "",
            "To Date": item.toDate ? new Date(item.toDate).toISOString().split("T")[0] : "",
            "From Time": item.fromTime,
            "To Time": item.toTime,
            "Days of Week": Array.isArray(item.days) ? item.days.join(", ") : item.days,
            "Status": item.status,
            "Remarks": item.description || ""
        }));

        return res.status(200).json({
            success: true,
            data: exportData
        });
    } catch (error) {
        console.error("Error in exportExamSchedules:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to export exam schedules",
            error: error.message
        });
    }
};
