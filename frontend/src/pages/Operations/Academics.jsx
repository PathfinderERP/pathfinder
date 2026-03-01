import React from 'react';
import Layout from '../../components/Layout';
import { useTheme } from "../../context/ThemeContext";
import { FaGraduationCap, FaChalkboardTeacher, FaCalendarAlt, FaHistory } from 'react-icons/fa';

const OperationsAcademicsPage = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    return (
        <Layout activePage="Operations">
            <div className={`p-6 min-h-screen ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                        Academic Operations
                    </h1>
                    <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Oversee day-to-day academic delivery and classroom operations.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className={`group p-8 rounded-3xl transition-all cursor-pointer ${
                        isDarkMode ? 'bg-[#1a1f24] border border-gray-800 hover:bg-gray-800/80' : 'bg-white shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-purple-500/5'
                    }`}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                                <FaChalkboardTeacher className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Class Dispatch</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest">Active Monitoring</p>
                            </div>
                        </div>
                        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Monitor real-time class delivery across all centres. Ensure teachers and students are present and resources are allocated correctly.
                        </p>
                    </div>

                    <div className={`group p-8 rounded-3xl transition-all cursor-pointer ${
                        isDarkMode ? 'bg-[#1a1f24] border border-gray-800 hover:bg-gray-800/80' : 'bg-white shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-indigo-500/5'
                    }`}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                                <FaCalendarAlt className="text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Execution Schedule</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest">Planning & Review</p>
                            </div>
                        </div>
                        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Track the execution of course plans. compare planned vs actual coverage of topics and syllabus for all active batches.
                        </p>
                    </div>
                </div>

                <div className={`mt-12 p-8 rounded-3xl flex items-center gap-6 ${isDarkMode ? 'bg-indigo-500/5' : 'bg-indigo-50'}`}>
                    <div className="p-4 rounded-full bg-indigo-500 text-white shadow-lg">
                        <FaHistory />
                    </div>
                    <div>
                        <h4 className="font-bold text-indigo-500">Resource History</h4>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>View historical data of academic resource utilization and centre efficiency.</p>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default OperationsAcademicsPage;
