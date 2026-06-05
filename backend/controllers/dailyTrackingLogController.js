import mongoose from "mongoose";
import DailyTrackingLog from "../models/DailyTrackingLog.js";
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";
import XLSX from "xlsx";

// Helper to get midnight in India Standard Time as a standardized UTC Date object
const getMidnightIST = (dateInput) => {
    let date;
    if (!dateInput) {
        date = new Date();
    } else if (typeof dateInput === "string") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return new Date(`${dateInput}T00:00:00.000Z`);
        }
        date = new Date(dateInput);
    } else {
        date = new Date(dateInput);
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
};

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
        if (!workDetails) {
            return res.status(400).json({ message: "Work Details are required." });
        }

        const todayUTC = getMidnightIST();
        const startRange = new Date(todayUTC.getTime() - 12 * 60 * 60 * 1000);
        const endRange = new Date(todayUTC.getTime() + 12 * 60 * 60 * 1000);

        const department = mapRoleToDepartment(req.user.role);

        // Find or create daily log document using range query to handle both UTC and local timezone formats
        let log = await DailyTrackingLog.findOne({ 
            user: req.user._id, 
            date: { $gte: startRange, $lt: endRange } 
        });
        if (!log) {
            log = new DailyTrackingLog({
                user: req.user._id,
                userName: req.user.name,
                department,
                date: todayUTC,
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
        const targetDate = getMidnightIST(date);
        const startRange = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
        const endRange = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);

        const log = await DailyTrackingLog.findOne({ 
            user: req.user._id, 
            date: { $gte: startRange, $lt: endRange } 
        });
        res.status(200).json({ log: log || { activities: [] } });
    } catch (error) {
        console.error("Error fetching my tracking log:", error);
        res.status(500).json({ message: "Failed to fetch log details.", error: error.message });
    }
};

