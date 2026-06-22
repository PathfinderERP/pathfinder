import mongoose from "mongoose";
import TomorrowPlanner from "../models/TomorrowPlanner.js";
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";

// Helper: convert a YYYY-MM-DD string or Date → midnight UTC for that calendar date
const getMidnightUTC = (dateInput) => {
    if (!dateInput) {
        const d = new Date();
        const iso = d.toISOString().split("T")[0];
        return new Date(`${iso}T00:00:00.000Z`);
    }
    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return new Date(`${dateInput}T00:00:00.000Z`);
    }
    const d = new Date(dateInput);
    const iso = d.toISOString().split("T")[0];
    return new Date(`${iso}T00:00:00.000Z`);
};

// Helper: get tomorrow's midnight UTC date
const getTomorrowMidnightUTC = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().split("T")[0];
    return new Date(`${iso}T00:00:00.000Z`);
};

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

// ─── Add a task to tomorrow's planner ───────────────────────────────────────
export const addTask = async (req, res) => {
    try {
        const { taskDetails, activityType, place, time, priority, estimatedDuration, notes, planDate } = req.body;
        if (!taskDetails && !activityType) {
            return res.status(400).json({ message: "Task details or Activity Type is required." });
        }

        // planDate can be explicitly passed (e.g. admin adding for a future date).
        // Default = tomorrow
        const targetDate = planDate ? getMidnightUTC(planDate) : getTomorrowMidnightUTC();
        const startRange = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
        const endRange   = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);

        const department = mapRoleToDepartment(req.user.role);

        let plan = await TomorrowPlanner.findOne({
            user: req.user._id,
            planDate: { $gte: startRange, $lt: endRange }
        });

        if (!plan) {
            plan = new TomorrowPlanner({
                user: req.user._id,
                userName: req.user.name,
                department,
                planDate: targetDate,
                tasks: []
            });
        }

        plan.tasks.push({
            taskDetails: taskDetails || `${activityType || 'Activity'} at ${place || 'Unspecified Place'}`,
            activityType: activityType || "",
            place: place || "",
            time: time || "",
            priority: priority || "Medium",
            estimatedDuration: estimatedDuration || "",
            notes: notes || "",
            status: "Planned"
        });

        await plan.save();
        res.status(201).json({ message: "Task added to tomorrow's planner.", plan });
    } catch (error) {
        console.error("Error adding tomorrow planner task:", error);
        res.status(500).json({ message: "Failed to add task.", error: error.message });
    }
};

// ─── Get current user's planner for a given date ────────────────────────────
export const getMyPlan = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = getMidnightUTC(date);
        const startRange = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
        const endRange   = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);

        const plan = await TomorrowPlanner.findOne({
            user: req.user._id,
            planDate: { $gte: startRange, $lt: endRange }
        });

        res.status(200).json({ plan: plan || { tasks: [] } });
    } catch (error) {
        console.error("Error fetching tomorrow plan:", error);
        res.status(500).json({ message: "Failed to fetch plan.", error: error.message });
    }
};

