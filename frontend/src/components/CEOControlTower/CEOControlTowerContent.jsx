import React, { useState, useEffect } from "react";
import {
    FaUsers, FaChartLine, FaMoneyBillWave, FaUserCheck,
    FaMoon, FaSun, FaArrowUp, FaArrowDown, FaBuilding, FaUserFriends, FaBullseye,
    FaSyncAlt, FaChartBar, FaUserClock, FaStopwatch, FaMapMarkerAlt
} from "react-icons/fa";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import EmployeeAttendanceAnalytics from './EmployeeAttendanceAnalytics';

// Reusable Components matching Attendance Management Styling
const StatCard = ({ title, value, subValue, icon, color = "cyan", isDarkMode }) => (
    <div className={`border rounded-[2px] p-6 relative group overflow-hidden transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/30' : 'bg-white border-gray-200 hover:border-cyan-500/30 shadow-sm hover:shadow-md'}`}>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 transition-all ${isDarkMode ? `bg-${color}-500/5 group-hover:bg-${color}-500/10` : `bg-${color}-500/10 group-hover:bg-${color}-500/20`}`} />
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <p className={`font-black text-[9px] uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{title}</p>
                <h3 className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
            </div>
            <div className={`w-10 h-10 rounded-[2px] bg-${color}-500/10 flex items-center justify-center text-${color}-500 border border-${color}-500/20 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
        </div>
        <div className="relative z-10">
            <div className={`text-${color}-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-1`}>
                {subValue}
            </div>
        </div>
    </div>
);

const ChartContainer = ({ title, children, isDarkMode, color = "cyan", onExport }) => (
    <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border p-6 rounded-[2px] relative overflow-hidden group min-w-0`}>
        <div className="flex justify-between items-center mb-6">
            <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em]`}>{title}</h4>
            <div className="flex items-center gap-2">
                {onExport && (
                    <button
                        onClick={onExport}
                        className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[1px] border border-gray-700 hover:bg-cyan-500 hover:text-black transition-all ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                    >
                        Export
                    </button>
                )}
                <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[1px]`} style={{ backgroundColor: `${color === 'cyan' ? '#06b6d4' : (color === 'purple' ? '#a855f7' : '#10b981')}20`, color: color === 'cyan' ? '#06b6d4' : (color === 'purple' ? '#a855f7' : '#10b981') }}>ANALYTICS</div>
            </div>
        </div>
        <div className="h-[250px] w-full relative">
            {children}
        </div>
    </div>
);

