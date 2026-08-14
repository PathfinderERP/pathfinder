import LogCalendar from "../models/LogCalendar.js";
import User from "../models/User.js";
import TomorrowPlanner from "../models/TomorrowPlanner.js";
import { syncPlanToLogCalendar } from "./tomorrowPlannerController.js";

const mapRoleToDepartment = (role) => {
    if (!role) return "Operations";
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

// Create upcoming log
export const createLog = async (req, res) => {
    try {
        const {
            title,
            activityType,
            startDate,
            endDate,
            time,
            place,
            priority,
            status,
            notes,
            color,
            centre,
            centreName
        } = req.body;

        if (!title || !startDate) {
            return res.status(400).json({ message: "Title and Start Date are required." });
        }

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = endDate ? new Date(endDate) : new Date(startDate);
        end.setHours(23, 59, 59, 999);

        if (end < start) {
            return res.status(400).json({ message: "End Date cannot be before Start Date." });
        }

        const department = mapRoleToDepartment(req.user.role);
        const userRoleStr = Array.isArray(req.user.role) ? req.user.role.join(", ") : (req.user.role || "");

        const newLog = new LogCalendar({
            user: req.user._id,
            userName: req.user.name || "Unknown User",
            userRole: userRoleStr,
            department,
            centre: centre || null,
            centreName: centreName || "",
            title,
            activityType: activityType || "Meeting",
            startDate: start,
            endDate: end,
            time: time || "",
            place: place || "",
            priority: priority || "Medium",
            status: status || "Upcoming",
            notes: notes || "",
            color: color || "#6366f1"
        });

        await newLog.save();
        res.status(201).json({ message: "Upcoming log created successfully.", log: newLog });
    } catch (error) {
        console.error("Error creating log calendar entry:", error);
        res.status(500).json({ message: "Failed to create upcoming log.", error: error.message });
    }
};

// Get current user's upcoming logs (for Log Calendar view)
export const getMyLogs = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let query = { user: req.user._id };

        if (startDate && endDate) {
            const reqStart = new Date(startDate);
            reqStart.setHours(0, 0, 0, 0);
            const reqEnd = new Date(endDate);
            reqEnd.setHours(23, 59, 59, 999);

            query = {
                user: req.user._id,
                startDate: { $lte: reqEnd },
                endDate: { $gte: reqStart }
            };

            // On-the-fly sync check for any TomorrowPlanner items in this date range
            try {
                const plans = await TomorrowPlanner.find({
                    user: req.user._id,
                    $or: [
                        { planDate: { $gte: reqStart, $lte: reqEnd } },
                        { plantDate: { $gte: reqStart, $lte: reqEnd } }
                    ]
                });
                for (const p of plans) {
                    if (p.tasks && p.tasks.length > 0) {
                        const pDate = p.planDate || p.plantDate;
                        await syncPlanToLogCalendar(req.user, pDate, p.tasks);
                    }
                }
            } catch (syncErr) {
                console.error("Error on-the-fly syncing in getMyLogs:", syncErr);
            }
        }

        const logs = await LogCalendar.find(query)
            .populate("centre", "centreName")
            .sort({ startDate: 1 });

        res.status(200).json({ logs });
    } catch (error) {
        console.error("Error fetching my log calendar:", error);
        res.status(500).json({ message: "Failed to fetch log calendar entries.", error: error.message });
    }
};

