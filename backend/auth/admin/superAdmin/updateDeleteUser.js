import User from "../../../models/User.js";
import bcrypt from "bcryptjs";

export const updateUserBySuperAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, employeeId, email, mobNum, password, role, centres, permissions, canEditUsers, canDeleteUsers, granularPermissions, assignedScript, isActive } = req.body;

        // Find the user to update
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if email is being changed and if it's already taken
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        // Check if employeeId is being changed and if it's already taken
        if (employeeId && employeeId !== user.employeeId) {
            const existingUser = await User.findOne({ employeeId });
            if (existingUser) {
                return res.status(400).json({ message: "Employee ID already in use" });
            }
        }

        // Update fields
        if (name) user.name = name;
        if (employeeId) user.employeeId = employeeId;
        if (email) user.email = email;
        if (mobNum) user.mobNum = mobNum;
        if (role) user.role = role;
        if (centres !== undefined) user.centres = centres || [];
        if (permissions !== undefined) user.permissions = permissions;
        if (granularPermissions !== undefined) user.granularPermissions = granularPermissions;
        if (canEditUsers !== undefined) user.canEditUsers = canEditUsers;
        if (canDeleteUsers !== undefined) user.canDeleteUsers = canDeleteUsers;
        if (isActive !== undefined) user.isActive = isActive;
        if (assignedScript !== undefined) {
            user.assignedScript = assignedScript === "" ? null : assignedScript;
        }

        // Update password if provided
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();

        // Populate centres for response
        await user.populate("centres", "centreName enterCode");

        res.status(200).json({
            message: "User updated successfully",
            user: {
                id: user._id,
                name: user.name,
                employeeId: user.employeeId,
                email: user.email,
                mobNum: user.mobNum,
                role: user.role,
                centres: user.centres,
                permissions: user.permissions,
                granularPermissions: user.granularPermissions,
                canEditUsers: user.canEditUsers,
                canDeleteUsers: user.canDeleteUsers,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prevent deactivating the last SuperAdmin
        if (user.role === "superAdmin" && user.isActive) {
            const activeSuperAdminCount = await User.countDocuments({ role: "superAdmin", isActive: true });
            if (activeSuperAdminCount <= 1) {
                return res.status(400).json({ message: "Cannot deactivate the last active SuperAdmin" });
            }
        }

        user.isActive = !user.isActive;
        await user.save();

        res.status(200).json({
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: user.isActive
        });

    } catch (error) {
        console.error("Error toggling user status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteUserBySuperAdmin = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prevent deleting the last SuperAdmin
        if (user.role === "superAdmin") {
            const superAdminCount = await User.countDocuments({ role: "superAdmin" });
            if (superAdminCount <= 1) {
                return res.status(400).json({ message: "Cannot delete the last SuperAdmin" });
            }
        }

        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: "User deleted successfully" });

    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
