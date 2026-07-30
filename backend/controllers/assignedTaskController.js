import mongoose from "mongoose";
import AssignedTask from "../models/AssignedTask.js";
import User from "../models/User.js";
import SchoolForTask from "../models/Master_data/SchoolForTask.js";
import Employee from "../models/HR/Employee.js";

// ── Helper: midnight UTC for a given date string or Date ──────
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

// Helper: date range window (±12h around midnight)
const dateRange = (midnightUTC) => ({
    $gte: new Date(midnightUTC.getTime() - 12 * 60 * 60 * 1000),
    $lt:  new Date(midnightUTC.getTime() + 12 * 60 * 60 * 1000),
});

// ─────────────────────────────────────────────────────────────
//  CREATE — Super admin assigns a task to a staff member
// ─────────────────────────────────────────────────────────────
export const createAssignedTask = async (req, res) => {
    try {
        const {
            assignedTo,   // User ObjectId
            school,       // SchoolForTask ObjectId
            planDate,     // "YYYY-MM-DD"
            activityType,
            time,
            estimatedDuration,
            notes,
            priority,
        } = req.body;

        if (!assignedTo || !school || !planDate) {
            return res.status(400).json({
                message: "assignedTo, school, and planDate are required.",
            });
        }

        const assignees = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
        if (assignees.length === 0) {
            return res.status(400).json({ message: "At least one staff member must be selected." });
        }

        // Resolve school details for denormalisation
        const schoolDoc = await SchoolForTask.findById(school)
            .populate("centerName", "centreName");

        if (!schoolDoc) {
            return res.status(404).json({ message: "School not found." });
        }

        // Resolve assignee users
        const assigneeUsers = await User.find({ _id: { $in: assignees } }).select("name");
        if (assigneeUsers.length === 0) {
            return res.status(404).json({ message: "Assignee user(s) not found." });
        }

        const targetDate = getMidnightUTC(planDate);

        const createdTasks = [];
        for (const assigneeUser of assigneeUsers) {
            const task = new AssignedTask({
                assignedBy:        req.user._id,
                assignedByName:    req.user.name || "",
                assignedTo:        assigneeUser._id,
                assignedToName:    assigneeUser.name || "",
                school:            schoolDoc._id,
                schoolName:        schoolDoc.schoolName || "",
                schoolStatus:      schoolDoc.status || "",
                schoolTier:        schoolDoc.tier || "",
                centreName:        schoolDoc.centerName?.centreName || "",
                planDate:          targetDate,
                activityType:      activityType || "School Visit",
                time:              time || "",
                estimatedDuration: estimatedDuration || "",
                notes:             notes || "",
                priority:          priority || "Medium",
                status:            "Pending",
            });
            await task.save();
            createdTasks.push(task);
        }

        res.status(201).json({
            message: `${createdTasks.length} task(s) assigned successfully.`,
            tasks: createdTasks,
            task: createdTasks[0],
        });
    } catch (error) {
        console.error("Error creating assigned task:", error);
        res.status(500).json({ message: "Failed to assign task.", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET MY TASKS — Tasks assigned TO the logged-in user (by date)
//  Used by Today Task & Tomorrow Planner to merge assigned tasks
// ─────────────────────────────────────────────────────────────
export const getMyAssignedTasks = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = getMidnightUTC(date);
        const range = dateRange(targetDate);

        const tasks = await AssignedTask.find({
            assignedTo: req.user._id,
            planDate:   range,
            status:     { $ne: "Cancelled" },
        })
            .populate("school", "schoolName status tier")
            .populate("assignedBy", "name role")
            .sort({ createdAt: -1 });

        res.status(200).json({ tasks });
    } catch (error) {
        console.error("Error fetching my assigned tasks:", error);
        res.status(500).json({ message: "Failed to fetch assigned tasks.", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET ALL — Admin view: all assigned tasks with filters
// ─────────────────────────────────────────────────────────────
export const getAllAssignedTasks = async (req, res) => {
    try {
        const { startDate, endDate, assignedTo, status, page = 1, limit = 20 } = req.query;

        const query = {};

        if (startDate && endDate) {
            const start = getMidnightUTC(startDate);
            const end   = getMidnightUTC(endDate);
            query.planDate = {
                $gte: new Date(start.getTime() - 12 * 60 * 60 * 1000),
                $lt:  new Date(end.getTime()   + 12 * 60 * 60 * 1000),
            };
        }

        if (assignedTo && assignedTo !== "All") {
            try {
                query.assignedTo = new mongoose.Types.ObjectId(assignedTo);
            } catch (_) { /* ignore invalid id */ }
        }

        if (status && status !== "All") {
            query.status = status;
        }

        const skip  = (parseInt(page) - 1) * parseInt(limit);
        const total = await AssignedTask.countDocuments(query);

        const tasks = await AssignedTask.find(query)
            .populate("assignedTo",  "name role profileImage")
            .populate("assignedBy",  "name role")
            .populate("school",      "schoolName status tier centerName")
            .sort({ planDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            tasks,
            total,
            page:       parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error("Error fetching all assigned tasks:", error);
        res.status(500).json({ message: "Failed to fetch tasks.", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  GET STAFF LIST — Active users that can be assigned tasks
// ─────────────────────────────────────────────────────────────
export const getAssignableStaff = async (req, res) => {
    try {
        const targetRoles = [
            "marketing",
            "centerIncharge",
            "zonalManager",
            "assistantZonalManager",
            "assistantCenterIncharge",
            "supportStaff",
        ];

        const users = await User.find({
            isActive: true,
            role:     { $in: targetRoles },
        })
            .select("name role designation profileImage centres")
            .sort({ name: 1 });

        // Enrich with primary centre from Employee
        const employees = await Employee.find({
            user: { $in: users.map(u => u._id) },
        }).populate("primaryCentre", "centreName");

        const empMap = new Map();
        for (const emp of employees) {
            if (emp.user) empMap.set(emp.user.toString(), emp.primaryCentre?.centreName || "");
        }

        const enriched = users.map(u => ({
            _id:           u._id,
            name:          u.name,
            role:          u.role,
            designation:   u.designation,
            profileImage:  u.profileImage,
            primaryCentre: empMap.get(u._id.toString()) || "",
        }));

        res.status(200).json({ staff: enriched });
    } catch (error) {
        console.error("Error fetching assignable staff:", error);
        res.status(500).json({ message: "Failed to fetch staff.", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  UPDATE — Edit or update status of an assigned task
// ─────────────────────────────────────────────────────────────
export const updateAssignedTask = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Only the assigner (or superAdmin) can update
        const task = await AssignedTask.findById(id);
        if (!task) return res.status(404).json({ message: "Assigned task not found." });

        const isSuperAdmin = req.user.role === "superAdmin";
        const isAssigner   = task.assignedBy.toString() === req.user._id.toString();
        if (!isSuperAdmin && !isAssigner) {
            return res.status(403).json({ message: "Access denied." });
        }

        // If updating school, re-denormalize
        if (updates.school && updates.school !== task.school.toString()) {
            const schoolDoc = await SchoolForTask.findById(updates.school)
                .populate("centerName", "centreName");
            if (schoolDoc) {
                updates.schoolName   = schoolDoc.schoolName || "";
                updates.schoolStatus = schoolDoc.status || "";
                updates.schoolTier   = schoolDoc.tier || "";
                updates.centreName   = schoolDoc.centerName?.centreName || "";
            }
        }

        // If updating assignee, re-resolve name
        if (updates.assignedTo && updates.assignedTo !== task.assignedTo.toString()) {
            const assigneeUser = await User.findById(updates.assignedTo).select("name");
            if (assigneeUser) updates.assignedToName = assigneeUser.name || "";
        }

        // Convert planDate to midnight UTC if provided
        if (updates.planDate) {
            updates.planDate = getMidnightUTC(updates.planDate);
        }

        const updated = await AssignedTask.findByIdAndUpdate(id, updates, { new: true })
            .populate("assignedTo", "name role")
            .populate("school", "schoolName status tier");

        res.status(200).json({ message: "Task updated.", task: updated });
    } catch (error) {
        console.error("Error updating assigned task:", error);
        res.status(500).json({ message: "Failed to update task.", error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
//  DELETE — Remove an assigned task
// ─────────────────────────────────────────────────────────────
export const deleteAssignedTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await AssignedTask.findById(id);
        if (!task) return res.status(404).json({ message: "Assigned task not found." });

        const isSuperAdmin = req.user.role === "superAdmin";
        const isAssigner   = task.assignedBy.toString() === req.user._id.toString();
        if (!isSuperAdmin && !isAssigner) {
            return res.status(403).json({ message: "Access denied." });
        }

        await AssignedTask.findByIdAndDelete(id);
        res.status(200).json({ message: "Assigned task deleted." });
    } catch (error) {
        console.error("Error deleting assigned task:", error);
        res.status(500).json({ message: "Failed to delete task.", error: error.message });
    }
};
