import React, { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { FaChevronLeft, FaChevronRight, FaSpinner, FaCalendarAlt, FaCalendarCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";

const HolidayList = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHolidays();
    }, [currentYear]);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/attendance/holidays?year=${currentYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Sort holidays by date
                const sortedHolidays = data.sort((a, b) => new Date(a.date) - new Date(b.date));
                setHolidays(sortedHolidays);
            }
        } catch (error) {
            toast.error("Failed to load holiday list");
        } finally {
            setLoading(false);
        }
    };

    const nextYear = () => setCurrentYear(prev => prev + 1);
    const prevYear = () => setCurrentYear(prev => prev - 1);
    const resetToCurrentYear = () => setCurrentYear(new Date().getFullYear());

    const getDayName = (dateString) => {
        const options = { weekday: 'long' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    const formatDate = (dateString) => {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 space-y-6 animate-fade-in pb-20">
                {/* Header Section */}
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-lg'} border p-8 rounded-[2.5rem] shadow-2xl`}>
                    <div>
                        <h2 className="text-cyan-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Annual Overview</h2>
                        <h1 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-tight italic`}>Holiday <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>List</span></h1>
                    </div>
                    <div className={`flex items-center gap-4 ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-200'} p-2 rounded-2xl border`}>
                        <button onClick={prevYear} className={`p-3 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'} rounded-xl transition-all`}>
                            <FaChevronLeft />
                        </button>
                        <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} px-4 min-w-[100px] text-center`}>{currentYear}</span>
                        <button onClick={nextYear} className={`p-3 ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'} rounded-xl transition-all`}>
                            <FaChevronRight />
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-[2rem] border overflow-hidden`}>
                    <div className={`p-8 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} border-b flex justify-between items-center`}>
                        <h3 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-bold text-lg flex items-center gap-3`}>
                            <FaCalendarCheck className="text-emerald-500" />
                            Official Holidays
                        </h3>
                        <button onClick={resetToCurrentYear} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500 hover:text-cyan-500' : 'text-gray-400 hover:text-cyan-600'} transition-colors`}>
                            Back to Current Year
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50/50 border-gray-100'} border-b`}>
                                    <th className={`p-6 text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest w-20`}>#</th>
                                    <th className={`p-6 text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Date</th>
                                    <th className={`p-6 text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Day</th>
                                    <th className={`p-6 text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest`}>Holiday Name</th>
                                    <th className={`p-6 text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest text-right`}>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="p-20 text-center">
                                            <FaSpinner className="animate-spin mx-auto text-cyan-500 text-3xl" />
                                        </td>
                                    </tr>
                                ) : holidays.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3 opacity-50">
                                                <FaCalendarAlt className="text-4xl text-gray-600" />
                                                <p className="text-gray-400 font-bold text-sm">No holidays found for {currentYear}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    holidays.map((holiday, index) => (
                                        <tr key={holiday._id || index} className={`${isDarkMode ? 'border-gray-800/50 hover:bg-gray-800/30' : 'border-gray-100 hover:bg-gray-50/50'} border-b transition-colors group`}>
                                            <td className={`p-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-bold text-sm`}>{index + 1}</td>
                                            <td className={`p-6 ${isDarkMode ? 'text-white' : 'text-gray-900'} font-bold text-sm`}>
                                                {formatDate(holiday.date)}
                                            </td>
                                            <td className={`p-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-medium text-sm`}>
                                                {getDayName(holiday.date)}
                                            </td>
                                            <td className={`p-6 ${isDarkMode ? 'text-white' : 'text-gray-900'} font-bold text-sm`}>
                                                {holiday.name}
                                            </td>
                                            <td className="p-6 text-right">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border ${holiday.type === 'Public' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    holiday.type === 'Office' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                                    }`}>
                                                    {holiday.type}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default HolidayList;
