import React from 'react';
import Layout from '../../components/Layout';
import { useTheme } from '../../context/ThemeContext';

const LiveClassReview = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-[#f8fafc]'}`}>
                <h1 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Live Class Review</h1>
                <div className={`p-6 rounded-lg border transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'}`}>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Welcome to the Live Class Review page.</p>
                    <p className={`mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400 font-medium'}`}>This feature is coming soon.</p>
                </div>
            </div>
        </Layout>
    );
};

export default LiveClassReview;