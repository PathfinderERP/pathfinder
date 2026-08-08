import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token || token === "null" || token === "undefined") {
            return res.status(401).json({ message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        if (user.isActive === false) {
            return res.status(403).json({ message: "Account is deactivated. Please contact administrator." });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name !== "TokenExpiredError") {
            console.error(error);
        }
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
                return res.status(401).json({ message: "No token provided" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            if (user.isActive === false) {
                return res.status(403).json({ message: "Account is deactivated. Please contact administrator." });
            }

            // SuperAdmin has access to everything
            if (user.role?.toLowerCase() === "superadmin" || user.role?.toLowerCase() === "super admin") {
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
            if (error.name !== "TokenExpiredError") {
                console.error(error);
            }
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
                return res.status(401).json({ message: "No token provided" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            if (user.isActive === false) {
                return res.status(403).json({ message: "Account is deactivated. Please contact administrator." });
            }

            // SuperAdmin has access to everything
            if (user.role?.toLowerCase() === "superadmin" || user.role?.toLowerCase() === "super admin") {
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
            if (error.name !== "TokenExpiredError") {
                console.error(error);
            }
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
                return res.status(401).json({ message: "No token provided" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            if (user.isActive === false) {
                return res.status(403).json({ message: "Account is deactivated. Please contact administrator." });
            }

            // SuperAdmin has access to everything
            if (user.role?.toLowerCase() === "superadmin" || user.role?.toLowerCase() === "super admin") {
                req.user = user;
                return next();
            }

            const hasCustomPerms = user.granularPermissions && typeof user.granularPermissions === 'object' && Object.keys(user.granularPermissions).length > 0;

            // Digital role has superadmin-like access by default unless specific permissions are set in user.granularPermissions
            if (user.role?.toLowerCase() === "digital") {
                if (!hasCustomPerms) {
                    req.user = user;
                    return next();
                }
            }

            // Granular Permission Check
            let hasAccess = false;

            // Grant automatic access to class-related academics actions for designated roles
            const ALL_ROLES_FOR_CLASS = [
                'teacher', 'admin', 'superAdmin', 'telecaller', 'centralizedTelecaller',
                'counsellor', 'RM', 'Class_Coordinator', 'HOD', 'marketing',
                'centerIncharge', 'zonalManager', 'zonalHead', 'hr', 'accounts',
                'coordinator', 'digital', 'assistantZonalManager', 'assistantCenterIncharge'
            ];

            if (module === 'academics' && ['classes', 'classManagement', 'upcomingClass', 'ongoingClass', 'previousClass'].includes(section)) {
                if (ALL_ROLES_FOR_CLASS.some(r => r.toLowerCase() === user.role?.toLowerCase())) {
                    hasAccess = true;
                }
            }

            // Master permission check for Academics Class Management
            if (!hasAccess && module === 'academics' && ['upcomingClass', 'ongoingClass', 'previousClass'].includes(section)) {
                const masterAction = action === "view" ? "create" : action; // If viewing, check if they have any master access
                if (user.granularPermissions?.[module]?.['classManagement']?.[action] === true ||
                    user.granularPermissions?.[module]?.['classes']?.[action] === true ||
                    (action === "view" && (user.granularPermissions?.[module]?.['classManagement'] || user.granularPermissions?.[module]?.['classes']))) {
                    hasAccess = true;
                }
            }

            // Course Management access check
            if (!hasAccess && module === 'courseManagement') {
                const cleanUserRole = (user.role || '').toLowerCase().replace(/[\s\-_]+/g, '');
                const isCourseTargetRole = [
                    'centerincharge', 'centreincharge', 'zonalmanager', 'zonalhead',
                    'superadmin', 'admin', 'assistantzonalmanager', 'assistantcenterincharge',
                    'coordinator', 'classcoordinator', 'class_coordinator'
                ].includes(cleanUserRole);

                if (hasCustomPerms) {
                    if (user.granularPermissions?.['courseManagement']) {
                        const coursePerms = user.granularPermissions['courseManagement'][section] || user.granularPermissions['courseManagement']['courses'];
                        if (coursePerms) {
                            hasAccess = action === "view" ? (coursePerms.view !== false) : (coursePerms[action] === true || coursePerms[action] === undefined);
                        } else {
                            hasAccess = true;
                        }
                    } else {
                        hasAccess = false;
                    }
                } else {
                    hasAccess = isCourseTargetRole;
                }
            }

            // Grant automatic access to dailyTrackingLog module actions ONLY if user does NOT have custom permissions configured
            if (!hasAccess && module === 'dailyTrackingLog' && !hasCustomPerms) {
                if (section === 'myDailyLog') {
                    const isTeacher = user.role?.toLowerCase() === 'teacher';
                    if (!isTeacher) {
                        hasAccess = true;
                    }
                } else {
                    const isTargetRole = ['marketing', 'centerincharge', 'centreincharge', 'zonalmanager', 'zonalhead', 'assistantzonalmanager', 'assistantcenterincharge', 'superadmin', 'admin'].includes(user.role?.toLowerCase()?.replace(/\s+/g, ''));
                    if (isTargetRole || user.granularPermissions?.['marketingCRM']) {
                        hasAccess = true;
                    }
                }
            }

            if (!hasAccess) {
                if (action === "view") {
                    if (user.granularPermissions?.[module]?.[section]?.view !== undefined) {
                        hasAccess = user.granularPermissions[module][section].view === true;
                    } else {
                        hasAccess = !!user.granularPermissions?.[module]?.[section];
                    }
                } else {
                    hasAccess = user.granularPermissions?.[module]?.[section]?.[action] === true;
                }
            }

            if (!hasAccess) {
                return res.status(403).json({
                    message: `Access denied. Required permission: ${module}.${section}.${action}`
                });
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name !== "TokenExpiredError") {
                console.error(error);
            }
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
                return res.status(401).json({ message: "No token provided" });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            if (user.isActive === false) {
                return res.status(403).json({ message: "Account is deactivated. Please contact administrator." });
            }

            // SuperAdmin has access to everything
            if (user.role?.toLowerCase() === "superadmin" || user.role?.toLowerCase() === "super admin") {
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
            if (error.name !== "TokenExpiredError") {
                console.error(error);
            }
            return res.status(401).json({ message: "Invalid or expired token" });
        }
    };
};
