import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { generateToken } from "../../../middleware/auth.js";
import User from "../../../models/User.js";

dotenv.config();

export async function createAccountBySuperAdmin(req, res) {
    try {
        const { name, employeeId, email, mobNum, password, role, centres, permissions, canEditUsers, canDeleteUsers, granularPermissions, assignedScript } = req.body;

        // Basic validation
        if (!name || !employeeId || !email || !mobNum || !password || !role) {
            console.log("All fields are required");
            return res.status(400).json({ message: "All fields are required" });
        }

        // Additional validation for telecallers
        if (role === 'telecaller' && !assignedScript) {
            return res.status(400).json({ message: "A script must be assigned to telecallers" });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("User already exists");
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            name,
            employeeId,
            email,
            mobNum,
            password: hashedPassword,
            role: role || "admin",
            centres: centres || [],
            permissions: permissions || [],
            granularPermissions: granularPermissions || {}, // Add granular permissions
            canEditUsers: canEditUsers || false,
            canDeleteUsers: canDeleteUsers || false,
            assignedScript: role === 'telecaller' ? assignedScript : undefined
        });

        await newUser.save();

        const token = generateToken(newUser);

        res.status(201).json({
            message: "User added successfully",
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                employeeId: newUser.employeeId,
                email: newUser.email,
                mobNum: newUser.mobNum,
                role: newUser.role,
                centres: newUser.centres,
                permissions: newUser.permissions,
                granularPermissions: newUser.granularPermissions, // Include in response
                canEditUsers: newUser.canEditUsers,
                canDeleteUsers: newUser.canDeleteUsers
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error to create account by super admin" });
    }
}

export async function bulkImportUsers(req, res) {
    try {
        const users = req.body;
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: "Invalid data format. Expected an array." });
        }

        const salt = await bcrypt.genSalt(10);
        const processedUsers = await Promise.all(users.map(async (user) => {
            const userData = { ...user };
            // Hash password if provided
            if (userData.password) {
                userData.password = await bcrypt.hash(userData.password.toString(), salt);
            }

            // Handle granularPermissions if they come as a JSON string
            if (userData.granularPermissions && typeof userData.granularPermissions === 'string') {
                try {
                    userData.granularPermissions = JSON.parse(userData.granularPermissions);
                } catch (e) {
                    userData.granularPermissions = {};
                }
            } else if (!userData.granularPermissions) {
                userData.granularPermissions = {};
            }

            return userData;
        }));

        const results = await User.insertMany(processedUsers, { ordered: false });

        res.status(201).json({
            message: `${results.length} users imported successfully`,
            count: results.length
        });
    } catch (err) {
        console.error("Bulk import users error:", err);
        if (err.name === 'BulkWriteError' || err.code === 11000) {
            return res.status(207).json({
                message: "Partial import success. Some records might be duplicates or invalid.",
                importedCount: err.result?.nInserted || 0,
                error: err.message
            });
        }
        res.status(500).json({ message: "Server error", error: err.message });
    }
}
