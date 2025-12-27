import { hasPermission } from '../config/permissions';

/**
 * Hook to check if user has specific permission
 * @param {string} module - Permission module (e.g., 'hrManpower')
 * @param {string} section - Permission section (e.g., 'leaveRequest')
 * @param {string} operation - Operation type ('create', 'edit', 'delete')
 * @returns {boolean} - Whether user has permission
 */
export const usePermission = (module, section, operation) => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // SuperAdmin has all permissions
    if (user.role === "superAdmin") {
        return true;
    }

    return hasPermission(user, module, section, operation);
};

/**
 * Component wrapper that conditionally renders children based on permission
 */
export const PermissionGuard = ({ module, section, operation, children, fallback = null }) => {
    const hasAccess = usePermission(module, section, operation);

    if (!hasAccess) {
        return fallback;
    }

    return children;
};

export default usePermission;
