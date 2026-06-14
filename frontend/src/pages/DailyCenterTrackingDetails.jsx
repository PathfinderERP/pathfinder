import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import { FaBuilding, FaUsers, FaChartLine, FaClipboardList, FaArrowLeft, FaPhoneAlt, FaEnvelope, FaIdCard, FaUserTie, FaUserGraduate, FaMoneyBillWave, FaFileExcel } from 'react-icons/fa';
import { toast } from "react-toastify";

const DailyCenterTrackingDetails = () => {
    const { centerId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    // Get date range from query params or default to today
    const queryParams = new URLSearchParams(location.search);
    const initialDate = new Date().toISOString().split('T')[0];
    
    const [fromDate, setFromDate] = useState(queryParams.get('fromDate') || queryParams.get('date') || initialDate);
    const [toDate, setToDate] = useState(queryParams.get('toDate') || queryParams.get('date') || initialDate);
    const [searchQuery, setSearchQuery] = useState("");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState(null);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/operations/daily-tracking/${centerId}?fromDate=${fromDate}&toDate=${toDate}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const result = await response.json();
            if (response.ok) {
                setData(result);
                // Preserve active role if possible, otherwise set first
                const roles = Object.keys(result.roles).filter(role => role.toUpperCase() !== 'ADMIN' && role.toUpperCase() !== 'HOD');
                if (roles.length > 0) {
                    if (!activeRole || !roles.includes(activeRole)) {
                        setActiveRole(roles[0]);
                    }
                }
            } else {
                toast.error("Failed to fetch center details");
            }
        } catch (error) {
            console.error("Error fetching center details:", error);
            toast.error("Error fetching center details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [centerId, fromDate, toDate]);

    const handleExport = async () => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const roleParam = activeRole ? `&role=${encodeURIComponent(activeRole)}` : '';
            const response = await fetch(`${apiUrl}/operations/daily-tracking/export/${centerId}?fromDate=${fromDate}&toDate=${toDate}${roleParam}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const roleSuffix = activeRole ? `_${activeRole.toUpperCase()}` : '';
                a.download = `Performance_Report_${data.centerName}${roleSuffix}_${fromDate}_to_${toDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                toast.error("Failed to export report");
            }
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Error during export");
        }
    };

    const handleExportUserCalling = async (userId, userName) => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/operations/daily-tracking/user/export/${userId}?fromDate=${fromDate}&toDate=${toDate}&centerId=${centerId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Calling_Report_${userName.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                toast.error("Failed to export calling report");
            }
        } catch (error) {
            console.error("Export calling report error:", error);
            toast.error("Error during export");
        }
    };

    if (loading) return (
        <Layout activePage="Tracking & Flagging">
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        </Layout>
    );

    if (!data) return (
        <Layout activePage="Tracking & Flagging">
            <div className="p-6 text-center text-gray-500">Center not found.</div>
        </Layout>
    );

    const roles = Object.keys(data.roles).filter(role => role.toUpperCase() !== 'ADMIN' && role.toUpperCase() !== 'HOD');

    // Filter staff members based on search query
    const getFilteredStaff = (role) => {
        if (!data.roles[role]) return [];
        return data.roles[role].filter(staff => 
            staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            staff.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    return (
        <Layout activePage="Tracking & Flagging">
            <div className={`p-4 md:p-6 min-h-screen ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                
                {/* Header Section */}
                <div className="mb-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className={`mb-4 flex items-center gap-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <FaArrowLeft /> Back to Dashboard
                    </button>
                    
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                                <FaBuilding className="text-cyan-500" />
                                {data.centerName}
                            </h1>
                            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Performance tracking from {new Date(fromDate).toLocaleDateString('en-GB')} to {new Date(toDate).toLocaleDateString('en-GB')}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                            {/* Search */}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded border w-full md:w-64 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <FaUsers className="text-gray-500 text-sm" />
                                <input 
                                    type="text"
                                    placeholder="Search staff name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs w-full"
                                />
                            </div>

                            {/* Date Range Filters */}
                            <div className={`flex flex-wrap items-center gap-3 p-2 rounded border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">From:</label>
                                    <input 
                                        type="date" 
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="bg-transparent text-cyan-500 font-black text-xs outline-none cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                                <div className="h-4 w-[1px] bg-gray-800 hidden md:block" />
                                <div className="flex items-center gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">To:</label>
                                    <input 
                                        type="date" 
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="bg-transparent text-cyan-500 font-black text-xs outline-none cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            {/* Export Button */}
                            <button 
                                onClick={handleExport}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-[2px] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-green-900/20"
                            >
                                <FaClipboardList /> Export Excel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Role Tabs Section */}
                <div className="mb-8 overflow-x-auto">
                    <div className="flex border-b border-gray-800 gap-8 min-w-max">
                        {roles.map(role => {
                            const filteredStaff = getFilteredStaff(role);
                            const userCount = filteredStaff.length;
                            const isActive = activeRole === role;
                            return (
                                <button
                                    key={role}
                                    onClick={() => setActiveRole(role)}
                                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${
                                        isActive 
                                            ? 'text-cyan-500' 
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        {role}
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-cyan-500/20 text-cyan-500' : 'bg-gray-800 text-gray-500'}`}>
                                            {userCount}
                                        </span>
                                    </span>
                                    {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Role Performance Grid */}
                {activeRole && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {getFilteredStaff(activeRole).map((user) => (
                            <div key={user.userId} className={`p-6 rounded-[4px] border transition-all hover:scale-[1.02] ${
                                isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
                            }`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg overflow-hidden`}>
                                            {user.profileImage ? (
                                                <img 
                                                    src={user.profileImage} 
                                                    alt={user.name} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <FaUserTie className="text-xl" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-sm uppercase tracking-wider">{user.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <FaIdCard className="text-[10px] text-gray-500" />
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">{user.employeeId}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
                                        <span className="text-[8px] font-black text-green-500 uppercase tracking-tighter">Active</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded bg-black/20 border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaPhoneAlt className="text-[10px] text-cyan-500" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Calls</span>
                                        </div>
                                        <p className="text-xl font-black tracking-tighter">{user.performance.dailyCalls}</p>
                                    </div>
                                    <div className="p-3 rounded bg-black/20 border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaUsers className="text-[10px] text-purple-500" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Counselled</span>
                                        </div>
                                        <p className="text-xl font-black tracking-tighter">{user.performance.counselled}</p>
                                    </div>
                                    <div className="p-3 rounded bg-black/20 border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaUserGraduate className="text-[10px] text-green-500" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Admissions</span>
                                        </div>
                                        <p className="text-xl font-black tracking-tighter">{user.performance.admissions}</p>
                                    </div>
                                    <div className="p-3 rounded bg-black/20 border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaMoneyBillWave className="text-[10px] text-amber-500" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Collection</span>
                                        </div>
                                        <p className="text-xl font-black tracking-tighter text-amber-500">₹{user.performance.collection.toLocaleString()}</p>
                                    </div>
                                </div>

                                {user.callHistory && user.callHistory.length > 0 && (
                                    <div className={`mt-4 p-4 rounded-[4px] border ${isDarkMode ? 'bg-[#15191c] border-gray-800/50' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <FaChartLine className="text-[10px] text-cyan-500" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Call History (5 Days)</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {user.callHistory.map((history, idx) => {
                                                const percentage = Math.min((history.calls / history.target) * 100, 100);
                                                return (
                                                    <div key={idx} className="flex flex-col gap-1.5">
                                                        <div className="flex justify-between items-center text-[10px]">
                                                            <span className={`font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {new Date(history.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                            <span className={`font-black ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                {history.calls} <span className="text-gray-500 font-medium">/ {history.target}</span>
                                                            </span>
                                                        </div>
                                                        <div className={`w-full rounded-full h-1.5 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                                            <div 
                                                                className={`h-1.5 rounded-full transition-all duration-500 ${percentage >= 100 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 flex gap-2">
                                    <button 
                                        onClick={() => navigate(`/daily-center-tracking/user/${user.userId}?fromDate=${fromDate}&toDate=${toDate}&centerId=${centerId}`)}
                                        className={`flex-1 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-wider transition-all text-center ${
                                            isDarkMode 
                                                ? 'bg-gray-800 text-gray-400 hover:bg-cyan-500 hover:text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-cyan-500 hover:text-white border border-gray-200'
                                        }`}
                                    >
                                        Activity Log
                                    </button>
                                    <button 
                                        onClick={() => handleExportUserCalling(user.userId, user.name)}
                                        className={`flex-1 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1 ${
                                            isDarkMode 
                                                ? 'bg-gray-800 text-gray-400 hover:bg-green-600 hover:text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-green-600 hover:text-white border border-gray-200'
                                        }`}
                                    >
                                        <FaFileExcel className="text-[10px] text-green-500" /> Export
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {(roles.length === 0 || (activeRole && getFilteredStaff(activeRole).length === 0)) && (
                    <div className={`p-12 text-center rounded-[4px] border border-dashed ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <FaUsers className="mx-auto text-4xl text-gray-700 mb-4" />
                        <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">No staff performance data found for the selected criteria.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default DailyCenterTrackingDetails;
