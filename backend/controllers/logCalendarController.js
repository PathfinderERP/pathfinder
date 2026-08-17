import mongoose from "mongoose";
import LogCalendar from "../models/LogCalendar.js";
import User from "../models/User.js";
import TomorrowPlanner from "../models/TomorrowPlanner.js";
import AssignedTask from "../models/AssignedTask.js";
import { syncPlanToLogCalendar } from "./tomorrowPlannerController.js";
import XLSX from "xlsx";

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

        const startStr = typeof startDate === "string" ? startDate.split("T")[0] : new Date(startDate).toISOString().split("T")[0];
        const endStr = endDate ? (typeof endDate === "string" ? endDate.split("T")[0] : new Date(endDate).toISOString().split("T")[0]) : startStr;

        const start = new Date(`${startStr}T00:00:00.000Z`);
        const end = new Date(`${endStr}T23:59:59.999Z`);

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
            const startStr = typeof startDate === "string" ? startDate.split("T")[0] : new Date(startDate).toISOString().split("T")[0];
            const endStr = typeof endDate === "string" ? endDate.split("T")[0] : new Date(endDate).toISOString().split("T")[0];
            const reqStart = new Date(`${startStr}T00:00:00.000Z`);
            const reqEnd = new Date(`${endStr}T23:59:59.999Z`);

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
                        { planDate: { $gte: new Date(reqStart.getTime() - 12 * 60 * 60 * 1000), $lte: new Date(reqEnd.getTime() + 12 * 60 * 60 * 1000) } },
                        { plantDate: { $gte: new Date(reqStart.getTime() - 12 * 60 * 60 * 1000), $lte: new Date(reqEnd.getTime() + 12 * 60 * 60 * 1000) } }
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
            const startStr = typeof startDate === "string" ? startDate.split("T")[0] : new Date(startDate).toISOString().split("T")[0];
            const endStr = typeof endDate === "string" ? endDate.split("T")[0] : new Date(endDate).toISOString().split("T")[0];
            const reqStart = new Date(`${startStr}T00:00:00.000Z`);
            const reqEnd = new Date(`${endStr}T23:59:59.999Z`);

            query.startDate = { $lte: reqEnd };
            query.endDate = { $gte: reqStart };

            // On-the-fly sync check for any TomorrowPlanner items in this date range
            try {
                const plans = await TomorrowPlanner.find({
                    $or: [
                        { planDate: { $gte: new Date(reqStart.getTime() - 12 * 60 * 60 * 1000), $lte: new Date(reqEnd.getTime() + 12 * 60 * 60 * 1000) } },
                        { plantDate: { $gte: new Date(reqStart.getTime() - 12 * 60 * 60 * 1000), $lte: new Date(reqEnd.getTime() + 12 * 60 * 60 * 1000) } }
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

        const oldStartDate = log.startDate ? new Date(log.startDate) : null;

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === "startDate" || field === "endDate") {
                    const dateStr = typeof req.body[field] === "string" ? req.body[field].split("T")[0] : new Date(req.body[field]).toISOString().split("T")[0];
                    if (field === "startDate") log[field] = new Date(`${dateStr}T00:00:00.000Z`);
                    if (field === "endDate") log[field] = new Date(`${dateStr}T23:59:59.999Z`);
                } else {
                    log[field] = req.body[field];
                }
            }
        });

        // Sync updates with TomorrowPlanner / AssignedTask if linked
        if (log.sourceModule === "MarketingPlanner" || log.marketingTaskId) {
            const plannerStatus = log.status === "Completed" ? "Completed" : "Planned";
            const newDateStr = log.startDate.toISOString().split("T")[0];
            const oldDateStr = oldStartDate ? oldStartDate.toISOString().split("T")[0] : newDateStr;

            if (log.marketingTaskId && mongoose.Types.ObjectId.isValid(log.marketingTaskId)) {
                if (newDateStr !== oldDateStr) {
                    // Date was moved: pull from old planner and push to new planner
                    let taskObj = null;
                    const oldPlans = await TomorrowPlanner.find({ user: log.user, "tasks._id": log.marketingTaskId });
                    for (const op of oldPlans) {
                        const found = op.tasks.id(log.marketingTaskId);
                        if (found) {
                            taskObj = found.toObject();
                            op.tasks.pull({ _id: log.marketingTaskId });
                            await op.save();
                        }
                    }

                    if (taskObj) {
                        taskObj.taskDetails = log.title;
                        taskObj.activityType = log.activityType;
                        taskObj.place = log.place;
                        taskObj.time = log.time;
                        taskObj.priority = log.priority;
                        taskObj.notes = log.notes;
                        taskObj.status = plannerStatus;

                        const startRange = new Date(log.startDate.getTime() - 12 * 60 * 60 * 1000);
                        const endRange = new Date(log.startDate.getTime() + 12 * 60 * 60 * 1000);
                        let targetPlan = await TomorrowPlanner.findOne({
                            user: log.user,
                            $or: [
                                { planDate: { $gte: startRange, $lt: endRange } },
                                { plantDate: { $gte: startRange, $lt: endRange } }
                            ]
                        });

                        if (!targetPlan) {
                            targetPlan = new TomorrowPlanner({
                                user: log.user,
                                userName: log.userName,
                                department: log.department,
                                planDate: log.startDate,
                                tasks: []
                            });
                        }
                        targetPlan.tasks.push(taskObj);
                        await targetPlan.save();
                    }
                } else {
                    // Same date: update in TomorrowPlanner
                    await TomorrowPlanner.updateOne(
                        { user: log.user, "tasks._id": log.marketingTaskId },
                        {
                            $set: {
                                "tasks.$.taskDetails": log.title,
                                "tasks.$.activityType": log.activityType,
                                "tasks.$.place": log.place,
                                "tasks.$.time": log.time,
                                "tasks.$.priority": log.priority,
                                "tasks.$.notes": log.notes,
                                "tasks.$.status": plannerStatus
                            }
                        }
                    );
                }

                // Also update AssignedTask if applicable
                await AssignedTask.findByIdAndUpdate(log.marketingTaskId, {
                    activityType: log.activityType,
                    schoolName: log.place,
                    time: log.time,
                    priority: log.priority,
                    notes: log.notes,
                    status: plannerStatus === "Completed" ? "Completed" : "Pending",
                    planDate: log.startDate
                });
            }
        }

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

        // If this log was synced from TomorrowPlanner or has marketingTaskId:
        if (log.sourceModule === "MarketingPlanner" || log.marketingTaskId) {
            if (log.marketingTaskId && mongoose.Types.ObjectId.isValid(log.marketingTaskId)) {
                await TomorrowPlanner.updateMany(
                    { user: log.user, "tasks._id": log.marketingTaskId },
                    { $pull: { tasks: { _id: log.marketingTaskId } } }
                );
                await TomorrowPlanner.updateMany(
                    { user: log.user, "tasks.assignedTaskRef": log.marketingTaskId },
                    { $pull: { tasks: { assignedTaskRef: log.marketingTaskId } } }
                );
                await AssignedTask.findByIdAndDelete(log.marketingTaskId);
                await AssignedTask.updateMany({ assignedTo: log.user, _id: log.marketingTaskId }, { $set: { status: "Cancelled" } });
            }

            // Also check for matching tasks by date/details in TomorrowPlanner in case marketingTaskId was empty or legacy
            const logStart = new Date(log.startDate);
            const startRange = new Date(logStart.getTime() - 12 * 60 * 60 * 1000);
            const endRange = new Date(logStart.getTime() + 12 * 60 * 60 * 1000);

            const matchingPlans = await TomorrowPlanner.find({
                user: log.user,
                $or: [
                    { planDate: { $gte: startRange, $lt: endRange } },
                    { plantDate: { $gte: startRange, $lt: endRange } }
                ]
            });

            for (const plan of matchingPlans) {
                const initialLen = plan.tasks.length;
                plan.tasks = plan.tasks.filter(t => {
                    if (log.marketingTaskId && t._id && String(t._id) === String(log.marketingTaskId)) {
                        return false;
                    }
                    if (log.marketingTaskId && t.assignedTaskRef && String(t.assignedTaskRef) === String(log.marketingTaskId)) {
                        return false;
                    }
                    // Match by place / title / activityType if no ID match
                    if (!log.marketingTaskId) {
                        const purposeStr = t.activityPurpose ? `${t.activityPurpose} - ` : "";
                        const placeStr = t.place ? ` @ ${t.place}` : "";
                        const expectedTitle = `[Marketing] ${purposeStr}${t.activityType || 'Field Activity'}${placeStr}`;
                        if (expectedTitle === log.title || (t.place && log.place && t.place === log.place)) {
                            return false;
                        }
                    }
                    return true;
                });
                if (plan.tasks.length !== initialLen) {
                    await plan.save();
                }
            }

            if (log.marketingTaskId) {
                await LogCalendar.deleteMany({ user: log.user, marketingTaskId: log.marketingTaskId });
            }
        }

        await LogCalendar.findByIdAndDelete(id);
        res.status(200).json({ message: "Upcoming log deleted successfully." });
    } catch (error) {
        console.error("Error deleting log calendar entry:", error);
        res.status(500).json({ message: "Failed to delete upcoming log.", error: error.message });
    }
};

