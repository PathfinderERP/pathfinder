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
            <p className={`text-${color}-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-1`}>
                {subValue}
            </p>
        </div>
    </div>
);

const ChartContainer = ({ title, children, isDarkMode, color = "cyan" }) => (
    <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border p-6 rounded-[2px] relative overflow-hidden group`}>
        <div className="flex justify-between items-center mb-6">
            <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em]`}>{title}</h4>
            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[1px]`} style={{ backgroundColor: `${color === 'cyan' ? '#06b6d4' : (color === 'purple' ? '#a855f7' : '#10b981')}20`, color: color === 'cyan' ? '#06b6d4' : (color === 'purple' ? '#a855f7' : '#10b981') }}>ANALYTICS</div>
        </div>
        <div className="h-[250px] w-full">
            {children}
        </div>
    </div>
);

const CEOControlTowerContent = () => {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/ceo/analytics`, {
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

    if (loading) {
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
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-3 rounded-[2px] bg-cyan-500 hover:bg-cyan-600 text-black font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                    >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} /> REFRESH
                    </button>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Enterprise Revenue"
                    value={`₹${(sales?.totalRevenue || 0 / 100000).toFixed(2)}L`}
                    subValue={<><FaArrowUp className="mr-1" /> 12.5% GROWTH</>}
                    icon={<FaMoneyBillWave />}
                    color="emerald"
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    title="Student Conversions"
                    value={sales?.totalAdmissions || 0}
                    subValue={<><FaArrowUp className="mr-1" /> 8.2% MONTHLY</>}
                    icon={<FaUsers />}
                    color="cyan"
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    title="Active Manpower"
                    value={workforce?.totalEmployees || 0}
                    subValue="STABLE ENROLLMENT"
                    icon={<FaUserFriends />}
                    color="purple"
                    isDarkMode={isDarkMode}
                />
                <StatCard
                    title="Daily Presence"
                    value={`${workforce?.presenceRate || 0}%`}
                    subValue={`${workforce?.attendanceToday || 0} PRESENT TODAY`}
                    icon={<FaUserCheck />}
                    color="amber"
                    isDarkMode={isDarkMode}
                />
            </div>

            {/* Core Analytics Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                {/* Revenue/Admission Trend */}
                <div className="lg:col-span-2">
                    <ChartContainer title="Performance Trajectory" isDarkMode={isDarkMode} color="cyan">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sales?.admissionTrend || []}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1f2937" : "#e5e7eb"} />
                                <XAxis
                                    dataKey="month"
                                    stroke={isDarkMode ? "#4b5563" : "#9ca3af"}
                                    fontSize={9}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontWeight: '900' }}
                                />
                                <YAxis
                                    stroke={isDarkMode ? "#4b5563" : "#9ca3af"}
                                    fontSize={9}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontWeight: '900' }}
                                />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorTrend)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#a855f7"
                                    strokeWidth={2}
                                    fillOpacity={0.1}
                                    fill="#a855f7"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Workforce Units */}
                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border p-6 rounded-[2px]`}>
                    <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em] mb-6`}>Unit Allocation</h4>
                    <div className="space-y-4">
                        {(workforce?.departments || []).sort((a, b) => b.count - a.count).slice(0, 6).map((dept, i) => {
                            const colors = ["bg-cyan-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
                            const pct = Math.min(100, (dept.count / (workforce?.totalEmployees || 1)) * 100);
                            return (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-1.5 px-0.5">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{dept.name}</span>
                                        <span className={`text-[9px] font-black ${isDarkMode ? 'text-cyan-500' : 'text-cyan-600'}`}>{dept.count}</span>
                                    </div>
                                    <div className={`h-1 w-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                                        <div
                                            className={`h-full ${colors[i % colors.length]} transition-all duration-1000`}
                                            style={{ width: `${pct}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Location & Pipeline Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">

                {/* Centre Performance Table */}
                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border rounded-[2px] overflow-hidden`}>
                    <div className="p-6 border-b border-gray-800/50 flex justify-between items-center bg-transparent">
                        <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em]`}>Strategic Business Units</h4>
                        <FaMapMarkerAlt className="text-cyan-500" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className={isDarkMode ? 'bg-black/20' : 'bg-gray-50'}>
                                <tr className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <th className="px-6 py-4">Centre Identity</th>
                                    <th className="px-6 py-4 text-center">Volume</th>
                                    <th className="px-6 py-4 text-right">Value</th>
                                </tr>
                            </thead>
                            <tbody className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {(sales?.centrePerformance || []).map((centre, i) => (
                                    <tr key={i} className={`border-t ${isDarkMode ? 'border-gray-800/50 hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50'} transition-colors`}>
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <span className={`w-5 h-5 flex items-center justify-center border-2 border-cyan-500/[0.1] rounded-[2px] text-[8px] ${isDarkMode ? 'text-cyan-500 bg-cyan-500/5' : 'text-cyan-600 bg-cyan-500/10'}`}>
                                                {i + 1}
                                            </span>
                                            {centre.name}
                                        </td>
                                        <td className="px-6 py-4 text-center">{centre.count} UNITS</td>
                                        <td className={`px-6 py-4 text-right ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>₹{(centre.revenue / 1000).toFixed(1)}K</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Lead Pipeline */}
                <div className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} border p-6 rounded-[2px]`}>
                    <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em] mb-6`}>Lead Acquisition Pipeline</h4>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 h-[250px]">
                        <div className="w-full h-full max-w-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={sales?.leadStats || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                        stroke="none"
                                    >
                                        {(sales?.leadStats || []).map((entry, index) => {
                                            const colors = ["#06b6d4", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];
                                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        })}
                                    </Pie>
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full">
                            {(sales?.leadStats || []).map((lead, i) => {
                                const colors = ["bg-cyan-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
                                return (
                                    <div key={i} className={`p-3 rounded-[2px] border ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-100'} flex flex-col gap-1`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${colors[i % colors.length]}`}></div>
                                            <span className="text-[8px] font-black text-gray-500 uppercase truncate">{lead.type}</span>
                                        </div>
                                        <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{lead.count}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${isDarkMode ? '#1f2937' : '#e5e7eb'};
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #06b6d4;
                }
            `}</style>
        </div>
    );
};

export default CEOControlTowerContent;
