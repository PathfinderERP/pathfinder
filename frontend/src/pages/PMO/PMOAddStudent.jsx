import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PMOAddStudentContent from '../../components/PMO/PMOAddStudentContent';
import { hasPermission } from '../../config/permissions';

const PMOAddStudent = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'super admin';
    const canCreate = isSuperAdmin || hasPermission(user, 'pmo', 'addStudent', 'create') || hasPermission(user, 'pmo', 'allStudents', 'create');

    useEffect(() => {
        if (!canCreate) {
            navigate("/");
        }
    }, [canCreate, navigate]);

    if (!canCreate) return null;

    return (
        <Layout activePage="PMO">
            <PMOAddStudentContent />
        </Layout>
    );
};

export default PMOAddStudent;
