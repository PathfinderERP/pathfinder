import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import { FaChartLine, FaFilter, FaFileExcel, FaUsers, FaTasks, FaChevronRight, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";

const LeadDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        centre: "",
        course: "",
        source: "",
        leadResponsibility: "",
        search: "",
        fromDate: "",
        toDate: ""
    });
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sources, setSources] = useState([]);

    const fetchMetadata = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const [centresRes, coursesRes, sourcesRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/source`, { headers: { Authorization: `Bearer ${token}` } })
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
        } catch (error) {
            console.error("Failed to fetch metadata:", error);
        }
    }, []);

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
            <div className="flex-1 min-h-screen bg-[#131619] p-6 space-y-6 overflow-x-hidden">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1f24] border border-gray-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-cyan-500/10 transition-colors"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                                <FaChartLine className="text-cyan-400 text-xl" />
                            </div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Lead Analytics Dashboard</h1>
                        </div>
                        <p className="text-gray-400 text-sm font-medium">Track performance, conversions, and upcoming pipeline activity</p>
                    </div>
                    
                    <div className="flex items-center gap-3 relative z-10">
                        <button 
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-900/20 transition-all hover:-translate-y-0.5 active:scale-95"
                        >
                            <FaFileExcel className="text-lg" /> 
                            <span>Export Report</span>
                        </button>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-[#1a1f24] border border-gray-800 p-5 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                        <h3 className="text-gray-300 font-bold text-xs uppercase tracking-widest">Global Filters</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                        {[
                            { label: "Centre", name: "centre", type: "select", options: centres, labelKey: "centreName" },
                            { label: "Course", name: "course", type: "select", options: courses, labelKey: "courseName" },
                            { label: "Source", name: "source", type: "select", options: sources.map(s => ({ _id: s.sourceName, name: s.sourceName })), labelKey: "name" },
                            { label: "Telecaller", name: "leadResponsibility", type: "text", placeholder: "Search..." },
                            { label: "Student", name: "search", type: "text", placeholder: "Search..." },
                            { label: "From Date", name: "fromDate", type: "date" }
                        ].map((field) => (
                            <div key={field.name} className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-500 ml-1 tracking-wider">{field.label}</label>
                                {field.type === "select" ? (
                                    <select 
                                        name={field.name} 
                                        value={filters[field.name]} 
                                        onChange={handleFilterChange} 
                                        className="w-full px-4 py-2.5 bg-[#131619] border border-gray-800 rounded-xl text-sm text-gray-200 outline-none focus:border-cyan-500/50 transition-colors cursor-pointer appearance-none"
                                    >
                                        <option value="">All {field.label}s</option>
                                        {field.options.map(opt => (
                                            <option key={opt._id} value={opt._id}>{opt[field.labelKey]}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input 
                                        type={field.type} 
                                        name={field.name} 
                                        value={filters[field.name]} 
                                        onChange={handleFilterChange} 
                                        placeholder={field.placeholder}
                                        className="w-full px-4 py-2.5 bg-[#131619] border border-gray-800 rounded-xl text-sm text-gray-200 outline-none focus:border-cyan-500/50 transition-colors" 
                                    />
                                )}
                            </div>
                        ))}
                        <div className="flex items-end">
                            <button 
                                onClick={fetchDashboardData} 
                                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl text-sm font-black shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                            >
                                <FaFilter size={12} /> APPLY
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: "Total Generated", value: stats?.summary?.totalLeads, color: "from-blue-600 to-indigo-700", icon: FaUsers, shadow: "shadow-blue-500/20", tag: "Overall Pool" },
                        { label: "Hot Leads", value: stats?.summary?.hotLeads, color: "from-green-600 to-emerald-700", icon: FaChartLine, shadow: "shadow-green-500/20", tag: "High Intent", pulse: true },
                        { label: "Cold Leads", value: stats?.summary?.coldLeads, color: "from-orange-600 to-amber-700", icon: FaTasks, shadow: "shadow-orange-500/20", tag: "Potential" },
                        { label: "Negative", value: stats?.summary?.negativeLeads, color: "from-red-600 to-rose-700", icon: FaTasks, shadow: "shadow-red-500/20", tag: "Uninterested" }
                    ].map((card, i) => (
                        <div key={i} className={`bg-gradient-to-br ${card.color} p-6 rounded-[2rem] shadow-2xl ${card.shadow} relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
                            <card.icon className="absolute -right-6 -bottom-6 text-white/10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500" size={140} />
                            {card.pulse && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_10px_white]"></div>}
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{card.label}</p>
                            <h2 className="text-5xl font-black text-white mt-1 tracking-tighter">
                                {loading ? <div className="h-12 w-16 bg-white/20 animate-pulse rounded-lg"></div> : card.value || 0}
                            </h2>
                            <div className="mt-4 flex items-center text-[10px] font-bold bg-black/20 w-max px-3 py-1 rounded-full text-white/90 backdrop-blur-sm">
                                {card.tag}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
                    {/* Performance Table */}
                    <div className="lg:col-span-2 bg-[#1a1f24] rounded-3xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-800 bg-[#1e2329]/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                    <FaChartLine className="text-orange-500" />
                                </div>
                                <h3 className="font-black text-white uppercase tracking-wider text-sm">Telecaller Leaderboard</h3>
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-1 h-[500px]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#1a1f24] z-10">
                                    <tr className="border-b border-gray-800">
                                        <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Member</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Leads</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Hot</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Cold</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-500 tracking-widest text-center">Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {loading ? (
                                        <tr><td colSpan="5" className="py-20 text-center"><FaSpinner className="animate-spin mx-auto text-cyan-500" size={30} /></td></tr>
                                    ) : stats?.telecallers?.length > 0 ? (
                                        stats.telecallers.map((tc, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-black text-xs border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                                            {tc._id?.[0] || "?"}
                                                        </div>
                                                        <span className="font-bold text-gray-200 text-sm tracking-tight">{tc._id || "No Identity"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-black text-gray-400">{tc.totalLeads}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black border border-green-500/20">{tc.hotLeads}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-black border border-orange-500/20">{tc.coldLeads}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-gray-800/50 rounded-full h-1.5 overflow-hidden">
                                                            <div 
                                                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-1000" 
                                                                style={{ width: `${(tc.hotLeads / tc.totalLeads) * 100 || 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-bold text-cyan-500 w-8">{Math.round((tc.hotLeads / tc.totalLeads) * 100) || 0}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className="py-20 text-center text-gray-600 font-medium italic">Station waiting for telecaller intelligence...</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pipeline / Queue */}
                    <div className="bg-[#1a1f24] rounded-3xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col h-[578px]">
                        <div className="p-6 border-b border-gray-800 bg-[#1e2329]/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                    <FaTasks className="text-cyan-400" />
                                </div>
                                <h3 className="font-black text-white uppercase tracking-wider text-sm">Action Pipeline</h3>
                            </div>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                            {loading ? (
                                <div className="py-20 text-center"><FaSpinner className="animate-spin mx-auto text-cyan-500" size={30} /></div>
                            ) : stats?.nextCalls?.length > 0 ? (
                                stats.nextCalls.map((call, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-[#131619] border border-gray-800 hover:border-cyan-500/50 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.02] -mr-8 -mt-8 rounded-full pointer-events-none group-hover:bg-white/[0.05]"></div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div>
                                                <h4 className="font-black text-sm text-gray-100 group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{call.name}</h4>
                                                <p className="text-xs text-blue-400 font-mono mt-0.5 tracking-tighter underline underline-offset-4 decoration-blue-400/30">{call.phoneNumber}</p>
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm border ${
                                                call.leadType === 'HOT LEAD' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                call.leadType === 'COLD LEAD' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                'bg-gray-800 text-gray-400 border-gray-700'
                                            }`}>
                                                {call.leadType}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between text-[11px] relative z-10 border-t border-gray-800/50 pt-3">
                                            <span className="flex items-center gap-1.5 text-gray-400 font-bold bg-[#1a1f24] px-2 py-0.5 rounded-md border border-gray-800">
                                                <span className="text-orange-500">📅</span> {new Date(call.nextFollowUpDate).toLocaleDateString('en-GB')}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-500 font-medium group-hover:text-gray-300 transition-colors italic">
                                                Assignee: <b className="text-gray-300 non-italic">{call.leadResponsibility || "Manual"}</b>
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center flex flex-col items-center gap-3">
                                    <FaTasks className="text-gray-800" size={40} />
                                    <p className="text-gray-600 font-bold text-sm tracking-widest uppercase">Pipeline Empty</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </Layout>
    );
};

export default LeadDashboard;
