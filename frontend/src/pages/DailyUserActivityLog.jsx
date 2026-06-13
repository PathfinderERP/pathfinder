import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useTheme } from "../context/ThemeContext";
import {
    FaHistory,
    FaUserTie, FaArrowLeft, FaPhoneAlt, FaUsers, FaUserGraduate,
    FaMoneyBillWave, FaCalendarAlt, FaIdCard, FaReceipt, FaCloudUploadAlt,
    FaFire, FaSnowflake, FaThermometerHalf, FaCheckCircle, FaSearch, FaFileExcel,
    FaTimesCircle
} from 'react-icons/fa';
import { toast } from "react-toastify";
import { BarChart, Bar, Cell, AreaChart, Area, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const LEAD_TYPE_CONFIG = {
    'HOT LEAD': { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <FaFire />, label: 'HOT' },
    'WARM LEAD': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: <FaThermometerHalf />, label: 'WARM' },
    'COLD LEAD': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: <FaSnowflake />, label: 'COLD' },
    'NEUTRAL LEAD': { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: <FaHistory />, label: 'NEUTRAL' },
    'INVALID LEAD': { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: <FaTimesCircle />, label: 'INVALID' },
    'UNTAGGED': { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: <FaPhoneAlt />, label: '-' },
};

const getLeadConfig = (type) => {
    const key = (type || '').toUpperCase();
    if (key.includes('HOT')) return LEAD_TYPE_CONFIG['HOT LEAD'];
    if (key.includes('WARM')) return LEAD_TYPE_CONFIG['WARM LEAD'];
    if (key.includes('COLD')) return LEAD_TYPE_CONFIG['COLD LEAD'];
    if (key.includes('NEUTRAL')) return LEAD_TYPE_CONFIG['NEUTRAL LEAD'];
    if (key.includes('INVALID')) return LEAD_TYPE_CONFIG['INVALID LEAD'];
    return LEAD_TYPE_CONFIG['UNTAGGED'];
};

