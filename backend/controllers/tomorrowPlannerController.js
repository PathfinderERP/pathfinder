import mongoose from "mongoose";
import TomorrowPlanner from "../models/TomorrowPlanner.js";
import User from "../models/User.js";
import Employee from "../models/HR/Employee.js";
import AssignedTask from "../models/AssignedTask.js";
import LogCalendar from "../models/LogCalendar.js";

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

// Helper: Sync TomorrowPlanner tasks into LogCalendar collection
export const syncPlanToLogCalendar = async (userObj, targetDate, tasks) => {
    try {
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const userId = userObj._id || userObj;

        // Delete existing synced MarketingPlanner items for this date & user
        await LogCalendar.deleteMany({
            user: userId,
            sourceModule: "MarketingPlanner",
            startDate: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!tasks || tasks.length === 0) return;

        const department = mapRoleToDepartment(userObj.role);
        const userRoleStr = Array.isArray(userObj.role) ? userObj.role.join(", ") : (userObj.role || "");

        let userCentre = userObj.centre || null;
        let userCentreName = "";
        if (userObj.centres && userObj.centres.length > 0) {
            userCentre = userObj.centres[0]._id || userObj.centres[0];
            userCentreName = userObj.centres[0].centreName || "";
        }

        const logEntries = tasks.map(t => {
            const purposeStr = t.activityPurpose ? `${t.activityPurpose} - ` : "";
            const placeStr = t.place ? ` @ ${t.place}` : "";
            const title = `[Marketing] ${purposeStr}${t.activityType || 'Field Activity'}${placeStr}`;

            const noteParts = [];
            if (t.activityPurpose) noteParts.push(`Purpose: ${t.activityPurpose}`);
            if (t.notes) noteParts.push(`Notes: ${t.notes}`);
            if (t.estimatedDuration) noteParts.push(`Duration: ${t.estimatedDuration}`);
            const notes = noteParts.join(" | ");

            return {
                user: userId,
                userName: userObj.name || userObj.userName || "Marketing Executive",
                userRole: userRoleStr,
                department,
                centre: userCentre,
                centreName: userCentreName,
                title,
                activityType: t.activityType || "School Visit",
                startDate: startOfDay,
                endDate: endOfDay,
                time: t.time || "",
                place: t.place || "",
                priority: t.priority || "Medium",
                status: t.status === "Completed" ? "Completed" : "Upcoming",
                notes: notes || "Marketing Plan Activity",
                color: "#3b82f6",
                sourceModule: "MarketingPlanner",
                marketingTaskId: t._id ? String(t._id) : ""
            };
        });

        await LogCalendar.insertMany(logEntries);
    } catch (err) {
        console.error("Error in syncPlanToLogCalendar:", err);
    }
};

// ─── Add a task to tomorrow's planner ───────────────────────────────────────
export const addTask = async (req, res) => {
    try {
        const { taskDetails, activityType, place, schoolRef, schoolStatus, time, priority, estimatedDuration, notes, planDate } = req.body;
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
            $or: [
                { planDate: { $gte: startRange, $lt: endRange } },
                { plantDate: { $gte: startRange, $lt: endRange } }
            ]
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
            schoolRef: schoolRef || null,
            schoolStatus: schoolStatus || "",
            time: time || "",
            priority: priority || "Medium",
            estimatedDuration: estimatedDuration || "",
            notes: notes || "",
            status: "Planned"
        });

        await plan.save();
        await syncPlanToLogCalendar(req.user, targetDate, plan.tasks);
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

        // Query both planDate and plantDate to handle legacy documents saved with the old field name
        const plan = await TomorrowPlanner.findOne({
            user: req.user._id,
            $or: [
                { planDate: { $gte: startRange, $lt: endRange } },
                { plantDate: { $gte: startRange, $lt: endRange } }
            ]
        }).populate({
            path: "tasks.schoolRef",
            select: "schoolName centerName tier status",
            populate: { path: "centerName", select: "centreName" }
        });

        // Fetch assigned tasks for this user on this date and merge them in
        const assignedTasks = await AssignedTask.find({
            assignedTo: req.user._id,
            planDate:   { $gte: startRange, $lt: endRange },
            status:     { $ne: "Cancelled" }
        });

        // Convert assigned tasks to the same shape as planner tasks
        const assignedTasksMapped = assignedTasks.map(at => ({
            _id:             at._id,
            taskDetails:     `${at.activityType || 'School Visit'} at ${at.schoolName || 'School'}`,
            activityType:    at.activityType || "School Visit",
            place:           at.schoolName || "",
            schoolRef:       at.school,
            schoolStatus:    at.schoolStatus || "",
            schoolTier:      at.schoolTier || "",
            time:            at.time || "",
            priority:        at.priority || "Medium",
            estimatedDuration: at.estimatedDuration || "",
            notes:           at.notes || "",
            status:          at.status === "Completed" ? "Completed" : "Planned",
            isAssigned:      true,
            assignedBy:      at.assignedBy,
            assignedByName:  at.assignedByName || "",
            assignedTaskRef: at._id,
            createdAt:       at.createdAt,
        }));

        if (plan) {
            const planObj = plan.toObject();
            // Filter out any already-merged assigned tasks to avoid duplicates on re-fetch
            const selfTasks = (planObj.tasks || []).filter(t => !t.isAssigned);
            planObj.tasks = [...selfTasks, ...assignedTasksMapped];
            return res.status(200).json({ plan: planObj });
        }

        // No self-plan yet — return a synthetic plan with just assigned tasks
        if (assignedTasksMapped.length > 0) {
            return res.status(200).json({
                plan: {
                    _id:      null,
                    user:     req.user._id,
                    planDate: targetDate,
                    tasks:    assignedTasksMapped,
                    noSelfPlan: true,
                }
            });
        }

        res.status(200).json({ plan: { tasks: [] } });
    } catch (error) {
        console.error("Error fetching tomorrow plan:", error);
        res.status(500).json({ message: "Failed to fetch plan.", error: error.message });
    }
};

