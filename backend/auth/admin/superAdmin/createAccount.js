import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { generateToken } from "../../../middleware/auth.js";
import User from "../../../models/User.js";

dotenv.config();

export async function createAccountBySuperAdmin(req, res) {
    try {
        const { name, employeeId, email, mobNum, password, role, centres, permissions } = req.body;

        // Basic validation
        if (!name || !employeeId || !email || !mobNum || !password || !role) {
            console.log("All fields are required");
            return res.status(400).json({ message: "All fields are required" });
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
            centres: centres || [], // Handle optional centres array
            permissions: permissions || [] // Handle permissions
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
                permissions: newUser.permissions
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error to create account by super admin" });
    }
}
