import React from 'react';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { FaBullhorn, FaChartLine, FaUsers, FaTasks } from 'react-icons/fa';

const MarketingPage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    return (
        <Layout activePage="Operations">
            <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                        Operational Marketing
                    </h1>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Manage marketing campaigns, outreach, and operational performance.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white shadow-sm border border-gray-100'}`}>
                        <FaBullhorn className="text-3xl text-orange-500 mb-4" />
                        <h3 className="text-lg font-bold mb-2">Campaign Tracking</h3>
                        <p className="text-sm text-gray-500 mb-4">Monitor active campaigns and their real-time performance metrics.</p>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: '65%' }}></div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white shadow-sm border border-gray-100'}`}>
                        <FaUsers className="text-3xl text-blue-500 mb-4" />
                        <h3 className="text-lg font-bold mb-2">Outreach Efficiency</h3>
                        <p className="text-sm text-gray-500 mb-4">Analyze the efficiency of your marketing team's outreach efforts.</p>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: '45%' }}></div>
                        </div>
                    </div>

                    <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white shadow-sm border border-gray-100'}`}>
                        <FaChartLine className="text-3xl text-green-500 mb-4" />
                        <h3 className="text-lg font-bold mb-2">Lead Conversion</h3>
                        <p className="text-sm text-gray-500 mb-4">View how operational marketing activities translate into successful leads.</p>
                        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: '80%' }}></div>
                        </div>
                    </div>
                </div>

                <div className={`mt-8 p-12 rounded-3xl border-2 border-dashed flex flex-col items-center text-center ${isDarkMode ? 'border-gray-800 bg-gray-900/40 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                    <FaTasks className="text-5xl mb-4 opacity-20" />
                    <p className="text-xl font-medium">Coming Soon</p>
                    <p className="text-sm mt-2">Extended marketing operations features are under development.</p>
                </div>
            </div>
        </Layout>
    );
};

export default MarketingPage;
