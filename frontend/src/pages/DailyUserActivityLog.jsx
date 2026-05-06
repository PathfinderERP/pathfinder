import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import { FaUserTie, FaArrowLeft, FaPhoneAlt, FaUsers, FaUserGraduate, FaMoneyBillWave, FaCalendarAlt, FaIdCard, FaReceipt } from 'react-icons/fa';
import { toast } from "react-toastify";

const DailyUserActivityLog = () => {
    const { userId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    
    // Get date range from query params or default to today
    const queryParams = new URLSearchParams(location.search);
    const initialDate = new Date().toISOString().split('T')[0];
    
    const [fromDate, setFromDate] = useState(queryParams.get('fromDate') || queryParams.get('date') || initialDate);
    const [toDate, setToDate] = useState(queryParams.get('toDate') || queryParams.get('date') || initialDate);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                const apiUrl = import.meta.env.VITE_API_URL;
                const response = await fetch(`${apiUrl}/operations/daily-tracking/user/${userId}?fromDate=${fromDate}&toDate=${toDate}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const result = await response.json();
                if (response.ok) {
                    setData(result);
                } else {
                    toast.error("Failed to fetch activity log");
                }
            } catch (error) {
                console.error("Error fetching activity log:", error);
                toast.error("Error fetching activity log");
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, [userId, fromDate, toDate]);

    if (loading) return (
        <Layout activePage="Daily Center Tracking">
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
        </Layout>
    );

    if (!data) return (
        <Layout activePage="Daily Center Tracking">
            <div className="p-6 text-center text-gray-500">Activity log not found.</div>
        </Layout>
    );

    const stats = [
        { 
            title: "Leads Analysis", 
            icon: <FaPhoneAlt />, 
            color: "text-cyan-500", 
            bg: "bg-cyan-500/10",
            metrics: [
                { label: "Fresh Leads", value: data.leads.fresh },
                { label: "Contacted Leads", value: data.leads.contacted },
                { label: "Total Follow-ups", value: data.leads.totalFollowUps }
            ]
        },
        { 
            title: "Counseling Analysis", 
            icon: <FaUsers />, 
            color: "text-purple-500", 
            bg: "bg-purple-500/10",
            metrics: [
                { label: "Normal Counselled", value: data.counselled.normal },
                { label: "Board Counselled", value: data.counselled.board },
                { label: "Total Counselled", value: data.counselled.total }
            ]
        },
        { 
            title: "Admission Analysis", 
            icon: <FaUserGraduate />, 
            color: "text-green-500", 
            bg: "bg-green-500/10",
            metrics: [
                { label: "Normal Admissions", value: data.admissions.normal },
                { label: "Board Admissions", value: data.admissions.board },
                { label: "Total Admissions", value: data.admissions.total }
            ]
        }
    ];

    return (
        <Layout activePage="Daily Center Tracking">
            <div className={`p-4 md:p-6 min-h-screen ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                
                {/* Header Section */}
                <div className="mb-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className={`mb-4 flex items-center gap-2 text-sm font-medium transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <FaArrowLeft /> Back to Center Details
                    </button>
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg`}>
                                <FaUserTie className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold uppercase tracking-tight">{data.userName}</h1>
                                <div className="flex items-center gap-3 mt-1 text-gray-500">
                                    <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                                        {data.role}
                                    </span>
                                    <span>•</span>
                                    <span className="text-xs font-medium flex items-center gap-1">
                                        <FaCalendarAlt />
                                        {new Date(fromDate).toLocaleDateString('en-GB')} - {new Date(toDate).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className={`flex flex-wrap items-center gap-3 p-2 rounded border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="flex items-center gap-2 px-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">From:</label>
                                <input 
                                    type="date" 
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-cyan-500 font-black text-xs outline-none cursor-pointer [color-scheme:dark]"
                                />
                            </div>
                            <div className="h-4 w-[1px] bg-gray-800 hidden md:block" />
                            <div className="flex items-center gap-2 px-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">To:</label>
                                <input 
                                    type="date" 
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-cyan-500 font-black text-xs outline-none cursor-pointer [color-scheme:dark]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {stats.map((stat, idx) => (
                        <div key={idx} className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`p-2.5 rounded ${stat.bg} ${stat.color}`}>
                                    {stat.icon}
                                </div>
                                <h3 className="font-black text-xs uppercase tracking-[0.2em]">{stat.title}</h3>
                            </div>
                            <div className="space-y-4">
                                {stat.metrics.map((m, midx) => (
                                    <div key={midx} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{m.label}</span>
                                        <span className="text-lg font-black tracking-tighter">{m.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Collection Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className={`p-6 rounded-[4px] border border-l-4 border-l-cyan-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Total Fresh Admission Amount</p>
                                <h2 className="text-3xl font-black tracking-tighter text-cyan-500">₹{data.collections.freshAdmissionTotal.toLocaleString()}</h2>
                            </div>
                            <div className="p-4 rounded bg-cyan-500/10 text-cyan-500 text-2xl">
                                <FaUserGraduate />
                            </div>
                        </div>
                    </div>
                    <div className={`p-6 rounded-[4px] border border-l-4 border-l-amber-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Total Installment Amount</p>
                                <h2 className="text-3xl font-black tracking-tighter text-amber-500">₹{data.collections.installmentTotal.toLocaleString()}</h2>
                            </div>
                            <div className="p-4 rounded bg-amber-500/10 text-amber-500 text-2xl">
                                <FaReceipt />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Collection Table */}
                <div className={`rounded-[4px] border overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded bg-amber-500/10 text-amber-500">
                                <FaMoneyBillWave />
                            </div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em]">Detailed Transaction Analysis</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-black/20 text-gray-500' : 'bg-gray-50 text-gray-500'}`}>
                                    <th className="px-6 py-4 font-black">Student Details</th>
                                    <th className="px-6 py-4 font-black text-center">Payment Type</th>
                                    <th className="px-6 py-4 font-black text-center">Method</th>
                                    <th className="px-6 py-4 font-black text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.collections.details.map((col, idx) => (
                                    <tr key={idx} className={isDarkMode ? 'hover:bg-black/10' : 'hover:bg-gray-50'}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black uppercase tracking-tight">{col.studentName}</span>
                                                <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                                                    <FaIdCard className="text-[8px]" /> {col.admissionNumber}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                                                col.isFresh 
                                                    ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20' 
                                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                            }`}>
                                                {col.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{col.method}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-lg font-black tracking-tighter ${col.isFresh ? 'text-cyan-500' : 'text-amber-500'}`}>
                                                ₹{col.amount.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {data.collections.details.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic text-sm">
                                            No collection transactions recorded for the selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {data.collections.details.length > 0 && (
                                <tfoot className={isDarkMode ? 'bg-black/30' : 'bg-gray-100'}>
                                    <tr className="font-black">
                                        <td colSpan="2" className="px-6 py-4 text-sm uppercase tracking-widest">Total Collection Summary</td>
                                        <td className="px-6 py-4 text-center text-xs text-gray-500">{data.collections.details.length} Txns</td>
                                        <td className="px-6 py-4 text-right text-xl tracking-tighter text-amber-500">
                                            ₹{(data.collections.freshAdmissionTotal + data.collections.installmentTotal).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default DailyUserActivityLog;