// Export upcoming logs to Excel with 2 sheets: User-wise summary and Detailed report
export const exportUpcomingLogs = async (req, res) => {
    try {
        const { startDate, endDate, centres, roles, search, status } = req.query;

        let query = {};

        if (startDate && endDate) {
            const startStr = typeof startDate === "string" ? startDate.split("T")[0] : new Date(startDate).toISOString().split("T")[0];
            const endStr = typeof endDate === "string" ? endDate.split("T")[0] : new Date(endDate).toISOString().split("T")[0];
            const reqStart = new Date(`${startStr}T00:00:00.000Z`);
            const reqEnd = new Date(`${endStr}T23:59:59.999Z`);

            query.startDate = { $lte: reqEnd };
            query.endDate = { $gte: reqStart };

            // On-the-fly sync check for any TomorrowPlanner items in this date range
            try {
                const plans = await TomorrowPlanner.find({
                    $or: [
                        { planDate: { $gte: new Date(reqStart.getTime() - 12 * 60 * 60 * 1000), $lte: new Date(reqEnd.getTime() + 12 * 60 * 60 * 1000) } },
                        { plantDate: { $gte: new Date(reqStart.getTime() - 12 * 60 * 60 * 1000), $lte: new Date(reqEnd.getTime() + 12 * 60 * 60 * 1000) } }
                    ]
                }).populate("user");
                for (const p of plans) {
                    if (p.user && p.tasks && p.tasks.length > 0) {
                        const pDate = p.planDate || p.plantDate;
                        await syncPlanToLogCalendar(p.user, pDate, p.tasks);
                    }
                }
            } catch (syncErr) {
                console.error("Error on-the-fly syncing in exportUpcomingLogs:", syncErr);
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

        // Group by user for Sheet 1
        const userMap = new Map();
        logs.forEach(log => {
            const userId = log.user?._id?.toString() || log.userName || "Unknown";
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    userName: log.userName || log.user?.name || "Unknown",
                    userRole: log.userRole || (Array.isArray(log.user?.role) ? log.user.role.join(", ") : log.user?.role) || "",
                    centreName: log.centreName || log.centre?.centreName || "N/A",
                    totalCount: 0,
                    completedCount: 0,
                    upcomingCount: 0
                });
            }
            const u = userMap.get(userId);
            u.totalCount++;
            if (log.status === "Completed") {
                u.completedCount++;
            } else {
                u.upcomingCount++;
            }
        });

        // Sheet 1: User-wise Log Counts Summary
        const userSummaryData = Array.from(userMap.values()).map((u, idx) => ({
            "SL No.": idx + 1,
            "User Name": u.userName,
            "Role": u.userRole,
            "Centre": u.centreName,
            "Total Log Counts": u.totalCount,
            "Completed Log Counts": u.completedCount,
            "Upcoming / Pending Log Counts": u.upcomingCount
        }));

        // Sheet 2: Detailed Report Summary
        const detailedReportData = logs.map((log, idx) => {
            const sStr = log.startDate ? new Date(log.startDate).toISOString().split("T")[0] : "";
            const eStr = log.endDate ? new Date(log.endDate).toISOString().split("T")[0] : "";
            const dateDisplay = (sStr && eStr && sStr !== eStr) ? `${sStr} to ${eStr}` : sStr;

            return {
                "SL No.": idx + 1,
                "Date": dateDisplay,
                "User Name": log.userName || log.user?.name || "Unknown",
                "Role": log.userRole || (Array.isArray(log.user?.role) ? log.user.role.join(", ") : log.user?.role) || "",
                "Centre": log.centreName || log.centre?.centreName || "N/A",
                "Activity Title": log.title || "",
                "Activity Type": log.activityType || "",
                "Time": log.time || "",
                "Place / Location": log.place || "",
                "Priority": log.priority || "Medium",
                "Status": log.status || "Upcoming",
                "Notes / Purpose": log.notes || ""
            };
        });

        const wb = XLSX.utils.book_new();
        const wsSummary = XLSX.utils.json_to_sheet(userSummaryData.length > 0 ? userSummaryData : [{ "Message": "No upcoming logs found for this date range / filter selection." }]);
        const wsDetail = XLSX.utils.json_to_sheet(detailedReportData.length > 0 ? detailedReportData : [{ "Message": "No upcoming log entries." }]);

        XLSX.utils.book_append_sheet(wb, wsSummary, "User Wise Log Summary");
        XLSX.utils.book_append_sheet(wb, wsDetail, "Detailed Report Summary");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const startLabel = startDate ? String(startDate).split("T")[0] : "All";
        const endLabel = endDate ? String(endDate).split("T")[0] : "All";
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Upcoming_Calendar_Logs_${startLabel}_to_${endLabel}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error("Error exporting upcoming logs to Excel:", error);
        res.status(500).json({ message: "Failed to export upcoming logs to Excel.", error: error.message });
    }
};
