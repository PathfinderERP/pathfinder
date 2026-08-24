import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PMOAllStudentsContent from '../../components/PMO/PMOAllStudentsContent';
import { hasPermission } from '../../config/permissions';

const PMOAllStudents = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'super admin';
    const canView = isSuperAdmin || hasPermission(user, 'pmo', 'allStudents', 'view');

    useEffect(() => {
        if (!canView) {
            navigate("/");
        }
    }, [canView, navigate]);

    if (!canView) return null;

    return (
        <Layout activePage="PMO">
            <PMOAllStudentsContent />
        </Layout>
    );
};

export default PMOAllStudents;
