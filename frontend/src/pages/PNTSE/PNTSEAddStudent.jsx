import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PNTSEAddStudentContent from '../../components/PNTSE/PNTSEAddStudentContent';
import { hasPermission } from '../../config/permissions';

const PNTSEAddStudent = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = user.role?.toLowerCase() === 'superadmin' || user.role?.toLowerCase() === 'super admin';
    const canCreate = isSuperAdmin || hasPermission(user, 'pntse', 'addStudent', 'create') || hasPermission(user, 'pntse', 'allStudents', 'create');

    useEffect(() => {
        if (!canCreate) {
            navigate("/");
        }
    }, [canCreate, navigate]);

    if (!canCreate) return null;

    return (
        <Layout activePage="PNTSE">
            <PNTSEAddStudentContent />
        </Layout>
    );
};

export default PNTSEAddStudent;
