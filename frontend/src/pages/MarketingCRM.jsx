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
    const [selectedStaff, setSelectedStaff] = useState(marketingPerformance[0] || null);
    const [activeTab, setActiveTab] = useState("Command Centre");
    const [tomorrowActivities, setTomorrowActivities] = useState([
        { type: "School Visit", place: "", time: "", expectedLeads: "" }
    ]);

    const handleAddActivity = () => {
        setTomorrowActivities([...tomorrowActivities, { type: "School Visit", place: "", time: "", expectedLeads: "" }]);
    };

    useEffect(() => {
        if (marketingPerformance.length > 0 && !selectedStaff) {
            setSelectedStaff(marketingPerformance[0]);
        }
    }, [marketingPerformance, selectedStaff]);

    return (
        <Layout activePage="Marketing & CRM">
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-[#0f1215] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />

                <div className="flex-1 custom-scrollbar overflow-y-auto">
                    {/* HERO SECTION */}
                    <div className="bg-[#05080c] text-white p-8 md:p-12 relative overflow-hidden">
                        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                            <div className="flex-1 space-y-6">
                                <div className="flex flex-wrap gap-3">
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest">Live ERP Preview</span>
                                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest">Marketing Field Control</span>
                                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-black uppercase tracking-widest">Lead + Proof Audit</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight max-w-2xl">
                                    Marketing Staff Daily Duty & Proof Command Centre
                                </h1>
                                <p className="text-gray-400 text-sm max-w-xl leading-relaxed font-medium">
                                    A waterproof ERP tab where ZMs, CIs and marketing executives must pre-plan tomorrow's market work, execute field activities, upload geo-tagged proof, submit lead data, get approval, and face automatic red flags if target, quality or proof is weak.
                                </p>
                                <div className="flex flex-wrap gap-4 pt-4">
                                    {["Day-before duty lock", "40 leads minimum", "Geo-tag proof", "CI/ZM approval"].map((text, idx) => (
                                        <div key={idx} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-gray-300 flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full lg:w-[400px]">
                                <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Today's Control Score</h4>
                                        <span className="text-4xl font-black tracking-tighter">86%</span>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: "Lead Achievement", value: 100, color: "bg-emerald-500" },
                                            { label: "Proof Compliance", value: 92, color: "bg-blue-500" },
                                            { label: "Hot Lead Ratio", value: 28, color: "bg-orange-500" }
                                        ].map((stat, idx) => (
                                            <div key={idx} className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                    <span>{stat.label}</span>
                                                    <span>{stat.value}%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full ${stat.color} rounded-full`} style={{ width: `${stat.value}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                        {/* KPI ROW */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {[
                                { label: "TOTAL LEADS", value: totalLeads, sub: "200 target across team", color: "text-emerald-500" },
                                { label: "HOT LEADS", value: totalHotLeads, sub: "High conversion priority", color: "text-orange-500" },
                                { label: "PROOF UPLOADS", value: "92", sub: "Photos and documents", color: "text-blue-500" },
                                { label: "PENDING REVIEW", value: "2", sub: "Need CI/ZM action", color: "text-red-500" },
                                { label: "RED FLAGS", value: "2", sub: "Immediate escalation", color: "text-red-500" }
                            ].map((kpi, idx) => (
                                <div key={idx} className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} transition-all hover:scale-[1.02]`}>
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{kpi.label}</p>
                                    <h3 className={`text-4xl font-black tracking-tighter my-2 ${kpi.color}`}>{kpi.value}</h3>
                                    <p className="text-[10px] font-bold text-gray-400">{kpi.sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* NAVIGATION */}
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                "Command Centre", "Tomorrow Planner", "Day-End Submission", "Activity Audit", "Management View"
                            ].map((tab, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                                        ? "bg-black text-white shadow-lg"
                                        : "bg-white border border-gray-100 text-gray-500 hover:border-gray-300"
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* MAIN CONTENT SPLIT */}
                        {activeTab === "Command Centre" && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
                            {/* STAFF BOARD (Left) */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <h2 className="text-xl font-black tracking-tight mb-1">Staff Board</h2>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Filter by role and status</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <select className={`px-4 py-2.5 rounded-xl border text-[11px] font-bold outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}>
                                            <option>All Roles</option>
                                        </select>
                                        <select className={`px-4 py-2.5 rounded-xl border text-[11px] font-bold outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}>
                                            <option>All Status</option>
                                        </select>
                                    </div>

                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {marketingPerformance.map((staff, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedStaff(staff)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedStaff?._id === staff._id
                                                    ? 'border-orange-500 bg-orange-500/5'
                                                    : 'border-transparent hover:bg-gray-50'
                                                    } ${isDarkMode && !(selectedStaff?._id === staff._id) ? 'hover:bg-gray-800/50' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-black text-sm">{staff.name}</h4>
                                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">ZM • Zone Control</p>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-200">Verified</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[
                                                        { label: "Leads", value: staff.currentCalls || 0 },
                                                        { label: "Hot", value: staff.hotLeads || 0 },
                                                        { label: "Proof", value: "31" },
                                                        { label: "Score", value: "97%" }
                                                    ].map((m, i) => (
                                                        <div key={i} className="text-center p-2 rounded-xl bg-gray-50/50">
                                                            <p className="text-[10px] font-black">{m.value}</p>
                                                            <p className="text-[7px] font-bold text-gray-400 uppercase">{m.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* DETAIL PANEL (Right) */}
                            <div className="lg:col-span-8">
                                {selectedStaff ? (
                                    <div className={`p-8 rounded-3xl border min-h-full ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <h1 className="text-4xl font-black tracking-tighter">{selectedStaff.name}</h1>
                                                <p className="text-gray-500 text-sm font-bold mt-1 uppercase tracking-widest">ZM • South Kolkata Zone • Zone Control</p>
                                            </div>
                                            <span className="px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">Risk: Low</span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                                            {[
                                                { label: "Lead Target", value: `${selectedStaff.currentCalls || 0}/40`, status: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/5" },
                                                { label: "Duties Done", value: "9/9", status: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/5" },
                                                { label: "Proof Files", value: "31", status: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/5" },
                                                { label: "Score", value: "97%", status: "Healthy", color: "text-emerald-500", bg: "bg-emerald-500/5" }
                                            ].map((m, idx) => (
                                                <div key={idx} className={`p-6 rounded-2xl ${m.bg} border border-emerald-500/10`}>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{m.label}</p>
                                                    <h3 className={`text-2xl font-black tracking-tighter my-2 ${m.color}`}>{m.value}</h3>
                                                    <p className={`text-[9px] font-black uppercase ${m.color}`}>{m.status}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            {/* Source Split */}
                                            <div className="space-y-6">
                                                <h4 className="text-sm font-black uppercase tracking-widest">Source Split</h4>
                                                <div className="space-y-5">
                                                    {[
                                                        { label: "School Visits", value: 100 },
                                                        { label: "Tuition Visits", value: 67 },
                                                        { label: "Shikkha Bondhu", value: 100 },
                                                        { label: "Referrals", value: 87 }
                                                    ].map((s, idx) => (
                                                        <div key={idx} className="space-y-1.5">
                                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                                <span>{s.label}</span>
                                                                <span>{s.value}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-black rounded-full" style={{ width: `${s.value}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Manager Decision */}
                                            <div className="space-y-6">
                                                <h4 className="text-sm font-black uppercase tracking-widest">Manager Decision</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button className="px-4 py-3 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Approve Work</button>
                                                    <button className="px-4 py-3 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Ask Clarification</button>
                                                    <button className="px-4 py-3 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Raise Red Flag</button>
                                                    <button className="px-4 py-3 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Assign Follow-up</button>
                                                </div>
                                                <div className="pt-4 border-t border-dashed">
                                                    <p className="text-[10px] text-gray-400 font-medium">Last submitted at <span className="text-black font-black">8:46 PM</span>. Final count is locked only after proof and approval.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 uppercase font-black text-xs tracking-widest">
                                        Select a staff member to view details
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        {/* TOMORROW PLANNER VIEW */}
                        {activeTab === "Tomorrow Planner" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter">Tomorrow Planner</h2>
                                    <p className="text-gray-500 text-[11px] font-bold mt-1">Staff must submit tomorrow's exact duty plan the day before. The ERP should lock vague or weak plans.</p>
                                </div>
                                
                                <div className={`p-8 rounded-[24px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <h3 className="text-xl font-black tracking-tight mb-6">Create Tomorrow's Field Plan</h3>
                                    
                                    {/* Form Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                        {["Date", "Staff Name", "Role", "Center", "Area / Route", "Expected Lead Target", "Expected Hot Leads", "Required Support"].map((label, idx) => (
                                            <input 
                                                key={idx} 
                                                type="text" 
                                                placeholder={label}
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 focus:border-black shadow-sm'}`}
                                            />
                                        ))}
                                    </div>

                                    {/* Activity Blocks */}
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-lg font-black tracking-tight">Planned Activity Blocks</h4>
                                            <button onClick={handleAddActivity} className="px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:shadow-lg transition-all flex items-center gap-2 active:scale-95">
                                                + Add Activity
                                            </button>
                                        </div>

                                        <div className={`p-6 rounded-2xl border space-y-4 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-[#f4f6f8] border-gray-100'}`}>
                                            {tomorrowActivities.map((activity, idx) => (
                                                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                                                    <select 
                                                        className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 shadow-sm'}`}
                                                        value={activity.type}
                                                        onChange={(e) => {
                                                            const newActs = [...tomorrowActivities];
                                                            newActs[idx].type = e.target.value;
                                                            setTomorrowActivities(newActs);
                                                        }}
                                                    >
                                                        <option>School Visit</option>
                                                        <option>Tuition Visit</option>
                                                        <option>Shikkha Bondhu</option>
                                                        <option>Referral Drive</option>
                                                        <option>Market Activity</option>
                                                    </select>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Place / Institution"
                                                        value={activity.place}
                                                        onChange={(e) => {
                                                            const newActs = [...tomorrowActivities];
                                                            newActs[idx].place = e.target.value;
                                                            setTomorrowActivities(newActs);
                                                        }}
                                                        className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 shadow-sm'}`}
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Time"
                                                        value={activity.time}
                                                        onChange={(e) => {
                                                            const newActs = [...tomorrowActivities];
                                                            newActs[idx].time = e.target.value;
                                                            setTomorrowActivities(newActs);
                                                        }}
                                                        className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 shadow-sm'}`}
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Expected leads"
                                                        value={activity.expectedLeads}
                                                        onChange={(e) => {
                                                            const newActs = [...tomorrowActivities];
                                                            newActs[idx].expectedLeads = e.target.value;
                                                            setTomorrowActivities(newActs);
                                                        }}
                                                        className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 shadow-sm'}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button className="w-full py-4 rounded-xl bg-[#05080c] text-white text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 transition-all active:scale-[0.99]">
                                        Submit for CI/ZM Approval
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* DAY-END SUBMISSION VIEW */}
                        {activeTab === "Day-End Submission" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter">Day-End Submission</h2>
                                    <p className="text-gray-500 text-[11px] font-bold mt-1">Actual work must be submitted with numbers, proof, lead sheet and remarks. Once submitted, it is locked for audit.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Column 1 */}
                                    <div className={`p-6 rounded-[24px] border space-y-4 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <h3 className="text-lg font-black tracking-tight mb-2">Activity Completion</h3>
                                        {['Activities completed', 'Activities missed', 'Reason for missed duties', 'Total leads collected', 'Hot leads', 'Warm leads', 'Cold leads'].map((label, idx) => (
                                            <input 
                                                key={idx} 
                                                type="text" 
                                                placeholder={label}
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 focus:border-black shadow-sm'}`}
                                            />
                                        ))}
                                    </div>
                                    
                                    {/* Column 2 */}
                                    <div className={`p-6 rounded-[24px] border space-y-4 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <h3 className="text-lg font-black tracking-tight mb-2">Source-wise Update</h3>
                                        {['School visit leads', 'Tuition visit leads', 'Shikkha Bondhu leads', 'Referral leads', 'Market activity leads', 'Walk-in generated', 'Admissions influenced'].map((label, idx) => (
                                            <input 
                                                key={idx} 
                                                type="text" 
                                                placeholder={label}
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 focus:border-black shadow-sm'}`}
                                            />
                                        ))}
                                    </div>

                                    {/* Column 3 */}
                                    <div className={`p-6 rounded-[24px] border space-y-4 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                        <h3 className="text-lg font-black tracking-tight mb-2">Proof Upload</h3>
                                        {['Upload geo-tag photos', 'Upload lead sheet', 'Upload contact card/photo', 'Add voice note/report', 'CI remark', 'ZM remark', 'Exception reason if below 40'].map((label, idx) => (
                                            <input 
                                                key={idx} 
                                                type="text" 
                                                placeholder={label}
                                                className={`w-full px-4 py-3 rounded-xl border text-[11px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-orange-500' : 'bg-white border-gray-200 focus:border-black shadow-sm'}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                    <button className={`py-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>Save Draft</button>
                                    <button className="py-4 rounded-xl bg-[#05080c] text-white text-[11px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 transition-all active:scale-[0.99]">Submit & Lock</button>
                                    <button className={`py-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>Send to CI</button>
                                    <button className={`py-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white hover:bg-gray-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>Escalate Exception</button>
                                </div>
                            </div>
                        )}

                        {/* ACTIVITY AUDIT VIEW */}
                        {activeTab === "Activity Audit" && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <h2 className="text-3xl font-black tracking-tighter">Activity Audit</h2>
                                    <p className="text-gray-500 text-[11px] font-bold mt-1">Every field activity is checked against the original plan, actual time, proof count, GPS match, leads generated and approval status.</p>
                                </div>

                                <div className="flex justify-between items-center mb-6">
                                    <select className={`px-6 py-2.5 rounded-2xl border text-[11px] font-black tracking-widest outline-none cursor-pointer appearance-none pr-10 bg-no-repeat bg-[length:14px_14px] bg-[right_16px_center] transition-all shadow-sm ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-white bg-[url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E\')]' : 'bg-white border-gray-200 text-[#05080c] bg-[url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2305080c%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E\')]'}`}>
                                        <option>All Activities</option>
                                        <option>School Visit</option>
                                        <option>Tuition Visit</option>
                                        <option>Shikkha Bondhu</option>
                                        <option>Referral Drive</option>
                                        <option>Market Canopy</option>
                                    </select>
                                    <button className="px-6 py-2.5 rounded-full bg-[#05080c] text-white text-[11px] font-black uppercase tracking-widest shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all">Plan vs Actual Audit</button>
                                </div>

                                <div className={`rounded-[24px] border overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[#05080c] text-white text-[10px] uppercase font-black tracking-widest">
                                                    <th className="px-6 py-4 whitespace-nowrap">ID</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Type</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Institution</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Owner</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Plan</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Actual</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Leads</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Proof</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">GPS</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Approval</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[11px] font-bold">
                                                {[
                                                    { id: "A101", type: "School Visit", institution: "St. John's High School", owner: "Aritra Sen", plan: "11:00 AM", actual: "11:08 AM", leads: 18, proof: 8, gps: "Matched", approval: "Approved" },
                                                    { id: "A102", type: "Tuition Visit", institution: "R.K Maths Batch", owner: "Rahul Dey", plan: "2:30 PM", actual: "2:41 PM", leads: 12, proof: 5, gps: "Matched", approval: "Approved" },
                                                    { id: "A103", type: "Shikkha Bondhu", institution: "Chowdhury Tea Stall Partner", owner: "Debjit Pal", plan: "4:00 PM", actual: "4:07 PM", leads: 6, proof: 4, gps: "Matched", approval: "Approved" },
                                                    { id: "A104", type: "Referral Drive", institution: "Parent Network", owner: "Mousumi Das", plan: "6:00 PM", actual: "6:36 PM", leads: 6, proof: 2, gps: "Partial", approval: "Review" },
                                                    { id: "A105", type: "Market Canopy", institution: "Station Road", owner: "Sohini Roy", plan: "5:00 PM", actual: "7:12 PM", leads: 8, proof: 1, gps: "Mismatch", approval: "Rejected" },
                                                ].map((row, idx) => (
                                                    <tr key={idx} className={`border-b last:border-0 ${isDarkMode ? 'border-gray-800 text-gray-300' : 'border-gray-50 text-gray-700'} hover:bg-gray-50/50 transition-colors`}>
                                                        <td className="px-6 py-4">{row.id}</td>
                                                        <td className="px-6 py-4">{row.type}</td>
                                                        <td className="px-6 py-4">{row.institution}</td>
                                                        <td className="px-6 py-4">{row.owner}</td>
                                                        <td className="px-6 py-4">{row.plan}</td>
                                                        <td className="px-6 py-4">{row.actual}</td>
                                                        <td className="px-6 py-4">{row.leads}</td>
                                                        <td className="px-6 py-4">{row.proof}</td>
                                                        <td className="px-6 py-4">{row.gps}</td>
                                                        <td className="px-6 py-4">{row.approval}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    
                    * {
                        font-family: 'Inter', sans-serif;
                    }

                    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }

                    .tracking-tighter { letter-spacing: -0.05em; }
                `}</style>
            </div>
        </Layout>
    );
};

export default MarketingCRM;
