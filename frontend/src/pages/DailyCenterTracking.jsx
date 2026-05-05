import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import { FaBuilding, FaUsers, FaChartLine, FaClipboardList, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from "react-toastify";

const DailyCenterTracking = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchCenters = async () => {
            try {
                const token = localStorage.getItem("token");
                const apiUrl = import.meta.env.VITE_API_URL;
                const response = await fetch(`${apiUrl}/centre`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await response.json();
                if (response.ok) {
                    // Map real centers to tracking structure
                    const trackingData = data.map(center => ({
                        id: center._id,
                        name: center.centreName,
                        head: "Not Assigned", // Default
                        status: "Active", // Default
                        staffPresent: Math.floor(Math.random() * 20) + 10,
                        staffTotal: 30,
                        classesHeld: Math.floor(Math.random() * 10),
                        classesPlanned: 10,
                        collections: `₹${(Math.random() * 50000).toFixed(0)}`,
                        leads: Math.floor(Math.random() * 50)
                    }));
                    setCenters(trackingData);
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
    }, []);

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
                            Monitor daily operations, attendance, classes, and collections across all centers.
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
                        { title: "Staff Attendance", value: "82%", icon: <FaUsers />, color: "text-green-500", bg: "bg-green-500/10" },
                        { title: "Classes Executed", value: "22/28", icon: <FaClipboardList />, color: "text-purple-500", bg: "bg-purple-500/10" },
                        { title: "Today's Collection", value: "₹1,55,000", icon: <FaChartLine />, color: "text-cyan-500", bg: "bg-cyan-500/10" }
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

                {/* Main Data Table/Cards */}
                <div className={`rounded overflow-hidden border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-5 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <h2 className="text-lg font-bold">Center Operations Overview</h2>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] text-gray-500' : 'bg-gray-50 text-gray-500'}`}>
                                    <th className="p-4 font-semibold">Center Name</th>
                                    <th className="p-4 font-semibold">Center Head</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Staff Attendance</th>
                                    <th className="p-4 font-semibold">Classes (Held/Plan)</th>
                                    <th className="p-4 font-semibold">Daily Leads</th>
                                    <th className="p-4 font-semibold">Collection</th>
                                    <th className="p-4 font-semibold text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="p-4 text-center text-gray-500">Loading centers...</td>
                                    </tr>
                                ) : filteredCenters.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-4 text-center text-gray-500">No centers found.</td>
                                    </tr>
                                ) : filteredCenters.map((center) => (
                                    <tr key={center.id} className={`border-b last:border-b-0 transition-colors ${
                                        isDarkMode ? 'border-gray-800 hover:bg-[#1f252b]' : 'border-gray-50 hover:bg-gray-50'
                                    }`}>
                                        <td className="p-4 font-medium flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${center.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            {center.name}
                                        </td>
                                        <td className="p-4 text-gray-500 dark:text-gray-400">{center.head}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded text-xs font-medium flex w-max items-center gap-1 ${
                                                center.status === 'Active' 
                                                    ? (isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700')
                                                    : (isDarkMode ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-700')
                                            }`}>
                                                {center.status === 'Active' ? <FaCheckCircle /> : <FaTimesCircle />}
                                                {center.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{center.staffPresent}</span>
                                                <span className="text-gray-500">/ {center.staffTotal}</span>
                                                {/* Simple Progress Bar */}
                                                <div className="w-16 h-1.5 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden ml-2">
                                                    <div 
                                                        className={`h-full rounded ${center.staffPresent / center.staffTotal > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                        style={{ width: `${center.staffTotal > 0 ? (center.staffPresent / center.staffTotal) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`font-medium ${center.classesHeld < center.classesPlanned ? 'text-yellow-500' : 'text-green-500'}`}>
                                                {center.classesHeld}
                                            </span>
                                            <span className="text-gray-500 ml-1">/ {center.classesPlanned}</span>
                                        </td>
                                        <td className="p-4 font-medium">{center.leads}</td>
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
                </div>

            </div>
        </Layout>
    );
};

export default DailyCenterTracking;
