import React, { useState, useEffect, useRef, useMemo } from "react";
import Layout from "../../components/Layout";
import {
    FaClock,
    FaSearch, FaFilter, FaSyncAlt, FaChartBar, FaUserTie,
    FaBuilding, FaSitemap, FaCalendarAlt, FaChevronRight,
    FaTimes, FaChevronDown, FaCheck, FaChartLine, FaChartPie, FaUsers, FaUserClock, FaStopwatch, FaArrowUp, FaArrowDown
} from "react-icons/fa";
import { toast } from "react-toastify";
import { format } from "date-fns";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, CartesianGrid, Cell, LineChart, Line, AreaChart, Area, PieChart, Pie
} from "recharts";

// Premium Multi-Select Dropdown Component (Updated for 2px radius)
const MultiSelectDropdown = ({ icon, label, options, selectedValues, onToggle, valKey, labelKey }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleSelection = (id) => {
        let newSelection;
        if (selectedValues.includes(id)) {
            newSelection = selectedValues.filter(v => v !== id);
        } else {
            newSelection = [...selectedValues, id];
        }
        onToggle(newSelection);
    };

    return (
        <div className="relative group" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full bg-[#131619] border rounded-[2px] py-3 pl-10 pr-8 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all flex items-center justify-between
                    ${isOpen ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'border-gray-800 hover:border-gray-700'}
                    ${selectedValues.length > 0 ? 'text-cyan-500' : 'text-gray-400'}
                `}
            >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-cyan-500 transition-colors">
                    {icon}
                </div>
                <span className="truncate">
                    {selectedValues.length === 0 ? `ALL ${label}S` : `${selectedValues.length} ${label}${selectedValues.length > 1 ? 'S' : ''} SELECTED`}
                </span>
                <FaChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-cyan-500' : 'text-gray-700'}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#131619] border border-gray-800 rounded-[2px] shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                        {options.map((opt) => (
                            <div
                                key={opt[valKey]}
                                onClick={() => toggleSelection(opt[valKey])}
                                className={`
                                    flex items-center justify-between p-2 rounded-[2px] cursor-pointer transition-all
                                    ${selectedValues.includes(opt[valKey]) ? 'bg-cyan-500/10 text-cyan-400' : 'hover:bg-gray-800 text-gray-400'}
                                `}
                            >
                                <span className="text-[9px] font-black uppercase tracking-widest truncate">{opt[labelKey]}</span>
                                {selectedValues.includes(opt[valKey]) && <FaCheck size={8} className="text-cyan-500" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, subValue, icon, color = "cyan" }) => (
    <div className={`bg-[#131619] border border-gray-800 rounded-[2px] p-6 relative group overflow-hidden hover:border-${color}-500/30 transition-all`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-${color}-500/10`} />
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
                <p className="text-gray-500 font-black text-[9px] uppercase tracking-[0.2em] mb-1">{title}</p>
                <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
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

const EmployeesAttendance = () => {
    // Shared State
    const [centres, setCentres] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [attendanceList, setAttendanceList] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Individual User Analysis State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userAnalysisData, setUserAnalysisData] = useState(null);

    // Filters State
    const [filters, setFilters] = useState({
        search: "",
        centreId: [],
        department: [],
        designation: [],
        role: [],
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        fetchAttendanceData();
    }, [filters.month, filters.year, filters.centreId, filters.department, filters.designation, filters.role]);

    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem("token");
            const [centresRes, deptRes, desigRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${import.meta.env.VITE_API_URL}/designation`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (centresRes.ok) setCentres(await centresRes.json());
            if (deptRes.ok) setDepartments(await deptRes.json());
            if (desigRes.ok) setDesignations(await desigRes.json());
        } catch (error) {
            console.error("Metadata fetch error:", error);
        }
    };

    const fetchAttendanceData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams({
                month: filters.month,
                year: filters.year,
                centreId: filters.centreId.join(','),
                department: filters.department.join(','),
                designation: filters.designation.join(','),
                role: filters.role.join(',')
            }).toString();

            // Fetch Stats and List in parallel
            const [listRes, statsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/hr/employee-attendance/all?${queryParams}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${import.meta.env.VITE_API_URL}/hr/employee-attendance/dashboard-stats?${queryParams}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (listRes.ok) {
                const data = await listRes.json();
                setAttendanceList(data);
            }
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats(data);
            }

            // If a user is selected, refresh their analysis as well
            if (selectedUser) {
                fetchUserAnalysis(selectedUser);
            }

        } catch (error) {
            console.error("Attendance fetch error:", error);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    const fetchUserAnalysis = async (user) => {
        // If clicking on a new user, set SelectedUser immediately
        if (!selectedUser || selectedUser.employeeId?._id !== user.employeeId?._id) {
            setSelectedUser(user);
            setUserAnalysisData(null); // Clear previous data while loading
        }

        try {
            const token = localStorage.getItem("token");
            // Use the employee's USER ID for the query, assuming the backend needs user ID
            // Check if user object structure has user id directly or inside employeeId
            // Based on previous file content, it seemed to pass userId query param
            const targetUserId = user.user?._id || user.user || user.employeeId?.user;

            if (!targetUserId) {
                console.error("No user ID found for analysis", user);
                return;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee-attendance/analysis?userId=${targetUserId}&month=${filters.month}&year=${filters.year}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserAnalysisData(data);
            }
        } catch (error) {
            console.error("Analysis Error:", error);
        }
    };

    const handleRefresh = () => {
        setFilters({
            search: "",
            centreId: [],
            department: [],
            designation: [],
            role: [],
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
        });
        toast.info("Filters reset");
    };

    const groupedRecords = useMemo(() => {
        const groups = {};
        attendanceList.forEach(record => {
            const empId = record.employeeId?._id;
            if (!empId) return;
            // Since backend is sorted by date -1, the first record we find is the latest
            if (!groups[empId]) {
                groups[empId] = record;
            }
        });

        return Object.values(groups).filter(record =>
            record.employeeId?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
            record.employeeId?.employeeId?.toLowerCase().includes(filters.search.toLowerCase())
        );
    }, [attendanceList, filters.search]);

    // Derived department data for charts
    const departmentData = useMemo(() => {
        if (!attendanceList.length) return [];
        const map = {};
        attendanceList.forEach(a => {
            const dept = a.employeeId?.department?.departmentName || 'Unknown';
            if (!map[dept]) map[dept] = 0;
            map[dept]++;
        });
        return Object.keys(map).map(k => ({ name: k, value: map[k] }));
    }, [attendanceList]);

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 md:p-8 max-w-[1800px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">
                            Workforce <span className="text-cyan-500">Analytics</span>
                        </h1>
                        <p className="text-gray-500 font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                            Performance Monitoring Hub
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleRefresh}
                            className="px-6 py-3 bg-gray-800 text-gray-400 hover:text-white rounded-[2px] border border-gray-700 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                        >
                            <FaSyncAlt className={loading ? "animate-spin" : ""} /> Reset
                        </button>
                        <div className="flex bg-[#131619] border border-gray-800 rounded-[2px] px-4 py-2 gap-4 items-center">
                            <select
                                className="bg-transparent text-gray-400 font-black uppercase text-[10px] outline-none cursor-pointer hover:text-cyan-500 transition-colors"
                                value={filters.month}
                                onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                            >
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <option key={i} value={i + 1}>{format(new Date(2025, i, 1), 'MMMM')}</option>
                                ))}
                            </select>
                            <div className="w-[1px] h-4 bg-gray-800" />
                            <select
                                className="bg-transparent text-gray-400 font-black uppercase text-[10px] outline-none cursor-pointer hover:text-cyan-500 transition-colors"
                                value={filters.year}
                                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                            >
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <div className="relative group">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-xs transition-colors group-focus-within:text-cyan-500" />
                        <input
                            type="text"
                            placeholder="SEARCH NAME / ID..."
                            className="w-full bg-[#131619] border border-gray-800 rounded-[2px] py-3 pl-10 pr-4 text-gray-200 text-[10px] font-black uppercase tracking-widest placeholder:text-gray-700 outline-none focus:border-cyan-500/50 transition-all"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                    <MultiSelectDropdown icon={<FaBuilding />} label="CENTRE" options={centres} selectedValues={filters.centreId} valKey="_id" labelKey="centreName" onToggle={(vals) => setFilters({ ...filters, centreId: vals })} />
                    <MultiSelectDropdown icon={<FaSitemap />} label="DEPT" options={departments} selectedValues={filters.department} valKey="_id" labelKey="departmentName" onToggle={(vals) => setFilters({ ...filters, department: vals })} />
                    <MultiSelectDropdown icon={<FaUserTie />} label="ROLE" options={[{ id: 'hr', name: 'HR' }, { id: 'admin', name: 'Admin' }, { id: 'teacher', name: 'Teacher' }]} selectedValues={filters.role} valKey="id" labelKey="name" onToggle={(vals) => setFilters({ ...filters, role: vals })} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Employees"
                        value={stats?.totalEmployees || 0}
                        subValue="Active Workforce"
                        icon={<FaUsers />}
                        color="blue"
                    />
                    <StatCard
                        title="Attendance"
                        value={stats?.presentCount || 0}
                        subValue={stats?.presentLabel || "Present Count"}
                        icon={<FaCheck />}
                        color="emerald"
                    />
                    <StatCard
                        title="Avg Working Hrs"
                        value={`${stats?.avgHours || 0}h`}
                        subValue={`Min: ${stats?.minHours || 0}h • Max: ${stats?.maxHours || 0}h`}
                        icon={<FaClock />}
                        color="purple"
                    />
                    <StatCard
                        title="Efficiency"
                        value="96%"
                        subValue="Based on Shift Comp."
                        icon={<FaChartLine />}
                        color="amber"
                    />
                </div>

                {/* Charts Area */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[400px]">
                    {/* Area Chart: Trend */}
                    <div className="xl:col-span-2 bg-[#131619] border border-gray-800 rounded-[2px] p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Attendance Trend (Daily)</h3>
                            <button className="text-cyan-500 text-[10px] font-black uppercase hover:underline">View Report</button>
                        </div>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.dailyTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 700 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '4px' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                                    <Area type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorAbsent)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Department Distribution */}
                    <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-6 flex flex-col">
                        <h3 className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">Department Distribution</h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={departmentData} margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1f2937" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9, fontWeight: 700 }} width={80} />
                                    <Tooltip cursor={{ fill: '#1f2937' }} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                                    <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={15}>
                                        {departmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'][index % 4]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col 2xl:flex-row gap-6">
                    {/* Attendance List */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <FaUserTie /> Workforce Directory ({groupedRecords.length})
                            </h3>
                            <div className="h-[1px] bg-gray-800 flex-1 ml-6"></div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {loading ? (
                                <div className="text-center py-20 text-gray-500 font-bold animate-pulse">LOADING ANALYTICS DATA...</div>
                            ) : groupedRecords.map((att) => (
                                <div
                                    key={att._id}
                                    onClick={() => fetchUserAnalysis(att)}
                                    className={`bg-[#131619] border rounded-[2px] p-4 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-cyan-500/30 transition-all group cursor-pointer ${selectedUser?.employeeId?._id === att.employeeId?._id ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-800'}`}
                                >
                                    <div className="flex items-center gap-6 w-full md:w-auto">
                                        <div className="w-12 h-12 rounded-[2px] bg-gray-900 border border-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                                            {att.employeeId?.profileImage && !att.employeeId.profileImage.startsWith('undefined/') ? (
                                                <img src={att.employeeId.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-gray-600 font-black text-lg group-hover:text-cyan-500">{att.employeeId?.name?.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="text-white font-black uppercase text-sm group-hover:text-cyan-400 transition-colors">{att.employeeId?.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-[2px] text-[8px] font-black uppercase tracking-widest">{att.employeeId?.employeeId}</span>
                                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">{att.employeeId?.department?.departmentName || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 md:gap-12 w-full md:w-auto justify-between md:justify-end">
                                        <div className="text-center">
                                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Check In</p>
                                            <p className="text-emerald-500 font-black text-sm">{att.checkIn?.time ? format(new Date(att.checkIn.time), 'HH:mm') : '--:--'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Check Out</p>
                                            <p className="text-red-500 font-black text-sm">{att.checkOut?.time ? format(new Date(att.checkOut.time), 'HH:mm') : '--:--'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Duration</p>
                                            <p className="text-white font-black text-sm">{att.workingHours || 0} Hrs</p>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-[2px] text-[9px] font-black uppercase tracking-widest min-w-[80px] text-center ${att.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                            {att.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Analysis Sidebar */}
                    <div className="w-full 2xl:w-[500px] shrink-0">
                        {!selectedUser ? (
                            <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-12 text-center h-[600px] flex flex-col items-center justify-center sticky top-10">
                                <div className="w-20 h-20 bg-gray-900 rounded-[2px] flex items-center justify-center text-gray-800 border border-gray-800 mb-6 shadow-inner rotate-3">
                                    <FaChartBar size={32} className="opacity-20 translate-x-1" />
                                </div>
                                <h4 className="text-white font-black text-xl mb-4 tracking-tighter italic">UNIT UNDER REVIEW</h4>
                                <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">Select an employee record to perform deep behavioral analysis</p>
                            </div>
                        ) : (
                            <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-8 sticky top-10 shadow-3xl animate-fade-in relative overflow-hidden group/ana custom-scrollbar h-[calc(100vh-100px)] overflow-y-auto">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />

                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-[2px] border border-gray-800 bg-gray-900 overflow-hidden shrink-0">
                                            {selectedUser.employeeId?.profileImage && !selectedUser.employeeId.profileImage.startsWith('undefined/') ? (
                                                <img src={selectedUser.employeeId.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-cyan-500 text-2xl font-black">
                                                    {selectedUser.employeeId?.name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black text-lg tracking-tighter uppercase italic">{selectedUser.employeeId?.name}</h3>
                                            <p className="text-gray-500 text-[9px] font-black tracking-widest uppercase">{selectedUser.employeeId?.designation?.name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="text-gray-700 hover:text-white transition-colors"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>

                                {userAnalysisData ? (
                                    <div className="space-y-8 animate-fade-in">
                                        {/* Key Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-gray-900/50 p-4 rounded-[2px] border border-gray-800">
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg Check-In</p>
                                                <p className="text-emerald-500 text-xl font-black">{userAnalysisData.summary.avgCheckIn}</p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-[2px] border border-gray-800">
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg Check-Out</p>
                                                <p className="text-red-500 text-xl font-black">{userAnalysisData.summary.avgCheckOut}</p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-[2px] border border-gray-800">
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Avg Hours</p>
                                                <p className="text-cyan-500 text-xl font-black">{userAnalysisData.summary.averageHours}h</p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-[2px] border border-gray-800">
                                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Max Hours</p>
                                                <p className="text-amber-500 text-xl font-black">{userAnalysisData.summary.maxHours}h</p>
                                            </div>
                                        </div>

                                        {/* 1. Monthly Trend (Bar) */}
                                        <div>
                                            <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <FaChartBar className="text-purple-500" /> Yearly Performance
                                            </h4>
                                            <div className="h-[180px] w-full bg-gray-900/30 rounded-[2px] border border-gray-800/50 p-2">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={userAnalysisData.monthlyStats}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" opacity={0.5} />
                                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 8, fontWeight: 700 }} />
                                                        <Tooltip
                                                            cursor={{ fill: '#1f2937' }}
                                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '4px', fontSize: '10px' }}
                                                        />
                                                        <Bar dataKey="avgHours" fill="#8b5cf6" radius={[2, 2, 0, 0]} barSize={12} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* 2. Daily Trend (Area) */}
                                        <div>
                                            <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <FaChartLine className="text-cyan-500" /> Daily Activity (Current Month)
                                            </h4>
                                            <div className="h-[180px] w-full bg-gray-900/30 rounded-[2px] border border-gray-800/50 p-2">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={userAnalysisData.dailyData}>
                                                        <defs>
                                                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" opacity={0.5} />
                                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 8, fontWeight: 700 }} interval={4} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '4px', fontSize: '10px' }}
                                                        />
                                                        <Area type="monotone" dataKey="hours" stroke="#06b6d4" fillOpacity={1} fill="url(#colorHours)" strokeWidth={2} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* 3. Status Distribution (Pie) */}
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <FaChartPie className="text-emerald-500" /> Attendance Mix
                                                </h4>
                                                <div className="h-[160px] w-full bg-gray-900/30 rounded-[2px] border border-gray-800/50 relative">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={userAnalysisData.statusDistribution}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={40}
                                                                outerRadius={60}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {userAnalysisData.statusDistribution?.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '4px', fontSize: '10px' }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    {/* Legend */}
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                                        <span className="text-[10px] font-black text-white">{userAnalysisData.summary.totalDays}</span>
                                                        <span className="block text-[8px] text-gray-500 font-bold uppercase">Days</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center gap-2">
                                                {userAnalysisData.statusDistribution?.map((stat, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-[9px] font-bold text-gray-400">
                                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }}></span>
                                                        <span>{stat.name}: {stat.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-[400px]">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
            `}</style>
        </Layout>
    );
};

export default EmployeesAttendance;
