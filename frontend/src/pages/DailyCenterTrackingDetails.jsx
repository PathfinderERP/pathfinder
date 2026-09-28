import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import { FaBuilding, FaUsers, FaClipboardList, FaArrowLeft, FaPhoneAlt, FaEnvelope, FaIdCard, FaUserTie, FaUserGraduate, FaMoneyBillWave, FaFileExcel, FaTimes, FaSearch } from 'react-icons/fa';
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
    const [detailModal, setDetailModal] = useState({
        isOpen: false,
        type: null, // 'counselled' or 'admissions'
        user: null,
        data: [],
        loading: false,
        search: ''
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && detailModal.isOpen) {
                setDetailModal(prev => ({ ...prev, isOpen: false }));
            }
        };
        if (detailModal.isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [detailModal.isOpen]);

    const handleOpenDetailModal = async (user, type) => {
        const targetUserId = user?.userId || user?._id || user?.id;
        console.log("Opening detail modal for staff:", { type, user, targetUserId });

        setDetailModal({
            isOpen: true,
            type,
            user,
            data: [],
            loading: true,
            search: ''
        });

        if (!targetUserId) {
            console.error("Target user ID not found in staff object:", user);
            toast.error("User information incomplete");
            setDetailModal(prev => ({ ...prev, loading: false }));
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const endpoint = type === 'counselled' ? 'counselled' : 'admissions';
            const response = await fetch(`${apiUrl}/operations/daily-tracking/user/${targetUserId}/${endpoint}?fromDate=${fromDate}&toDate=${toDate}&centerId=${centerId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const result = await response.json();
            if (response.ok) {
                setDetailModal(prev => ({
                    ...prev,
                    data: Array.isArray(result) ? result : [],
                    loading: false
                }));
            } else {
                toast.error(result.message || `Failed to fetch ${type} details`);
                setDetailModal(prev => ({ ...prev, loading: false }));
            }
        } catch (error) {
            console.error(`Error fetching ${type} details:`, error);
            toast.error(`Error loading ${type} details`);
            setDetailModal(prev => ({ ...prev, loading: false }));
        }
    };

    const filteredModalData = (detailModal.data || []).filter(item => {
        if (!detailModal.search) return true;
        const q = detailModal.search.toLowerCase().trim();
        return (
            (item.studentName || '').toLowerCase().includes(q) ||
            (item.phoneNumber || '').includes(q) ||
            (item.admissionNumber || '').toLowerCase().includes(q) ||
            (item.courseName || '').toLowerCase().includes(q) ||
            (item.className || '').toLowerCase().includes(q) ||
            (item.boardName || '').toLowerCase().includes(q) ||
            (item.admissionType || '').toLowerCase().includes(q) ||
            (item.counsellingType || '').toLowerCase().includes(q)
        );
    });

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

    const formatRoleLabel = (role) => {
        if (!role) return '';
        const rLower = role.toLowerCase().replace(/[\s\-_]+/g, '');
        if (rLower === 'areamanager') return 'Area Manager';
        if (rLower === 'zonalmanager') return 'Zonal Manager';
        if (rLower === 'centerincharge' || rLower === 'centreincharge') return 'Center Incharge';
        if (rLower === 'assistantcenterincharge' || rLower === 'assistantcentreincharge') return 'Assistant Center Incharge';
        if (rLower === 'assistantzonalmanager') return 'Assistant Zonal Manager';
        if (rLower === 'centralizedtelecaller') return 'Centralized Telecaller';
        return role.replace(/([A-Z])/g, ' $1').trim();
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
                                        {formatRoleLabel(role)}
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
                                    <div 
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenDetailModal(user, 'counselled');
                                        }}
                                        className={`p-3 rounded border transition-all duration-200 cursor-pointer group select-none hover:shadow-lg active:scale-95 ${
                                            isDarkMode 
                                                ? 'bg-black/20 border-white/5 hover:border-purple-500/50 hover:bg-purple-500/10' 
                                                : 'bg-white border-gray-200 hover:border-purple-500 hover:bg-purple-50/50 shadow-sm'
                                        }`}
                                        title="Click to view counselled students"
                                    >
                                        <div className="flex items-center justify-between mb-1 pointer-events-none">
                                            <div className="flex items-center gap-1.5">
                                                <FaUsers className="text-[10px] text-purple-500 group-hover:scale-110 transition-transform" />
                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest group-hover:text-purple-400 transition-colors">Counselled</span>
                                            </div>
                                            <span className="text-[8px] font-bold text-purple-400 opacity-70 group-hover:opacity-100 transition-opacity">View ↗</span>
                                        </div>
                                        <p className="text-xl font-black tracking-tighter text-purple-400 pointer-events-none">{user.performance.counselled}</p>
                                    </div>
                                    <div 
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenDetailModal(user, 'admissions');
                                        }}
                                        className={`p-3 rounded border transition-all duration-200 cursor-pointer group select-none hover:shadow-lg active:scale-95 ${
                                            isDarkMode 
                                                ? 'bg-black/20 border-white/5 hover:border-green-500/50 hover:bg-green-500/10' 
                                                : 'bg-white border-gray-200 hover:border-green-500 hover:bg-green-50/50 shadow-sm'
                                        }`}
                                        title="Click to view admission details"
                                    >
                                        <div className="flex items-center justify-between mb-1 pointer-events-none">
                                            <div className="flex items-center gap-1.5">
                                                <FaUserGraduate className="text-[10px] text-green-500 group-hover:scale-110 transition-transform" />
                                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest group-hover:text-green-400 transition-colors">Admissions</span>
                                            </div>
                                            <span className="text-[8px] font-bold text-green-400 opacity-70 group-hover:opacity-100 transition-opacity">View ↗</span>
                                        </div>
                                        <p className="text-xl font-black tracking-tighter text-green-400 pointer-events-none">{user.performance.admissions}</p>
                                    </div>
                                    <div className="p-3 rounded bg-black/20 border border-white/5">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaMoneyBillWave className="text-[10px] text-amber-500" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Collection</span>
                                        </div>
                                        <p className="text-xl font-black tracking-tighter text-amber-500">₹{user.performance.collection.toLocaleString()}</p>
                                    </div>
                                </div>

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
                {/* Modal Pop-up for Counselled / Admissions */}
                {detailModal.isOpen && typeof document !== 'undefined' && createPortal(
                    <div 
                        id="daily-tracking-modal-backdrop"
                        className="fixed inset-0 flex items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-sm"
                        style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                        onClick={(e) => {
                            if (e.target.id === 'daily-tracking-modal-backdrop') {
                                setDetailModal(prev => ({ ...prev, isOpen: false }));
                            }
                        }}
                    >
                        <style>{`
                            @keyframes detailModalScaleIn {
                                0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                                100% { opacity: 1; transform: scale(1) translateY(0); }
                            }
                        `}</style>
                        <div 
                            className={`w-full max-w-5xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
                                isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-100 shadow-black/90' : 'bg-white border-gray-200 text-gray-900 shadow-xl'
                            }`}
                            style={{ animation: 'detailModalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className={`p-4 md:p-5 border-b flex items-center justify-between ${
                                isDarkMode ? 'border-gray-800 bg-[#161a1e]' : 'border-gray-100 bg-gray-50'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-lg ${
                                        detailModal.type === 'counselled'
                                            ? 'bg-purple-500/10 text-purple-400'
                                            : 'bg-green-500/10 text-green-400'
                                    }`}>
                                        {detailModal.type === 'counselled' ? <FaUsers className="text-lg" /> : <FaUserGraduate className="text-lg" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm md:text-base font-black uppercase tracking-wider">
                                                {detailModal.type === 'counselled' ? 'Counselled Students' : 'Admission Details'}
                                            </h2>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                detailModal.type === 'counselled' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
                                            }`}>
                                                {detailModal.data.length} Total
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 flex flex-wrap items-center gap-2 mt-0.5">
                                            <span className="font-bold text-gray-300">{detailModal.user?.name}</span>
                                            <span>•</span>
                                            <span className="uppercase text-cyan-400">{detailModal.user?.role}</span>
                                            <span>•</span>
                                            <span>{data?.centerName}</span>
                                            <span>•</span>
                                            <span>{fromDate} to {toDate}</span>
                                        </p>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
                                    className={`p-2 rounded-lg transition-colors ${
                                        isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    <FaTimes className="text-sm" />
                                </button>
                            </div>

                            {/* Search Bar & Stats */}
                            <div className={`px-4 md:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
                                isDarkMode ? 'border-gray-800 bg-[#111417]' : 'border-gray-100 bg-gray-50/50'
                            }`}>
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs w-full sm:w-80 ${
                                    isDarkMode ? 'bg-black/30 border-gray-700' : 'bg-white border-gray-200'
                                }`}>
                                    <FaSearch className="text-[10px] text-gray-400" />
                                    <input 
                                        type="text"
                                        placeholder="Search student, phone, course..."
                                        value={detailModal.search}
                                        onChange={(e) => setDetailModal(prev => ({ ...prev, search: e.target.value }))}
                                        className="bg-transparent outline-none w-full text-xs"
                                        autoFocus
                                    />
                                    {detailModal.search && (
                                        <button onClick={() => setDetailModal(prev => ({ ...prev, search: '' }))} className="text-gray-400 hover:text-white text-[10px]">
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className="text-[11px] text-gray-400">
                                    Showing <span className="font-bold text-cyan-400">{filteredModalData.length}</span> of {detailModal.data.length} records
                                </div>
                            </div>

                            {/* Modal Table Body */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-5">
                                {detailModal.loading ? (
                                    <div className="py-16 text-center">
                                        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Loading details...</p>
                                    </div>
                                ) : filteredModalData.length === 0 ? (
                                    <div className={`py-16 text-center rounded-lg border border-dashed ${
                                        isDarkMode ? 'border-gray-800 bg-black/10' : 'border-gray-200 bg-gray-50'
                                    }`}>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                            {detailModal.search ? 'No matching records found for search' : 'No records found for this period'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className={`border-b text-[9px] uppercase tracking-wider font-black ${
                                                    isDarkMode ? 'border-gray-800 text-gray-400 bg-black/20' : 'border-gray-200 text-gray-500 bg-gray-100'
                                                }`}>
                                                    <th className="py-2.5 px-3">#</th>
                                                    {detailModal.type === 'admissions' && <th className="py-2.5 px-3">Admission No</th>}
                                                    <th className="py-2.5 px-3">Student Name</th>
                                                    <th className="py-2.5 px-3">Mobile No</th>
                                                    <th className="py-2.5 px-3">Course</th>
                                                    <th className="py-2.5 px-3">Class</th>
                                                    <th className="py-2.5 px-3">Board</th>
                                                    <th className="py-2.5 px-3">Type</th>
                                                    {detailModal.type === 'counselled' && <th className="py-2.5 px-3">Enrolled</th>}
                                                    {detailModal.type === 'admissions' && (
                                                        <>
                                                            <th className="py-2.5 px-3 text-right">Down Payment</th>
                                                            <th className="py-2.5 px-3 text-right">Total Fees</th>
                                                            <th className="py-2.5 px-3 text-right">Balance</th>
                                                        </>
                                                    )}
                                                    <th className="py-2.5 px-3">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/60' : 'divide-gray-100'}`}>
                                                {filteredModalData.map((row, idx) => (
                                                    <tr 
                                                        key={row.id || row.admissionId || idx}
                                                        className={`transition-colors ${
                                                            isDarkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <td className="py-3 px-3 text-gray-500 font-mono text-[10px]">{idx + 1}</td>
                                                        {detailModal.type === 'admissions' && (
                                                            <td className="py-3 px-3">
                                                                <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                                                    {row.admissionNumber || 'N/A'}
                                                                </span>
                                                            </td>
                                                        )}
                                                        <td className="py-3 px-3 font-bold text-gray-200">
                                                            {row.studentName}
                                                        </td>
                                                        <td className="py-3 px-3 font-mono text-gray-400">
                                                            {row.phoneNumber || '-'}
                                                        </td>
                                                        <td className="py-3 px-3 max-w-[200px] truncate" title={row.courseName}>
                                                            {row.courseName || '-'}
                                                        </td>
                                                        <td className="py-3 px-3 text-gray-400">
                                                            {row.className || '-'}
                                                        </td>
                                                        <td className="py-3 px-3 text-gray-400">
                                                            {row.boardName || '-'}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                (row.admissionType === 'BOARD' || row.counsellingType?.includes('BOARD'))
                                                                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                                                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                                            }`}>
                                                                {row.admissionType || row.counsellingType || '-'}
                                                            </span>
                                                        </td>
                                                        {detailModal.type === 'counselled' && (
                                                            <td className="py-3 px-3">
                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                    row.isEnrolled 
                                                                        ? 'bg-green-500/15 text-green-400 border border-green-500/20' 
                                                                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                                                }`}>
                                                                    {row.isEnrolled ? 'Admitted' : 'Pending'}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {detailModal.type === 'admissions' && (
                                                            <>
                                                                <td className="py-3 px-3 text-right font-mono font-bold text-green-400">
                                                                    ₹{(row.downPayment || 0).toLocaleString('en-IN')}
                                                                </td>
                                                                <td className="py-3 px-3 text-right font-mono text-gray-300">
                                                                    ₹{(row.totalFees || 0).toLocaleString('en-IN')}
                                                                </td>
                                                                <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                                                                    ₹{(row.remainingAmount || 0).toLocaleString('en-IN')}
                                                                </td>
                                                            </>
                                                        )}
                                                        <td className="py-3 px-3 text-gray-400 text-[10px] whitespace-nowrap">
                                                            {row.date ? new Date(row.date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex items-center justify-between ${
                                isDarkMode ? 'border-gray-800 bg-[#161a1e]' : 'border-gray-100 bg-gray-50'
                            }`}>
                                <div className="text-[10px] text-gray-400">
                                    Press <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-gray-700 font-mono text-[9px]">ESC</kbd> or click backdrop to close
                                </div>
                                <button
                                    onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                        isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </Layout>
    );
};

export default DailyCenterTrackingDetails;
