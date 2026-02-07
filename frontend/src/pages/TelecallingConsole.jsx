import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
    FaUserTie, FaUsers, FaPhoneAlt, FaCalendarAlt,
    FaSearch, FaArrowLeft, FaChartPie, FaChartBar, FaSun, FaMoon, FaSync, FaChartLine, FaHistory, FaCheckCircle, FaTimesCircle,
    FaFileExcel, FaRedo, FaClock
} from "react-icons/fa";
import { saveAs } from 'file-saver';
import { ToastContainer } from "react-toastify";
import {
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import LeadListModal from "./LeadListModal";
import FollowUpActivityModal from "../components/LeadManagement/FollowUpActivityModal";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AnalyticsDashboard = ({ data, isDarkMode }) => {
    if (!data) return null;

    const { leadStatus, feedbackAnalysis, calls } = data;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: "Today's Calls", value: calls.today, icon: <FaPhoneAlt />, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Yesterday", value: calls.yesterday, icon: <FaCalendarAlt />, color: "text-purple-500", bg: "bg-purple-500/10" },
                    { label: "Last 7 Days", value: calls.last7Days, icon: <FaChartBar />, color: "text-green-500", bg: "bg-green-500/10" },
                    { label: "Last 30 Days", value: calls.last30Days, icon: <FaChartLine />, color: "text-orange-500", bg: "bg-orange-500/10" },
                    { label: "Filtered Performance", value: calls.filtered, icon: <FaSearch />, color: "text-cyan-500", bg: "bg-cyan-500/10" }
                ].map((stat, idx) => (
                    <div key={idx} className={`p-4 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} flex items-center justify-between ${stat.label === "Filtered Performance" && calls.filtered === 0 ? 'opacity-50 grayscale' : 'hover:border-cyan-500/50'}`}>
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</p>
                            <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</h4>
                        </div>
                        <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Status Distribution */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaChartPie className="text-cyan-500" /> Lead Disposition
                    </h5>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={leadStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {leadStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Call Trend */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaChartLine className="text-green-500" /> Follow-up Activity (30 Days)
                    </h5>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={calls.trend}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10, fontWeight: 'bold' }}
                                    tickFormatter={(tick) => tick.slice(5)}
                                />
                                <YAxis tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ color: '#06b6d4' }}
                                    labelStyle={{ color: isDarkMode ? '#fff' : '#000', marginBottom: '4px' }}
                                />
                                <Area type="monotone" dataKey="calls" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCalls)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Feedback Analysis */}
                <div className={`col-span-1 lg:col-span-2 p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaChartBar className="text-purple-500" /> Top Feedback Analysis
                    </h5>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={feedbackAnalysis} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} horizontal={false} />
                                <XAxis type="number" tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={150}
                                    tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <Tooltip
                                    cursor={{ fill: isDarkMode ? '#374151' : '#f3f4f6', opacity: 0.4 }}
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ color: '#8884d8' }}
                                />
                                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20}>
                                    {feedbackAnalysis.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TelecallingConsole = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [telecallers, setTelecallers] = useState([]);
    const [assignedLeads, setAssignedLeads] = useState([]); // This might still be useful for "limit 100" partial view if we want to show a list somewhere, but we removed the list. It's now just for... checking length?
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [followUpStats, setFollowUpStats] = useState({
        totalScheduled: 0,
        totalFollowUps: 0,
        hotLeads: 0,
        coldLeads: 0,
        negativeLeads: 0,
        recentActivity: []
    });

    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        startTime: "",
        endTime: ""
    });

    const [activityModal, setActivityModal] = useState({
        isOpen: false,
        title: "",
        data: []
    });

    const [showLeadModal, setShowLeadModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalLeads, setModalLeads] = useState([]);

    const handleActivityCardClick = (type) => {
        let title = "";
        let data = [];

        switch (type) {
            case 'UPCOMING':
                title = "Upcoming Scheduled Follow-ups";
                data = followUpStats.scheduledList || [];
                break;
            case 'TODAY':
                title = "Today's Follow-up Activity";
                data = followUpStats.recentActivity || [];
                break;
            case 'HOT':
                title = "Hot Interest Leads Details";
                data = (followUpStats.recentActivity || []).filter(item =>
                    item.status?.toUpperCase() === 'HOT LEAD'
                );
                break;
            case 'COLD':
                title = "Cold Leads Discussions";
                data = (followUpStats.recentActivity || []).filter(item =>
                    item.status?.toUpperCase() === 'COLD LEAD'
                );
                break;
            case 'NEGATIVE':
                title = "Negative Results Records";
                data = (followUpStats.recentActivity || []).filter(item =>
                    item.status?.toUpperCase() === 'NEGATIVE'
                );
                break;
            default:
                return;
        }

        setActivityModal({
            isOpen: true,
            title: title.toUpperCase(),
            data
        });
    };

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const telecallerNameFromUrl = queryParams.get("telecaller");

    useEffect(() => {
        fetchTelecallers();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (telecallerNameFromUrl) {
            const loadData = async () => {
                setLoading(true);
                await Promise.all([
                    fetchAssignedLeads(telecallerNameFromUrl),
                    fetchAnalytics(telecallerNameFromUrl, filters),
                    fetchFollowUpStats(telecallerNameFromUrl, filters)
                ]);
                setLoading(false);
            };
            loadData();
        } else {
            setAssignedLeads([]);
            setAnalyticsData(null);
            fetchTelecallers(); // Ensure we have the list when not looking at specific telecaller
        }
        // eslint-disable-next-line
    }, [telecallerNameFromUrl, filters]);

    const fetchAnalytics = async (telecallerName, currentFilters = {}) => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ ...currentFilters });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/analytics/${encodeURIComponent(telecallerName)}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setAnalyticsData(data);
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    };

    const fetchFollowUpStats = async (telecallerName, currentFilters = {}) => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                leadResponsibility: telecallerName,
                ...currentFilters
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/stats/today-followups?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setFollowUpStats(data);
            }
        } catch (error) {
            console.error("Error fetching follow-up stats:", error);
        }
    };

    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                telecallerName: telecallerNameFromUrl,
                ...filters
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/export/telecaller-logs?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const blob = await response.blob();
                saveAs(blob, `Telecaller_${telecallerNameFromUrl.replace(/\s+/g, '_')}_Report.xlsx`);
            } else {
                const error = await response.json();
                alert(error.message || "Failed to export logs");
            }
        } catch (error) {
            console.error("Export error:", error);
            alert("Error exporting logs");
        }
    };

    const setDatePreset = (preset) => {
        const today = new Date().toISOString().split('T')[0];
        let fromDate = today;
        let toDate = today;

        if (preset === 'yesterday') {
            fromDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            toDate = fromDate;
        } else if (preset === '7days') {
            fromDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        } else if (preset === '30days') {
            fromDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        }

        setFilters(prev => ({ ...prev, fromDate, toDate }));
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: "",
            toDate: "",
            startTime: "",
            endTime: ""
        });
    };

    const fetchTelecallers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role === "superAdmin" || currentUser.role === "Super Admin";

            const userCentres = currentUser.centres?.map(c => c._id || c) || [];

            const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                let telecallersList = (data.users || []).filter(u => u.role === "telecaller");

                if (!isSuperAdmin && userCentres.length > 0) {
                    telecallersList = telecallersList.filter(telecaller => {
                        const telecallerCentres = telecaller.centres?.map(c => c._id || c) || [];
                        return telecallerCentres.some(tc => userCentres.includes(tc));
                    });
                }
                setTelecallers(telecallersList);
            }
        } catch (error) {
            console.error("Error fetching telecallers:", error);
        } finally {
            if (!telecallerNameFromUrl) setLoading(false);
        }
    };

    const fetchAssignedLeads = async (telecallerName) => {
        // Loading handled by wrapper
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role === "superAdmin" || currentUser.role === "Super Admin";

            const userCentres = currentUser.centres?.map(c => c.centreName || c) || [];

            const params = new URLSearchParams({ leadResponsibility: telecallerName, limit: 100 });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                let leads = data.leads || [];

                if (!isSuperAdmin && userCentres.length > 0) {
                    leads = leads.filter(lead => userCentres.includes(lead.centre));
                }

                // Sort by follow-ups length descending
                const sortedLeads = leads.sort((a, b) => (b.followUps?.length || 0) - (a.followUps?.length || 0));
                setAssignedLeads(sortedLeads);
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
        }
    };

    const handleTelecallerClick = (telecaller) => {
        navigate(`/admissions/telecalling-console?telecaller=${encodeURIComponent(telecaller.name)}`);
    };



    const fetchLeadsByStatus = async (status) => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                leadResponsibility: telecallerNameFromUrl,
                limit: 500, // Fetch up to 500 for the modal list
                followUpStatus: status
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) return data.leads || [];
            return [];
        } catch (error) {
            console.error("Error fetching modal leads:", error);
            return [];
        }
    };

    // Update Stats to use Analytics Data
    const totalAssignedRef = analyticsData?.performance?.totalAssigned || 0;
    const totalFollowUpsRef = analyticsData?.performance?.totalFollowUps || 0;
    const conversionRateRef = analyticsData?.performance?.conversionRate || 0;

    // Modal Handler
    const openLeadModal = async (type) => {
        setShowLeadModal(true);
        setModalLeads([]); // Clear previous data

        let leads = [];
        if (type === 'CONTACTED') {
            setModalTitle(`CONTACTED STUDENTS`);
            leads = await fetchLeadsByStatus('contacted');
            setModalTitle(`CONTACTED STUDENTS (${leads.length})`);
        } else if (type === 'REMAINING') {
            setModalTitle(`REMAINING STUDENTS`);
            leads = await fetchLeadsByStatus('remaining');
            setModalTitle(`REMAINING STUDENTS (${leads.length})`);
        } else {
            setModalTitle(`ALL ASSIGNED STUDENTS`);
            // Fallback to assignedLeads or fetch all if needed
            leads = assignedLeads;
        }
        setModalLeads(leads);
    };

    const contactData = [
        { name: 'Contacted', value: analyticsData?.performance?.called || 0 },
        { name: 'Remaining', value: analyticsData?.performance?.remaining || 0 }
    ];

    return (
        <Layout activePage="Admissions">
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-[#0f1215] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />

                {/* Tactical Header */}
                <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-30 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-md'}`}>
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <FaArrowLeft size={14} />
                        </button>
                        <div>
                            <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Telecalling Performance Console
                            </h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2 italic">
                                {!telecallerNameFromUrl ? "ANALYZE PERFORMANCE AND METRICS" : `PERFORMANCE LOGS FOR AGENT: ${telecallerNameFromUrl.toUpperCase()}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                            title="Toggle Mode"
                        >
                            {isDarkMode ? <FaSun /> : <FaMoon />}
                        </button>
                        <button
                            onClick={() => telecallerNameFromUrl ? fetchAssignedLeads(telecallerNameFromUrl) : fetchTelecallers()}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black' : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100 shadow-sm'}`}
                            title="Refresh Data"
                        >
                            <FaSync className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-8 space-y-8 custom-scrollbar overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-6">
                            <FaSync size={48} className="text-cyan-500 animate-spin" />
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-500 animate-pulse">Synchronizing Data...</p>
                        </div>
                    ) : (
                        <>
                            {telecallerNameFromUrl && (
                                <div className={`p-6 rounded-[4px] border flex flex-col lg:flex-row items-center justify-between gap-6 transition-all animate-fadeIn ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    {/* Presets */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest mr-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Presets</span>
                                        {['today', 'yesterday', '7days', '30days'].map(preset => (
                                            <button
                                                key={preset}
                                                onClick={() => setDatePreset(preset)}
                                                className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500'}`}
                                            >
                                                {preset === '7days' ? 'Last 7 Days' : preset === '30days' ? 'Last 30 Days' : preset.charAt(0).toUpperCase() + preset.slice(1)}
                                            </button>
                                        ))}
                                        <button
                                            onClick={resetFilters}
                                            className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white'}`}
                                        >
                                            <FaRedo size={10} /> Reset
                                        </button>
                                    </div>

                                    {/* Custom Filters */}
                                    <div className="flex flex-wrap items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Range</span>
                                            <input
                                                type="date"
                                                value={filters.fromDate}
                                                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                                className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            />
                                            <span className="text-gray-500">→</span>
                                            <input
                                                type="date"
                                                value={filters.toDate}
                                                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                                className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <FaClock className="text-cyan-500" size={12} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Time</span>
                                            <input
                                                type="time"
                                                value={filters.startTime}
                                                onChange={(e) => handleFilterChange('startTime', e.target.value)}
                                                className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            />
                                            <span className="text-gray-500">-</span>
                                            <input
                                                type="time"
                                                value={filters.endTime}
                                                onChange={(e) => handleFilterChange('endTime', e.target.value)}
                                                className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                            />
                                        </div>

                                        <button
                                            onClick={handleExportExcel}
                                            className={`px-6 py-2.5 rounded-[2px] bg-green-600 text-black hover:bg-green-500 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95`}
                                        >
                                            <FaFileExcel size={14} /> Export Report
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!telecallerNameFromUrl ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
                                    {telecallers.map(caller => (
                                        <div
                                            key={caller._id}
                                            onClick={() => handleTelecallerClick(caller)}
                                            className={`p-8 rounded-[4px] border transition-all cursor-pointer group flex flex-col items-center relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/50 hover:bg-[#1e242a]' : 'bg-white border-gray-200 hover:border-cyan-500/50 hover:bg-gray-50 shadow-sm'}`}
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                                            <div className={`w-24 h-24 rounded-[4px] flex items-center justify-center text-4xl mb-6 shadow-xl transition-all group-hover:scale-110 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-100 shadow-sm'}`}>
                                                <FaUserTie />
                                            </div>
                                            <h3 className={`text-xl font-black uppercase tracking-tight text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{caller.name}</h3>
                                            <div className="flex flex-col items-center mt-4">
                                                <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">ASSIGNED ROLE</p>
                                                <p className={`text-[11px] font-black uppercase mt-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{caller.role}</p>
                                            </div>
                                            <div className={`mt-6 w-full pt-6 border-t flex justify-center ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-cyan-500/40 group-hover:text-cyan-400' : 'text-cyan-600/40 group-hover:text-cyan-600'}`}>VIEW METRICS →</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-10 animate-fadeIn">
                                    {/* Analytics Dashboard */}
                                    <AnalyticsDashboard data={analyticsData} isDarkMode={isDarkMode} />

                                    {/* Detailed Stats Cards Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        {/* Scheduled Follow-ups Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('UPCOMING')}
                                            className={`p-5 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/50' : 'bg-cyan-50 border-cyan-100 shadow-sm hover:border-cyan-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Upcoming Tasks</p>
                                                    <h3 className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalScheduled}</h3>
                                                    <p className="text-[8px] font-bold text-cyan-500 mt-1 uppercase tracking-widest">Scheduled Follow-ups</p>
                                                </div>
                                                <div className={`p-2.5 rounded-[20px] transition-all bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]`}>
                                                    <FaCalendarAlt size={16} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform group-hover:scale-110 transition-transform text-cyan-500">
                                                <FaCalendarAlt size={100} />
                                            </div>
                                        </div>

                                        {/* Total Follow-ups Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('TODAY')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-cyan-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Today's Activity</p>
                                                    <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalFollowUps}</h3>
                                                    <p className="text-[9px] font-bold text-cyan-500 mt-1 uppercase tracking-widest">Follow-ups Recorded</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchFollowUpStats(telecallerNameFromUrl);
                                                    }}
                                                    className={`p-3 rounded-[2px] transition-all hover:rotate-180 duration-500 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-50 text-cyan-600'}`}
                                                >
                                                    <FaHistory size={20} />
                                                </button>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                                <FaHistory size={100} />
                                            </div>
                                        </div>

                                        {/* Hot Leads Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('HOT')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-red-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-red-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Hot Interests</p>
                                                    <h3 className="text-3xl font-black italic tracking-tighter text-red-500">{followUpStats.hotLeads}</h3>
                                                    <p className="text-[9px] font-bold text-red-500/80 mt-1 uppercase tracking-widest">Positive Feedback</p>
                                                </div>
                                                <div className="p-3 bg-red-500/10 text-red-500 rounded-[2px]">
                                                    <FaChartLine size={20} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                                <FaChartLine size={100} />
                                            </div>
                                        </div>

                                        {/* Cold Leads Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('COLD')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-blue-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-blue-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Cold Leads</p>
                                                    <h3 className="text-3xl font-black italic tracking-tighter text-blue-500">{followUpStats.coldLeads}</h3>
                                                    <p className="text-[9px] font-bold text-blue-500/80 mt-1 uppercase tracking-widest">Ongoing Discussions</p>
                                                </div>
                                                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-[2px]">
                                                    <FaSearch size={20} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                                <FaSearch size={100} />
                                            </div>
                                        </div>

                                        {/* Negative Results Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('NEGATIVE')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-gray-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-gray-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Negative Results</p>
                                                    <h3 className="text-3xl font-black italic tracking-tighter text-gray-500">{followUpStats.negativeLeads}</h3>
                                                    <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-widest">No Interest Shown</p>
                                                </div>
                                                <div className="p-3 bg-gray-500/10 text-gray-500 rounded-[2px]">
                                                    <FaTimesCircle size={20} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                                <FaTimesCircle size={100} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className={`p-8 rounded-[4px] border transition-all flex items-center gap-6 shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
                                            <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center text-3xl border transition-transform hover:scale-110 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-lg shadow-cyan-500/10' : 'bg-cyan-50 text-cyan-600 border-cyan-100 shadow-sm'}`}>
                                                <FaUsers />
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">TOTAL LEADS ASSIGNED</p>
                                                <h4 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalAssignedRef}</h4>
                                            </div>
                                        </div>

                                        <div className={`p-8 rounded-[4px] border transition-all flex items-center gap-6 shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
                                            <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center text-3xl border transition-transform hover:scale-110 ${isDarkMode ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-lg shadow-purple-500/10' : 'bg-purple-50 text-purple-600 border-purple-100 shadow-sm'}`}>
                                                <FaHistory />
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">TOTAL FOLLOW-UPS</p>
                                                <h4 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {totalFollowUpsRef}
                                                </h4>
                                            </div>
                                        </div>

                                        <div className={`p-8 rounded-[4px] border transition-all flex items-center gap-6 shadow-lg relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
                                            <div className={`w-16 h-16 rounded-[4px] flex items-center justify-center text-3xl border transition-transform hover:scale-110 ${isDarkMode ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-lg shadow-green-500/10' : 'bg-green-50 text-green-600 border-green-100 shadow-sm'}`}>
                                                <FaCheckCircle />
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">CONVERSION RATE</p>
                                                <h4 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {conversionRateRef}%
                                                </h4>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Matrix */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
                                        <div className={`p-8 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                <FaChartPie className="text-cyan-500" /> LEAD ALLOCATION & PROGRESS
                                            </h5>

                                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                                {/* Chart */}
                                                <div className="w-full md:w-1/2 h-[200px]">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={contactData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={50}
                                                                outerRadius={70}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                <Cell fill="#22c55e" /> {/* Contacted - Green */}
                                                                <Cell fill="#ef4444" /> {/* Remaining - Red */}
                                                            </Pie>
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}
                                                                itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                                                            />
                                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                {/* Stats & Controls */}
                                                <div className="w-full md:w-1/2 space-y-4">
                                                    <div
                                                        onClick={() => openLeadModal('CONTACTED')}
                                                        className={`p-4 rounded-[4px] border cursor-pointer transition-all active:scale-95 group ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:bg-green-500/5 hover:border-green-500/30' : 'bg-gray-50 border-gray-100 hover:bg-green-50'}`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>CONTACTED</p>
                                                            <div className={`w-2 h-2 rounded-full bg-green-500/50 group-hover:bg-green-500 group-hover:animate-pulse transition-all`}></div>
                                                        </div>
                                                        <h4 className={`text-xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.performance?.called || 0}</h4>
                                                        <p className="text-[9px] text-gray-500 mt-1">CLICK TO VIEW LIST</p>
                                                    </div>

                                                    <div
                                                        onClick={() => openLeadModal('REMAINING')}
                                                        className={`p-4 rounded-[4px] border cursor-pointer transition-all active:scale-95 group ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:bg-red-500/5 hover:border-red-500/30' : 'bg-gray-50 border-gray-100 hover:bg-red-50'}`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>REMAINING</p>
                                                            <div className={`w-2 h-2 rounded-full bg-red-500/50 group-hover:bg-red-500 group-hover:animate-pulse transition-all`}></div>
                                                        </div>
                                                        <h4 className={`text-xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.performance?.remaining || 0}</h4>
                                                        <p className="text-[9px] text-gray-500 mt-1">CLICK TO VIEW LIST</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`p-8 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                            <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                <FaHistory className="text-purple-500" /> PERIODIC PERFORMANCE
                                            </h5>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 rounded-[4px] border-b border-dashed border-gray-700">
                                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>DAILY CALLS</span>
                                                    <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.calls?.today || 0}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-4 rounded-[4px] border-b border-dashed border-gray-700">
                                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>MONTHLY CALLS</span>
                                                    <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.calls?.last30Days || 0}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-4 rounded-[4px] border-b border-dashed border-gray-700">
                                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>CONVERSION RATE</span>
                                                    <span className={`text-lg font-black ${(analyticsData?.performance?.conversionRate || 0) > 0 ? 'text-green-500' : 'text-gray-500'}`}>{analyticsData?.performance?.conversionRate || 0}%</span>
                                                </div>
                                                <div className="flex items-center justify-between p-4 rounded-[4px]">
                                                    <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>TOTAL FOLLOW-UPS</span>
                                                    <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.performance?.totalFollowUps || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {showLeadModal && (
                        <LeadListModal
                            title={modalTitle}
                            leads={modalLeads}
                            onClose={() => setShowLeadModal(false)}
                            isDarkMode={isDarkMode}
                        />
                    )}

                    <FollowUpActivityModal
                        isOpen={activityModal.isOpen}
                        onClose={() => setActivityModal(prev => ({ ...prev, isOpen: false }))}
                        title={activityModal.title}
                        data={activityModal.data}
                        isDarkMode={isDarkMode}
                    />
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
                .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </Layout>
    );
};

export default TelecallingConsole;