// Helper to query and construct board logs data shared by get and export
const getLogsDataHelper = async (req) => {
    const { date, role, employeeName, centreId } = req.query;
    const targetDate = getMidnightIST(date);
    const startRange = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
    const endRange = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);

    const userQuery = { isActive: true };
    
    const roleDBMapping = {
        admin: ["admin"],
        superadmin: ["superAdmin"],
        coordinator: ["coordinator", "Class_Coordinator"],
        accounts: ["accounts"],
        hr: ["hr"],
        digital: ["digital"],
        marketing: ["marketing"],
        telecaller: ["telecaller", "centralizedTelecaller"],
        counsellor: ["counsellor"],
        teacher: ["teacher"],
        zonalmanager: ["zonalManager", "zonalmanager"]
    };

    // Handle multi-select roles
    let rolesFilter = [];
    if (role) {
        if (Array.isArray(role)) {
            rolesFilter = role;
        } else if (typeof role === "string") {
            rolesFilter = role.split(",").map(r => r.trim()).filter(Boolean);
        }
    }

    if (rolesFilter.length > 0 && !rolesFilter.includes("All")) {
        let mappedRoles = [];
        for (const r of rolesFilter) {
            const dbRoles = roleDBMapping[r.toLowerCase()];
            if (dbRoles) {
                mappedRoles.push(...dbRoles);
            } else {
                mappedRoles.push(r);
            }
        }
        userQuery.role = { $in: mappedRoles };
    } else {
        // If empty or "All", limit to users with any of the supported roles
        const allSupportedRoles = Object.values(roleDBMapping).flat();
        userQuery.role = { $in: allSupportedRoles };
    }

    if (employeeName) {
        userQuery.name = { $regex: employeeName, $options: "i" };
    }

    const isSuperAdmin = Array.isArray(req.user.role) 
        ? req.user.role.includes("superAdmin") || req.user.role.includes("superadmin")
        : req.user.role === "superAdmin" || req.user.role === "superadmin";

    // Handle multi-select centres
    let centresFilter = [];
    if (centreId) {
        if (Array.isArray(centreId)) {
            centresFilter = centreId;
        } else if (typeof centreId === "string") {
            centresFilter = centreId.split(",").map(c => c.trim()).filter(Boolean);
        }
    }

    // Determine the allowed centre IDs for filtering by employee primaryCentre
    let allowedCentreIds = [];
    let shouldFilterCentres = false;

    if (!isSuperAdmin) {
        // Find logged-in user's Employee document to get their primaryCentre and assigned centres
        const loggedInEmployee = await Employee.findOne({ user: req.user._id });
        const userCentreIds = [];

        if (loggedInEmployee) {
            if (loggedInEmployee.primaryCentre) {
                userCentreIds.push(loggedInEmployee.primaryCentre.toString());
            }
            if (Array.isArray(loggedInEmployee.centres)) {
                loggedInEmployee.centres.forEach(c => {
                    userCentreIds.push(c.toString());
                });
            }
        }

        // Fallback/Legacy User model centres
        const userCentres = req.user.centres || [];
        userCentres.forEach(c => {
            userCentreIds.push(c._id ? c._id.toString() : c.toString());
        });
        if (req.user.centre) {
            userCentreIds.push(req.user.centre._id ? req.user.centre._id.toString() : req.user.centre.toString());
        }
        
        const uniqueUserCentreIds = [...new Set(userCentreIds)].filter(Boolean);

        if (uniqueUserCentreIds.length > 0) {
            shouldFilterCentres = true;
            if (centresFilter.length > 0 && !centresFilter.includes("All")) {
                allowedCentreIds = uniqueUserCentreIds.filter(c => centresFilter.includes(c));
                if (allowedCentreIds.length === 0) {
                    return { combinedLogs: [], targetDate };
                }
            } else {
                allowedCentreIds = uniqueUserCentreIds;
            }
        } else {
            return { combinedLogs: [], targetDate };
        }
    } else {
        // SuperAdmin
        if (centresFilter.length > 0 && !centresFilter.includes("All")) {
            shouldFilterCentres = true;
            allowedCentreIds = centresFilter;
        }
    }

    if (shouldFilterCentres) {
        const objectIdCentres = allowedCentreIds.map(id => {
            try {
                return new mongoose.Types.ObjectId(id);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        // Always filter by primaryCentre only (as requested)
        const empQuery = { primaryCentre: { $in: objectIdCentres } };

        const employees = await Employee.find(empQuery).select("user");
        const allowedUserIds = employees.map(emp => emp.user).filter(Boolean);
        userQuery._id = { $in: allowedUserIds };
    }

    const users = await User.find(userQuery).select("name role designation profileImage centres centre");

    // Fetch Employee details to get their primaryCentre name for display
    const employeesForUsers = await Employee.find({
        user: { $in: users.map(u => u._id) }
    }).populate("primaryCentre", "centreName");

    const employeeMap = new Map();
    for (const emp of employeesForUsers) {
        if (emp.user) {
            employeeMap.set(emp.user.toString(), emp.primaryCentre);
        }
    }

    // Find existing logs for the day
    const logQuery = { 
        date: { $gte: startRange, $lt: endRange },
        user: { $in: users.map(u => u._id) }
    };

    const logs = await DailyTrackingLog.find(logQuery)
        .populate("user", "name role designation profileImage");

    // Map logs by user ID string
    const logMap = new Map();
    for (const log of logs) {
        if (log.user) {
            logMap.set(log.user._id.toString(), log);
        }
    }

    // Merge users with their logs (or create empty logs)
    const combinedLogs = users.map(user => {
        const existingLog = logMap.get(user._id.toString());
        const primaryCentre = employeeMap.get(user._id.toString());

        const formattedUser = {
            _id: user._id,
            name: user.name,
            role: user.role,
            designation: user.designation,
            profileImage: user.profileImage,
            primaryCentre: primaryCentre
        };

        if (existingLog) {
            // Ensure user in existingLog is populated with primaryCentre info
            const logObj = existingLog.toObject ? existingLog.toObject() : existingLog;
            logObj.user = formattedUser;
            return logObj;
        }

        return {
            _id: `temp_${user._id}`,
            user: formattedUser,
            userName: user.name,
            department: user.role,
            date: targetDate,
            activities: [],
            noEntry: true
        };
    });

    // Sort combined list by userName
    combinedLogs.sort((a, b) => a.userName.localeCompare(b.userName));

    return { combinedLogs, targetDate };
};

const getDisplayRoleName = (role) => {
    if (!role) return "Employee";
    const rStr = Array.isArray(role) ? role.join(", ") : role;
    const normalized = rStr.toLowerCase();
    if (normalized.includes("admin")) {
        if (normalized.includes("super")) return "Superadmin";
        return "Admin";
    }
    if (normalized.includes("coordinator")) return "Coordinator";
    if (normalized.includes("telecaller")) return "Telecaller";
    if (normalized.includes("accounts")) return "Accounts";
    if (normalized.includes("hr")) return "HR";
    if (normalized.includes("digital")) return "Digital";
    if (normalized.includes("marketing")) return "Marketing";
    if (normalized.includes("counsellor")) return "Counsellor";
    if (normalized.includes("teacher")) return "Teacher";
    if (normalized.includes("zonal") && normalized.includes("manager")) return "Zonal Manager";
    if (normalized === "zonalmanager") return "Zonal Manager";
    return rStr.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
};

// Get department/board logs (grouped or filtered)
export const getDepartmentLogs = async (req, res) => {
    try {
        const { combinedLogs } = await getLogsDataHelper(req);
        res.status(200).json({ logs: combinedLogs });
    } catch (error) {
        console.error("Error fetching board logs:", error);
        res.status(500).json({ message: "Failed to fetch board logs.", error: error.message });
    }
};

// Export department/board logs to Excel format
export const exportDepartmentLogs = async (req, res) => {
    try {
        const { combinedLogs, targetDate } = await getLogsDataHelper(req);

        const reportData = [];
        for (const log of combinedLogs) {
            const displayRole = getDisplayRoleName(log.user?.role || log.department);
            const rowBase = {
                Date: new Date(log.date).toLocaleDateString('en-GB'),
                "Employee Name": log.userName || log.user?.name || "Unknown",
                "Role / Department": displayRole,
                "Designation": log.user?.designation || "Employee",
                "Primary Centre": log.user?.primaryCentre?.centreName || "N/A"
            };

            if (log.activities && log.activities.length > 0) {
                for (const act of log.activities) {
                    reportData.push({
                        ...rowBase,
                        "Status": act.status || "Completed",
                        "Work Details": act.workDetails || "N/A",
                        "Completed Work / Deliverables": act.completedWork || "N/A"
                    });
                }
            } else {
                reportData.push({
                    ...rowBase,
                    "Status": "No Entry",
                    "Work Details": "No activities logged today.",
                    "Completed Work / Deliverables": "N/A"
                });
            }
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(reportData);
        XLSX.utils.book_append_sheet(wb, ws, "Daily Tracking Logs");

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        const formattedDate = new Date(targetDate).toLocaleDateString('en-GB').replace(/\//g, '-');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Daily_Tracking_Logs_${formattedDate}.xlsx`);
        res.send(buffer);

    } catch (error) {
        console.error("Error exporting board logs:", error);
        res.status(500).json({ message: "Failed to export logs to Excel.", error: error.message });
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
