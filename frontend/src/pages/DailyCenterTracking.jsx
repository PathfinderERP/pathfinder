import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import { FaBuilding, FaUsers, FaChartLine, FaClipboardList, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaThLarge, FaList } from 'react-icons/fa';
import { toast } from "react-toastify";

const DailyCenterTracking = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState("card"); // "card" or "table"

    useEffect(() => {
        const fetchCenters = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                const apiUrl = import.meta.env.VITE_API_URL;
                const response = await fetch(`${apiUrl}/operations/daily-tracking?date=${selectedDate}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await response.json();
                if (response.ok) {
                    setCenters(data);
                } else {
                    toast.error("Failed to fetch centers");
                }
            } catch (error) {
                console.error("Error fetching centers:", error);
                toast.error("Error fetching centers");
            } finally {
                setLoading(false);
            }
        };

        fetchCenters();
    }, [selectedDate]);

    const filteredCenters = centers.filter(center => 
        center.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout activePage="Daily Center Tracking">
            <div className={`p-4 md:p-6 min-h-screen ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                            <FaBuilding className="text-cyan-500" />
                            Daily Center Tracking
                        </h1>
                        <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Monitor daily operations, attendance, admissions, and collections across all centers.
                        </p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search centers..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 rounded border focus:ring-2 focus:ring-cyan-500 outline-none transition-all ${
                                    isDarkMode 
                                        ? 'bg-[#1a1f24] border-gray-700 text-white placeholder-gray-500' 
                                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                }`}
                            />
                        </div>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={`pl-3 pr-4 py-2 rounded border focus:ring-2 focus:ring-cyan-500 outline-none transition-all ${
                                    isDarkMode 
                                        ? 'bg-[#1a1f24] border-gray-700 text-white' 
                                        : 'bg-white border-gray-200 text-gray-900'
                                }`}
                            />
                        </div>
                        <button className={`p-2 rounded border transition-colors flex items-center gap-2 ${
                            isDarkMode 
                                ? 'bg-[#1a1f24] border-gray-700 hover:bg-gray-800 text-gray-300' 
                                : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}>
                            <FaFilter /> <span className="hidden sm:inline">Filter</span>
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { title: "Total Active Centers", value: centers.length.toString(), icon: <FaBuilding />, color: "text-blue-500", bg: "bg-blue-500/10" },
                        { title: "Total Daily Calls", value: centers.reduce((acc, curr) => acc + curr.dailyCalls, 0).toString(), icon: <FaUsers />, color: "text-green-500", bg: "bg-green-500/10" },
                        { title: "Total Admissions", value: centers.reduce((acc, curr) => acc + curr.admissionNormal + curr.admissionBoard, 0).toString(), icon: <FaClipboardList />, color: "text-purple-500", bg: "bg-purple-500/10" },
                        { title: "Total Collection", value: `₹${centers.reduce((acc, curr) => acc + parseInt((curr.collections || '0').toString().replace(/₹/g, '').replace(/,/g, '') || 0, 10), 0).toLocaleString()}`, icon: <FaChartLine />, color: "text-cyan-500", bg: "bg-cyan-500/10" }
                    ].map((kpi, index) => (
                        <div key={index} className={`p-6 rounded transition-all hover:shadow-lg ${
                            isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'
                        }`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded ${kpi.bg} ${kpi.color}`}>
                                    {React.cloneElement(kpi.icon, { className: "text-2xl" })}
                                </div>
                                <div>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.title}</p>
                                    <h3 className="text-2xl font-bold mt-1">{kpi.value}</h3>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className={`rounded overflow-hidden border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <h2 className="text-lg font-bold">Center Operations Overview</h2>
                        
                        {/* View Mode Toggle */}
                        <div className={`flex rounded p-1 border ${isDarkMode ? 'bg-[#131619] border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                            <button 
                                onClick={() => setViewMode('card')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded transition-all text-sm font-medium ${
                                    viewMode === 'card' 
                                        ? (isDarkMode ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white') 
                                        : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                                }`}
                            >
                                <FaThLarge /> Cards
                            </button>
                            <button 
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded transition-all text-sm font-medium ${
                                    viewMode === 'table' 
                                        ? (isDarkMode ? 'bg-cyan-600 text-white' : 'bg-cyan-500 text-white') 
                                        : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700')
                                }`}
                            >
                                <FaList /> Table
                            </button>
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading centers...</div>
                    ) : filteredCenters.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No centers found.</div>
                    ) : (
                        viewMode === 'table' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] text-gray-500' : 'bg-gray-50 text-gray-500'}`}>
                                            <th className="p-4 font-semibold min-w-[150px]">Center Name</th>
                                            <th className="p-4 font-semibold">Daily Calls</th>
                                            <th className="p-4 font-semibold">Counselled</th>
                                            <th className="p-4 font-semibold">Admission</th>
                                            <th className="p-4 font-semibold">Collection</th>
                                            <th className="p-4 font-semibold text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {filteredCenters.map((center) => (
                                            <tr key={center.id} className={`border-b last:border-b-0 transition-colors ${
                                                isDarkMode ? 'border-gray-800 hover:bg-[#1f252b]' : 'border-gray-50 hover:bg-gray-50'
                                            }`}>
                                                <td className="p-4 font-medium flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${center.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                    {center.name}
                                                </td>
                                                <td className="p-4 font-medium">{center.dailyCalls}</td>
                                                <td className="p-4 font-medium">
                                                    {center.counselledNormal + center.counselledBoard}
                                                </td>
                                                <td className="p-4 font-medium">
                                                    {center.admissionNormal + center.admissionBoard}
                                                </td>
                                                <td className="p-4 font-semibold text-cyan-600 dark:text-cyan-400">{center.collections}</td>
                                                <td className="p-4 text-center">
                                                    <button className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                                                        isDarkMode 
                                                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                                    }`}>
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredCenters.map((center) => (
                                    <div key={center.id} className={`rounded p-5 border transition-all hover:shadow-lg ${
                                        isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-lg ${
                                                    isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {center.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                                                        {center.name}
                                                    </h3>
                                                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        Head: {center.head}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                                                center.status === 'Active' 
                                                    ? (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700')
                                                    : (isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700')
                                            }`}>
                                                {center.status === 'Active' ? <FaCheckCircle /> : <FaTimesCircle />}
                                                {center.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 my-6">
                                            <div>
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Daily Calls</p>
                                                <span className="font-bold text-lg">{center.dailyCalls}</span>
                                            </div>
                                            <div>
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Counselled</p>
                                                <span className="font-bold text-lg">{center.counselledNormal + center.counselledBoard}</span>
                                            </div>
                                            <div>
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admission</p>
                                                <span className="font-bold text-lg">{center.admissionNormal + center.admissionBoard}</span>
                                            </div>
                                            <div className="col-span-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                                <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Collection</p>
                                                <span className="font-bold text-cyan-600 dark:text-cyan-400 text-lg">{center.collections}</span>
                                            </div>
                                        </div>

                                        <button className={`w-full py-2 rounded text-sm font-medium transition-colors ${
                                            isDarkMode 
                                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' 
                                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                            View Details
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default DailyCenterTracking;
