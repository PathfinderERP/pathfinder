import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        // Redirect to login if not authenticated
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
