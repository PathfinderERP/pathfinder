import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FaDownload, FaSearch, FaUser, FaClock, FaCalendar, FaExclamationTriangle } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import MultiSelectFilter from '../common/MultiSelectFilter'; // Assuming this exists or similar

const EmployeeAttendanceAnalytics = ({ masterData }) => {
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

    useEffect(() => {
        fetchAnalytics();
    }, [period, dateRange, filters]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) fetchEmployeeSearch();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (selectedEmployee) fetchEmployeePerformance();
    }, [selectedEmployee, dateRange]);

    const fetchAnalytics = async () => {
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
    };

    const fetchEmployeeSearch = async () => {
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
    };

    const fetchEmployeePerformance = async () => {
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
    };

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
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1f24] text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/10 transition-all font-bold text-xs uppercase tracking-wider"
            >
                <FaDownload /> Export
            </button>
        );
    };

    const COLORS = ['#06b6d4', '#ef4444', '#f59e0b', '#a855f7']; // Cyan, Red, Yellow, Purple

    return (
        <div className="mt-8 bg-[#131619] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            {/* Background decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent blur-sm"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                        <FaClock className="text-cyan-400" /> Employee Attendance Trends
                    </h2>
                    <p className="text-gray-500 text-xs mt-1">Workforce presence and punctuality analytics</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Period Tabs */}
                    <div className="flex bg-[#1a1f24] rounded-lg p-1 border border-gray-800">
                        {['day', 'week', 'month', 'year'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-1.5 rounded text-xs font-bold uppercase transition-all ${period === p ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white'
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="flex bg-[#1a1f24] rounded-lg border border-gray-800 overflow-hidden h-10">
                    <span className="px-3 flex items-center text-gray-400 text-xs font-bold uppercase bg-[#131619] border-r border-gray-800">Date</span>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        className="bg-transparent text-white px-2 py-1 text-xs focus:outline-none w-full"
                    />
                    <span className="flex items-center text-gray-500">-</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        className="bg-transparent text-white px-2 py-1 text-xs focus:outline-none w-full"
                    />
                </div>

                {/* Reusing MultiSelectFilter logic would be complex here without prop drilling the component or creating a new one. 
                    For simplicity in this step, using standard selects or verify if MultiSelectFilter is generic.
                    Assuming standard selects for now to guarantee functionality, styled to match.
                */}
                <select
                    className="bg-[#1a1f24] text-gray-300 text-xs rounded-lg border border-gray-800 px-3 h-10 focus:border-cyan-500 focus:outline-none"
                    onChange={(e) => setFilters({ ...filters, centre: [e.target.value] })}
                    value={filters.centre[0] || 'ALL'}
                >
                    <option value="ALL">All Centres</option>
                    {masterData.centres?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>

                <select
                    className="bg-[#1a1f24] text-gray-300 text-xs rounded-lg border border-gray-800 px-3 h-10 focus:border-cyan-500 focus:outline-none"
                    onChange={(e) => setFilters({ ...filters, department: [e.target.value] })}
                    value={filters.department[0] || 'ALL'}
                >
                    <option value="ALL">All Departments</option>
                    {masterData.departments?.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>

                <select
                    className="bg-[#1a1f24] text-gray-300 text-xs rounded-lg border border-gray-800 px-3 h-10 focus:border-cyan-500 focus:outline-none"
                    onChange={(e) => setFilters({ ...filters, designation: [e.target.value] })}
                    value={filters.designation[0] || 'ALL'}
                >
                    <option value="ALL">All Designations</option>
                    {masterData.designations?.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
            </div>

            {/* Attendance Area Chart */}
            <div className="h-[350px] w-full mb-8 relative">
                {analyticsData.length === 0 && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 text-gray-500 text-sm">No data available for selected range</div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="_id" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                            itemStyle={{ fontSize: '12px' }}
                            labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Area type="monotone" dataKey="present" name="Present" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={2} />
                        <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLate)" strokeWidth={2} />
                        <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" fillOpacity={1} fill="url(#colorAbsent)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Single User Analysis Section */}
            <div className="border-t border-gray-800 pt-8" id="single-user-analysis">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Search Column */}
                    <div className="lg:col-span-1 border-r border-gray-800 pr-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <FaUser className="text-cyan-400" /> Single User Analysis
                        </h3>
                        <div className="relative mb-4">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search Employee..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#1a1f24] text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:border-cyan-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {searchResults.map(emp => (
                                <div
                                    key={emp._id || emp.employeeId}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${selectedEmployee?._id === emp._id ? 'bg-cyan-500/10 border border-cyan-500/50' : 'bg-[#1a1f24] border border-transparent hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                        {emp.employeeImage ? <img src={emp.employeeImage} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-gray-400">{emp.employeeName?.[0]}</span>}
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${selectedEmployee?._id === emp._id ? 'text-cyan-400' : 'text-gray-300'}`}>{emp.employeeName}</p>
                                        <p className="text-[10px] text-gray-500">{emp.employeeId}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats Column */}
                    <div className="lg:col-span-3">
                        {!employeeStats ? (
                            <div className="h-full flex items-center justify-center text-gray-500 italic">
                                Select an employee to view detailed performance metrics.
                            </div>
                        ) : (
                            <div className="animate-fadeIn">
                                {/* Profile Header */}
                                <div className="flex items-center gap-4 mb-6 bg-[#1a1f24] p-4 rounded-xl border border-gray-800">
                                    <div className="w-16 h-16 rounded-full border-2 border-cyan-500 p-1">
                                        <div className="w-full h-full rounded-full bg-gray-700 overflow-hidden">
                                            {employeeStats.employee.image ? (
                                                <img src={employeeStats.employee.image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                                                    {employeeStats.employee.name?.[0]}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">{employeeStats.employee.name}</h3>
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> {employeeStats.employee.designation}</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> {employeeStats.employee.department}</span>
                                            <span className="flex items-center gap-1"><FaExclamationTriangle className="text-yellow-500" /> {employeeStats.employee.centre}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Pie Chart */}
                                    <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 h-[250px] flex items-center">
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
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {['#06b6d4', '#ef4444', '#f59e0b', '#a855f7'].map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                                                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-col gap-2 justify-center mr-4">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-white">{employeeStats.stats.totalDays}</p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Days</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-2xl font-bold text-cyan-400">
                                                    {((employeeStats.stats.present / (employeeStats.stats.totalDays || 1)) * 100).toFixed(0)}%
                                                </p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Attendance</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-xl">
                                            <p className="text-green-400 text-xs font-bold uppercase mb-1">On Time</p>
                                            <p className="text-2xl font-bold text-white">{employeeStats.stats.present - employeeStats.stats.late}</p>
                                        </div>
                                        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-xl">
                                            <p className="text-yellow-400 text-xs font-bold uppercase mb-1">Late Arrivals</p>
                                            <p className="text-2xl font-bold text-white">{employeeStats.stats.late}</p>
                                        </div>
                                        <div className="p-4 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl">
                                            <p className="text-red-400 text-xs font-bold uppercase mb-1">Absences</p>
                                            <p className="text-2xl font-bold text-white">{employeeStats.stats.absent}</p>
                                        </div>
                                        <div className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-xl">
                                            <p className="text-purple-400 text-xs font-bold uppercase mb-1">Half Days</p>
                                            <p className="text-2xl font-bold text-white">{employeeStats.stats.halfDay}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Timeline Trend Chart */}
                                {employeeStats.timeline && employeeStats.timeline.length > 0 && (
                                    <div className="mt-6 bg-[#1a1f24] p-4 rounded-xl border border-gray-800 h-[200px]">
                                        <p className="text-gray-400 text-xs font-bold uppercase mb-4">Attendance Consistency Trend</p>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={employeeStats.timeline.map(t => ({
                                                date: t.date,
                                                score: t.status === 'Present' ? 100 : (t.status === 'Late' ? 75 : (t.status === 'Half Day' ? 50 : 0)),
                                                status: t.status
                                            }))}>
                                                <defs>
                                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                                                <XAxis dataKey="date" hide />
                                                <Tooltip
                                                    cursor={{ stroke: '#06b6d4', strokeWidth: 1 }}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-[#1f2937] border border-gray-700 p-2 rounded shadow-lg">
                                                                    <p className="text-gray-400 text-[10px]">{data.date}</p>
                                                                    <p className={`text-sm font-bold ${data.status === 'Present' ? 'text-cyan-400' : (data.status === 'Absent' ? 'text-red-400' : 'text-yellow-400')}`}>
                                                                        {data.status}
                                                                    </p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="score" stroke="#06b6d4" fill="url(#colorScore)" strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeAttendanceAnalytics;
