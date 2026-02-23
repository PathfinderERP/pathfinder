import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
    FaBullhorn, FaUsers, FaChartLine, FaMoneyBillWave, FaChartPie, FaChartBar,
    FaFileExcel, FaSync, FaSun, FaMoon, FaFilter, FaSearch, FaArrowLeft,
    FaRedo, FaDownload
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
    CartesianGrid, Legend, PieChart, Pie, Cell, LabelList
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const MarketingCRM = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [allPerformance, setAllPerformance] = useState([]);
    const [globalTrends, setGlobalTrends] = useState([]);
    const [globalAdmissionDetail, setGlobalAdmissionDetail] = useState({ bySource: [], byCenter: [] });
    const [availableCenters, setAvailableCenters] = useState([]);
    const [selectedCenters, setSelectedCenters] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [timePeriod, setTimePeriod] = useState('daily');
    const [filters, setFilters] = useState({ fromDate: "", toDate: "" });

    // Filtered marketing performance data
    const marketingPerformance = allPerformance.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
        const uCentres = u.centres || u.centers || [];
        const matchesCenter = selectedCenters.length === 0 || (uCentres.some(c => selectedCenters.includes(c.centreName || c)));
        return u.role === 'marketing' && matchesSearch && matchesCenter;
    });

    // Aggregate summary
    const totalLeads = marketingPerformance.reduce((acc, curr) => acc + (curr.currentCalls || 0), 0);
    const totalConversions = marketingPerformance.reduce((acc, curr) => acc + (curr.admissions || 0), 0);
    const totalHotLeads = marketingPerformance.reduce((acc, curr) => acc + (curr.hotLeads || 0), 0);
    const conversionRate = totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : "0.0";

    // Chart data - squad comparison
    const chartData = marketingPerformance.map(curr => ({
        name: curr.name.split(' ')[0],
        leads: curr.currentCalls || 0,
        conversions: curr.admissions || 0,
        hotLeads: curr.hotLeads || 0
    }));

    // Daily comparison data
    const dailyComparisonData = marketingPerformance.map(curr => ({
        name: curr.name.split(' ')[0],
        today: curr.todayCalls || 0,
        yesterday: curr.yesterdayCalls || 0
    }));

    // Monthly comparison data
    const monthlyComparisonData = marketingPerformance.map(curr => ({
        name: curr.name.split(' ')[0],
        thisMonth: curr.thisMonthCalls || 0,
        lastMonth: curr.lastMonthCalls || 0
    }));

    // The backend trends use `calls` key for monthly call aggregation
    const chartTrends = globalTrends.length > 0 ? globalTrends : [
        { month: 'Jan', calls: 0, admissions: 0 },
        { month: 'Feb', calls: 0, admissions: 0 },
        { month: 'Mar', calls: 0, admissions: 0 },
        { month: 'Apr', calls: 0, admissions: 0 },
        { month: 'May', calls: Number(totalLeads) || 0, admissions: Number(totalConversions) || 0 },
    ];

    useEffect(() => {
        fetchCentres();
        fetchAllPerformance(timePeriod, filters);
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        fetchAllPerformance(timePeriod, filters);
        // eslint-disable-next-line
    }, [timePeriod, selectedCenters]);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const uniqueCentres = Array.from(new Map((data || []).map(c => [c._id, c])).values());
                setAvailableCenters(uniqueCentres);
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchAllPerformance = async (period = 'daily', customFilters = {}) => {
        setSummaryLoading(true);
        if (allPerformance.length === 0) setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const centreIds = availableCenters
                .filter(c => selectedCenters.includes(c.centreName))
                .map(c => c._id);

            const params = new URLSearchParams({
                period,
                ...customFilters,
                ...(centreIds.length > 0 ? { centre: centreIds } : {})
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/analytics-all?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                const perfData = data.performance || [];
                const uniquePerf = Array.from(new Map(perfData.map(p => [p._id || p.userId, p])).values());
                setAllPerformance(uniquePerf);
                setGlobalTrends(data.trends || []);
                setGlobalAdmissionDetail(data.admissionDetail || { bySource: [], byCenter: [] });
            }
        } catch (error) {
            console.error("Error fetching performance:", error);
        } finally {
            setSummaryLoading(false);
            setLoading(false);
        }
    };

    const resetFilters = () => {
        const clearedFilters = { fromDate: "", toDate: "" };
        setFilters(clearedFilters);
        fetchAllPerformance(timePeriod, clearedFilters);
    };

    const exportToExcel = () => {
        const exportData = [
            ...globalAdmissionDetail.bySource.map(s => ({ Type: 'Source', Name: s.name, Count: s.value })),
            ...globalAdmissionDetail.byCenter.map(c => ({ Type: 'Center', Name: c.name, Count: c.value }))
        ];
        if (exportData.length === 0) return alert("No data to export");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Marketing Admissions");
        XLSX.writeFile(workbook, `Marketing_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportSquadData = () => {
        const exportData = marketingPerformance.map(p => ({
            'Name': p.name,
            'Role': p.role,
            'Centers': (p.centres || p.centers || []).map(c => c.centreName || c).join(', ') || 'N/A',
            'Leads (Current)': p.currentCalls || 0,
            'Leads (Previous)': p.previousCalls || 0,
            'Today Calls': p.todayCalls || 0,
            'Yesterday Calls': p.yesterdayCalls || 0,
            'This Month': p.thisMonthCalls || 0,
            'Last Month': p.lastMonthCalls || 0,
            'Hot Leads': p.hotLeads || 0,
            'Admissions': p.admissions || 0,
            'Conversion %': p.currentCalls > 0 ? ((p.admissions / p.currentCalls) * 100).toFixed(2) + '%' : '0%',
        }));
        if (exportData.length === 0) return alert("No marketing data to export");
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Marketing Squad');
        XLSX.writeFile(workbook, `Marketing_Squad_Report_${timePeriod}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <Layout activePage="Marketing & CRM">
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-[#0f1215] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />

                {/* Header */}
                <div className={`p-6 border-b flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-md'}`}>
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <FaArrowLeft size={14} />
                        </button>
                        <div>
                            <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Marketing & CRM
                            </h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2 italic">
                                CAMPAIGN ANALYTICS & SQUAD PERFORMANCE
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
                            onClick={() => fetchAllPerformance(timePeriod, filters)}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-black' : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 shadow-sm'}`}
                            title="Refresh Data"
                        >
                            <FaSync className={summaryLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-8 space-y-8 custom-scrollbar overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-6">
                            <FaSync size={48} className="text-orange-500 animate-spin" />
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-orange-500 animate-pulse">Synchronizing Data...</p>
                        </div>
                    ) : (
                        <>
                            {/* FILTERS */}
                            <div className={`p-8 rounded-[4px] border space-y-6 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-md'}`}>
                                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                                    {/* Search */}
                                    <div className="flex flex-1 items-center gap-4 w-full lg:w-auto">
                                        <div className={`p-4 rounded-[4px] border hidden md:block ${isDarkMode ? 'bg-[#131619] border-gray-800 text-orange-500' : 'bg-gray-50 border-gray-200 text-orange-600'}`}>
                                            <FaFilter size={18} />
                                        </div>
                                        <div className="flex-1 max-w-md relative group">
                                            <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-orange-500' : 'text-gray-400 group-focus-within:text-orange-500'}`} />
                                            <input
                                                type="text"
                                                placeholder="SEARCH MARKETING TEAM..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={`w-full pl-12 pr-4 py-3 rounded-[2px] border text-[10px] font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 text-gray-900 focus:border-orange-500 shadow-sm'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Period Selector & Date Range */}
                                    <div className="flex flex-wrap items-center gap-4 justify-end w-full lg:w-auto">
                                        <div className={`flex items-center gap-1 p-1 rounded-[6px] ${isDarkMode ? 'bg-black/20' : 'bg-gray-100'}`}>
                                            {['daily', 'weekly', 'monthly'].map((period) => (
                                                <button
                                                    key={period}
                                                    onClick={() => {
                                                        setTimePeriod(period);
                                                        fetchAllPerformance(period, filters);
                                                    }}
                                                    className={`px-6 py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${timePeriod === period
                                                        ? (isDarkMode ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'bg-orange-500 text-white shadow-sm')
                                                        : (isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                                                        }`}
                                                >
                                                    {period}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={filters.fromDate}
                                                onChange={(e) => {
                                                    const nf = { ...filters, fromDate: e.target.value };
                                                    setFilters(nf);
                                                    fetchAllPerformance(timePeriod, nf);
                                                }}
                                                className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 text-gray-900 focus:border-orange-500 shadow-sm'}`}
                                            />
                                            <span className="text-gray-500">→</span>
                                            <input
                                                type="date"
                                                value={filters.toDate}
                                                onChange={(e) => {
                                                    const nf = { ...filters, toDate: e.target.value };
                                                    setFilters(nf);
                                                    fetchAllPerformance(timePeriod, nf);
                                                }}
                                                className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 text-gray-900 focus:border-orange-500 shadow-sm'}`}
                                            />
                                            <button
                                                onClick={resetFilters}
                                                className={`p-2.5 rounded-[4px] border transition-all ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`}
                                                title="Reset Filters"
                                            >
                                                <FaRedo size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Center Filter */}
                                <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-dashed border-gray-800/50">
                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] mr-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Region:</span>
                                    <button
                                        onClick={() => setSelectedCenters([])}
                                        className={`px-4 py-1.5 rounded-[20px] text-[9px] font-black uppercase tracking-widest transition-all border ${selectedCenters.length === 0 ? (isDarkMode ? 'bg-orange-500 text-black border-orange-500' : 'bg-orange-500 text-white') : (isDarkMode ? 'bg-gray-800 text-gray-500 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-500')}`}
                                    >
                                        ALL REGIONS
                                    </button>
                                    {availableCenters.map((center, idx) => (
                                        <button
                                            key={`center-${center._id || idx}`}
                                            onClick={() => {
                                                setSelectedCenters(prev =>
                                                    prev.includes(center.centreName)
                                                        ? prev.filter(c => c !== center.centreName)
                                                        : [...prev, center.centreName]
                                                );
                                            }}
                                            className={`px-4 py-1.5 rounded-[20px] text-[9px] font-black uppercase tracking-widest transition-all border ${selectedCenters.includes(center.centreName) ? (isDarkMode ? 'bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-orange-500 text-white shadow-sm') : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:border-orange-500')}`}
                                        >
                                            {center.centreName.toUpperCase()}
                                        </button>
                                    ))}
                                    {selectedCenters.length > 0 && (
                                        <button onClick={() => setSelectedCenters([])} className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-4 hover:underline">
                                            CLEAR ALL
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Total Leads", value: totalLeads.toLocaleString(), icon: <FaBullhorn />, color: "text-orange-500", bg: "bg-orange-500/10" },
                                    { label: "Hot Leads", value: totalHotLeads.toLocaleString(), icon: <FaChartLine />, color: "text-red-500", bg: "bg-red-500/10" },
                                    { label: "Admissions", value: totalConversions.toLocaleString(), icon: <FaUsers />, color: "text-green-500", bg: "bg-green-500/10" },
                                    { label: "Conv Rate", value: `${conversionRate}%`, icon: <FaMoneyBillWave />, color: "text-cyan-500", bg: "bg-cyan-500/10" }
                                ].map((stat, idx) => (
                                    <div key={idx} className={`p-6 rounded-[4px] border flex items-center justify-between transition-all hover:border-orange-500/30 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</p>
                                            <h3 className={`text-2xl font-black mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</h3>
                                        </div>
                                        <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                                            {stat.icon}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Squad Performance Charts */}
                            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="flex items-center justify-between mb-8">
                                    <h5 className={`text-sm font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        <FaChartBar className="text-orange-500" /> Comparative Performance Matrix
                                        {summaryLoading && <FaSync className="animate-spin text-orange-500" size={12} />}
                                    </h5>
                                    <button
                                        onClick={exportSquadData}
                                        className={`px-6 py-2 rounded-[2px] transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-black' : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white shadow-sm'}`}
                                    >
                                        <FaDownload /> Export Squad Data
                                    </button>
                                </div>

                                {marketingPerformance.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <FaBullhorn size={48} className={`${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-500">No Marketing Team Data Available</p>
                                    </div>
                                ) : (
                                    <div className="h-[350px] w-full overflow-x-auto custom-scrollbar">
                                        <div style={{ minWidth: `${Math.max(400, chartData.length * 80)}px`, height: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#333' : '#eee'} vertical={false} />
                                                    <XAxis dataKey="name" stroke={isDarkMode ? '#666' : '#999'} fontSize={10} fontWeight="bold" />
                                                    <YAxis stroke={isDarkMode ? '#666' : '#999'} fontSize={10} fontWeight="bold" />
                                                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }} />
                                                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                                    <Bar name="Leads Generated" dataKey="leads" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={25}>
                                                        <LabelList dataKey="leads" position="top" style={{ fill: '#f59e0b', fontSize: 9, fontWeight: 900 }} />
                                                    </Bar>
                                                    <Bar name="Hot Leads" dataKey="hotLeads" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={25}>
                                                        <LabelList dataKey="hotLeads" position="top" style={{ fill: '#ef4444', fontSize: 9, fontWeight: 900 }} />
                                                    </Bar>
                                                    <Bar name="Admissions" dataKey="conversions" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25}>
                                                        <LabelList dataKey="conversions" position="top" style={{ fill: '#10b981', fontSize: 9, fontWeight: 900 }} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Daily Comparison */}
                                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <h4 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Daily Call Comparison</h4>
                                    <div className="h-[300px] overflow-x-auto custom-scrollbar">
                                        <div style={{ minWidth: `${Math.max(100, dailyComparisonData.length * 60)}px`, height: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={dailyComparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                                    <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 9, fontWeight: 900 }} />
                                                    <YAxis tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 900 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '2px', fontSize: '11px', fontWeight: '900' }} />
                                                    <Bar dataKey="today" name="Calls Today" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={15}>
                                                        <LabelList dataKey="today" position="top" style={{ fill: '#f59e0b', fontSize: 9, fontWeight: 900 }} />
                                                    </Bar>
                                                    <Bar dataKey="yesterday" name="Calls Yesterday" fill="#4b5563" radius={[2, 2, 0, 0]} barSize={15}>
                                                        <LabelList dataKey="yesterday" position="top" style={{ fill: '#666', fontSize: 9, fontWeight: 900 }} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Monthly Comparison */}
                                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <h4 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Call Comparison</h4>
                                    <div className="h-[300px] overflow-x-auto custom-scrollbar">
                                        <div style={{ minWidth: `${Math.max(100, monthlyComparisonData.length * 60)}px`, height: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={monthlyComparisonData} margin={{ top: 20, right: 10, left: 10, bottom: 40 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                                    <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={60} tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 9, fontWeight: 900 }} />
                                                    <YAxis tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 900 }} />
                                                    <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '2px', fontSize: '11px', fontWeight: '900' }} />
                                                    <Bar dataKey="thisMonth" name="This Month" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={15}>
                                                        <LabelList dataKey="thisMonth" position="top" style={{ fill: '#f59e0b', fontSize: 9, fontWeight: 900 }} />
                                                    </Bar>
                                                    <Bar dataKey="lastMonth" name="Last Month" fill="#78350f" radius={[2, 2, 0, 0]} barSize={15}>
                                                        <LabelList dataKey="lastMonth" position="top" style={{ fill: '#78350f', fontSize: 9, fontWeight: 900 }} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Lead Growth Trend */}
                            <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <h4 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Monthly Lead Growth Trend</h4>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartTrends}>
                                            <defs>
                                                <linearGradient id="colorLeadsMarketing" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="1 1" stroke={isDarkMode ? '#333' : '#eee'} />
                                            <XAxis dataKey="month" tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 'bold' }} />
                                            <YAxis tick={{ fill: isDarkMode ? '#666' : '#999', fontSize: 10, fontWeight: 'bold' }} />
                                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }} />
                                            <Area type="monotone" dataKey="leads" name="New Leads Generated" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLeadsMarketing)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Conversion Analysis */}
                            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h4 className={`text-lg font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            <FaChartPie className="text-orange-500" /> Conversion Analysis
                                        </h4>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Lead source and regional conversion metrics</p>
                                    </div>
                                    <button
                                        onClick={exportToExcel}
                                        className={`px-6 py-2 rounded-[2px] transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-black' : 'bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-500 hover:text-white shadow-sm'}`}
                                    >
                                        <FaFileExcel /> Export Campaign Report
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Center Wise Reach</h5>
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={globalAdmissionDetail.byCenter}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }} />
                                                    <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }} />
                                                    <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: isDarkMode ? '#1f2937' : '#fff' }} />
                                                    <Bar dataKey="value" name="Conversions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source Attribution</h5>
                                        <div className="h-[250px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={globalAdmissionDetail.bySource}
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {globalAdmissionDetail.bySource.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold', backgroundColor: isDarkMode ? '#1f2937' : '#fff' }} />
                                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Individual Agent Cards */}
                            {marketingPerformance.length > 0 && (
                                <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                    <h4 className={`text-lg font-black uppercase tracking-widest flex items-center gap-3 mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        <FaUsers className="text-orange-500" /> Marketing Team — Individual Breakdown
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {marketingPerformance.map((p, idx) => (
                                            <div key={idx} className={`p-4 rounded-[4px] border transition-all hover:border-orange-500/50 ${isDarkMode ? 'bg-[#0f1216] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-black">
                                                        {p.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h5 className={`text-xs font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.name}</h5>
                                                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{(p.centres || p.centers || []).map(c => c.centreName || c).join(', ') || 'N/A'}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase">
                                                            {timePeriod === 'daily' ? 'Leads Today' : timePeriod === 'weekly' ? 'Leads Weekly' : 'Leads Monthly'}
                                                        </span>
                                                        <span className={`text-xs font-black ${(p.currentCalls || 0) >= (timePeriod === 'daily' ? 20 : timePeriod === 'weekly' ? 100 : 400) ? 'text-emerald-500' : 'text-orange-400'}`}>
                                                            {p.currentCalls || 0}
                                                        </span>
                                                    </div>
                                                    <div className={`w-full h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                                        <div className={`h-full transition-all duration-1000 ${(p.currentCalls || 0) >= (timePeriod === 'daily' ? 20 : timePeriod === 'weekly' ? 100 : 400) ? 'bg-emerald-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(100, ((p.currentCalls || 0) / (timePeriod === 'daily' ? 20 : timePeriod === 'weekly' ? 100 : 400)) * 100)}%` }}></div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase">Hot Leads</span>
                                                        <span className="text-xs font-black text-red-500">{p.hotLeads || 0}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-gray-500 uppercase">Admissions</span>
                                                        <span className={`text-xs font-black ${(p.admissions || 0) >= 3 ? 'text-emerald-500' : 'text-blue-400'}`}>
                                                            {p.admissions || 0}
                                                        </span>
                                                    </div>
                                                    <div className={`w-full h-1 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                                                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, ((p.admissions || 0) / 3) * 100)}%` }}></div>
                                                    </div>
                                                </div>

                                                <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Conv Rate</span>
                                                    <span className="text-[10px] font-black text-orange-500">
                                                        {p.currentCalls > 0 ? ((p.admissions / p.currentCalls) * 100).toFixed(1) : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
                    .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                `}</style>
            </div>
        </Layout>
    );
};

export default MarketingCRM;