const ScrollableChartContainer = ({ title, children, isDarkMode, color = "cyan", height = 300 }) => (
    <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border p-6 rounded-[2px] relative overflow-hidden group min-w-0`}>
        <div className="flex justify-between items-center mb-6">
            <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em]`}>{title}</h4>
            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[1px]`} style={{ backgroundColor: `${color === 'cyan' ? '#06b6d4' : (color === 'purple' ? '#a855f7' : (color === 'amber' ? '#f59e0b' : '#10b981'))}20`, color: color === 'cyan' ? '#06b6d4' : (color === 'purple' ? '#a855f7' : (color === 'amber' ? '#f59e0b' : '#10b981')) }}>ANALYTICS</div>
        </div>
        <div style={{ height: height }} className="w-full relative overflow-y-auto custom-scrollbar">
            {children}
        </div>
    </div>
);

const CEOControlTowerContent = () => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [centres, setCentres] = useState([]);

    // Filter States
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        centre: 'ALL'
    });

    useEffect(() => {
        fetchCentres();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filters]);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) setCentres(result.data);
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/ceo/analytics?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error("Error fetching CEO analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = (chartData, fileName) => {
        const ws = XLSX.utils.json_to_sheet(chartData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Analytics");
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `${fileName}_${new Date().toLocaleDateString()}.xlsx`);
    };

    if (loading && !data) {
        return (
            <div className={`flex h-full items-center justify-center ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'}`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span className="text-cyan-500 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Initializing Control Tower</span>
                </div>
            </div>
        );
    }

    const { workforce, sales } = data || {};

    const chartTooltipStyle = {
        backgroundColor: isDarkMode ? '#131619' : '#fff',
        border: `1px solid ${isDarkMode ? '#1f2937' : '#e5e7eb'}`,
        borderRadius: '2px',
        fontSize: '10px',
        textTransform: 'uppercase',
        fontWeight: '900',
        color: isDarkMode ? '#fff' : '#000'
    };

    return (
        <div className={`flex-1 flex flex-col min-h-screen ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'} transition-colors duration-500 p-6 overflow-y-auto custom-scrollbar`}>

            {/* Command Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-gray-800/50 pb-6">
                <div>
                    <h1 className={`text-2xl font-black italic tracking-tight mb-1 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <span className="p-2 border-2 border-cyan-500 rounded-[2px] text-cyan-500"><FaChartBar /></span>
                        CEO CONTROL TOWER <span className="text-[10px] not-italic text-gray-500 mt-2">V2.0</span>
                    </h1>
                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Enterprise Dynamic Intelligence Dashboard</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1 p-1 rounded-[2px] border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'}`}>
                        <button
                            onClick={() => setIsDarkMode(true)}
                            className={`p-2 rounded-[1px] transition-all ${isDarkMode ? "bg-cyan-500 text-black" : "text-gray-500 hover:text-cyan-500"}`}
                        >
                            <FaMoon size={12} />
                        </button>
                        <button
                            onClick={() => setIsDarkMode(false)}
                            className={`p-2 rounded-[1px] transition-all ${!isDarkMode ? "bg-cyan-500 text-black" : "text-gray-600 hover:text-cyan-500"}`}
                        >
                            <FaSun size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className={`mb-8 p-4 border rounded-[2px] flex flex-wrap items-center gap-6 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex flex-col gap-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Operational Centre</label>
                    <select
                        value={filters.centre}
                        onChange={(e) => setFilters({ ...filters, centre: e.target.value })}
                        className={`text-[10px] font-black uppercase tracking-widest p-2 rounded-[2px] border outline-none min-w-[200px] ${isDarkMode ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-200 text-black'}`}
                    >
                        <option value="ALL">Global Operations (All)</option>
                        {centres.map(c => <option key={c._id} value={c.centreName}>{c.centreName}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Temporal Range</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            className={`text-[10px] font-black p-2 rounded-[2px] border outline-none ${isDarkMode ? 'bg-black border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-black focus:border-cyan-500'}`}
                        />
                        <span className="text-gray-500 text-[10px]">TO</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            className={`text-[10px] font-black p-2 rounded-[2px] border outline-none ${isDarkMode ? 'bg-black border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-black focus:border-cyan-500'}`}
                        />
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-3 self-end">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-6 py-3 rounded-[2px] bg-cyan-500 hover:bg-cyan-600 text-black font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                    >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} /> SYNC DATA
                    </button>
                    <button
                        onClick={() => exportToExcel(sales?.centrePerformance || [], 'global_performance')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-[2px] border font-black text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-500 hover:text-black hover:border-emerald-500 ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'}`}
                    >
                        Export Master
                    </button>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Revenue Performance"
                    value={`₹${((sales?.totalRevenue || 0) / 100000).toFixed(2)}L`}
                    subValue={<><FaArrowUp className="mr-1" /> CORE REVENUE</>}
                    icon={<FaMoneyBillWave />}
                    color="emerald"
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    title="Gross Admissions"
                    value={sales?.totalAdmissions || 0}
                    subValue="ENROLLED UNITS"
                    icon={<FaUsers />}
                    color="cyan"
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    title="Workforce Baseline"
                    value={workforce?.totalEmployees || 0}
                    subValue="ACTIVE EMPLOYEES"
                    icon={<FaUserFriends />}
                    color="purple"
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    title="Operation Presence"
                    value={`${workforce?.presenceRate || 0}%`}
                    subValue={`${workforce?.attendanceToday || 0} AT OFFICE`}
                    icon={<FaUserCheck />}
                    color="amber"
                    isDarkMode={isDarkMode}
                />
            </div>

            {/* Business Velocity & Conversion Tracker */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <ChartContainer title="Registrations vs Admissions Velocity" isDarkMode={isDarkMode} color="cyan" onExport={() => exportToExcel(sales?.conversionTrend || [], 'conversion_trend')}>
                        <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                            <AreaChart data={sales?.conversionTrend || []}>
                                <defs>
                                    <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorAdm" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                                <XAxis dataKey="date" stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                                <YAxis stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                                <Area type="monotone" dataKey="registrations" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorReg)" name="Registrations" />
                                <Area type="monotone" dataKey="admissions" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorAdm)" name="Admissions" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                <ChartContainer title="Transaction Method Mix" isDarkMode={isDarkMode} color="emerald" onExport={() => exportToExcel(sales?.transactionStats || [], 'transactions')}>
                    <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                        <PieChart>
                            <Pie data={sales?.transactionStats || []} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="count" nameKey="name" stroke="none">
                                {(sales?.transactionStats || []).map((entry, index) => <Cell key={`cell-${index}`} fill={["#10b981", "#06b6d4", "#f59e0b", "#a855f7", "#ef4444"][index % 5]} />)}
                            </Pie>
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>

            {/* Performance Rankings: Counselors & Telecallers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Counselor Performance */}
                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-[2px] overflow-hidden shadow-xl`}>
                    <div className="p-6 border-b border-gray-800/50 flex justify-between items-center bg-transparent">
                        <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em]`}>Top Tier Counselors (Sales)</h4>
                        <div className="px-2 py-0.5 rounded-[1px] bg-cyan-500/10 text-cyan-500 text-[8px] font-black uppercase">By Conversions</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-gray-50'}>
                                <tr className="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-800/50">
                                    <th className="px-6 py-4">Counselor Name</th>
                                    <th className="px-6 py-4 text-center">Unit Volume</th>
                                    <th className="px-6 py-4 text-right">Revenue (L)</th>
                                </tr>
                            </thead>
                            <tbody className="text-[10px] font-black tracking-widest">
                                {(sales?.counselorStats || []).map((row, i) => (
                                    <tr key={i} className={`border-b ${isDarkMode ? 'border-gray-800/30' : 'border-gray-100'} hover:bg-cyan-500/[0.02]`}>
                                        <td className="px-6 py-4 text-white uppercase italic">{row.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">{row.count} ADM</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-emerald-500">₹{(row.revenue / 100000).toFixed(2)}L</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Telecaller Performance */}
                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-[2px] overflow-hidden shadow-xl`}>
                    <div className="p-6 border-b border-gray-800/50 flex justify-between items-center bg-transparent">
                        <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em]`}>High Volume Telecallers</h4>
                        <div className="px-2 py-0.5 rounded-[1px] bg-purple-500/10 text-purple-500 text-[8px] font-black uppercase">By Lead Volume</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-gray-50'}>
                                <tr className="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-gray-800/50">
                                    <th className="px-6 py-4">Telecaller Identity</th>
                                    <th className="px-6 py-4 text-center">Lead Engagement</th>
                                    <th className="px-6 py-4 text-right">Market Share</th>
                                </tr>
                            </thead>
                            <tbody className="text-[10px] font-black tracking-widest">
                                {(sales?.telecallerStats || []).map((row, i) => {
                                    const total = sales.telecallerStats.reduce((a, b) => a + b.count, 0);
                                    const share = ((row.count / total) * 100).toFixed(1);
                                    return (
                                        <tr key={i} className={`border-b ${isDarkMode ? 'border-gray-800/30' : 'border-gray-100'} hover:bg-purple-500/[0.02]`}>
                                            <td className="px-6 py-4 text-white uppercase italic">{row.name}</td>
                                            <td className="px-6 py-4 text-center text-purple-400 font-bold">{row.count} LEADS</td>
                                            <td className="px-6 py-4 text-right text-gray-500">{share}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Employee Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ScrollableChartContainer title="Employee Department Distribution" isDarkMode={isDarkMode} color="purple" height={300}>
                    <div style={{ height: Math.max(300, (data?.workforce?.departments?.length || 0) * 40) }}>
                        <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                            <BarChart data={data?.workforce?.departments || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={15}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke={isDarkMode ? "#9ca3af" : "#6b7280"} fontSize={9} fontWeight={700} axisLine={false} tickLine={false} width={120} />
                                <Tooltip cursor={{ fill: isDarkMode ? '#1f2937' : '#f9fafb' }} contentStyle={chartTooltipStyle} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {(data?.workforce?.departments || []).map((entry, index) => <Cell key={`cell-${index}`} fill={["#06b6d4", "#a855f7", "#10b981", "#f59e0b", "#ef4444"][index % 5]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ScrollableChartContainer>

                <ChartContainer title="Lead Acquisition Sources" isDarkMode={isDarkMode} color="emerald" onExport={() => exportToExcel(sales?.leadSourceStats || [], 'lead_sources')}>
                    <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                        <BarChart data={sales?.leadSourceStats || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                            <XAxis dataKey="name" stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: isDarkMode ? '#ffffff05' : '#00000005' }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>

            {/* Employee Designation & Centre Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ScrollableChartContainer title="Employee Designation Distribution" isDarkMode={isDarkMode} color="cyan" height={350}>
                    <div style={{ height: Math.max(350, (data?.workforce?.designations?.length || 0) * 35) }}>
                        <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                            <BarChart data={data?.workforce?.designations || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={15}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke={isDarkMode ? "#9ca3af" : "#6b7280"} fontSize={9} fontWeight={700} axisLine={false} tickLine={false} width={140} />
                                <Tooltip cursor={{ fill: isDarkMode ? '#1f2937' : '#f9fafb' }} contentStyle={chartTooltipStyle} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {(data?.workforce?.designations || []).map((entry, index) => <Cell key={`cell-${index}`} fill={["#a855f7", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"][index % 5]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ScrollableChartContainer>

                <ScrollableChartContainer title="Employee Centre Distribution" isDarkMode={isDarkMode} color="amber" height={350}>
                    <div style={{ height: Math.max(350, (data?.workforce?.centres?.length || 0) * 35) }}>
                        <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                            <BarChart data={data?.workforce?.centres || []} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barSize={15}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" stroke={isDarkMode ? "#9ca3af" : "#6b7280"} fontSize={9} fontWeight={700} axisLine={false} tickLine={false} width={140} />
                                <Tooltip cursor={{ fill: isDarkMode ? '#1f2937' : '#f9fafb' }} contentStyle={chartTooltipStyle} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {(data?.workforce?.centres || []).map((entry, index) => <Cell key={`cell-${index}`} fill={["#f59e0b", "#ef4444", "#10b981", "#06b6d4", "#a855f7"][index % 5]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ScrollableChartContainer>
            </div>

            {/* Academic Intelligence Dropdown - Comprehensive Course & Board Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Board Course Wise Analysis - Area Chart */}
                <ChartContainer title="Board Course Analysis" isDarkMode={isDarkMode} color="cyan">
                    <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                        <AreaChart data={data?.academics?.boardCourse || []}>
                            <defs>
                                <linearGradient id="colorBoard" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                            <XAxis dataKey="name" stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: '#06b6d4', strokeWidth: 1, strokeDasharray: '3 3' }} />
                            <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#colorBoard)" name="Students" animationDuration={1500} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>

                {/* Normal Course Wise Analysis - Bar Graph */}
                <ChartContainer title="Standard Course Distribution" isDarkMode={isDarkMode} color="purple">
                    <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                        <BarChart data={data?.academics?.normalCourse || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                            <XAxis type="number" stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis dataKey="name" type="category" stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} width={100} />
                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: isDarkMode ? '#ffffff05' : '#00000005' }} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                {(data?.academics?.normalCourse || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={["#a855f7", "#8b5cf6", "#7c3aed", "#6d28d9"][index % 4]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>

            {/* Subject Analysis for Board Students */}
            <div className="mb-8">
                <ChartContainer title="Board Subject Preference" isDarkMode={isDarkMode} color="emerald">
                    <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                        <BarChart data={data?.academics?.boardSubjects || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                            <XAxis dataKey="name" stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                            <YAxis stroke={isDarkMode ? "#4b5563" : "#9ca3af"} fontSize={9} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: isDarkMode ? '#ffffff05' : '#00000005' }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                                {(data?.academics?.boardSubjects || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={["#10b981", "#34d399", "#059669", "#047857"][index % 4]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>

            {/* Final Distribution Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <ChartContainer title="Regional Spread" isDarkMode={isDarkMode} color="purple">
                    <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                        <PieChart>
                            <Pie data={data?.students?.state || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="count" nameKey="name" stroke="none">
                                {(data?.students?.state || []).map((entry, index) => <Cell key={`cell-${index}`} fill={["#a855f7", "#10b981", "#f59e0b", "#06b6d4", "#ef4444"][index % 5]} />)}
                            </Pie>
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer title="Student Board Mix" isDarkMode={isDarkMode} color="amber">
                    <ResponsiveContainer width="100%" height="100%" debounce={50} minHeight={0} minWidth={0}>
                        <PieChart>
                            <Pie data={data?.students?.board || []} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="name" stroke="none">
                                {(data?.students?.board || []).map((entry, index) => <Cell key={`cell-${index}`} fill={["#f59e0b", "#ef4444", "#10b981", "#06b6d4"][index % 4]} />)}
                            </Pie>
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-[2px] overflow-hidden shadow-xl`}>
                    <div className="p-6 border-b border-gray-800/50 flex justify-between items-center">
                        <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em]`}>Unit Ranking</h4>
                        <div className="text-emerald-500 font-black text-[10px]">REVENUE LEADERBOARD</div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar" style={{ maxHeight: '250px' }}>
                        <table className="w-full text-left">
                            <tbody className="text-[10px] font-black tracking-widest text-gray-400">
                                {(sales?.centrePerformance || []).map((centre, i) => (
                                    <tr key={i} className={`border-b border-gray-800/20 hover:bg-white/[0.02] transition-colors`}>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${i < 3 ? 'border-cyan-500 text-cyan-500' : 'border-gray-800 text-gray-600'} text-[8px] font-black`}>{i + 1}</span>
                                        </td>
                                        <td className="px-6 py-3 text-white uppercase">{centre.name}</td>
                                        <td className="px-6 py-3 text-right text-emerald-500">₹{(centre.revenue / 1000).toFixed(0)}K</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Employee Attendance Analytics Section */}
            <EmployeeAttendanceAnalytics
                masterData={{
                    departments: data?.workforce?.departments || [],
                    designations: data?.workforce?.designations || [],
                    centres: data?.workforce?.centres || []
                }}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#e5e7eb'}; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
            `}</style>
        </div>
    );
};

export default CEOControlTowerContent;
