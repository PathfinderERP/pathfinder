import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BoxSkeleton, BaseSkeleton, CardSkeleton } from '../common/Skeleton';
import { FaDownload, FaSearch, FaUser, FaClock, FaCalendar, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const EmployeeAttendanceAnalytics = ({ masterData, isDarkMode }) => {
    const [loading, setLoading] = useState(false);
    const [analyticsData, setAnalyticsData] = useState([]);

    // Filters
    const [period, setPeriod] = useState("day"); // day, week, month, year
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [filters, setFilters] = useState({
        centre: [],
        department: [],
        designation: []
    });

    // Single User
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeStats, setEmployeeStats] = useState(null);

    const apiUrl = import.meta.env.VITE_API_URL;

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const query = new URLSearchParams({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                period,
                centre: filters.centre.join(',') || 'ALL',
                department: filters.department.join(',') || 'ALL',
                designation: filters.designation.join(',') || 'ALL'
            }).toString();

            const res = await fetch(`${apiUrl}/ceo/attendance-analytics?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAnalyticsData(data.data);
            }
        } catch (error) {
            console.error("Error fetching analytics", error);
        } finally {
            setLoading(false);
        }
    }, [period, dateRange, filters, apiUrl]);

    const fetchEmployeeSearch = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${apiUrl}/ceo/employee-search?query=${searchQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setSearchResults(data.data);
        } catch (error) {
            console.error("Search error", error);
        }
    }, [searchQuery, apiUrl]);

    const fetchEmployeePerformance = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const query = new URLSearchParams({
                employeeId: selectedEmployee.employeeId || selectedEmployee._id,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            }).toString();

            const res = await fetch(`${apiUrl}/ceo/employee-performance?${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setEmployeeStats(data.data);
        } catch (error) {
            console.error("Employee stats error", error);
        }
    }, [selectedEmployee, dateRange, apiUrl]);

    useEffect(() => {
        fetchAnalytics();
    }, [period, dateRange, filters, fetchAnalytics]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) fetchEmployeeSearch();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchEmployeeSearch]);

    useEffect(() => {
        if (selectedEmployee) fetchEmployeePerformance();
    }, [selectedEmployee, dateRange, fetchEmployeePerformance]);


    const handleExport = () => {
        if (!analyticsData.length) return;
        const ws = XLSX.utils.json_to_sheet(analyticsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance_Trends");
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `attendance_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const ExportButton = () => {
        return (
            <button
                onClick={handleExport}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all font-bold text-[10px] uppercase tracking-widest border ${isDarkMode
                    ? 'bg-[#1a1f24] text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10'
                    : 'bg-white text-cyan-600 border-cyan-200 hover:bg-cyan-50 shadow-sm'
                    }`}
            >
                <FaDownload /> Export Matrix
            </button>
        );
    };

    const COLORS = ['#06b6d4', '#ef4444', '#f59e0b', '#a855f7']; // Cyan, Red, Yellow, Purple

    const chartTooltipStyle = {
        backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
        borderRadius: '4px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontSize: '10px',
        fontWeight: '900',
        textTransform: 'uppercase'
    };

    return (
        <div className={`mt-8 border rounded-[4px] p-8 relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-xl'}`}>
            {/* Background decorative glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent blur-sm`}></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h2 className={`text-xl font-black uppercase italic tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaClock className="text-cyan-500" /> Employee Attendance Intelligence
                    </h2>
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Workforce Presence & Synchronized Analytics</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Period Tabs */}
                    <div className={`flex p-1 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                        {['day', 'week', 'month', 'year'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-5 py-1.5 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all ${period === p
                                    ? (isDarkMode ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-white text-cyan-600 shadow-sm')
                                    : (isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-600')
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    {/* Export */}
                    <ExportButton />
                </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className={`flex rounded-[4px] border overflow-hidden h-11 transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <span className={`px-4 flex items-center text-[10px] font-black uppercase tracking-widest border-r transition-colors ${isDarkMode ? 'text-gray-500 bg-[#131619] border-gray-800' : 'text-gray-400 bg-white border-gray-200'}`}>Date Range</span>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        className={`bg-transparent px-3 py-1 text-[10px] font-black outline-none w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    />
                    <span className="flex items-center text-gray-500 font-black px-1">-</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        className={`bg-transparent px-3 py-1 text-[10px] font-black outline-none w-full ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    />
                </div>

                <select
                    className={`text-[10px] font-black uppercase tracking-widest rounded-[4px] border px-4 h-11 transition-all outline-none ${isDarkMode
                        ? 'bg-[#1a1f24] text-gray-300 border-gray-800 focus:border-cyan-500/50'
                        : 'bg-white text-gray-700 border-gray-200 focus:border-cyan-500 shadow-sm'
                        }`}
                    onChange={(e) => setFilters({ ...filters, centre: [e.target.value] })}
                    value={filters.centre[0] || 'ALL'}
                >
                    <option value="ALL">Global Centres</option>
                    {masterData.centres?.map((c, i) => <option key={`centre-${c.name}-${i}`} value={c.name}>{c.name.toUpperCase()}</option>)}
                </select>

                <select
                    className={`text-[10px] font-black uppercase tracking-widest rounded-[4px] border px-4 h-11 transition-all outline-none ${isDarkMode
                        ? 'bg-[#1a1f24] text-gray-300 border-gray-800 focus:border-cyan-500/50'
                        : 'bg-white text-gray-700 border-gray-200 focus:border-cyan-500 shadow-sm'
                        }`}
                    onChange={(e) => setFilters({ ...filters, department: [e.target.value] })}
                    value={filters.department[0] || 'ALL'}
                >
                    <option value="ALL">All Departments</option>
                    {masterData.departments?.map((d, i) => <option key={`dept-${d.name}-${i}`} value={d.name}>{d.name.toUpperCase()}</option>)}
                </select>

                <select
                    className={`text-[10px] font-black uppercase tracking-widest rounded-[4px] border px-4 h-11 transition-all outline-none ${isDarkMode
                        ? 'bg-[#1a1f24] text-gray-300 border-gray-800 focus:border-cyan-500/50'
                        : 'bg-white text-gray-700 border-gray-200 focus:border-cyan-500 shadow-sm'
                        }`}
                    onChange={(e) => setFilters({ ...filters, designation: [e.target.value] })}
                    value={filters.designation[0] || 'ALL'}
                >
                    <option value="ALL">All Designations</option>
                    {masterData.designations?.map((d, i) => <option key={`desig-${d.name}-${i}`} value={d.name}>{d.name.toUpperCase()}</option>)}
                </select>
            </div>

            {/* Attendance Area Chart */}
            <div className="h-[400px] w-full mb-12 relative p-4 rounded-[4px] border border-dashed transition-colors" style={{ borderColor: isDarkMode ? '#1f2937' : '#e5e7eb' }}>
                {analyticsData.length === 0 && !loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-gray-500">
                        <FaExclamationTriangle className="text-2xl mb-2 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Zero Vector Data in Range</span>
                    </div>
                )}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-transparent">
                        <BoxSkeleton className="h-full w-full" />
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1f2937" : "#f1f5f9"} vertical={false} />
                        <XAxis dataKey="_id" stroke={isDarkMode ? "#4b5563" : "#94a3b8"} fontSize={9} fontWeight={900} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke={isDarkMode ? "#4b5563" : "#94a3b8"} fontSize={9} fontWeight={900} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={chartTooltipStyle}
                            itemStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }}
                            labelStyle={{ color: isDarkMode ? '#6b7280' : '#94a3b8', marginBottom: '8px', fontSize: '10px' }}
                            cursor={{ stroke: '#06b6d4', strokeWidth: 1, strokeDasharray: '3 3' }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            height={36}
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', paddingBottom: '20px', letterSpacing: '0.1em' }}
                        />
                        <Area type="monotone" dataKey="present" name="Present" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                        <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLate)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                        <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" fillOpacity={1} fill="url(#colorAbsent)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Single User Analysis Section */}
            <div className={`border-t pt-10 transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} id="single-user-analysis">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                    {/* Search Column */}
                    <div className={`lg:col-span-1 border-r pr-8 transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <h3 className={`font-black uppercase tracking-[0.2em] text-[11px] mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaUser className="text-cyan-500" /> Vector Profile Search
                        </h3>
                        <div className="relative mb-6">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <input
                                type="text"
                                placeholder="SEARCH_IDENTITY..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-11 pr-4 py-3 rounded-[4px] border text-[11px] font-black uppercase tracking-widest transition-all outline-none ${isDarkMode
                                    ? 'bg-[#1a1f24] text-white border-gray-700 focus:border-cyan-500/50'
                                    : 'bg-white text-gray-900 border-gray-200 focus:border-cyan-500 shadow-sm'
                                    }`}
                            />
                        </div>
                        <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto custom-scrollbar">
                            {searchResults.map(emp => (
                                <div
                                    key={emp._id || emp.employeeId}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`p-4 rounded-[4px] cursor-pointer transition-all flex items-center gap-4 border ${selectedEmployee?._id === emp._id
                                        ? (isDarkMode ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-cyan-50 border-cyan-200')
                                        : (isDarkMode ? 'bg-[#1a1f24]/50 border-transparent hover:border-gray-700' : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm')
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-[2px] flex items-center justify-center overflow-hidden border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                                        {emp.employeeImage ? <img src={emp.employeeImage} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-black text-gray-400">{emp.employeeName?.[0]}</span>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-[11px] font-black uppercase tracking-widest truncate ${selectedEmployee?._id === emp._id ? 'text-cyan-500' : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>{emp.employeeName}</p>
                                        <p className="text-[9px] text-gray-500 font-bold tracking-widest">{emp.employeeId.toUpperCase()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats Column */}
                    <div className="lg:col-span-3">
                        {loading && !selectedEmployee ? (
                            <div className="space-y-4">
                                <CardSkeleton isDarkMode={isDarkMode} />
                                <CardSkeleton isDarkMode={isDarkMode} />
                                <CardSkeleton isDarkMode={isDarkMode} />
                            </div>
                        ) : !employeeStats ? (
                            <div className={`h-full flex flex-col items-center justify-center text-center opacity-30`}>
                                <FaUser className="text-4xl mb-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Identity Selection</span>
                                <p className="text-[9px] mt-2 font-bold uppercase tracking-widest">Select an employee vector to initialize performance mix</p>
                            </div>
                        ) : (
                            <div className="animate-fadeIn space-y-8">
                                {/* Profile Header */}
                                <div className={`flex items-center gap-6 p-6 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-lg shadow-black/20' : 'bg-white border-gray-200 shadow-md'}`}>
                                    <div className="w-20 h-20 rounded-[4px] border-2 border-cyan-500/30 p-1.5 bg-gradient-to-br from-cyan-500/10 to-transparent">
                                        <div className={`w-full h-full rounded-[2px] flex items-center justify-center overflow-hidden h-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                            {employeeStats.employee.image ? (
                                                <img src={employeeStats.employee.image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-gray-500 opacity-50">
                                                    {employeeStats.employee.name?.[0]}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className={`text-2xl font-black italic tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{employeeStats.employee.name}</h3>
                                        <div className="flex flex-wrap gap-4">
                                            {[
                                                { label: employeeStats.employee.designation, color: 'bg-cyan-500' },
                                                { label: employeeStats.employee.department, color: 'bg-purple-500' },
                                                { label: employeeStats.employee.centre, color: 'bg-amber-500' }
                                            ].map((tag, idx) => (
                                                <span key={idx} className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-[1px] border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${tag.color}`}></span> {tag.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Pie Chart */}
                                    <div className={`p-8 rounded-[4px] border h-[300px] flex items-center transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                        <div className="flex-1 h-full">
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: 'Present', value: employeeStats.stats.present },
                                                            { name: 'Absent', value: employeeStats.stats.absent },
                                                            { name: 'Late', value: employeeStats.stats.late },
                                                            { name: 'Half Day', value: employeeStats.stats.halfDay },
                                                        ]}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={65}
                                                        outerRadius={85}
                                                        paddingAngle={8}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {['#06b6d4', '#ef4444', '#f59e0b', '#a855f7'].map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={chartTooltipStyle} />
                                                    <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-col gap-6 justify-center ml-4 border-l pl-8 border-gray-800/20">
                                            <div className="text-left">
                                                <p className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{employeeStats.stats.totalDays}</p>
                                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Matrix Density</p>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-3xl font-black tracking-tighter text-cyan-500">
                                                    {((employeeStats.stats.present / (employeeStats.stats.totalDays || 1)) * 100).toFixed(0)}%
                                                </p>
                                                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Sync Rate</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-6">
                                        {[
                                            { label: "High Sync", val: employeeStats.stats.present - employeeStats.stats.late, color: "emerald", sub: "On Time" },
                                            { label: "Delayed", val: employeeStats.stats.late, color: "amber", sub: "Late Shift" },
                                            { label: "Offline", val: employeeStats.stats.absent, color: "red", sub: "Absences" },
                                            { label: "Partial", val: employeeStats.stats.halfDay, color: "purple", sub: "Half Cycles" }
                                        ].map((stat, i) => (
                                            <div key={i} className={`p-5 rounded-[4px] border group transition-all relative overflow-hidden ${isDarkMode
                                                ? `bg-gray-800/20 border-gray-800 hover:border-${stat.color}-500/50`
                                                : `bg-white border-gray-200 hover:border-${stat.color}-500/50 shadow-sm`
                                                }`}>
                                                <div className={`absolute top-0 right-0 w-12 h-12 bg-${stat.color}-500/5 rounded-full blur-xl -mr-6 -mt-6 group-hover:bg-${stat.color}-500/10 transition-all`}></div>
                                                <p className={`text-${stat.color}-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2`}>{stat.label}</p>
                                                <p className={`text-3xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stat.val}</p>
                                                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">{stat.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Timeline Trend Chart */}
                                {employeeStats.timeline && employeeStats.timeline.length > 0 && (
                                    <div className={`p-8 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                                        <div className="flex justify-between items-center mb-8">
                                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Identity Consistency Vector</p>
                                            <div className="text-[8px] font-black uppercase tracking-widest text-cyan-500 px-2 py-0.5 border border-cyan-500/20 rounded-[1px]">Realtime Flux</div>
                                        </div>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={employeeStats.timeline.map(t => ({
                                                    date: t.date,
                                                    score: t.status === 'Present' ? 100 : (t.status === 'Late' ? 75 : (t.status === 'Half Day' ? 50 : 0)),
                                                    status: t.status
                                                }))}>
                                                    <defs>
                                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1f2937" : "#f1f5f9"} />
                                                    <XAxis dataKey="date" hide />
                                                    <Tooltip
                                                        cursor={{ stroke: '#06b6d4', strokeWidth: 1, strokeDasharray: '3 3' }}
                                                        content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div className={`p-3 rounded-[2px] border shadow-2xl transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                                                        <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">{data.date.toUpperCase()}</p>
                                                                        <p className={`text-[11px] font-black uppercase tracking-widest ${data.status === 'Present' ? 'text-cyan-500' : (data.status === 'Absent' ? 'text-red-500' : 'text-amber-500')}`}>
                                                                            SIGNAL: {data.status.toUpperCase()}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Area type="monotone" dataKey="score" stroke="#06b6d4" fill="url(#colorScore)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: ${isDarkMode ? '#333' : '#e2e8f0'}; 
                    border-radius: 4px; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
                    background: ${isDarkMode ? '#444' : '#cbd5e1'}; 
                }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default EmployeeAttendanceAnalytics;