// Get all upcoming logs for Log Tracking department board
export const getAllUpcomingLogs = async (req, res) => {
    try {
        const { startDate, endDate, centres, roles, search, status } = req.query;

        let query = {};

        if (startDate && endDate) {
            const reqStart = new Date(startDate);
            reqStart.setHours(0, 0, 0, 0);
            const reqEnd = new Date(endDate);
            reqEnd.setHours(23, 59, 59, 999);

            query.startDate = { $lte: reqEnd };
            query.endDate = { $gte: reqStart };

            // On-the-fly sync check for any TomorrowPlanner items in this date range
            try {
                const plans = await TomorrowPlanner.find({
                    $or: [
                        { planDate: { $gte: reqStart, $lte: reqEnd } },
                        { plantDate: { $gte: reqStart, $lte: reqEnd } }
                    ]
                }).populate("user");
                for (const p of plans) {
                    if (p.user && p.tasks && p.tasks.length > 0) {
                        const pDate = p.planDate || p.plantDate;
                        await syncPlanToLogCalendar(p.user, pDate, p.tasks);
                    }
                }
            } catch (syncErr) {
                console.error("Error on-the-fly syncing in getAllUpcomingLogs:", syncErr);
            }
        }

        if (status && status !== "ALL") {
            query.status = status;
        }

        if (centres) {
            const centreList = centres.split(",").filter(Boolean);
            if (centreList.length > 0) {
                query.centre = { $in: centreList };
            }
        }

        if (roles) {
            const roleList = roles.split(",").filter(Boolean);
            if (roleList.length > 0) {
                const regexList = roleList.map(r => new RegExp(r, "i"));
                query.userRole = { $in: regexList };
            }
        }

        if (search && search.trim()) {
            query.$or = [
                { userName: { $regex: search.trim(), $options: "i" } },
                { title: { $regex: search.trim(), $options: "i" } },
                { place: { $regex: search.trim(), $options: "i" } }
            ];
        }

        const logs = await LogCalendar.find(query)
            .populate("user", "name email role centre department")
            .populate("centre", "centreName")
            .sort({ startDate: 1 });

        // Calculate summary stats
        const totalLogs = logs.length;
        const upcomingCount = logs.filter(l => l.status === "Upcoming").length;
        const inProgressCount = logs.filter(l => l.status === "In Progress").length;
        const completedCount = logs.filter(l => l.status === "Completed").length;

        // Group logs by user
        const groupedByUserMap = new Map();

        logs.forEach(log => {
            const userIdStr = log.user?._id?.toString() || log.user?.toString() || log.userName;
            if (!groupedByUserMap.has(userIdStr)) {
                groupedByUserMap.set(userIdStr, {
                    user: log.user || { name: log.userName, role: log.userRole },
                    userName: log.userName,
                    userRole: log.userRole,
                    department: log.department,
                    centreName: log.centreName || log.centre?.centreName || "",
                    logs: []
                });
            }
            groupedByUserMap.get(userIdStr).logs.push(log);
        });

        const groupedUsers = Array.from(groupedByUserMap.values());

        res.status(200).json({
            logs,
            groupedUsers,
            summary: {
                totalLogs,
                upcomingCount,
                inProgressCount,
                completedCount
            }
        });
    } catch (error) {
        console.error("Error fetching board upcoming logs:", error);
        res.status(500).json({ message: "Failed to fetch upcoming logs board.", error: error.message });
    }
};

// Update an upcoming log
export const updateLog = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await LogCalendar.findById(id);

        if (!log) {
            return res.status(404).json({ message: "Upcoming log entry not found." });
        }

        const isOwner = log.user.toString() === req.user._id.toString();
        const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
        const isAdmin = userRoles.some(r => ["superAdmin", "superadmin", "admin"].includes(r));

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to update this entry." });
        }

        const allowedFields = [
            "title", "activityType", "startDate", "endDate", "time",
            "place", "priority", "status", "notes", "color", "centre", "centreName"
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === "startDate" || field === "endDate") {
                    log[field] = new Date(req.body[field]);
                } else {
                    log[field] = req.body[field];
                }
            }
        });

        await log.save();
        res.status(200).json({ message: "Upcoming log updated successfully.", log });
    } catch (error) {
        console.error("Error updating log calendar entry:", error);
        res.status(500).json({ message: "Failed to update upcoming log.", error: error.message });
    }
};

// Delete an upcoming log
export const deleteLog = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await LogCalendar.findById(id);

        if (!log) {
            return res.status(404).json({ message: "Upcoming log entry not found." });
        }

        const isOwner = log.user.toString() === req.user._id.toString();
        const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
        const isAdmin = userRoles.some(r => ["superAdmin", "superadmin", "admin"].includes(r));

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to delete this entry." });
        }

        await LogCalendar.findByIdAndDelete(id);
        res.status(200).json({ message: "Upcoming log deleted successfully." });
    } catch (error) {
        console.error("Error deleting log calendar entry:", error);
        res.status(500).json({ message: "Failed to delete upcoming log.", error: error.message });
    }
};
