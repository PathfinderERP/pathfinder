import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import PNTSEUploadResultsContent from '../../components/PNTSE/PNTSEUploadResultsContent';
import { hasPermission } from '../../config/permissions';

const PNTSEUploadResults = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canView = hasPermission(user, 'pntse', 'allStudents', 'view');

    useEffect(() => {
        if (!canView) {
            navigate("/");
        }
    }, [canView, navigate]);

    if (!canView) return null;

    return (
        <Layout activePage="PNTSE">
            <PNTSEUploadResultsContent />
        </Layout>
    );
};

export default PNTSEUploadResults;
