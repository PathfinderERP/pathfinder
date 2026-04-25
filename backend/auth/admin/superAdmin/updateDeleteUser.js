import User from "../../../models/User.js";
import Employee from "../../../models/HR/Employee.js";
import bcrypt from "bcryptjs";

// Helper for deep comparison of granularPermissions
const isDeepEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};

// Helper for array comparison (centres, permissions)
const areArraysEqual = (arr1, arr2) => {
    if (!arr1 || !arr2) return arr1 === arr2;
    if (arr1.length !== arr2.length) return false;
    const s1 = [...arr1].map(String).sort();
    const s2 = [...arr2].map(String).sort();
    return s1.every((v, i) => v === s2[i]);
};

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

        let hasChanges = false;
        const employeeSyncData = {};

        // Prepare Employee Sync Data & Detect Changes
        if (name !== undefined && name !== user.name) {
            user.name = name;
            employeeSyncData.name = name;
            hasChanges = true;
        }
        if (employeeId !== undefined && employeeId !== user.employeeId) {
            user.employeeId = employeeId;
            employeeSyncData.employeeId = employeeId;
            hasChanges = true;
        }
        if (email !== undefined && email !== user.email) {
            user.email = email;
            employeeSyncData.email = email;
            hasChanges = true;
        }
        if (mobNum !== undefined && mobNum !== user.mobNum) {
            user.mobNum = mobNum;
            employeeSyncData.phoneNumber = mobNum; // Employee uses phoneNumber field
            hasChanges = true;
        }
        
        if (role !== undefined && role !== user.role) {
            user.role = role;
            hasChanges = true;
        }

        if (centres !== undefined && !areArraysEqual(centres, user.centres)) {
            user.centres = centres || [];
            hasChanges = true;
        }

        if (permissions !== undefined && !areArraysEqual(permissions, user.permissions)) {
            user.permissions = permissions;
            hasChanges = true;
        }

        if (granularPermissions !== undefined && !isDeepEqual(granularPermissions, user.granularPermissions)) {
            user.granularPermissions = granularPermissions;
            hasChanges = true;
        }

        if (canEditUsers !== undefined && canEditUsers !== user.canEditUsers) {
            user.canEditUsers = canEditUsers;
            hasChanges = true;
        }

        if (canDeleteUsers !== undefined && canDeleteUsers !== user.canDeleteUsers) {
            user.canDeleteUsers = canDeleteUsers;
            hasChanges = true;
        }
        
        if (isActive !== undefined && isActive !== user.isActive) {
            user.isActive = isActive;
            hasChanges = true;
            
            // Audit deactivation
            if (isActive === false) {
                user.deactivatedBy = req.user.id;
                user.deactivatedAt = new Date();
                employeeSyncData.deactivatedBy = req.user.id;
                employeeSyncData.deactivatedAt = new Date();
            } else {
                // Clear deactivation fields if reactivating
                user.deactivatedBy = null;
                user.deactivatedAt = null;
                employeeSyncData.deactivatedBy = null;
                employeeSyncData.deactivatedAt = null;
            }

            employeeSyncData.status = isActive ? "Active" : "Inactive";
        }

        if (assignedScript !== undefined) {
            const newScript = assignedScript === "" ? null : assignedScript;
            if (String(newScript) !== String(user.assignedScript)) {
                user.assignedScript = newScript;
                hasChanges = true;
            }
        }

        // Update password if provided
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            hasChanges = true;
        }

        if (hasChanges) {
            user.updatedBy = req.user.id;
            employeeSyncData.updatedBy = req.user.id;

            // Sync with Employee if there are changes
            if (Object.keys(employeeSyncData).length > 0) {
                try {
                    await Employee.findOneAndUpdate(
                        { user: user._id },
                        { $set: employeeSyncData }
                    );
                } catch (err) {
                    console.error("Error syncing to Employee record:", err);
                    // If it's a duplicate email error in Employee collection, we might want to handle it
                    if (err.code === 11000) {
                        return res.status(400).json({ message: "Update failed: Email or Employee ID already exists in Employee records" });
                    }
                }
            }
            await user.save();
        }

        // Populate audit fields for response
        await user.populate([
            { path: "centres", select: "centreName enterCode" },
            { path: "createdBy", select: "name" },
            { path: "updatedBy", select: "name" },
            { path: "deactivatedBy", select: "name" }
        ]);

        res.status(200).json({
            message: hasChanges ? "User updated successfully" : "No changes detected",
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
                isActive: user.isActive,
                createdBy: user.createdBy,
                updatedBy: user.updatedBy,
                deactivatedBy: user.deactivatedBy,
                deactivatedAt: user.deactivatedAt
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
        user.updatedBy = req.user.id;

        // Audit deactivation
        const syncData = { 
            status: user.isActive ? "Active" : "Inactive",
            updatedBy: req.user.id
        };

        if (user.isActive === false) {
            user.deactivatedBy = req.user.id;
            user.deactivatedAt = new Date();
            syncData.deactivatedBy = req.user.id;
            syncData.deactivatedAt = new Date();
        } else {
            user.deactivatedBy = null;
            user.deactivatedAt = null;
            syncData.deactivatedBy = null;
            syncData.deactivatedAt = null;
        }

        await user.save();

        // Sync with Employee status
        await Employee.findOneAndUpdate(
            { user: user._id },
            { $set: syncData }
        );

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

        // Delete associated Employee record if it exists
        await Employee.findOneAndDelete({ user: userId });

        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: "User and associated Employee record deleted successfully" });

    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
