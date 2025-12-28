import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaSearch, FaFilter, FaSyncAlt, FaChartBar, FaUserTie,
    FaBuilding, FaSitemap, FaCalendarAlt, FaChevronRight, FaTimes
} from "react-icons/fa";
import { toast } from "react-toastify";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    Tooltip, CartesianGrid, Cell, LineChart, Line
} from "recharts";

const EmployeesAttendance = () => {
    // Shared State
    const [employees, setEmployees] = useState([]);
    const [centres, setCentres] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [attendanceList, setAttendanceList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters State
    const [filters, setFilters] = useState({
        search: "",
        centreId: "",
        department: "",
        designation: "",
        role: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    // Individual User Analysis State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userAnalysisData, setUserAnalysisData] = useState(null);

    useEffect(() => {
        fetchMetadata();
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
                centreId: filters.centreId,
                department: filters.department,
                designation: filters.designation,
                role: filters.role
            }).toString();

            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee-attendance/all?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAttendanceList(data);
            }
        } catch (error) {
            console.error("Attendance fetch error:", error);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    const fetchUserAnalysis = async (user) => {
        setSelectedUser(user);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employee-attendance/analysis?userId=${user.user._id}&month=${filters.month}&year=${filters.year}`, {
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
            centreId: "",
            department: "",
            designation: "",
            role: "",
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
        });
        toast.info("Filters reset");
    };

    const filteredRecords = attendanceList.filter(record =>
        record.employeeId?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        record.employeeId?.employeeId?.toLowerCase().includes(filters.search.toLowerCase())
    );

    return (
        <Layout activePage="HR & Manpower">
            <div className="p-6 md:p-10 max-w-[1800px] mx-auto">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">
                            Workforce <span className="text-cyan-500">Analytics</span>
                        </h1>
                        <p className="text-gray-500 font-bold text-xs md:text-sm uppercase tracking-[0.3em] flex items-center gap-2">
                            <FaSitemap className="text-cyan-500" /> Administrative attendance control and performance monitoring
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={handleRefresh}
                            className="p-4 bg-gray-800 text-gray-400 hover:text-white rounded-2xl border border-gray-700 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest"
                        >
                            <FaSyncAlt className={loading ? "animate-spin" : ""} /> Reset Filters
                        </button>
                        <div className="flex bg-[#131619] border border-gray-800 rounded-2xl px-4 py-2 gap-4 items-center">
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

                {/* Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-12">
                    <div className="relative group">
                        <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 transition-colors group-focus-within:text-cyan-500" />
                        <input
                            type="text"
                            placeholder="SEARCH NAME / ID..."
                            className="w-full bg-[#131619] border border-gray-800 rounded-2xl py-4 pl-14 pr-6 text-gray-200 text-[10px] font-black uppercase tracking-widest placeholder:text-gray-700 outline-none focus:border-cyan-500/50 transition-all shadow-inner"
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>

                    {[
                        { icon: <FaBuilding />, label: 'Centre', key: 'centreId', options: centres, valKey: '_id', labelKey: 'centreName' },
                        { icon: <FaSitemap />, label: 'Department', key: 'department', options: departments, valKey: '_id', labelKey: 'departmentName' },
                        { icon: <FaUserTie />, label: 'Designation', key: 'designation', options: designations, valKey: '_id', labelKey: 'designationName' },
                    ].map((filt, i) => (
                        <div key={i} className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors">
                                {filt.icon}
                            </div>
                            <select
                                className="w-full bg-[#131619] border border-gray-800 rounded-2xl py-4 pl-14 pr-6 text-gray-400 text-[10px] font-black uppercase tracking-widest outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                                value={filters[filt.key]}
                                onChange={(e) => setFilters({ ...filters, [filt.key]: e.target.value })}
                            >
                                <option value="">ALL {filt.label}S</option>
                                {filt.options?.map(opt => (
                                    <option key={opt[filt.valKey]} value={opt[filt.valKey]}>{opt[filt.labelKey]}</option>
                                ))}
                            </select>
                        </div>
                    ))}

                    <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-500 transition-colors">
                            <FaChartBar />
                        </div>
                        <select
                            className="w-full bg-[#131619] border border-gray-800 rounded-2xl py-4 pl-14 pr-6 text-gray-400 text-[10px] font-black uppercase tracking-widest outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                            value={filters.role}
                            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                        >
                            <option value="">ALL ROLES</option>
                            <option value="hr">HR</option>
                            <option value="admin">Admin</option>
                            <option value="teacher">Teacher</option>
                            <option value="employee">Employee</option>
                        </select>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-col 2xl:flex-row gap-10">
                    {/* Attendance List */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between mb-6 px-4">
                            <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.3em]">Recent Logs ({filteredRecords.length})</h3>
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-cyan-500"></div></div>
                        ) : filteredRecords.length === 0 ? (
                            <div className="bg-[#131619] border-2 border-dashed border-gray-800 rounded-[2rem] p-20 text-center">
                                <p className="text-gray-600 font-black uppercase tracking-widest">No matching logs found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                                {filteredRecords.map((att, i) => (
                                    <div
                                        key={att._id}
                                        onClick={() => fetchUserAnalysis(att)}
                                        className={`
                                            p-6 bg-[#131619] border border-gray-800 rounded-[2rem] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 hover:border-cyan-500/30 transition-all group cursor-pointer
                                            ${selectedUser?._id === att._id ? 'ring-2 ring-cyan-500 border-transparent shadow-2xl shadow-cyan-500/10' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-gray-900 rounded-2xl border border-gray-800 flex items-center justify-center text-gray-700 font-black group-hover:text-cyan-500 transition-colors">
                                                {att.employeeId?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-black uppercase tracking-tight group-hover:text-cyan-400 transition-colors">{att.employeeId?.name}</h4>
                                                <p className="text-gray-600 text-[10px] font-black tracking-widest uppercase">{att.employeeId?.employeeId} • {att.employeeId?.designation?.designationName}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-8">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1">Date</span>
                                                <span className="text-xs text-gray-300 font-bold">{format(new Date(att.date), 'dd MMM yyyy')}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1">Check In</span>
                                                <span className="text-xs text-emerald-400 font-black">{att.checkIn?.time ? format(new Date(att.checkIn.time), 'HH:mm') : '--:--'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1">Working Hours</span>
                                                <span className="text-xs text-cyan-400 font-black">{att.workingHours || 0} Hrs</span>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${att.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {att.status}
                                            </div>
                                            <FaChevronRight className="text-gray-800 group-hover:text-cyan-500 transition-colors ml-4 hidden xl:block" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Analysis Sidebar */}
                    <div className="w-full 2xl:w-[450px]">
                        {!selectedUser ? (
                            <div className="bg-[#131619] border border-gray-800 rounded-[2.5rem] p-12 text-center h-[600px] flex flex-col items-center justify-center sticky top-10">
                                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center text-gray-800 border border-gray-800 mb-6 shadow-inner">
                                    <FaChartBar size={32} className="opacity-20 translate-x-1" />
                                </div>
                                <h4 className="text-white font-black text-xl mb-4 tracking-tighter italic">UNIT UNDER REVIEW</h4>
                                <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">Select an employee record to perform deep behavioral analysis</p>
                            </div>
                        ) : (
                            <div className="bg-[#131619] border border-gray-800 rounded-[3rem] p-10 sticky top-10 shadow-3xl animate-fade-in relative overflow-hidden group/ana">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />

                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="absolute top-8 right-8 text-gray-700 hover:text-white transition-colors"
                                >
                                    <FaTimes />
                                </button>

                                <div className="text-center mb-10">
                                    <h3 className="text-white font-black text-2xl tracking-tighter uppercase italic mb-2">{selectedUser.employeeId?.name}</h3>
                                    <p className="text-cyan-500 text-[10px] font-black tracking-[0.3em] uppercase">{selectedUser.employeeId?.primaryCentre?.centreName}</p>
                                </div>

                                {userAnalysisData && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 mb-10">
                                            {[
                                                { label: 'Present Days', val: userAnalysisData.summary.presentDays, color: '#10b981' },
                                                { label: 'Avg Shift', val: `${userAnalysisData.summary.averageHours}h`, color: '#06b6d4' }
                                            ].map((stat, i) => (
                                                <div key={i} className="bg-black/20 p-6 rounded-3xl border border-gray-800/50">
                                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2">{stat.label}</p>
                                                    <p className="text-2xl font-black tracking-tighter" style={{ color: stat.color }}>{stat.val}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mb-10">
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Daily Performance Trend</p>
                                            <div className="h-[250px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={userAnalysisData.dailyData}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                                                        <XAxis dataKey="day" hide />
                                                        <YAxis hide domain={[0, 10]} />
                                                        <Tooltip
                                                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                                                            itemStyle={{ color: '#06b6d4', fontSize: '10px', fontWeight: 'bold' }}
                                                        />
                                                        <Bar dataKey="hours" radius={[10, 10, 0, 0]}>
                                                            {userAnalysisData.dailyData.map((entry, index) => (
                                                                <Cell key={index} fill={entry.hours > 8 ? '#06b6d4' : '#1e293b'} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="p-5 bg-cyan-500/5 rounded-[2rem] border border-cyan-500/10 flex items-center justify-between group-hover/ana:border-cyan-500/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <FaClock className="text-cyan-500" size={16} />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Efficiency Rate</span>
                                                </div>
                                                <span className="text-xs font-black text-cyan-500 italic">98.4%</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                .shadow-3xl { shadow-box: 0 40px 100px -20px rgba(0,0,0,0.8); }
            `}</style>
        </Layout>
    );
};

export default EmployeesAttendance;
