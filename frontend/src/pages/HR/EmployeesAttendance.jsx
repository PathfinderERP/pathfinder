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
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const LiveTimer = ({ checkIn, checkOut }) => {
    const [duration, setDuration] = useState("0h 0m");

    useEffect(() => {
        if (!checkIn) return;

        const updateTimer = () => {
            const start = new Date(checkIn);
            const end = checkOut ? new Date(checkOut) : new Date(); // Use current time if active
            const diff = Math.max(0, end - start);

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            // Format to be exactly like "3.5 hrs" or "3h 30m"
            // User requested "minutes and hour".
            setDuration(`${hours}h ${minutes}m`);
        };

        updateTimer();
        // Update every minute if active
        if (!checkOut) {
            const interval = setInterval(updateTimer, 60000);
            return () => clearInterval(interval);
        }
    }, [checkIn, checkOut]);

    return <span className="text-white font-black text-sm">{duration}</span>;
};

const PresentModal = ({ isOpen, onClose, employees }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#131619] border border-gray-800 rounded-[2px] w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-[#131619] z-10">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Today's Attendance</h2>
                        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">{employees.length} Active Personnel</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-[2px] text-gray-500 hover:text-white transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map((att) => (
                        <div key={att._id} className="bg-gray-900/50 border border-gray-800 p-4 rounded-[2px] flex items-center gap-4 hover:border-emerald-500/30 transition-all">
                            <div className="w-12 h-12 rounded-[2px] bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-700">
                                {att.employeeId?.profileImage ? (
                                    <img
                                        src={att.employeeId.profileImage}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'block';
                                        }}
                                    />
                                ) : null}
                                <span className={`text-emerald-500 font-black text-lg ${att.employeeId?.profileImage ? 'hidden' : 'block'}`}>
                                    {att.employeeId?.name?.charAt(0)}
                                </span>
                            </div>
                            <div>
                                <h4 className="text-white font-black text-xs uppercase tracking-wide">{att.employeeId?.name}</h4>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">{att.employeeId?.department?.departmentName}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-[2px]">
                                        IN: {format(new Date(att.checkIn.time), 'HH:mm')}
                                    </span>
                                    {!att.checkOut && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online"></span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {employees.length === 0 && (
                        <div className="col-span-full py-10 text-center text-gray-600 font-black uppercase tracking-widest">
                            No active attendance records found for today.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

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
    const [showPresentModal, setShowPresentModal] = useState(false);

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

    const fetchAttendanceData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
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
            if (!isBackground) toast.error("Failed to load attendance records");
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    // Poll for updates every 30 seconds to show live checking-in increases
    useEffect(() => {
        const interval = setInterval(() => {
            fetchAttendanceData(true);
        }, 30000);
        return () => clearInterval(interval);
    }, [filters]);

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

    // Present Today Data
    const presentTodayList = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return attendanceList.filter(a => format(new Date(a.date), 'yyyy-MM-dd') === todayStr);
    }, [attendanceList]);

    // Derived department data for charts (Based on Today's Present)
    const departmentData = useMemo(() => {
        if (!presentTodayList.length) return [];
        const map = {};
        presentTodayList.forEach(a => {
            const dept = a.employeeId?.department?.departmentName || 'Unknown';
            if (!map[dept]) map[dept] = 0;
            map[dept]++;
        });
        return Object.keys(map).map(k => ({ name: k, value: map[k] }));
    }, [presentTodayList]);

    // Live update for User Analysis Chart (Daily Activity)
    useEffect(() => {
        if (!selectedUser || !userAnalysisData?.summary?.todayRecord?.checkIn || userAnalysisData.summary.todayRecord.checkOut) return;

        const updateChart = () => {
            const checkInTime = new Date(userAnalysisData.summary.todayRecord.checkIn).getTime();
            const now = Date.now();
            const currentDurationHours = Math.max(0, (now - checkInTime) / (1000 * 60 * 60)); // hours

            setUserAnalysisData(prev => {
                if (!prev) return prev;
                const newDailyData = [...prev.dailyData];
                const todayDay = new Date().getDate();
                const todayIndex = newDailyData.findIndex(d => d.day === todayDay);

                if (todayIndex >= 0) {
                    newDailyData[todayIndex] = { ...newDailyData[todayIndex], hours: parseFloat(currentDurationHours.toFixed(2)) };
                } else {
                    newDailyData.push({ day: todayDay, hours: parseFloat(currentDurationHours.toFixed(2)) });
                }

                // Sort by day just in case
                newDailyData.sort((a, b) => a.day - b.day);

                return {
                    ...prev,
                    dailyData: newDailyData
                };
            });
        };

        const interval = setInterval(updateChart, 60000); // Update every minute
        updateChart(); // Initial run

        return () => clearInterval(interval);
    }, [selectedUser, userAnalysisData?.summary?.todayRecord?.checkIn, userAnalysisData?.summary?.todayRecord?.checkOut]);

    const handleExport = () => {
        const dataToExport = attendanceList.map(att => ({
            "Employee ID": att.employeeId?.employeeId,
            "Name": att.employeeId?.name,
            "Department": att.employeeId?.department?.departmentName || '-',
            "Designation": att.employeeId?.designation?.name || '-',
            "Date": format(new Date(att.date), 'dd-MM-yyyy'),
            "Check In": att.checkIn?.time ? format(new Date(att.checkIn.time), 'HH:mm:ss') : '-',
            "Check Out": att.checkOut?.time ? format(new Date(att.checkOut.time), 'HH:mm:ss') : '-',
            "Duration (Hrs)": att.workingHours || 0,
            "Status": att.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Workforce_Attendance_${format(new Date(), 'yyyyMMdd')}.xlsx`);
        toast.success("Attendance Report Exported!");
    };

    return (
        <Layout activePage="HR & Manpower">
            <PresentModal isOpen={showPresentModal} onClose={() => setShowPresentModal(false)} employees={presentTodayList} />
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
                            onClick={handleExport}
                            className="px-6 py-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-[2px] border border-emerald-500/20 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        >
                            <FaChartBar /> Export Excel
                        </button>
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
                    <div onClick={() => setShowPresentModal(true)} className="cursor-pointer transition-transform hover:scale-[1.02]">
                        <StatCard
                            title="Attendance"
                            value={presentTodayList.length} // Real-time today count derived from list
                            subValue="Click to View Present"
                            icon={<FaCheck />}
                            color="emerald"
                        />
                    </div>
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
                                            {att.employeeId?.profileImage ? (
                                                <img
                                                    src={att.employeeId.profileImage}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'block';
                                                    }}
                                                />
                                            ) : null}
                                            <span
                                                className={`text-gray-600 font-black text-lg group-hover:text-cyan-500 ${att.employeeId?.profileImage ? 'hidden' : 'block'}`}
                                            >
                                                {att.employeeId?.name?.charAt(0)}
                                            </span>
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
                                            <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Live Duration</p>
                                            <LiveTimer checkIn={att.checkIn?.time} checkOut={att.checkOut?.time} />
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

                                <div className="flex justify-end items-start absolute top-8 right-8 z-10">
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="text-gray-700 hover:text-white transition-colors"
                                    >
                                        <FaTimes />
                                    </button>
                                </div>

                                {/* Analysis Header */}
                                <div className="text-center mb-10 pt-4">
                                    <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-cyan-500/20 bg-gray-900 overflow-hidden shadow-2xl shadow-cyan-500/20 group-hover/ana:border-cyan-500/50 transition-all duration-500">
                                        {selectedUser.employeeId?.profileImage && !selectedUser.employeeId.profileImage.startsWith('undefined/') ? (
                                            <img src={selectedUser.employeeId.profileImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-cyan-500 text-4xl font-black">
                                                {selectedUser.employeeId?.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="text-white font-black text-2xl tracking-tighter uppercase italic mb-1">{selectedUser.employeeId?.name}</h3>
                                    <p className="text-cyan-500 text-[10px] font-black tracking-[0.3em] uppercase mb-4">{selectedUser.employeeId?.primaryCentre?.centreName}</p>

                                    <div className="flex flex-wrap justify-center gap-2">
                                        <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-[8px] font-black uppercase tracking-widest">{selectedUser.employeeId?.employeeId}</span>
                                        <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-[8px] font-black uppercase tracking-widest">{selectedUser.employeeId?.department?.departmentName}</span>
                                        <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-[8px] font-black uppercase tracking-widest">{selectedUser.employeeId?.designation?.name}</span>
                                    </div>
                                </div>


                                {userAnalysisData ? (
                                    <>
                                        {/* Today's Live Status Card - New Addition */}
                                        <div className="mb-8 relative overflow-hidden rounded-[2px] p-[1px] bg-gradient-to-r from-cyan-500 to-purple-600">
                                            <div className="bg-[#111827] relative p-6 rounded-[1px]">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="text-white font-black text-sm uppercase tracking-widest italic">Today's Activity</h4>
                                                        <p className="text-cyan-500 text-[9px] font-black uppercase tracking-[0.2em]">{format(new Date(), 'dd MMMM yyyy')}</p>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-[2px] text-[8px] font-black uppercase tracking-widest ${userAnalysisData.summary.todayRecord ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-gray-800 text-gray-500'}`}>
                                                        {userAnalysisData.summary.todayRecord?.status || 'NOT CHECKED IN'}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Check In</p>
                                                        <p className="text-white font-black text-lg">
                                                            {userAnalysisData.summary.todayRecord?.checkIn ? format(new Date(userAnalysisData.summary.todayRecord.checkIn), 'HH:mm') : '--:--'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] text-gray-600 uppercase font-black tracking-widest mb-1">Check Out</p>
                                                        <p className="text-white font-black text-lg">
                                                            {userAnalysisData.summary.todayRecord?.checkOut ? format(new Date(userAnalysisData.summary.todayRecord.checkOut), 'HH:mm') : '--:--'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {userAnalysisData.summary.todayRecord?.checkIn && !userAnalysisData.summary.todayRecord?.checkOut && (
                                                    <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Currently Working</span>
                                                        </div>
                                                        <LiveTimer checkIn={userAnalysisData.summary.todayRecord.checkIn} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Historical Averages Grid */}
                                        <div className="grid grid-cols-2 gap-3 mb-8">
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

                                        {/* Charts Section */}

                                        {/* 1. Monthly Trend (Bar) */}
                                        <div className="mb-8">
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
                                        <div className="mb-8">
                                            <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <FaChartLine className="text-cyan-500" /> Daily Activity ({format(new Date(filters.year, filters.month - 1), 'MMMM')})
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
                                                            labelFormatter={(label) => `Day ${label}`}
                                                            formatter={(value) => [`${value} Hrs`, "Working Duration"]}
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
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-[400px]">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-cyan-500"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div >




            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
            `}</style>
        </Layout >
    );
};

export default EmployeesAttendance;
