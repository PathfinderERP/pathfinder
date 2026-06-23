import Task from "../../models/Task.js";
import User from "../../models/User.js";

// @desc    Create a new task
// @route   POST /api/task-workflow/tasks
// @access  Private (superAdmin only)
export const createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, role, target, deadline } = req.body;

        if (!title || !assignedTo || !role || !deadline) {
            return res.status(400).json({ message: "Please provide title, assignedTo, role, and deadline." });
        }

        // Verify assigned user exists
        const userExists = await User.findById(assignedTo);
        if (!userExists) {
            return res.status(404).json({ message: "Assigned user not found." });
        }

        const task = new Task({
            title,
            description,
            assignedTo,
            role,
            target,
            deadline,
            createdBy: req.user._id
        });

        const savedTask = await task.save();
        res.status(201).json({ message: "Task created successfully", task: savedTask });
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get tasks
// @route   GET /api/task-workflow/tasks
// @access  Private
export const getTasks = async (req, res) => {
    try {
        const userRole = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = ["superadmin", "super admin"].includes(userRole);

        let query = {};
        if (!isSuperAdmin) {
            query.assignedTo = req.user._id;
        }

        const tasks = await Task.find(query)
            .populate("assignedTo", "name employeeId role centres")
            .populate("createdBy", "name")
            .populate("comments.user", "name role")
            .sort({ createdAt: -1 });

        res.status(200).json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Update task status
// @route   PATCH /api/task-workflow/tasks/:id/status
// @access  Private
export const updateTaskStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value." });
        }

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const userRole = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = ["superadmin", "super admin"].includes(userRole);

        // Check if assigned user or superadmin
        if (task.assignedTo.toString() !== req.user._id.toString() && !isSuperAdmin) {
            return res.status(403).json({ message: "Access denied." });
        }

        task.status = status;
        await task.save();

        res.status(200).json({ message: "Task status updated successfully", task });
    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Add comment to task
// @route   POST /api/task-workflow/tasks/:id/comments
// @access  Private
export const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!text || text.trim() === "") {
            return res.status(400).json({ message: "Comment content cannot be empty." });
        }

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        const userRole = (req.user.role || "").toLowerCase().replace(/\s+/g, "");
        const isSuperAdmin = ["superadmin", "super admin"].includes(userRole);

        // Only assigned user or superadmin can add comments
        if (task.assignedTo.toString() !== req.user._id.toString() && !isSuperAdmin) {
            return res.status(403).json({ message: "Access denied." });
        }

        task.comments.push({
            user: req.user._id,
            text
        });

        await task.save();

        // Fetch task again to populate new comment details
        const updatedTask = await Task.findById(id)
            .populate("assignedTo", "name employeeId role")
            .populate("createdBy", "name")
            .populate("comments.user", "name role");

        res.status(200).json({ message: "Comment added successfully", task: updatedTask });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Delete a task
// @route   DELETE /api/task-workflow/tasks/:id
// @access  Private (superAdmin only)
export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        await Task.findByIdAndDelete(id);
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Mark all tasks for the logged in user as viewed
// @route   PUT /api/task-workflow/tasks/mark-viewed
// @access  Private
export const markTasksAsViewed = async (req, res) => {
    try {
        await Task.updateMany(
            { assignedTo: req.user._id, viewed: { $ne: true } },
            { $set: { viewed: true } }
        );
        res.status(200).json({ message: "Tasks marked as viewed" });
    } catch (error) {
        console.error("Error marking tasks as viewed:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Get count of unviewed tasks for the logged in user
// @route   GET /api/task-workflow/tasks/unviewed-count
// @access  Private
export const getUnviewedTasksCount = async (req, res) => {
    try {
        const count = await Task.countDocuments({
            assignedTo: req.user._id,
            viewed: { $ne: true }
        });

        res.status(200).json({ count });
    } catch (error) {
        console.error("Error fetching unviewed tasks count:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// @desc    Update a task (superAdmin only)
// @route   PUT /api/task-workflow/tasks/:id
// @access  Private (superAdmin only)
export const updateTask = async (req, res) => {
    try {
        const { title, description, assignedTo, role, target, deadline } = req.body;
        const { id } = req.params;

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        if (title) task.title = title;
        if (description !== undefined) task.description = description;
        if (assignedTo) {
            const userExists = await User.findById(assignedTo);
            if (!userExists) {
                return res.status(404).json({ message: "Assigned user not found." });
            }
            task.assignedTo = assignedTo;
        }
        if (role) task.role = role;
        if (target !== undefined) task.target = target;
        if (deadline) task.deadline = deadline;

        const updatedTask = await task.save();
        res.status(200).json({ message: "Task updated successfully", task: updatedTask });
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Server error" });
    }
};
