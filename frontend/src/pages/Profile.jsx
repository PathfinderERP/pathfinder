import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../components/Layout";
import ProfileContent from "../components/Profile/ProfileContent";

const Profile = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is SuperAdmin
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        if (user.role !== 'superAdmin') {
            toast.error('Access Denied: Only Super Admins can access the Profile page');
            navigate('/dashboard');
        }
    }, [navigate]);

    // Additional check before rendering
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user.role !== 'superAdmin') {
        return null; // Don't render anything while redirecting
    }

    return (
        <Layout>
            <ProfileContent />
        </Layout>
    );
};

export default Profile;
