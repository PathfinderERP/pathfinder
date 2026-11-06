import React, { useEffect } from "react";
import Layout from "../../components/Layout";
import MarketingAnalysisContent from "../../components/MarketingCRM/MarketingAnalysisContent";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { hasModuleAccess, hasPermission } from "../../config/permissions";

const MarketingAnalysis = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    useEffect(() => {
        const canAccess = hasModuleAccess(currentUser, "marketingCRM") &&
            hasPermission(currentUser, "marketingCRM", "marketingAnalysis", "view");

        if (!canAccess) {
            navigate("/dashboard");
        }
    }, [currentUser, navigate]);

    return (
        <Layout activePage="Marketing & CRM">
            <div className={`min-h-screen p-4 md:p-8 ${isDarkMode ? "bg-[#0b0e11]" : "bg-gray-50"}`}>
                <div className="max-w-[1700px] mx-auto">
                    <MarketingAnalysisContent isDarkMode={isDarkMode} />
                </div>
            </div>
        </Layout>
    );
};

export default MarketingAnalysis;
