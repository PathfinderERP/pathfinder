import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import CentrePerformanceContent from "../components/MarketingCRM/CentrePerformanceContent";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { hasModuleAccess } from "../config/permissions";

const CentrePerformance = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const [availableCenters, setAvailableCenters] = useState([]);

    useEffect(() => {
        if (!hasModuleAccess(currentUser, "marketingCRM")) {
            navigate("/dashboard");
        }
    }, [currentUser, navigate]);

    useEffect(() => {
        fetchCentres();
    }, []);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const uniqueCentres = Array.from(new Map((data || []).map(c => [c._id, c])).values());
                setAvailableCenters(uniqueCentres);
            }
        } catch (error) {
            console.error("Error fetching centres in CentrePerformance page:", error);
        }
    };

    return (
        <Layout activePage="Marketing & CRM">
            <div className={`min-h-screen p-4 md:p-8 ${isDarkMode ? 'bg-[#0b0e11]' : 'bg-gray-50'}`}>
                <div className="max-w-[1700px] mx-auto">
                    <CentrePerformanceContent
                        isDarkMode={isDarkMode}
                        availableCenters={availableCenters}
                    />
                </div>
            </div>
        </Layout>
    );
};

export default CentrePerformance;
