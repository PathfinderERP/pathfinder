import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PNTSEAllStudentsContent from '../../components/PNTSE/PNTSEAllStudentsContent';
import { hasPermission } from '../../config/permissions';

const PNTSEAllStudents = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'super admin';
    const canView = isSuperAdmin || hasPermission(user, 'pntse', 'allStudents', 'view');

    useEffect(() => {
        if (!canView) {
            navigate("/");
        }
    }, [canView, navigate]);

    if (!canView) return null;

    return (
        <Layout activePage="PNTSE">
            <PNTSEAllStudentsContent />
        </Layout>
    );
};

export default PNTSEAllStudents;
