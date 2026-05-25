import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import { FaBuilding, FaUsers, FaChartLine, FaClipboardList, FaSearch, FaFilter, FaCheckCircle, FaTimesCircle, FaThLarge, FaList, FaWalking, FaComments, FaUserPlus, FaPhoneAlt, FaRupeeSign } from 'react-icons/fa';
import { toast } from "react-toastify";
import DailyTrackingDetailsModal from '../components/Dashboard/DailyTrackingDetailsModal';

const DailyCenterTracking = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewMode, setViewMode] = useState("card"); // "card" or "table"
    const navigate = useNavigate();

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [detailsData, setDetailsData] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const handleCardClick = async (category, title) => {
        setSelectedCategory(category);
        setModalTitle(title);
        setShowDetailsModal(true);
        setLoadingDetails(true);
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/operations/daily-tracking/details?date=${selectedDate}&category=${category}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (response.ok) {
                setDetailsData(data);
            } else {
                toast.error(data.message || "Failed to fetch details");
                setShowDetailsModal(false);
            }
        } catch (error) {
            console.error("Error fetching details:", error);
            toast.error("Error fetching details");
            setShowDetailsModal(false);
        } finally {
            setLoadingDetails(false);
        }
    };

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
        <Layout activePage="Tracking & Flagging">
            <div className={`p-4 md:p-6 min-h-screen ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                            <FaBuilding className="text-cyan-500" />
                            Daily Center Tracking
                            {centers.length > 0 && (
                                <span className={`text-xs px-2.5 py-1 rounded border font-semibold ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-100'}`}>
                                    {centers.filter(c => c.status === "Active" || c.status === "active").length} Active
                                </span>
                            )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {[
                        { title: "Daily Walk-Ins", category: "walkins", value: centers.reduce((acc, curr) => acc + (curr.walkIns || 0), 0).toString(), icon: <FaWalking />, color: "text-blue-500", bg: "bg-blue-500/10" },
                        { title: "Daily Counselling", category: "counselling", value: centers.reduce((acc, curr) => acc + ((curr.counselledNormal || 0) + (curr.counselledBoard || 0)), 0).toString(), icon: <FaComments />, color: "text-green-500", bg: "bg-green-500/10" },
                        { 
                            title: "Daily Admission", 
                            category: "admission",
                            value: centers.reduce((acc, curr) => acc + ((curr.admissionNormal || 0) + (curr.admissionBoard || 0)), 0).toString(), 
                            subtext: `Normal: ${centers.reduce((acc, curr) => acc + (curr.admissionNormal || 0), 0)} | Board: ${centers.reduce((acc, curr) => acc + (curr.admissionBoard || 0), 0)}`,
                            icon: <FaUserPlus />, 
                            color: "text-purple-500", 
                            bg: "bg-purple-500/10" 
                        },
                        { title: "Daily Calls", category: "calls", value: centers.reduce((acc, curr) => acc + (curr.dailyCalls || 0), 0).toString(), icon: <FaPhoneAlt />, color: "text-yellow-500", bg: "bg-yellow-500/10" },
                        { 
                            title: "Total Collection", 
                            category: "collection",
                            value: `₹${centers.reduce((acc, curr) => acc + (curr.collectionsVal || 0), 0).toLocaleString()}`, 
                            subtext: `Admission: ₹${centers.reduce((acc, curr) => acc + (curr.collectionsAdmissionVal || 0), 0).toLocaleString()} | Installment: ₹${centers.reduce((acc, curr) => acc + (curr.collectionsInstallmentVal || 0), 0).toLocaleString()}`,
                            icon: <FaRupeeSign />, 
                            color: "text-cyan-500", 
                            bg: "bg-cyan-500/10" 
                        }
                    ].map((kpi, index) => (
                        <div 
                            key={index} 
                            onClick={() => handleCardClick(kpi.category, kpi.title)}
                            className={`p-5 rounded transition-all hover:shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] select-none hover:border-cyan-500/40 ${
                            isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'
                        }`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-3 rounded ${kpi.bg} ${kpi.color} shrink-0`}>
                                    {React.cloneElement(kpi.icon, { className: "text-xl" })}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-medium`}>{kpi.title}</p>
                                    <h3 className="text-xl font-bold mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{kpi.value}</h3>
                                    {kpi.subtext && (
                                        <p className={`text-[10px] mt-1 font-semibold whitespace-nowrap overflow-hidden text-ellipsis ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {kpi.subtext}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className={`rounded overflow-hidden border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            Center Operations Overview
                            {centers.length > 0 && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isDarkMode ? 'bg-cyan-950 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                    {filteredCenters.filter(c => c.status === "Active" || c.status === "active").length} Active
                                </span>
                            )}
                        </h2>
                        
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
                                                    <button 
                                                        onClick={() => navigate(`/daily-center-tracking/${center.id}?date=${selectedDate}`)}
                                                        className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
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

                                        <button 
                                            onClick={() => navigate(`/daily-center-tracking/${center.id}?date=${selectedDate}`)}
                                            className={`w-full py-2 rounded text-sm font-medium transition-colors ${
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
            
            <DailyTrackingDetailsModal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title={modalTitle}
                data={detailsData}
                loading={loadingDetails}
                isDarkMode={isDarkMode}
            />
        </Layout>
    );
};

export default DailyCenterTracking;
