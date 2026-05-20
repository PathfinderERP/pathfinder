import DailyTrackingLog from "../models/DailyTrackingLog.js";

const mapRoleToDepartment = (role) => {
    if (!role) return "Operations";
    
    // Support string or array of strings
    const r = (Array.isArray(role) ? role[0] : role).toLowerCase();
    
    if (r.includes("teacher") || r.includes("academic") || r.includes("hod")) return "Academics";
    if (r.includes("telecaller")) return "Telecalling";
    if (r.includes("counsellor") || r.includes("admission")) return "Admissions";
    if (r.includes("marketing")) return "Marketing";
    if (r.includes("hr")) return "HR";
    if (r.includes("finance") || r.includes("pay")) return "Finance";
    if (r.includes("incharge") || r.includes("manager") || r.includes("head")) return "Management";
    if (r.includes("admin")) return "Administration";
    return "Operations";
};

// Add a new activity to today's log
export const addOrUpdateActivity = async (req, res) => {
    try {
        const { time, workDetails, completedWork, status } = req.body;
        if (!time || !workDetails) {
            return res.status(400).json({ message: "Time and Work Details are required." });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const department = mapRoleToDepartment(req.user.role);

        // Find or create daily log document
        let log = await DailyTrackingLog.findOne({ user: req.user._id, date: today });
        if (!log) {
            log = new DailyTrackingLog({
                user: req.user._id,
                userName: req.user.name,
                department,
                date: today,
                activities: []
            });
        }

        // Push new activity
        log.activities.push({
            time,
            workDetails,
            completedWork: completedWork || "",
            status: status || "Completed"
        });

        await log.save();

        res.status(201).json({ message: "Activity added successfully.", log });
    } catch (error) {
        console.error("Error adding tracking log activity:", error);
        res.status(500).json({ message: "Failed to add activity log.", error: error.message });
    }
};

// Get current user's log for a specific date
export const getMyLog = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const log = await DailyTrackingLog.findOne({ user: req.user._id, date: targetDate });
        res.status(200).json({ log: log || { activities: [] } });
    } catch (error) {
        console.error("Error fetching my tracking log:", error);
        res.status(500).json({ message: "Failed to fetch log details.", error: error.message });
    }
};

// Get department/board logs (grouped or filtered)
export const getDepartmentLogs = async (req, res) => {
    try {
        const { date, department, employeeName } = req.query;
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const query = { date: targetDate };

        if (department && department !== "All") {
            query.department = department;
        }

        if (employeeName) {
            query.userName = { $regex: employeeName, $options: "i" };
        }

        const logs = await DailyTrackingLog.find(query)
            .populate("user", "name role designation profileImage")
            .sort({ userName: 1 });

        res.status(200).json({ logs });
    } catch (error) {
        console.error("Error fetching department logs:", error);
        res.status(500).json({ message: "Failed to fetch department board logs.", error: error.message });
    }
};

// Update an activity
export const updateActivity = async (req, res) => {
    try {
        const { logId, activityId } = req.params;
        const { time, workDetails, completedWork, status } = req.body;

        const log = await DailyTrackingLog.findById(logId);
        if (!log) {
            return res.status(404).json({ message: "Tracking log not found." });
        }

        // Check ownership (only the log owner or a superAdmin/HR can edit)
        const isOwner = log.user.toString() === req.user._id.toString();
        const isAdminOrHR = req.user.role === "superAdmin" || req.user.role === "hr";
        if (!isOwner && !isAdminOrHR) {
            return res.status(403).json({ message: "Access denied. You can only edit your own logs." });
        }

        const activity = log.activities.id(activityId);
        if (!activity) {
            return res.status(404).json({ message: "Activity details not found." });
        }

        if (time !== undefined) activity.time = time;
        if (workDetails !== undefined) activity.workDetails = workDetails;
        if (completedWork !== undefined) activity.completedWork = completedWork;
        if (status !== undefined) activity.status = status;

        await log.save();

        res.status(200).json({ message: "Activity updated successfully.", log });
    } catch (error) {
        console.error("Error updating tracking log activity:", error);
        res.status(500).json({ message: "Failed to update activity log.", error: error.message });
    }
};

// Delete an activity
export const deleteActivity = async (req, res) => {
    try {
        const { logId, activityId } = req.params;

        const log = await DailyTrackingLog.findById(logId);
        if (!log) {
            return res.status(404).json({ message: "Tracking log not found." });
        }

        // Check ownership
        const isOwner = log.user.toString() === req.user._id.toString();
        const isAdminOrHR = req.user.role === "superAdmin" || req.user.role === "hr";
        if (!isOwner && !isAdminOrHR) {
            return res.status(403).json({ message: "Access denied." });
        }

        log.activities.pull({ _id: activityId });
        await log.save();

        res.status(200).json({ message: "Activity deleted successfully.", log });
    } catch (error) {
        console.error("Error deleting tracking log activity:", error);
        res.status(500).json({ message: "Failed to delete activity log.", error: error.message });
    }
};