// ─── Get board/department plans (admin view) ─────────────────────────────────
export const getBoardPlans = async (req, res) => {
    try {
        const { date, startDate, endDate, role, employeeName, centreId } = req.query;
        let startRange, endRange;
        let targetDate;

        if (startDate && endDate) {
            const startMidnight = getMidnightUTC(startDate);
            const endMidnight = getMidnightUTC(endDate);
            startRange = new Date(startMidnight.getTime() - 12 * 60 * 60 * 1000);
            endRange   = new Date(endMidnight.getTime() + 12 * 60 * 60 * 1000);
            targetDate = startMidnight;
        } else {
            targetDate = getMidnightUTC(date);
            startRange = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
            endRange   = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);
        }

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
            zonalmanager: ["zonalManager", "zonalmanager"],
            centerincharge: ["centerIncharge", "centerincharge"],
            assistantzonalmanager: ["assistantZonalManager"],
            assistantcenterincharge: ["assistantCenterIncharge"],
            supportstaff: ["supportStaff"]
        };

        let rolesFilter = [];
        if (role) {
            rolesFilter = typeof role === "string"
                ? role.split(",").map(r => r.trim()).filter(Boolean)
                : role;
        }

        if (rolesFilter.length > 0 && !rolesFilter.includes("All")) {
            let mappedRoles = [];
            for (const r of rolesFilter) {
                const dbRoles = roleDBMapping[r.toLowerCase()];
                if (dbRoles) mappedRoles.push(...dbRoles);
                else mappedRoles.push(r);
            }
            userQuery.role = { $in: mappedRoles };
        } else {
            userQuery.role = { $in: Object.values(roleDBMapping).flat() };
        }

        const reqUserRole = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        if (reqUserRole === "assistantzonalmanager" || reqUserRole === "assistantcenterincharge") {
            const allowedSubRoles = ["marketing", "centerIncharge", "centerincharge", "assistantCenterIncharge", "assistantZonalManager", "zonalManager", "zonalmanager", "supportStaff"];
            let activeFilterRoles = [];
            if (userQuery.role && userQuery.role.$in) {
                activeFilterRoles = userQuery.role.$in.filter(r => allowedSubRoles.includes(r));
            } else {
                activeFilterRoles = allowedSubRoles;
            }
            delete userQuery.role;
            userQuery.$or = [
                { role: { $in: activeFilterRoles } },
                { _id: req.user._id || req.user.id }
            ];
        }

        if (employeeName) {
            userQuery.name = { $regex: employeeName, $options: "i" };
        }

        const isSuperAdmin = Array.isArray(req.user.role)
            ? req.user.role.includes("superAdmin") || req.user.role.includes("superadmin")
            : req.user.role === "superAdmin" || req.user.role === "superadmin";

        let centresFilter = [];
        if (centreId) {
            centresFilter = typeof centreId === "string"
                ? centreId.split(",").map(c => c.trim()).filter(Boolean)
                : centreId;
        }

        let allowedCentreIds = [];
        let shouldFilterCentres = false;

        if (!isSuperAdmin) {
            const loggedInEmployee = await Employee.findOne({ user: req.user._id });
            const userCentreIds = [];

            if (loggedInEmployee) {
                if (loggedInEmployee.primaryCentre) userCentreIds.push(loggedInEmployee.primaryCentre.toString());
                if (Array.isArray(loggedInEmployee.centres)) {
                    loggedInEmployee.centres.forEach(c => userCentreIds.push(c.toString()));
                }
            }

            const userCentres = req.user.centres || [];
            userCentres.forEach(c => userCentreIds.push(c._id ? c._id.toString() : c.toString()));
            if (req.user.centre) {
                userCentreIds.push(req.user.centre._id ? req.user.centre._id.toString() : req.user.centre.toString());
            }

            const uniqueUserCentreIds = [...new Set(userCentreIds)].filter(Boolean);
            if (uniqueUserCentreIds.length > 0) {
                shouldFilterCentres = true;
                allowedCentreIds = centresFilter.length > 0 && !centresFilter.includes("All")
                    ? uniqueUserCentreIds.filter(c => centresFilter.includes(c))
                    : uniqueUserCentreIds;

                if (allowedCentreIds.length === 0) return res.status(200).json({ plans: [] });
            } else {
                return res.status(200).json({ plans: [] });
            }
        } else {
            if (centresFilter.length > 0 && !centresFilter.includes("All")) {
                shouldFilterCentres = true;
                allowedCentreIds = centresFilter;
            }
        }

        if (shouldFilterCentres) {
            const objectIdCentres = allowedCentreIds.map(id => {
                try { return new mongoose.Types.ObjectId(id); } catch { return null; }
            }).filter(Boolean);

            const employees = await Employee.find({
                $or: [
                    { primaryCentre: { $in: objectIdCentres } },
                    { centres: { $in: objectIdCentres } }
                ]
            }).select("user");
            const allowedUserIds = employees.map(emp => emp.user).filter(Boolean);

            const centerMatchQuery = [
                { _id: { $in: allowedUserIds } },
                { centres: { $in: objectIdCentres } }
            ];

            if (userQuery.$or) {
                const roleOrQuery = userQuery.$or;
                delete userQuery.$or;
                userQuery.$and = [
                    { $or: roleOrQuery },
                    { $or: centerMatchQuery }
                ];
            } else {
                userQuery.$or = centerMatchQuery;
            }
        }

        const users = await User.find(userQuery).select("name role designation profileImage");

        const employeesForUsers = await Employee.find({
            user: { $in: users.map(u => u._id) }
        }).populate("primaryCentre", "centreName");

        const employeeMap = new Map();
        for (const emp of employeesForUsers) {
            if (emp.user) employeeMap.set(emp.user.toString(), emp.primaryCentre);
        }

        const plans = await TomorrowPlanner.find({
            planDate: { $gte: startRange, $lt: endRange },
            user: { $in: users.map(u => u._id) }
        }).populate("user", "name role designation profileImage");

        const planMap = new Map();
        for (const plan of plans) {
            if (plan.user) {
                const userIdStr = plan.user._id.toString();
                const planObj = plan.toObject ? plan.toObject() : JSON.parse(JSON.stringify(plan));
                if (planMap.has(userIdStr)) {
                    const existingPlan = planMap.get(userIdStr);
                    existingPlan.tasks.push(...(planObj.tasks || []));
                } else {
                    planMap.set(userIdStr, planObj);
                }
            }
        }

        const combined = users.map(user => {
            const existingPlan = planMap.get(user._id.toString());
            const primaryCentre = employeeMap.get(user._id.toString());

            const formattedUser = {
                _id: user._id,
                name: user.name,
                role: user.role,
                designation: user.designation,
                profileImage: user.profileImage,
                primaryCentre
            };

            if (existingPlan) {
                const planObj = existingPlan.toObject ? existingPlan.toObject() : existingPlan;
                planObj.user = formattedUser;
                return planObj;
            }

            return {
                _id: `temp_${user._id}`,
                user: formattedUser,
                userName: user.name,
                department: user.role,
                planDate: targetDate,
                tasks: [],
                noEntry: true
            };
        });

        combined.sort((a, b) => a.userName.localeCompare(b.userName));
        res.status(200).json({ plans: combined });
    } catch (error) {
        console.error("Error fetching board plans:", error);
        res.status(500).json({ message: "Failed to fetch plans.", error: error.message });
    }
};

