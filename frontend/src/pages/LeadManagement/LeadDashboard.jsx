import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import { FaChartLine, FaFilter, FaFileExcel, FaUsers, FaTasks, FaChevronRight, FaSpinner, FaTimes, FaPhone, FaEnvelope, FaCalendarAlt, FaIdBadge, FaSun, FaMoon, FaChevronLeft } from "react-icons/fa";
import { toast } from "react-toastify";

const LeadDashboard = () => {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem("lead_dashboard_theme");
        return saved ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem("lead_dashboard_theme", JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        centre: "",
        course: "",
        source: "",
        leadResponsibility: "",
        search: "",
        fromDate: "",
        toDate: "",
        feedback: "",
        leadType: ""
    });
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sources, setSources] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [selectedTelecaller, setSelectedTelecaller] = useState(null);
    const [telecallerLeads, setTelecallerLeads] = useState([]);
    const [sidebarLoading, setSidebarLoading] = useState(false);

    const fetchMetadata = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const [centresRes, coursesRes, sourcesRes, feedbackRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/source`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/master-data/follow-up-feedback`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (centresRes.ok) {
                const centresData = await centresRes.json();
                setCentres(Array.isArray(centresData) ? centresData : []);
            }
            if (coursesRes.ok) {
                const coursesData = await coursesRes.json();
                setCourses(Array.isArray(coursesData) ? coursesData : []);
            }
            if (sourcesRes.ok) {
                const sourcesData = await sourcesRes.json();
                setSources(sourcesData.sources || []);
            }
            if (feedbackRes.ok) {
                const feedbackData = await feedbackRes.json();
                setFeedbacks(feedbackData || []);
            }
        } catch (error) {
            console.error("Failed to fetch metadata:", error);
        }
    }, []);

    const fetchTelecallerLeads = async (name) => {
        if (!name) return;
        try {
            setSelectedTelecaller(name);
            setSidebarLoading(true);
            const token = localStorage.getItem("token");

            const queryParams = new URLSearchParams({
                leadResponsibility: name,
                limit: "100",
                ...(filters.centre && { centre: filters.centre }),
                ...(filters.course && { course: filters.course }),
                ...(filters.source && { source: filters.source }),
                ...(filters.fromDate && { fromDate: filters.fromDate }),
                ...(filters.toDate && { toDate: filters.toDate }),
                ...(filters.leadType && { leadType: filters.leadType })
            }).toString();

            const res = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTelecallerLeads(data.leads || []);
            }
        } catch (error) {
            toast.error("Failed to load telecaller leads");
        } finally {
            setSidebarLoading(false);
        }
    };

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/stats/dashboard?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchMetadata();
        fetchDashboardData();
    }, [fetchMetadata, fetchDashboardData]);

    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/export/excel?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Leads_Report_${new Date().toLocaleDateString()}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                toast.success("Excel report downloaded");
            }
        } catch (error) {
            toast.error("Failed to export Excel");
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    return (
        <Layout activePage="Lead Management">
            <div className={`flex-1 min-h-screen p-6 space-y-6 overflow-x-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
                {/* Header Section */}
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-[4px] border shadow-2xl relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/5' : 'bg-white border-gray-200 shadow-gray-200/50'}`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-cyan-500/10 transition-colors"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-2">
                            <div className={`p-3 rounded-[4px] border ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'}`}>
                                <FaChartLine className={isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} size={20} />
                            </div>
                            <div>
                                <h1 className={`text-3xl font-black uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Lead Intelligence Matrix</h1>
                                <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${isDarkMode ? 'text-cyan-500/70' : 'text-cyan-600/70'}`}>Performance, Conversion & Dynamic Pipeline Tracking</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative z-10 text-nowrap">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-4 rounded-[4px] border transition-all active:scale-95 flex items-center gap-2 group/toggle ${isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-indigo-600 hover:bg-gray-50'}`}
                        >
                            {isDarkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
                            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Toggle Interface</span>
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[4px] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
                        >
                            <FaFileExcel className="text-lg" />
                            <span>Export Intelligence</span>
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className={`p-8 rounded-[4px] border shadow-xl transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#06b6d4]"></div>
                        <h3 className={`font-black text-[11px] uppercase tracking-[0.3em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Filter Parameters</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {[
                            { label: "Centre Vector", name: "centre", type: "select", options: centres, labelKey: "centreName" },
                            { label: "Target Course", name: "course", type: "select", options: courses, labelKey: "courseName" },
                            { label: "Origin Source", name: "source", type: "select", options: sources.map(s => ({ _id: s.sourceName, name: s.sourceName })), labelKey: "name" },
                            { label: "Feedback Status", name: "feedback", type: "select", options: feedbacks.map(f => ({ _id: f.name, name: f.name })), labelKey: "name" },
                            { label: "Lead Intensity", name: "leadType", type: "select", options: [{ _id: 'HOT LEAD', name: 'HOT LEAD' }, { _id: 'COLD LEAD', name: 'COLD LEAD' }, { _id: 'NEGATIVE', name: 'NEGATIVE' }], labelKey: "name" },
                            { label: "Agent Identity", name: "leadResponsibility", type: "text", placeholder: "AGENT_ID..." },
                            { label: "Student Cipher", name: "search", type: "text", placeholder: "SEARCH..." },
                            { label: "Window Start", name: "fromDate", type: "date" },
                            { label: "Window End", name: "toDate", type: "date" }
                        ].map((field) => (
                            <div key={field.name} className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-widest">{field.label}</label>
                                {field.type === "select" ? (
                                    <div className="relative group/select">
                                        <select
                                            name={field.name}
                                            value={filters[field.name]}
                                            onChange={handleFilterChange}
                                            className={`w-full px-4 py-3 border rounded-[4px] text-[11px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer appearance-none ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-300 focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-cyan-500'}`}
                                        >
                                            <option value="">ALL {field.label.split(' ')[0]}S</option>
                                            {field.options.map(opt => (
                                                <option key={opt._id} value={opt._id}>{opt[field.labelKey]}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <input
                                        type={field.type}
                                        name={field.name}
                                        value={filters[field.name]}
                                        onChange={handleFilterChange}
                                        placeholder={field.placeholder}
                                        className={`w-full px-4 py-3 border rounded-[4px] text-[11px] font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-300 focus:border-cyan-500/50' : 'bg-gray-50 border-gray-200 text-gray-700 focus:border-cyan-500'}`}
                                    />
                                )}
                            </div>
                        ))}
                        <div className="flex items-end">
                            <button
                                onClick={fetchDashboardData}
                                className={`w-full py-3 rounded-[4px] text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg ${isDarkMode ? 'bg-cyan-500 text-black shadow-cyan-500/10 hover:bg-cyan-400' : 'bg-cyan-600 text-white shadow-cyan-500/20 hover:bg-cyan-700'}`}
                            >
                                <FaFilter size={10} /> RECALIBRATE
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { label: "Total Pooled leads", value: stats?.summary?.totalLeads, color: "from-blue-600 to-indigo-700", icon: FaUsers, shadow: "shadow-blue-500/20", tag: "Aggregate" },
                        { label: "High Intent (Hot)", value: stats?.summary?.hotLeads, color: "from-emerald-600 to-teal-700", icon: FaChartLine, shadow: "shadow-emerald-500/20", tag: "Priority", pulse: true },
                        { label: "Standard leads (Cold)", value: stats?.summary?.coldLeads, color: "from-orange-600 to-amber-700", icon: FaTasks, shadow: "shadow-orange-500/20", tag: "Queue" },
                        { label: "Negative vectors", value: stats?.summary?.negativeLeads, color: "from-rose-600 to-pink-700", icon: FaTasks, shadow: "shadow-rose-500/20", tag: "Archived" }
                    ].map((card, i) => (
                        <div key={i} className={`bg-gradient-to-br ${card.color} p-8 rounded-[4px] shadow-2xl ${card.shadow} relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
                            <card.icon className="absolute -right-8 -bottom-8 text-white/10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500" size={160} />
                            {card.pulse && <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_15px_white]"></div>}
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{card.label}</p>
                            <h2 className="text-6xl font-black text-white tracking-tighter italic">
                                {loading ? <div className="h-16 w-24 bg-white/20 animate-pulse rounded-[4px]"></div> : (card.value || 0).toLocaleString()}
                            </h2>
                            <div className="mt-8 flex items-center text-[9px] font-black uppercase tracking-widest bg-black/20 w-max px-4 py-1.5 rounded-[4px] text-white/90 backdrop-blur-sm border border-white/10">
                                {card.tag} SIGNAL
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                    {/* Performance Table */}
                    <div className={`lg:col-span-2 rounded-[4px] shadow-2xl border overflow-hidden flex flex-col transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`p-6 border-b flex items-center justify-between transition-all ${isDarkMode ? 'bg-[#1e2329]/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center border transition-all ${isDarkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-100'}`}>
                                    <FaChartLine className="text-orange-500" size={18} />
                                </div>
                                <div>
                                    <h3 className={`font-black uppercase tracking-widest text-sm italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Agent Efficiency Roster</h3>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Telemetry on lead conversion efficiency</p>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-1 h-[550px] custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className={`sticky top-0 z-10 transition-all ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}`}>
                                    <tr className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-500 tracking-[0.3em]">AGENT_IDENTITY</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] text-center">LOAD_VOL</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] text-center">INTENSE (HOT)</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] text-center">LEVEL (COLD)</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] text-center">THROUGHPUT</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                    {loading ? (
                                        <tr><td colSpan="5" className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <FaSpinner className="animate-spin text-cyan-500" size={40} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500 animate-pulse">Analyzing Member Performance...</span>
                                            </div>
                                        </td></tr>
                                    ) : stats?.telecallers?.length > 0 ? (
                                        stats.telecallers.map((tc, idx) => (
                                            <tr key={idx} className="hover:bg-cyan-500/[0.03] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div
                                                        className="flex items-center gap-4 cursor-pointer group/name"
                                                        onClick={() => fetchTelecallerLeads(tc._id)}
                                                    >
                                                        <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center font-black text-sm border transition-all ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover/name:bg-cyan-500 group-hover/name:text-black' : 'bg-cyan-50 border-cyan-100 text-cyan-600 group-hover/name:bg-cyan-600 group-hover/name:text-white'}`}>
                                                            {tc._id?.[0] || "?"}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`font-black uppercase text-sm tracking-tight transition-colors ${isDarkMode ? 'text-gray-200 group-hover/name:text-cyan-400' : 'text-gray-900 group-hover/name:text-cyan-600'}`}>{tc._id || "OPERATIVE_ANONYMOUS"}</span>
                                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] opacity-40 group-hover/name:opacity-100 transition-opacity italic">Stream Data →</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-8 py-6 text-center font-black italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{tc.totalLeads}</td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`px-4 py-1 rounded-[4px] text-[9px] font-black border tracking-widest ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{tc.hotLeads}</span>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`px-4 py-1 rounded-[4px] text-[9px] font-black border tracking-widest ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{tc.coldLeads}</span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`flex-1 h-2 rounded-[4px] overflow-hidden transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                            <div
                                                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-[4px] transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                                                style={{ width: `${(tc.hotLeads / tc.totalLeads) * 100 || 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-black text-cyan-500 w-10 text-right">{Math.round((tc.hotLeads / tc.totalLeads) * 100) || 0}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="py-24 text-center opacity-40 italic">
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Awaiting Signal Integrity / No Agent Data</p>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pipeline / Queue */}
                    <div className={`rounded-[4px] shadow-2xl border overflow-hidden flex flex-col h-[628px] transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`p-6 border-b flex items-center justify-between transition-all ${isDarkMode ? 'bg-[#1e2329]/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center border transition-all ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'}`}>
                                    <FaTasks className="text-cyan-500" size={18} />
                                </div>
                                <div>
                                    <h3 className={`font-black uppercase tracking-widest text-sm italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Active Pipeline</h3>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Upcoming interaction sequence</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            {loading ? (
                                <div className="py-24 text-center"><FaSpinner className="animate-spin mx-auto text-cyan-500" size={40} /></div>
                            ) : stats?.nextCalls?.length > 0 ? (
                                stats.nextCalls.map((call, idx) => (
                                    <div key={idx} className={`p-6 rounded-[4px] border transition-all group relative overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/50 shadow-lg' : 'bg-gray-50 border-gray-200 hover:border-cyan-500/30'}`}>
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/[0.03] -mr-12 -mt-12 rounded-full pointer-events-none group-hover:bg-cyan-500/[0.08] transition-colors"></div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div>
                                                <h4 className={`font-black text-[13px] uppercase tracking-tighter italic transition-colors ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}>{call.name}</h4>
                                                <p className="text-[11px] text-cyan-500 font-mono mt-1 font-bold tracking-tight underline underline-offset-4 decoration-cyan-500/20 group-hover:decoration-cyan-500/50 transition-all">{call.phoneNumber}</p>
                                            </div>
                                            <div className={`px-3 py-1.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest border transition-all ${call.leadType === 'HOT LEAD' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100') :
                                                call.leadType === 'COLD LEAD' ? (isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-100') :
                                                    (isDarkMode ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200')
                                                }`}>
                                                {call.leadType}
                                            </div>
                                        </div>
                                        <div className={`mt-6 flex items-center justify-between text-[11px] relative z-10 border-t pt-4 transition-all ${isDarkMode ? 'border-gray-800' : 'border-gray-200/50'}`}>
                                            <span className={`flex items-center gap-2 font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-400' : 'bg-white border-gray-100 text-gray-500'}`}>
                                                <span className="text-orange-500">📅</span> {new Date(call.nextFollowUpDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                                AGENT: <b className={`non-italic ${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>{call.leadResponsibility?.toUpperCase() || "UNASSIGNED"}</b>
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-24 text-center flex flex-col items-center gap-4 opacity-30">
                                    <FaTasks className="text-gray-700" size={48} />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Zero Pipeline Density</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar for Telecaller Leads */}
                {selectedTelecaller && (
                    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setSelectedTelecaller(null)}
                        ></div>
                        <div className={`relative w-full max-w-md h-full shadow-2xl border-l flex flex-col transform transition-all duration-500 animate-in slide-in-from-right ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-cyan-500/10' : 'bg-white border-gray-200 shadow-2xl'}`}>
                            {/* Sidebar Header */}
                            <div className={`p-8 border-b flex items-center justify-between transition-all ${isDarkMode ? 'bg-[#1e2329]/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-[4px] flex items-center justify-center border transition-all ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-100'}`}>
                                        <FaIdBadge className="text-cyan-500" size={20} />
                                    </div>
                                    <div>
                                        <h2 className={`text-xl font-black uppercase tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedTelecaller}</h2>
                                        <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.3em] italic">Assigned Lead Protocol</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTelecaller(null)}
                                    className={`p-3 rounded-[4px] transition-all hover:rotate-90 active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <FaTimes size={22} />
                                </button>
                            </div>

                            {/* Sidebar Content */}
                            <div className={`flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar transition-all ${isDarkMode ? 'bg-[#131619]' : 'bg-white'}`}>
                                {sidebarLoading ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-6">
                                        <FaSpinner className="animate-spin text-cyan-500" size={40} />
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] animate-pulse">Syncing Vector Records...</span>
                                    </div>
                                ) : telecallerLeads.length > 0 ? (
                                    telecallerLeads.map((lead, i) => (
                                        <div key={i} className={`p-6 rounded-[4px] border group shadow-xl transition-all duration-500 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/30' : 'bg-gray-50 border-gray-200 hover:border-cyan-500/20'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className={`text-[15px] font-black uppercase tracking-tight italic transition-colors ${isDarkMode ? 'text-white group-hover:text-cyan-400' : 'text-gray-900 group-hover:text-cyan-600'}`}>{lead.name}</h3>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className={`px-2 py-0.5 rounded-[2px] text-[8px] font-black uppercase border tracking-widest ${lead.leadType === 'HOT LEAD' ? (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100') :
                                                            lead.leadType === 'COLD LEAD' ? (isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-600 border-orange-100') :
                                                                (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200')
                                                            }`}>
                                                            {lead.leadType}
                                                        </span>
                                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                                                            <FaCalendarAlt size={8} /> {new Date(lead.createdAt).toLocaleDateString('en-GB').toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`grid grid-cols-1 gap-3 border-t pt-4 transition-all ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
                                                    <FaPhone size={10} className="text-cyan-500/30" />
                                                    <span className={`tracking-tighter ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.phoneNumber}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] font-mono text-gray-500">
                                                    <FaEnvelope size={10} className="text-cyan-500/30" />
                                                    <span className={`truncate tracking-tighter ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{lead.email}</span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-3 border-t border-dashed border-gray-800/50 pt-2">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Protocol Course</span>
                                                    <span className={`text-[10px] font-black uppercase text-right flex-1 tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{lead.course?.courseName || 'UNASSIGNED'}</span>
                                                </div>
                                            </div>

                                            {lead.followUps && lead.followUps.length > 0 && (
                                                <div className={`mt-5 p-4 rounded-[4px] border border-dashed transition-all ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-white border-gray-100'}`}>
                                                    <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-2 italic">Intelligence Segment</p>
                                                    <p className={`text-[11px] font-medium leading-relaxed uppercase italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        "{lead.followUps[lead.followUps.length - 1].feedback}"
                                                    </p>
                                                    {lead.followUps[lead.followUps.length - 1].callDuration && (
                                                        <p className="text-[9px] text-gray-500 mt-2 flex items-center gap-2 font-mono font-bold tracking-widest">
                                                            ⏱ SYNC_LENGTH: {lead.followUps[lead.followUps.length - 1].callDuration}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30">
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2 border-dashed ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                            <FaUsers className="text-gray-500" size={32} />
                                        </div>
                                        <p className="text-gray-500 font-black text-[10px] uppercase tracking-[0.4em]">Zero Vector Records Detected For This Profile</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#333' : '#cbd5e1'}; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#444' : '#94a3b8'}; }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .slide-in-from-right {
                    animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </Layout>
    );
};

export default LeadDashboard;
