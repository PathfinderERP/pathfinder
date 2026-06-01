import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (!token || !userString) {
        // Redirect to root (Login) if not authenticated
        return <Navigate to="/" replace />;
    }

    if (allowedRoles) {
        try {
            const user = JSON.parse(userString);
            const userRoles = Array.isArray(user.role) ? user.role : [user.role || ''];
            
            const hasAllowedRole = userRoles.some(r => 
                allowedRoles.map(allowed => allowed.toLowerCase()).includes(r.toLowerCase())
            );

            if (!hasAllowedRole) {
                return <Navigate to="/dashboard" replace />;
            }
        } catch (error) {
            console.error("Error parsing user data in ProtectedRoute", error);
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
