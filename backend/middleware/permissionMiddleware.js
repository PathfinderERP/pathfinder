import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        if (!token || token === "null" || token === "undefined") {
            return res.status(401).json({ message: "Invalid token format" });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

/**
 * Middleware to check if user has specific permission or is SuperAdmin
 * Usage: requirePermission("Admissions & Sales")
 */
export const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // First authenticate the user
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "No token provided" });
            }

            const token = authHeader.split(" ")[1];
            if (!token || token === "null" || token === "undefined") {
                return res.status(401).json({ message: "Invalid token format" });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            // SuperAdmin has access to everything
            if (user.role === "superAdmin") {
                req.user = user;
                return next();
            }

            // Check if user has the required permission
            if (!user.permissions || !user.permissions.includes(requiredPermission)) {
                return res.status(403).json({
                    message: `Access denied. Required permission: ${requiredPermission}`
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    };
};

/**
 * Middleware to check if user has ANY of the specified permissions or is SuperAdmin
 * Usage: requireAnyPermission(["Admissions & Sales", "Master Data"])
 */
export const requireAnyPermission = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "No token provided" });
            }

            const token = authHeader.split(" ")[1];
            if (!token || token === "null" || token === "undefined") {
                return res.status(401).json({ message: "Invalid token format" });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            // SuperAdmin has access to everything
            if (user.role === "superAdmin") {
                req.user = user;
                return next();
            }

            // Check if user has ANY of the required permissions
            const hasPermission = requiredPermissions.some(permission =>
                user.permissions && user.permissions.includes(permission)
            );

            if (!hasPermission) {
                return res.status(403).json({
                    message: `Access denied. Required one of: ${requiredPermissions.join(", ")}`
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    };
};

/**
 * Middleware to check granular permissions
 * Usage: requireGranularPermission("masterData", "class", "create")
 */
export const requireGranularPermission = (module, section, action) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "No token provided" });
            }

            const token = authHeader.split(" ")[1];
            if (!token || token === "null" || token === "undefined") {
                return res.status(401).json({ message: "Invalid token format" });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            // SuperAdmin has access to everything
            if (user.role === "superAdmin") {
                req.user = user;
                return next();
            }

            // Granular Permission Check
            let hasAccess = false;
            if (action === "view") {
                // If checking for view, any entry in that section means they have access to view the list
                hasAccess = !!user.granularPermissions?.[module]?.[section];
            } else {
                hasAccess = user.granularPermissions?.[module]?.[section]?.[action] === true;
            }

            if (!hasAccess) {
                return res.status(403).json({
                    message: `Access denied. Required permission: ${module}.${section}.${action}`
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    };
};

/**
 * Middleware to check if user has ANY of the specified granular permissions
 * Usage: requireAnyGranularPermission([
 *   { module: "admissions", section: "enrolledStudents", action: "edit" },
 *   { module: "financeFees", section: "installmentPayment", action: "create" }
 * ])
 */
export const requireAnyGranularPermission = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ message: "No token provided" });
            }

            const token = authHeader.split(" ")[1];
            if (!token || token === "null" || token === "undefined") {
                return res.status(401).json({ message: "Invalid token format" });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            // SuperAdmin has access to everything
            if (user.role === "superAdmin") {
                req.user = user;
                return next();
            }

            // Check if user has ANY of the required granular permissions
            const hasAccess = requiredPermissions.some(({ module, section, action }) =>
                user.granularPermissions?.[module]?.[section]?.[action] === true
            );

            if (!hasAccess) {
                return res.status(403).json({
                    message: "Access denied. You do not have the required permissions."
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    };
};