const DailyUserActivityLog = () => {
    const { userId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const queryParams = new URLSearchParams(location.search);
    const initialDate = new Date().toISOString().split('T')[0];
    const centerId = queryParams.get('centerId');

    const [fromDate, setFromDate] = useState(queryParams.get('fromDate') || queryParams.get('date') || initialDate);
    const [toDate, setToDate] = useState(queryParams.get('toDate') || queryParams.get('date') || initialDate);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [callSearch, setCallSearch] = useState('');
    const [callTypeFilter, setCallTypeFilter] = useState('ALL'); // ALL | FRESH | FOLLOW-UP
    const [leadTypeFilter, setLeadTypeFilter] = useState('ALL'); // ALL | HOT | WARM | COLD
    const [activeChartTab, setActiveChartTab] = useState('bar'); // bar | area | pie
    const [selectedSection, setSelectedSection] = useState('ALL'); // ALL | CALLS | COUNSELLED | ADMISSIONS | COLLECTION | HOT | WARM | COLD

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem("token");
                const apiUrl = import.meta.env.VITE_API_URL;
                const centerParam = centerId ? `&centerId=${centerId}` : '';
                const response = await fetch(
                    `${apiUrl}/operations/daily-tracking/user/${userId}?fromDate=${fromDate}&toDate=${toDate}${centerParam}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const result = await response.json();
                if (response.ok) setData(result);
                else toast.error("Failed to fetch activity log");
            } catch (error) {
                console.error("Error fetching activity log:", error);
                toast.error("Error fetching activity log");
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, [userId, fromDate, toDate, centerId]);

    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const centerParam = centerId ? `&centerId=${centerId}` : '';
            const response = await fetch(`${apiUrl}/operations/daily-tracking/user/export/${userId}?fromDate=${fromDate}&toDate=${toDate}${centerParam}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Calling_Report_${data.userName.replace(/\s+/g, '_')}_${fromDate}_to_${toDate}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                toast.error("Failed to export calling report");
            }
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Error during export");
        }
    };

    const card = isDark ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm';
    const subText = isDark ? 'text-gray-400' : 'text-gray-500';
    const mainText = isDark ? 'text-gray-100' : 'text-gray-900';
    const rowHover = isDark ? 'hover:bg-black/10' : 'hover:bg-gray-50';
    const theadBg = isDark ? 'bg-black/20 text-gray-500' : 'bg-gray-50 text-gray-500';
    const divider = isDark ? 'divide-gray-800' : 'divide-gray-100';

    if (loading) return (
        <Layout activePage="Tracking & Flagging">
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" />
            </div>
        </Layout>
    );

    if (!data) return (
        <Layout activePage="Tracking & Flagging">
            <div className="p-6 text-center text-gray-500">Activity log not found.</div>
        </Layout>
    );

    // Filtered call list
    const filteredCalls = (data.callDetails || []).filter(call => {
        const matchSearch = callSearch === '' ||
            call.studentName.toLowerCase().includes(callSearch.toLowerCase()) ||
            call.phoneNumber.includes(callSearch) ||
            (call.feedback || '').toLowerCase().includes(callSearch.toLowerCase());
        const matchType = callTypeFilter === 'ALL' || call.callType === callTypeFilter;
        const cfg = getLeadConfig(call.leadType);
        const matchLead = leadTypeFilter === 'ALL' || cfg.label === leadTypeFilter;

        let matchSection = true;
        if (selectedSection === 'FRESH') {
            matchSection = call.callType === 'FRESH';
        } else if (selectedSection === 'CONTACTED_UPLOADS') {
            matchSection = call.callType === 'CONTACTED_UPLOAD';
        } else if (selectedSection === 'CALLS') {
            matchSection = call.callType === 'FOLLOW-UP';
        } else if (selectedSection === 'COUNSELLED') {
            matchSection = call.counselledTick === true;
        } else if (selectedSection === 'ADMISSIONS') {
            matchSection = call.enrolledTick === true;
        } else if (selectedSection === 'COLLECTION') {
            matchSection = call.enrolledTick === true;
        } else if (selectedSection === 'HOT') {
            matchSection = (call.leadType || '').toUpperCase().includes('HOT');
        } else if (selectedSection === 'WARM') {
            matchSection = (call.leadType || '').toUpperCase().includes('WARM');
        } else if (selectedSection === 'COLD') {
            matchSection = (call.leadType || '').toUpperCase().includes('COLD');
        }

        return matchSearch && matchType && matchLead && matchSection;
    });

    const totalCalls = data.leads.totalFollowUps;
    const collectionTotal = (data.collections.freshAdmissionTotal || 0) + (data.collections.installmentTotal || 0);

    const conversionChartData = [
        { name: 'Lead', value: totalCalls, displayValue: totalCalls },
        { name: 'Counselled', value: data.counselled.total, displayValue: data.counselled.total },
        { name: 'Enrolled', value: data.admissions.total, displayValue: data.admissions.total }
    ];

    return (
        <Layout activePage="Tracking & Flagging">
            <div className={`p-4 md:p-6 min-h-screen ${isDark ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className={`mb-4 flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <FaArrowLeft /> Back to Center Details
                    </button>

                    <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
                        {/* Left Column: Full-Height Profile Card */}
                        <div className={`w-full xl:w-[280px] h-[200px] xl:h-[234px] rounded-xl overflow-hidden relative border shadow-lg ${isDark ? 'bg-[#131619] border-gray-800 shadow-black/45' : 'bg-white border-gray-100 shadow-sm'
                            }`}>
                            {data.profileImage ? (
                                <>
                                    <img
                                        src={data.profileImage}
                                        alt={data.userName}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    {/* Gradient overlay for readability */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-0" />
                                </>
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 flex items-center justify-center">
                                    <FaUserTie className="absolute -right-4 -bottom-4 text-8xl text-cyan-500/5 pointer-events-none" />
                                </div>
                            )}

                            {/* Content Overlaid */}
                            <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
                                <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
                                        {data.role}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-xl font-black uppercase tracking-wide text-white drop-shadow-md leading-none mb-2">
                                        {data.userName}
                                    </h1>
                                    <span className="text-[9px] font-medium text-gray-300 flex items-center gap-1 drop-shadow-md">
                                        <FaCalendarAlt className="text-cyan-400" />
                                        {new Date(fromDate).toLocaleDateString('en-GB')} – {new Date(toDate).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Two horizontal rows */}
                        <div className="flex flex-col justify-between gap-4">

                            {/* Upper row: Conversion Funnel and Date Pickers */}
                            <div className="flex flex-col xl:flex-row justify-between items-stretch gap-4">

                                {/* Conversion Funnel Widget with Interactive Charts */}
                                <div className={`flex-1 flex items-center justify-between gap-6 px-6 py-2 rounded-xl border ${isDark ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} h-[110px] overflow-hidden`}>
                                    {/* Charts Area */}
                                    <div className="flex-grow flex-1 flex flex-col items-center justify-between h-full">
                                        {/* Chart Selector Tabs */}
                                        <div className={`flex rounded bg-black/30 p-0.5 text-[8px] font-black uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-1.5`}>
                                            {['bar', 'area', 'pie'].map(tab => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setActiveChartTab(tab)}
                                                    className={`px-3 py-0.5 rounded transition-all ${activeChartTab === tab
                                                        ? 'bg-cyan-500 text-white font-black'
                                                        : 'hover:text-white'}`}
                                                >
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Recharts Display */}
                                        <div className="h-[52px] w-full bg-transparent">
                                            <ResponsiveContainer width="100%" height="100%">
                                                {activeChartTab === 'bar' && (
                                                    <BarChart data={conversionChartData} margin={{ top: 0, right: 10, left: -30, bottom: 0 }}>
                                                        <XAxis dataKey="name" tick={{ fontSize: 7, fill: isDark ? '#9ca3af' : '#4b5563' }} axisLine={false} tickLine={false} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: isDark ? '#1a1f24' : '#fff',
                                                                borderColor: isDark ? '#374151' : '#e5e7eb',
                                                                fontSize: '8px',
                                                                padding: '2px 4px'
                                                            }}
                                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                        />
                                                        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                                                            {conversionChartData.map((entry, index) => {
                                                                const colors = ['#22d3ee', '#c084fc', '#34d399'];
                                                                return <Cell key={`cell-${index}`} fill={colors[index]} />;
                                                            })}
                                                        </Bar>
                                                    </BarChart>
                                                )}

                                                {activeChartTab === 'area' && (
                                                    <AreaChart data={conversionChartData} margin={{ top: 2, right: 10, left: -30, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="conversionGrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis dataKey="name" tick={{ fontSize: 7, fill: isDark ? '#9ca3af' : '#4b5563' }} axisLine={false} tickLine={false} />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: isDark ? '#1a1f24' : '#fff',
                                                                borderColor: isDark ? '#374151' : '#e5e7eb',
                                                                fontSize: '8px',
                                                                padding: '2px 4px'
                                                            }}
                                                        />
                                                        <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={1} fillOpacity={1} fill="url(#conversionGrad)" />
                                                    </AreaChart>
                                                )}

                                                {activeChartTab === 'pie' && (
                                                    <PieChart>
                                                        <Pie
                                                            data={conversionChartData}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={10}
                                                            outerRadius={20}
                                                            paddingAngle={2}
                                                            dataKey="value"
                                                        >
                                                            {conversionChartData.map((entry, index) => {
                                                                const colors = ['#22d3ee', '#c084fc', '#34d399'];
                                                                return <Cell key={`cell-${index}`} fill={colors[index]} />;
                                                            })}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: isDark ? '#1a1f24' : '#fff',
                                                                borderColor: isDark ? '#374151' : '#e5e7eb',
                                                                fontSize: '8px',
                                                                padding: '2px 4px'
                                                            }}
                                                        />
                                                    </PieChart>
                                                )}
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Vertical Divider */}
                                    <div className={`h-16 w-[1px] ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />

                                    {/* Current Analysis section (keep it!) */}
                                    <div className="flex flex-col gap-2 justify-center min-w-[150px]">
                                        {/* Lead -> Counselled */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="text-left">
                                                <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Lead ➔ Counselled</span>
                                                <span className="text-xs font-black text-cyan-400 mt-1 block leading-none">
                                                    {totalCalls > 0
                                                        ? `${Math.round((data.counselled.total / totalCalls) * 100)}%`
                                                        : '0%'}
                                                </span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                                                ➔
                                            </div>
                                        </div>

                                        {/* Counselled -> Admitted */}
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="text-left">
                                                <span className="block text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Counselling ➔ Admitted</span>
                                                <span className="text-xs font-black text-purple-400 mt-1 block leading-none">
                                                    {data.counsembled?.total || data.counselled.total > 0
                                                        ? `${Math.round((data.admissions.total / (data.counsembled?.total || data.counselled.total)) * 100)}%`
                                                        : '0%'}
                                                </span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                                                ➔
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Date Pickers */}
                                <div className={`flex flex-col justify-center gap-2 p-3 px-4 rounded-xl border ${isDark ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} h-[110px]`}>
                                    <div className="flex items-center gap-2">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${subText} w-10`}>From:</label>
                                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                            className="bg-transparent text-cyan-500 font-black text-xs outline-none cursor-pointer [color-scheme:dark]" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className={`text-[9px] font-black uppercase tracking-widest ${subText} w-10`}>To:</label>
                                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                            className="bg-transparent text-cyan-500 font-black text-xs outline-none cursor-pointer [color-scheme:dark]" />
                                    </div>
                                </div>
                            </div>

                            {/* Lower row: Four KPI cards side-by-side */}
                            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {[
                                    { label: 'Folloups counts', value: filteredCalls.filter(c => c.callType === 'FOLLOW-UP' || c.callType === 'CONTACTED_UPLOAD').length, color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: <FaPhoneAlt />, section: 'CALLS', activeBorder: 'border-cyan-500 shadow-lg shadow-cyan-900/20 bg-cyan-950/10' },
                                    { label: 'Counselled', value: data.counselled.total, color: 'text-purple-400', bg: 'bg-purple-500/10', icon: <FaUsers />, section: 'COUNSELLED', activeBorder: 'border-purple-500 shadow-lg shadow-purple-900/20 bg-purple-950/10' },
                                    { label: 'Admissions', value: data.admissions.total, color: 'text-green-400', bg: 'bg-green-500/10', icon: <FaUserGraduate />, section: 'ADMISSIONS', activeBorder: 'border-green-500 shadow-lg shadow-green-900/20 bg-green-950/10' },
                                    { label: 'Collection', value: `₹${collectionTotal.toLocaleString('en-IN')}`, color: 'text-amber-400', bg: 'bg-amber-500/10', icon: <FaMoneyBillWave />, section: 'COLLECTION', activeBorder: 'border-amber-500 shadow-lg shadow-amber-900/20 bg-amber-950/10' },
                                ].map((kpi, i) => {
                                    const isActive = selectedSection === kpi.section;
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => setSelectedSection(isActive ? 'ALL' : kpi.section)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${isActive ? kpi.activeBorder : card} flex items-center gap-4 h-[100px] xl:h-[108px]`}
                                        >
                                            <div className={`p-2.5 rounded-lg ${kpi.bg} ${kpi.color} text-base`}>{kpi.icon}</div>
                                            <div>
                                                <p className={`text-[9px] font-black uppercase tracking-widest ${subText}`}>{kpi.label}</p>
                                                <p className={`text-xl xl:text-2xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        </div>
                    </div>
                </div>

                {/* HOT / WARM / COLD breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                        { label: 'Hot Leads', value: data.leads.hot, cfg: LEAD_TYPE_CONFIG['HOT LEAD'], section: 'HOT', activeBorder: 'border-red-500 shadow-lg shadow-red-900/20 bg-red-950/10' },
                        { label: 'Warm Leads', value: data.leads.warm, cfg: LEAD_TYPE_CONFIG['WARM LEAD'], section: 'WARM', activeBorder: 'border-amber-500 shadow-lg shadow-amber-900/20 bg-amber-950/10' },
                        { label: 'Cold Leads', value: data.leads.cold, cfg: LEAD_TYPE_CONFIG['COLD LEAD'], section: 'COLD', activeBorder: 'border-cyan-500 shadow-lg shadow-cyan-900/20 bg-cyan-950/10' },
                    ].map((item, i) => {
                        const pct = totalCalls > 0 ? Math.round((item.value / totalCalls) * 100) : 0;
                        const isActive = selectedSection === item.section;
                        return (
                            <div
                                key={i}
                                onClick={() => setSelectedSection(isActive ? 'ALL' : item.section)}
                                className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${isActive ? item.activeBorder : card} flex items-center justify-between gap-4`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-lg text-lg ${item.cfg.bg} ${item.cfg.color}`}>{item.cfg.icon}</div>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${subText}`}>{item.label}</p>
                                        <p className={`text-3xl font-black tracking-tighter ${item.cfg.color}`}>{item.value}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-black ${item.cfg.color} ${item.cfg.bg} px-2 py-1 rounded-full border ${item.cfg.border}`}>
                                        {pct}%
                                    </span>
                                    <p className={`text-[10px] mt-1 ${subText}`}>of total calls</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Calls Detail Table */}
                <div className={`rounded-xl border overflow-hidden mb-6 ${card}`}>
                    {/* Table Header + Filters */}
                    <div className={`p-5 border-b flex flex-wrap items-center gap-4 justify-between ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400"><FaPhoneAlt /></div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em] flex items-center flex-wrap gap-2">
                                Call Activity Log
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    {filteredCalls.length} / {data.callDetails?.length || 0}
                                </span>
                                {selectedSection !== 'ALL' && (
                                    <span
                                        onClick={() => setSelectedSection('ALL')}
                                        className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-all flex items-center gap-1"
                                    >
                                        Filter: {selectedSection} ✕
                                    </span>
                                )}
                            </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${isDark ? 'bg-black/20 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <FaSearch className={`text-[10px] ${subText}`} />
                                <input
                                    type="text"
                                    placeholder="Search name, phone, feedback..."
                                    value={callSearch}
                                    onChange={e => setCallSearch(e.target.value)}
                                    className="bg-transparent outline-none w-44 text-xs"
                                />
                            </div>
                            {/* Call Type Filter */}
                            <div className={`flex rounded-lg overflow-hidden border text-[10px] font-black uppercase ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                {['ALL', 'FRESH', 'FOLLOW-UP'].map(f => (
                                    <button key={f} onClick={() => setCallTypeFilter(f)}
                                        className={`px-3 py-1.5 transition-all ${callTypeFilter === f
                                            ? 'bg-cyan-500 text-white'
                                            : isDark ? 'bg-black/20 text-gray-400 hover:bg-gray-800' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                            {/* Lead Type Filter */}
                            <div className={`flex rounded-lg overflow-hidden border text-[10px] font-black uppercase ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                {['ALL', 'HOT', 'WARM', 'COLD'].map(f => {
                                    const cfgMap = { HOT: LEAD_TYPE_CONFIG['HOT LEAD'], WARM: LEAD_TYPE_CONFIG['WARM LEAD'], COLD: LEAD_TYPE_CONFIG['COLD LEAD'] };
                                    const active = leadTypeFilter === f;
                                    const cfg = cfgMap[f];
                                    return (
                                        <button key={f} onClick={() => setLeadTypeFilter(f)}
                                            className={`px-3 py-1.5 transition-all ${active
                                                ? (cfg ? `${cfg.bg} ${cfg.color} border-0` : 'bg-gray-500/20 text-gray-300')
                                                : isDark ? 'bg-black/20 text-gray-400 hover:bg-gray-800' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                                            {f}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Reset Filter Button */}
                            {(callSearch !== '' || callTypeFilter !== 'ALL' || leadTypeFilter !== 'ALL' || selectedSection !== 'ALL') && (
                                <button
                                    onClick={() => {
                                        setCallSearch('');
                                        setCallTypeFilter('ALL');
                                        setLeadTypeFilter('ALL');
                                        setSelectedSection('ALL');
                                    }}
                                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${isDark
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                                        : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                        }`}
                                >
                                    Reset Filter
                                </button>
                            )}
                            {/* Export Button */}
                            <button
                                onClick={handleExportExcel}
                                className="px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-500/20 hover:scale-105 shadow-md shadow-green-950/20"
                            >
                                <FaFileExcel className="text-[11px]" /> Export Calling Report
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`text-[10px] uppercase tracking-widest ${theadBg}`}>
                                    <th className="px-5 py-3 font-black">#</th>
                                    <th className="px-5 py-3 font-black">Student</th>
                                    <th className="px-5 py-3 font-black">Phone</th>
                                    <th className="px-5 py-3 font-black text-center">Call Type</th>
                                    <th className="px-5 py-3 font-black text-center">Lead Status</th>
                                    <th className="px-5 py-3 font-black">Feedback</th>
                                    <th className="px-5 py-3 font-black">Remarks</th>
                                    <th className="px-5 py-3 font-black text-center">Lead</th>
                                    <th className="px-5 py-3 font-black text-center">Counselled</th>
                                    <th className="px-5 py-3 font-black text-center">Enrolled</th>
                                    <th className="px-5 py-3 font-black">Next Follow-up</th>
                                    <th className="px-5 py-3 font-black">Date</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${divider}`}>
                                {filteredCalls.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className={`px-6 py-12 text-center text-sm italic ${subText}`}>
                                            No call records found for the selected filters.
                                        </td>
                                    </tr>
                                ) : filteredCalls.map((call, idx) => {
                                    const cfg = getLeadConfig(call.leadType);
                                    const isFresh = call.callType === 'FRESH';
                                    return (
                                        <tr key={idx} className={`${rowHover} transition-colors`}>
                                            <td className={`px-5 py-3 text-xs font-black ${subText}`}>{idx + 1}</td>
                                            <td className="px-5 py-3">
                                                <span className={`text-sm font-black uppercase tracking-tight ${mainText}`}>{call.studentName}</span>
                                            </td>
                                            <td className={`px-5 py-3 text-xs font-mono ${subText}`}>{call.phoneNumber}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${call.callType === 'FRESH'
                                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                    : call.callType === 'ADMISSION'
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                        : call.callType === 'BOARD-ADMIT'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : call.callType === 'BOARD-COUNSEL'
                                                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                    }`}>
                                                    {call.callType}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                            <td className={`px-5 py-3 text-xs max-w-[160px] truncate ${subText}`} title={call.feedback}>
                                                {call.feedback || '-'}
                                            </td>
                                            <td className={`px-5 py-3 text-xs max-w-[160px] truncate ${subText}`} title={call.remarks}>
                                                {call.remarks || '-'}
                                            </td>
                                            {/* Lead column */}
                                            <td className="px-5 py-3 text-center">
                                                {call.leadTick ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <FaCheckCircle className="text-red-500 text-sm mb-1" />
                                                        <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap block mt-0.5 leading-tight">
                                                            {new Date(call.leadDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                            <br />
                                                            {new Date(call.leadDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className={`text-xs ${subText}`}>–</span>
                                                )}
                                            </td>
                                            {/* Counselled column */}
                                            <td className="px-5 py-3 text-center">
                                                {call.counselledTick ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <FaCheckCircle className="text-yellow-400 text-sm mb-1" />
                                                        <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap block mt-0.5 leading-tight">
                                                            {new Date(call.counselledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                            <br />
                                                            {new Date(call.counselledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className={`text-xs ${subText}`}>–</span>
                                                )}
                                            </td>
                                            {/* Enrolled column */}
                                            <td className="px-5 py-3 text-center">
                                                {call.enrolledTick ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <FaCheckCircle className="text-emerald-400 text-sm mb-1" />
                                                        <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap block mt-0.5 leading-tight">
                                                            {new Date(call.enrolledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                            <br />
                                                            {new Date(call.enrolledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className={`text-xs ${subText}`}>–</span>
                                                )}
                                            </td>
                                            <td className={`px-5 py-3 text-xs whitespace-nowrap ${call.nextFollowUpDate ? 'text-amber-400 font-bold' : subText}`}>
                                                {call.nextFollowUpDate
                                                    ? new Date(call.nextFollowUpDate).toLocaleDateString('en-GB')
                                                    : '-'}
                                            </td>
                                            <td className={`px-5 py-3 text-xs whitespace-nowrap ${subText}`}>
                                                {new Date(call.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Collection Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className={`p-5 rounded-xl border border-l-4 border-l-cyan-500 ${card}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${subText}`}>Fresh Admission Collection</p>
                                <h2 className="text-3xl font-black tracking-tighter text-cyan-400">₹{data.collections.freshAdmissionTotal.toLocaleString('en-IN')}</h2>
                            </div>
                            <div className="p-4 rounded-lg bg-cyan-500/10 text-cyan-400 text-2xl"><FaUserGraduate /></div>
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl border border-l-4 border-l-amber-500 ${card}`}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${subText}`}>Installment Collection</p>
                                <h2 className="text-3xl font-black tracking-tighter text-amber-400">₹{data.collections.installmentTotal.toLocaleString('en-IN')}</h2>
                            </div>
                            <div className="p-4 rounded-lg bg-amber-500/10 text-amber-400 text-2xl"><FaReceipt /></div>
                        </div>
                    </div>
                </div>

                {/* Collection Detail Table */}
                {data.collections.details.length > 0 && (
                    <div className={`rounded-xl border overflow-hidden ${card}`}>
                        <div className={`p-5 border-b flex items-center gap-3 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400"><FaMoneyBillWave /></div>
                            <h3 className="font-black text-xs uppercase tracking-[0.2em]">Transaction Detail</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`text-[10px] uppercase tracking-widest ${theadBg}`}>
                                        <th className="px-6 py-3 font-black">Student</th>
                                        <th className="px-6 py-3 font-black text-center">Type</th>
                                        <th className="px-6 py-3 font-black text-center">Method</th>
                                        <th className="px-6 py-3 font-black text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${divider}`}>
                                    {data.collections.details.map((col, idx) => (
                                        <tr key={idx} className={rowHover}>
                                            <td className="px-6 py-3">
                                                <p className={`text-sm font-black uppercase ${mainText}`}>{col.studentName}</p>
                                                <p className={`text-[10px] flex items-center gap-1 ${subText}`}><FaIdCard className="text-[8px]" />{col.admissionNumber}</p>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black border ${col.isFresh ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                    {col.type}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-3 text-center text-xs font-bold uppercase ${subText}`}>{col.method}</td>
                                            <td className={`px-6 py-3 text-right text-lg font-black tracking-tighter ${col.isFresh ? 'text-cyan-400' : 'text-amber-400'}`}>
                                                ₹{col.amount.toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className={isDark ? 'bg-black/30' : 'bg-gray-50'}>
                                    <tr className="font-black">
                                        <td colSpan="2" className="px-6 py-3 text-sm uppercase tracking-widest">Total</td>
                                        <td className={`px-6 py-3 text-center text-xs ${subText}`}>{data.collections.details.length} Txns</td>
                                        <td className="px-6 py-3 text-right text-xl tracking-tighter text-amber-400">
                                            ₹{collectionTotal.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default DailyUserActivityLog;