// ─── Update a task ───────────────────────────────────────────────────────────
export const updateTask = async (req, res) => {
    try {
        const { planId, taskId } = req.params;
        const { taskDetails, activityType, place, time, priority, estimatedDuration, notes, status } = req.body;

        const plan = await TomorrowPlanner.findById(planId);
        if (!plan) return res.status(404).json({ message: "Planner not found." });

        const isOwner = plan.user.toString() === req.user._id.toString();
        const isAdminOrHR = req.user.role === "superAdmin" || req.user.role === "hr";
        if (!isOwner && !isAdminOrHR) {
            return res.status(403).json({ message: "Access denied." });
        }

        const task = plan.tasks.id(taskId);
        if (!task) return res.status(404).json({ message: "Task not found." });

        if (taskDetails !== undefined) task.taskDetails = taskDetails;
        if (activityType !== undefined) task.activityType = activityType;
        if (place !== undefined) task.place = place;
        if (time !== undefined) task.time = time;
        if (priority !== undefined) task.priority = priority;
        if (estimatedDuration !== undefined) task.estimatedDuration = estimatedDuration;
        if (notes !== undefined) task.notes = notes;
        if (status !== undefined) task.status = status;

        await plan.save();
        res.status(200).json({ message: "Task updated successfully.", plan });
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Failed to update task.", error: error.message });
    }
};

// ─── Delete a task ───────────────────────────────────────────────────────────
export const deleteTask = async (req, res) => {
    try {
        const { planId, taskId } = req.params;

        const plan = await TomorrowPlanner.findById(planId);
        if (!plan) return res.status(404).json({ message: "Planner not found." });

        const isOwner = plan.user.toString() === req.user._id.toString();
        const isAdminOrHR = req.user.role === "superAdmin" || req.user.role === "hr";
        if (!isOwner && !isAdminOrHR) {
            return res.status(403).json({ message: "Access denied." });
        }

        plan.tasks.pull({ _id: taskId });
        await plan.save();
        res.status(200).json({ message: "Task deleted successfully.", plan });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Failed to delete task.", error: error.message });
    }
};

export const savePlan = async (req, res) => {
    try {
        const { tasks, planDate } = req.body;
        if (!Array.isArray(tasks)) {
            return res.status(400).json({ message: "Tasks must be an array." });
        }

        const targetDate = planDate ? getMidnightUTC(planDate) : getTomorrowMidnightUTC();
        const startRange = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
        const endRange   = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);

        const department = mapRoleToDepartment(req.user.role);

        let plan = await TomorrowPlanner.findOne({
            user: req.user._id,
            planDate: { $gte: startRange, $lt: endRange }
        });

        // Filter and map tasks to clean up temporary client-side IDs
        const mappedTasks = tasks.map(t => ({
            taskDetails: t.taskDetails || `${t.activityType || 'Activity'} at ${t.place || 'Unspecified Place'}`,
            activityType: t.activityType || "",
            place: t.place || "",
            time: t.time || "",
            priority: t.priority || "Medium",
            estimatedDuration: t.estimatedDuration || "",
            notes: t.notes || "",
            status: t.status || "Planned"
        }));

        if (!plan) {
            plan = new TomorrowPlanner({
                user: req.user._id,
                userName: req.user.name,
                department,
                planDate: targetDate,
                tasks: mappedTasks
            });
        } else {
            plan.tasks = mappedTasks;
        }

        await plan.save();
        res.status(200).json({ message: "Tomorrow's plan saved successfully.", plan });
    } catch (error) {
        console.error("Error saving tomorrow plan:", error);
        res.status(500).json({ message: "Failed to save plan.", error: error.message });
    }
};
