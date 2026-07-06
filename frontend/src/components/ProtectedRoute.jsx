import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute
 * 
 * Props:
 *  - allowedRoles: string[] — if set, user's role must be in this list
 *  - requiredPermissionModule: string — if set, grants access if the user has ANY
 *      granular permission in that module (or is superadmin).
 *  - requiredPermissionSection: string — if set (with requiredPermissionModule),
 *      grants access only if the user has granular permissions for this specific section.
 */
const ProtectedRoute = ({ children, allowedRoles, requiredPermissionModule, requiredPermissionSection }) => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (!token || !userString) {
        // Redirect to root (Login) if not authenticated
        return <Navigate to="/" replace />;
    }

    try {
        const user = JSON.parse(userString);
        const userRoles = Array.isArray(user.role) ? user.role : [user.role || ''];

        // SuperAdmin always has full access
        const isSuperAdmin = userRoles.some(r =>
            typeof r === 'string' && r.toLowerCase().replace(/\s+/g, '') === 'superadmin'
        );

        if (isSuperAdmin) {
            return children;
        }

        // If a granular permission module is required, check if user has access to it / its section
        if (requiredPermissionModule) {
            const granularPermissions = user.granularPermissions || {};
            
            if (requiredPermissionSection) {
                // Check access to specific section of the module
                const sectionPerms = granularPermissions[requiredPermissionModule]?.[requiredPermissionSection];
                if (sectionPerms) {
                    return children;
                }
            } else {
                // Check general access to the module (at least one section is active)
                const modulePerms = granularPermissions[requiredPermissionModule];
                const hasModuleGranularAccess = modulePerms && Object.keys(modulePerms).length > 0;
                if (hasModuleGranularAccess) {
                    return children;
                }
            }

            // If user has no granular access to the module/section, deny access
            return <Navigate to="/dashboard" replace />;
        }

        // Role-based access check
        if (allowedRoles) {
            const hasAllowedRole = userRoles.some(r =>
                allowedRoles.map(allowed => allowed.toLowerCase()).includes(r.toLowerCase())
            );

            if (!hasAllowedRole) {
                return <Navigate to="/dashboard" replace />;
            }
        }

        return children;
    } catch (error) {
        console.error("Error parsing user data in ProtectedRoute", error);
        return <Navigate to="/" replace />;
    }
};

export default ProtectedRoute;