// ─── Get current user's upcoming plans (where planDate >= today) ──────────────
export const getMyUpcomingPlans = async (req, res) => {
    try {
        const todayMidnight = getMidnightUTC();
        const startRange = new Date(todayMidnight.getTime() - 12 * 60 * 60 * 1000);

        // Find all plans for this user where planDate >= startRange
        const plans = await TomorrowPlanner.find({
            user: req.user._id,
            $or: [
                { planDate: { $gte: startRange } },
                { plantDate: { $gte: startRange } }
            ]
        }).sort({ planDate: 1 }).populate({
            path: "tasks.schoolRef",
            select: "schoolName centerName tier status",
            populate: { path: "centerName", select: "centreName" }
        });

        // Also fetch future assigned tasks
        const assignedTasks = await AssignedTask.find({
            assignedTo: req.user._id,
            planDate: { $gte: startRange },
            status: { $ne: "Cancelled" }
        });

        const allUpcomingTasks = [];

        plans.forEach(p => {
            const pDateStr = (p.planDate || p.plantDate).toISOString().split("T")[0];
            (p.tasks || []).forEach(t => {
                const tObj = t.toObject ? t.toObject() : t;
                allUpcomingTasks.push({
                    ...tObj,
                    targetDate: pDateStr,
                    planId: p._id
                });
            });
        });

        assignedTasks.forEach(at => {
            const atDateStr = at.planDate ? at.planDate.toISOString().split("T")[0] : "";
            allUpcomingTasks.push({
                _id: at._id,
                targetDate: atDateStr,
                taskDetails: `${at.activityType || 'School Visit'} at ${at.schoolName || 'School'}`,
                activityType: at.activityType || "School Visit",
                place: at.schoolName || "",
                schoolRef: at.school,
                schoolStatus: at.schoolStatus || "",
                time: at.time || "",
                priority: at.priority || "Medium",
                estimatedDuration: at.estimatedDuration || "",
                notes: at.notes || "",
                status: at.status === "Completed" ? "Completed" : "Planned",
                isAssigned: true,
                assignedBy: at.assignedBy,
                assignedByName: at.assignedByName || ""
            });
        });

        res.status(200).json({ tasks: allUpcomingTasks, plans });
    } catch (error) {
        console.error("Error fetching upcoming plans:", error);
        res.status(500).json({ message: "Failed to fetch upcoming plans.", error: error.message });
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
            areamanager: ["areaManager", "areamanager"],
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
            const allowedSubRoles = ["marketing", "centerIncharge", "centerincharge", "assistantCenterIncharge", "assistantZonalManager", "zonalManager", "zonalmanager", "areaManager", "areamanager", "supportStaff"];
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
            $or: [
                { planDate: { $gte: startRange, $lt: endRange } },
                { plantDate: { $gte: startRange, $lt: endRange } }
            ],
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

        // Merge assigned tasks into each user's plan
        const allAssignedTasks = await AssignedTask.find({
            planDate:    { $gte: startRange, $lt: endRange },
            assignedTo:  { $in: users.map(u => u._id) },
            status:      { $ne: "Cancelled" },
        });

        // Group assigned tasks by assignedTo user
        const assignedByUser = new Map();
        for (const at of allAssignedTasks) {
            const uid = at.assignedTo.toString();
            if (!assignedByUser.has(uid)) assignedByUser.set(uid, []);
            assignedByUser.get(uid).push({
                _id:             at._id,
                taskDetails:     `${at.activityType || 'School Visit'} at ${at.schoolName || 'School'}`,
                activityType:    at.activityType || "School Visit",
                place:           at.schoolName || "",
                schoolRef:       at.school,
                schoolStatus:    at.schoolStatus || "",
                schoolTier:      at.schoolTier || "",
                time:            at.time || "",
                priority:        at.priority || "Medium",
                estimatedDuration: at.estimatedDuration || "",
                notes:           at.notes || "",
                status:          at.status === "Completed" ? "Completed" : "Planned",
                isAssigned:      true,
                assignedBy:      at.assignedBy,
                assignedByName:  at.assignedByName || "",
                assignedTaskRef: at._id,
                createdAt:       at.createdAt,
            });
        }

        const combined = users.map(user => {
            const existingPlan = planMap.get(user._id.toString());
            const primaryCentre = employeeMap.get(user._id.toString());
            const userAssignedTasks = assignedByUser.get(user._id.toString()) || [];

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
                // Merge assigned tasks (avoid duplicates from already-embedded ones)
                const selfTasks = (planObj.tasks || []).filter(t => !t.isAssigned);
                planObj.tasks = [...selfTasks, ...userAssignedTasks];
                return planObj;
            }

            return {
                _id: `temp_${user._id}`,
                user: formattedUser,
                userName: user.name,
                department: user.role,
                planDate: targetDate,
                tasks: userAssignedTasks,
                noEntry: userAssignedTasks.length === 0 ? true : false
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
        const { taskDetails, activityType, place, schoolRef, schoolStatus, time, priority, estimatedDuration, notes, status } = req.body;

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
        if (schoolRef !== undefined) task.schoolRef = schoolRef;
        if (schoolStatus !== undefined) task.schoolStatus = schoolStatus;
        if (time !== undefined) task.time = time;
        if (priority !== undefined) task.priority = priority;
        if (estimatedDuration !== undefined) task.estimatedDuration = estimatedDuration;
        if (notes !== undefined) task.notes = notes;
        if (status !== undefined) task.status = status;
        if (activityStatus !== undefined) task.activityStatus = activityStatus;
        if (nextActivityDate !== undefined) task.nextActivityDate = nextActivityDate;

        await plan.save();
        await syncPlanToLogCalendar(req.user, plan.planDate, plan.tasks);
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
        await syncPlanToLogCalendar(req.user, plan.planDate, plan.tasks);
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

        const fallbackTargetDate = planDate ? getMidnightUTC(planDate) : getTomorrowMidnightUTC();
        const department = mapRoleToDepartment(req.user.role);

        // Group tasks by targetDate
        const tasksByDate = new Map();

        tasks.forEach(t => {
            const tDateStr = t.targetDate ? String(t.targetDate).split("T")[0] : null;
            const tDate = tDateStr ? getMidnightUTC(tDateStr) : fallbackTargetDate;
            const dateKey = tDate.toISOString().split("T")[0];

            if (!tasksByDate.has(dateKey)) {
                tasksByDate.set(dateKey, { targetDate: tDate, tasks: [] });
            }
            tasksByDate.get(dateKey).tasks.push(t);
        });

        // If empty tasks array provided, ensure plan for fallbackTargetDate is cleared
        if (tasksByDate.size === 0) {
            const dateKey = fallbackTargetDate.toISOString().split("T")[0];
            tasksByDate.set(dateKey, { targetDate: fallbackTargetDate, tasks: [] });
        }

        const savedPlans = [];

        for (const [dateKey, group] of tasksByDate.entries()) {
            const targetDate = group.targetDate;
            const startRange = new Date(targetDate.getTime() - 12 * 60 * 60 * 1000);
            const endRange   = new Date(targetDate.getTime() + 12 * 60 * 60 * 1000);

            let plan = await TomorrowPlanner.findOne({
                user: req.user._id,
                $or: [
                    { planDate: { $gte: startRange, $lt: endRange } },
                    { plantDate: { $gte: startRange, $lt: endRange } }
                ]
            });

            const mappedTasks = group.tasks.map(t => {
                const rawSchoolRef = t.schoolRef || t.school;
                const validSchoolRef = (rawSchoolRef && mongoose.Types.ObjectId.isValid(rawSchoolRef)) ? rawSchoolRef : null;
                const validAssignedBy = (t.assignedBy && mongoose.Types.ObjectId.isValid(t.assignedBy)) ? t.assignedBy : null;
                const validAssignedTaskRef = (t.assignedTaskRef && mongoose.Types.ObjectId.isValid(t.assignedTaskRef)) ? t.assignedTaskRef : null;

                return {
                    taskDetails: t.taskDetails || `${t.activityType || 'Activity'} at ${t.place || 'Unspecified Place'}`,
                    activityType: t.activityType || "",
                    activityPurpose: t.activityPurpose || "",
                    place: t.place || "",
                    schoolRef: validSchoolRef,
                    schoolStatus: t.schoolStatus || "",
                    time: t.time || "",
                    priority: t.priority || "Medium",
                    estimatedDuration: t.estimatedDuration || "",
                    notes: t.notes || "",
                    status: t.status || "Planned",
                    isAssigned: Boolean(t.isAssigned),
                    assignedBy: validAssignedBy,
                    assignedByName: t.assignedByName || "",
                    assignedTaskRef: validAssignedTaskRef,
                    activityStatus: t.activityStatus || "Neutral"
                };
            });

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
            await syncPlanToLogCalendar(req.user, targetDate, mappedTasks);
            savedPlans.push(plan);
        }

        res.status(200).json({ message: "Activity plan saved successfully.", plans: savedPlans, plan: savedPlans[0] });
    } catch (error) {
        console.error("Error saving tomorrow plan:", error);
        res.status(500).json({ message: "Failed to save plan.", error: error.message });
    }
};
