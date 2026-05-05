import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaSearch, FaFilter, FaDownload, FaSyncAlt, FaCalendarAlt,
    FaUser, FaExclamationCircle, FaCheckCircle, FaClock,
    FaPhone, FaEnvelope, FaMapMarkerAlt, FaFileInvoice, FaMoneyBillWave, FaArrowRight, FaTimes, FaCoins
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";

const FeeDueList = () => {
    const { isDarkMode } = useTheme();
    const [dueList, setDueList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ critical: 0, overdue: 0, dueToday: 0 });

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    // Filters
    const [filters, setFilters] = useState({
        centre: "",
        course: "",
        department: "",
        startDate: "",
        endDate: "",
        minAmount: "",
        maxAmount: "",
        searchTerm: ""
    });

    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Details Popup
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [financialData, setFinancialData] = useState(null);

    useEffect(() => {
        fetchMasterData();
        fetchDueList();
    }, []);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centreRes, courseRes, deptRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre/list`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers })
            ]);

            if (centreRes.ok) {
                const data = await centreRes.json();
                const filteredCentres = Array.isArray(data)
                    ? data.filter(c =>
                        user.role === 'superAdmin' ||
                        (user.centres && user.centres.some(uc => uc._id === c._id || uc.centreName === c.centreName))
                    )
                    : [];
                const sortedCentres = filteredCentres.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setCentres(sortedCentres);
            }
            if (courseRes.ok) {
                const data = await courseRes.json();
                setCourses(data || []);
            }
            if (deptRes.ok) {
                const data = await deptRes.json();
                const visibleDepts = Array.isArray(data) ? data.filter(dept => dept.showInAdmission !== false) : [];
                setDepartments(visibleDepts);
            }
        } catch (error) {
            console.error("Error fetching master data:", error);
        }
    };

    const fetchDueList = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();
            if (filters.centre) queryParams.append("centre", filters.centre);
            if (filters.course) queryParams.append("course", filters.course);
            if (filters.department) queryParams.append("department", filters.department);
            if (filters.startDate) queryParams.append("startDate", filters.startDate);
            if (filters.endDate) queryParams.append("endDate", filters.endDate);
            if (filters.minAmount) queryParams.append("minAmount", filters.minAmount);
            if (filters.maxAmount) queryParams.append("maxAmount", filters.maxAmount);
            if (filters.searchTerm) queryParams.append("searchTerm", filters.searchTerm);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/get-due-list?${queryParams.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const result = await response.json();
                setDueList(result.data || []);
                setStats(result.stats || { critical: 0, overdue: 0, dueToday: 0 });
            } else {
                toast.error("Failed to load due list");
            }
        } catch (error) {
            console.error("Error fetching due list:", error);
            toast.error("Error loading data");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setFilters({
            centre: "",
            course: "",
            department: "",
            startDate: "",
            endDate: "",
            minAmount: "",
            maxAmount: "",
            searchTerm: ""
        });
        fetchDueList();
        toast.info("Filters reset to default view");
    };

    const handleSelectStudent = async (studentId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/student/${studentId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setFinancialData(data);
                setSelectedStudent(data.studentInfo);
            } else {
                toast.error("Failed to load financial details");
            }
        } catch (error) {
            console.error("Error loading details:", error);
            toast.error("Network error during student lookup");
        }
    };

    const handleExport = () => {
        if (dueList.length === 0) {
            toast.info("No data available for export");
            return;
        }

        const headers = ["Admission No", "Student Name", "Course", "Department", "Centre", "Amount Due", "Due Date", "Days Overdue", "Months Overdue", "Status"];
        const rows = dueList.map(item => [
            item.admissionNumber,
            item.studentName,
            item.course,
            item.department,
            item.centre,
            item.amount,
            new Date(item.dueDate).toLocaleDateString('en-IN'),
            item.daysOverdue,
            item.monthsOverdue,
            item.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Fee_Due_Archive_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Outstanding ledger exported successfully");
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
            case "COMPLETED":
                return <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-2 shadow-sm shadow-emerald-500/10 tracking-widest transition-all"><FaCheckCircle size={10} /> {status}</span>;
            case "CRITICAL":
                return <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-2 shadow-sm shadow-red-500/10 tracking-widest animate-pulse transition-all"><FaExclamationCircle size={10} /> {status}</span>;
            case "OVERDUE":
                return <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-orange-500 bg-orange-500/10 border-orange-500/20 inline-flex items-center gap-2 shadow-sm shadow-orange-500/10 tracking-widest transition-all"><FaExclamationCircle size={10} /> {status}</span>;
            case "DUE TODAY":
                return <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-amber-500 bg-amber-500/10 border-amber-500/20 inline-flex items-center gap-2 shadow-sm shadow-amber-500/10 tracking-widest transition-all"><FaClock size={10} /> {status}</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-amber-500 bg-amber-500/10 border-amber-500/20 inline-flex items-center gap-2 shadow-sm shadow-amber-500/10 tracking-widest transition-all"><FaClock size={10} /> IN PROCESS</span>;
            case "REJECTED":
                return <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-2 shadow-sm shadow-red-500/10 tracking-widest transition-all"><FaExclamationCircle size={10} /> REJECTED</span>;
            case "PENDING":
                return <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-gray-400 bg-gray-500/10 border-gray-500/20 inline-flex items-center gap-2 shadow-sm shadow-gray-500/10 tracking-widest transition-all"><FaClock size={10} /> {status}</span>;
            default:
                return <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20 transition-all">{status}</span>;
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 mb-12">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className="p-3 bg-orange-500/10 rounded-2xl text-orange-500 border border-orange-500/20 shadow-inner">
                                <FaFileInvoice size={28} />
                            </span>
                            Outstanding <span className="text-orange-500">Ledgers</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">Real-time mapping & audit of due instructional capital</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleRefresh}
                            className={`px-8 py-3.5 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all flex items-center gap-3 active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 border border-gray-800 hover:text-white hover:bg-white/10' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-sm'}`}
                        >
                            <FaSyncAlt size={12} /> SYNC_MAP
                        </button>
                        <button
                            onClick={handleExport}
                            className="px-8 py-3.5 bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-orange-500 transition-all flex items-center gap-3 active:scale-95 shadow-xl shadow-orange-600/20"
                        >
                            <FaDownload size={12} /> EXPORT ARCHIVE
                        </button>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className={`border p-8 rounded-[2rem] relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-red-500/20 shadow-2xl shadow-red-500/[0.02]' : 'bg-red-50 border-red-100 shadow-sm'}`}>
                        <FaExclamationCircle className={`absolute -right-4 -bottom-4 text-9xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 ${isDarkMode ? 'text-red-500/10' : 'text-red-500/[0.03]'}`} />
                        <div className="relative z-10">
                            <div className="text-red-500 text-[10px] font-black uppercase tracking-[0.25em] mb-4 italic">Critical Risk (7+ Days Overdue)</div>
                            <div className={`text-6xl font-black italic tracking-tighter tabular-nums leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.critical}</div>
                        </div>
                    </div>
                    <div className={`border p-8 rounded-[2rem] relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-orange-500/20 shadow-2xl shadow-orange-500/[0.02]' : 'bg-orange-50 border-orange-100 shadow-sm'}`}>
                        <FaClock className={`absolute -right-4 -bottom-4 text-9xl group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700 ${isDarkMode ? 'text-orange-500/10' : 'text-orange-500/[0.03]'}`} />
                        <div className="relative z-10">
                            <div className="text-orange-500 text-[10px] font-black uppercase tracking-[0.25em] mb-4 italic">Overdue (1-7 Days Threshold)</div>
                            <div className={`text-6xl font-black italic tracking-tighter tabular-nums leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.overdue}</div>
                        </div>
                    </div>
                    <div className={`border p-8 rounded-[2rem] relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-amber-500/20 shadow-2xl shadow-amber-500/[0.02]' : 'bg-amber-50 border-amber-100 shadow-sm'}`}>
                        <FaCalendarAlt className={`absolute -right-4 -bottom-4 text-9xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 ${isDarkMode ? 'text-amber-500/10' : 'text-amber-500/[0.03]'}`} />
                        <div className="relative z-10">
                            <div className="text-amber-500 text-[10px] font-black uppercase tracking-[0.25em] mb-4 italic">Current Maturity (Due Today)</div>
                            <div className={`text-6xl font-black italic tracking-tighter tabular-nums leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stats.dueToday}</div>
                        </div>
                    </div>
                </div>

                {/* Filtering Interface */}
                <div className={`border rounded-[2.5rem] p-10 mb-12 shadow-[0_30px_60px_rgba(0,0,0,0.3)] transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                        <div className="lg:col-span-2 relative group">
                            <FaSearch className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-700 group-focus-within:text-orange-500' : 'text-gray-400 group-focus-within:text-orange-600'}`} />
                            <input
                                type="text"
                                placeholder="TRACE BY IDENTITY OR ENROLLMENT..."
                                value={filters.searchTerm}
                                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                onKeyPress={(e) => e.key === "Enter" && fetchDueList()}
                                className={`w-full border rounded-2xl py-4 pl-16 pr-6 font-black text-[10px] uppercase tracking-[0.2em] outline-none transition-all duration-300 ${isDarkMode ? 'bg-black/20 border-gray-800 text-white placeholder:text-gray-800 focus:border-orange-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-500 shadow-inner'}`}
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={filters.centre}
                                onChange={(e) => setFilters({ ...filters, centre: e.target.value })}
                                className={`w-full border rounded-2xl py-4 px-6 font-black text-[10px] uppercase tracking-widest outline-none transition-all duration-300 appearance-none ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-300 focus:border-orange-500/50' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-orange-500 shadow-sm'}`}
                            >
                                <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>PARAM: CENTRE_NODE</option>
                                {centres.map((c, i) => (
                                    <option key={i} value={c.centreName} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{c.centreName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <select
                                value={filters.course}
                                onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                                className={`w-full border rounded-2xl py-4 px-6 font-black text-[10px] uppercase tracking-widest outline-none transition-all duration-300 appearance-none ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-300 focus:border-orange-500/50' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-orange-500 shadow-sm'}`}
                            >
                                <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>PARAM: COURSE_STREAM</option>
                                {courses.map((c, i) => (
                                    <option key={i} value={c._id} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{c.courseName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <select
                                value={filters.department}
                                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                                className={`w-full border rounded-2xl py-4 px-6 font-black text-[10px] uppercase tracking-widest outline-none transition-all duration-300 appearance-none ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-300 focus:border-orange-500/50' : 'bg-gray-50 border-gray-200 text-gray-800 focus:border-orange-500 shadow-sm'}`}
                            >
                                <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>PARAM: SECTOR</option>
                                {departments.map((d, i) => (
                                    <option key={i} value={d._id} className={isDarkMode ? 'bg-[#1a1f24]' : ''}>{d.departmentName}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchDueList}
                            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black uppercase text-[10px] tracking-[0.2em] py-4 rounded-2xl transition-all shadow-xl shadow-orange-600/20 active:scale-95 flex items-center justify-center gap-3"
                        >
                            <FaFilter size={10} /> EXECUTE_SCAN
                        </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-10 pt-10 border-t border-gray-800/10">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col gap-3">
                                <span className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] ml-2 italic">Horizon Start:</span>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    className={`w-full border rounded-2xl py-4 px-6 font-black text-[11px] uppercase outline-none transition-all duration-300 [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-orange-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-500 shadow-inner'}`}
                                />
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] ml-2 italic">Horizon End:</span>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    className={`w-full border rounded-2xl py-4 px-6 font-black text-[11px] uppercase outline-none transition-all duration-300 [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-orange-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-orange-500 shadow-inner'}`}
                                />
                            </div>
                        </div>
                        <div className={`grid grid-cols-2 gap-6 p-6 rounded-3xl border transition-all duration-500 ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                            <div className="flex flex-col gap-3">
                                <span className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] ml-2 italic">Asset Floor:</span>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-500 font-black italic">₹</span>
                                    <input
                                        type="number"
                                        placeholder="MIN VAL"
                                        value={filters.minAmount}
                                        onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                        className={`w-full border rounded-2xl py-4 pl-12 pr-6 font-black text-[11px] outline-none transition-all duration-300 tabular-nums ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-orange-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-orange-500 shadow-sm'}`}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] ml-2 italic">Asset Ceiling:</span>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-orange-500 font-black italic">₹</span>
                                    <input
                                        type="number"
                                        placeholder="MAX VAL"
                                        value={filters.maxAmount}
                                        onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                        className={`w-full border rounded-2xl py-4 pl-12 pr-6 font-black text-[11px] outline-none transition-all duration-300 tabular-nums ${isDarkMode ? 'bg-white/5 border-gray-800 text-white focus:border-orange-500/50' : 'bg-white border-gray-200 text-gray-900 focus:border-orange-500 shadow-sm'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ledger Matrix */}
                <div className={`rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left border-collapse min-w-[1600px]">
                            <thead>
                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <th className="p-8">Admission Seq</th>
                                    <th className="p-8">Authorized Personnel</th>
                                    <th className="p-8">Sector / Origin Node</th>
                                    <th className="p-8">Outstanding Value</th>
                                    <th className="p-8">Maturity Date</th>
                                    <th className="p-8">Overdue Duration</th>
                                    <th className="p-8">Audit State</th>
                                    <th className="p-8 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y transition-all duration-500 ${isDarkMode ? 'divide-gray-800/30' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="p-40 text-center">
                                            <div className="flex flex-col items-center gap-8">
                                                <div className="w-20 h-20 border-4 border-orange-500/10 border-t-orange-500 rounded-full animate-spin shadow-lg shadow-orange-500/20"></div>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] italic animate-pulse">Retrieving Outstanding Vectors...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : dueList.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-32 text-center text-gray-600 font-black uppercase tracking-[0.4em] text-xs italic">
                                            No matched outstanding ledgers in active sector
                                        </td>
                                    </tr>
                                ) : (
                                    dueList.map((item, index) => (
                                        <tr key={index} className={`transition-all duration-300 group ${isDarkMode ? 'hover:bg-orange-500/[0.03] bg-transparent' : 'hover:bg-orange-500/[0.02] bg-white'}`}>
                                            <td className="p-8">
                                                <span className="text-orange-500 font-black tracking-[0.2em] italic tabular-nums">#{item.admissionNumber}</span>
                                            </td>
                                            <td className="p-8">
                                                <div className={`font-black text-lg italic uppercase tracking-tighter transition-all duration-300 group-hover:translate-x-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.studentName}</div>
                                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-2 italic tabular-nums">{item.phoneNumber}</div>
                                            </td>
                                            <td className="p-8">
                                                <div className={`font-black text-[11px] uppercase tracking-tighter transition-colors duration-300 ${isDarkMode ? 'text-gray-300 group-hover:text-orange-400' : 'text-gray-700'}`}>{item.course}</div>
                                                <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1.5 opacity-60 italic">{item.department}</div>
                                                <div className="text-[9px] text-orange-500/70 font-black uppercase mt-2.5 tracking-[0.3em] border-l-2 border-orange-500/20 pl-3">{item.centre}</div>
                                            </td>
                                            <td className="p-8">
                                                <div className={`text-2xl font-black italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{item.amount.toLocaleString()}</div>
                                            </td>
                                            <td className="p-8">
                                                <div className={`font-black text-[11px] tabular-nums tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{new Date(item.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
                                                <div className="text-[9px] text-red-500/70 font-black uppercase mt-2 tracking-[0.2em] italic">Sequence # {item.installmentNumber}</div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex flex-col">
                                                    <span className={`text-xl font-black italic tracking-tighter tabular-nums ${item.daysOverdue >= 7 ? 'text-red-500' : 'text-orange-500'}`}>
                                                        {item.daysOverdue} DAYS
                                                    </span>
                                                    {item.monthsOverdue > 0 && (
                                                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1 italic border-t border-gray-800/20 pt-1 w-fit">
                                                            ({item.monthsOverdue} CYCLE{item.monthsOverdue > 1 ? 'S' : ''} OVER)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td className="p-8 text-right">
                                                <button
                                                    onClick={() => handleSelectStudent(item.studentId)}
                                                    className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-3 ml-auto"
                                                >
                                                    ANALYSIS <FaArrowRight size={10} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Analysis Matrix Modal */}
                {selectedStudent && financialData && (
                    <div className={`fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-md transition-all duration-500 animate-in fade-in duration-500 ${isDarkMode ? 'bg-black/90' : 'bg-gray-900/60'}`}>
                        <div className={`border w-full max-w-7xl max-h-[92vh] rounded-[3.5rem] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-500 shadow-[0_60px_120px_rgba(0,0,0,0.8)] ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100'}`}>
                            {/* Modal Header */}
                            <div className={`p-12 border-b flex items-start justify-between relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] pointer-events-none"></div>
                                <div className="flex items-center gap-8 relative z-10">
                                    <div className="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center text-white text-5xl font-black shadow-2xl shadow-orange-500/30 italic">
                                        {selectedStudent.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className={`text-5xl font-black italic uppercase tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedStudent.name}</h2>
                                        <div className="flex flex-wrap items-center gap-8 text-[10px] text-gray-500 font-black uppercase tracking-[0.25em] mt-4 italic">
                                            <span className="flex items-center gap-3"><FaEnvelope className="text-orange-500" /> {selectedStudent.email?.toLowerCase()}</span>
                                            <span className="flex items-center gap-3"><FaPhone className="text-orange-500" /> {selectedStudent.mobile}</span>
                                            <span className="flex items-center gap-3 px-4 py-1.5 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20">{selectedStudent.centre}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedStudent(null);
                                        setFinancialData(null);
                                    }}
                                    className={`p-5 rounded-3xl transition-all duration-300 active:scale-90 ${isDarkMode ? 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-400 hover:bg-red-500 hover:text-white shadow-sm'}`}
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            {/* Modal Matrix */}
                            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12">
                                {/* Summary Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                                    <div className={`rounded-[2.5rem] border p-10 shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 italic">Gross Asset Value</div>
                                        <div className={`text-4xl font-black italic tracking-tighter tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{financialData.summary.totalFeesAcrossAll.toLocaleString()}</div>
                                    </div>
                                    <div className={`rounded-[2.5rem] border p-10 shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/[0.02]' : 'bg-emerald-50 border-emerald-100 shadow-inner'}`}>
                                        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4 italic">Realized Capital</div>
                                        <div className="text-4xl font-black italic tracking-tighter tabular-nums text-emerald-500">₹{financialData.summary.totalPaidAcrossAll.toLocaleString()}</div>
                                    </div>
                                    <div className={`rounded-[2.5rem] border p-10 shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-orange-500/5 border-orange-500/20 shadow-orange-500/[0.02]' : 'bg-orange-50 border-orange-100 shadow-inner'}`}>
                                        <div className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-4 italic">Net Outstanding</div>
                                        <div className="text-4xl font-black italic tracking-tighter tabular-nums text-orange-500">₹{financialData.summary.totalRemainingAcrossAll.toLocaleString()}</div>
                                    </div>
                                    <div className={`rounded-[2.5rem] border p-10 shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 italic">Active Streams</div>
                                        <div className={`text-4xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{financialData.admissions.length} NODES</div>
                                    </div>
                                </div>

                                {/* Admissions Deep Dive */}
                                {financialData.admissions.map((adm, i) => (
                                    <div key={i} className={`rounded-[3.5rem] border p-12 transition-all duration-500 ${isDarkMode ? 'border-gray-800 bg-white/[0.01]' : 'border-gray-100 bg-gray-50/20 shadow-inner'}`}>
                                        <div className={`flex flex-col xl:flex-row xl:items-center justify-between mb-12 pb-10 border-b transition-all duration-500 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <div>
                                                <h3 className={`text-3xl font-black uppercase italic tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{adm.course}</h3>
                                                <div className="flex flex-wrap items-center gap-6 text-[10px] text-orange-500 font-black uppercase tracking-[0.3em] mt-5 italic">
                                                    <span className="bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/20 shadow-sm">ADMISSION_ID: #{adm.admissionNumber}</span>
                                                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div> STREAM_STATE: {adm.paymentStatus}</span>
                                                </div>
                                            </div>
                                            <div className="xl:text-right mt-8 xl:mt-0 flex flex-col xl:items-end">
                                                <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-3 italic">Settled Sector Capital</div>
                                                <div className="text-4xl font-black text-emerald-500 tracking-tighter tabular-nums italic">₹{adm.totalPaidAmount.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-12">
                                            {/* Installment Protocol */}
                                            <div className="space-y-8">
                                                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] flex items-center gap-4 italic">
                                                    <span className="p-2.5 bg-orange-500/10 rounded-xl text-orange-500 shadow-inner">
                                                        <FaFileInvoice size={14} />
                                                    </span>
                                                    Installment Sequence Map
                                                </h4>
                                                <div className={`rounded-[2.5rem] overflow-hidden border shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className={`text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ${isDarkMode ? 'bg-white/5 border-b border-gray-800' : 'bg-gray-50 border-b border-gray-100'}`}>
                                                                <th className="p-6">SEQ ID</th>
                                                                <th className="p-6">Maturity Horizon</th>
                                                                <th className="p-6 text-right">Instrument Value</th>
                                                                <th className="p-6 text-right">Audit State</th>
                                                            </tr>
                                                         </thead>
                                                         <tbody className={`divide-y transition-all duration-500 ${isDarkMode ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
                                                            {adm.paymentBreakdown.map((p, pi) => (
                                                                <tr key={pi} className={`transition-all duration-300 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                                                    <td className="p-6 font-black text-orange-500 text-[11px] tabular-nums tracking-widest italic">INSTR_{p.installmentNumber}</td>
                                                                    <td className={`p-6 font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{new Date(p.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</td>
                                                                    <td className={`p-6 text-right font-black text-base italic tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{p.amount.toLocaleString()}</td>
                                                                    <td className="p-6 text-right">{getStatusBadge(p.status)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Audit Trail */}
                                            <div className="space-y-8">
                                                <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.5em] flex items-center gap-4 italic">
                                                    <span className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 shadow-inner">
                                                        <FaMoneyBillWave size={14} />
                                                    </span>
                                                    Verification Ledger Trail
                                                </h4>
                                                <div className={`rounded-[2.5rem] overflow-hidden border shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className={`text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ${isDarkMode ? 'bg-white/5 border-b border-gray-800' : 'bg-gray-50 border-b border-gray-100'}`}>
                                                                <th className="p-6">Audit Temporal</th>
                                                                <th className="p-6 text-right">Settled Amount</th>
                                                                <th className="p-6 text-center">Mechanism</th>
                                                                <th className="p-6 text-right">Verifier Node</th>
                                                            </tr>
                                                         </thead>
                                                         <tbody className={`divide-y transition-all duration-500 ${isDarkMode ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
                                                            {adm.paymentHistory && adm.paymentHistory.length > 0 ? (
                                                                adm.paymentHistory.map((h, hi) => (
                                                                    <tr key={hi} className={`transition-all duration-300 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                                                        <td className={`p-6 font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{new Date(h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</td>
                                                                        <td className="p-6 text-right font-black text-base italic tabular-nums tracking-tighter text-emerald-500">₹{h.paidAmount.toLocaleString()}</td>
                                                                        <td className="p-6 text-center">
                                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${isDarkMode ? 'bg-white/5 text-gray-400 border-gray-800' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                                                {h.paymentMethod}
                                                                            </span>
                                                                        </td>
                                                                        <td className={`p-6 text-right font-black text-[9px] uppercase tracking-[0.2em] italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{h.recordedBy || "SYSTEM"}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="4" className="p-24 text-center">
                                                                        <p className="text-gray-600 font-black uppercase tracking-[0.4em] text-[10px] italic">No transaction vectors mapped to this stream</p>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Modal Matrix Footer */}
                            <div className={`p-10 border-t flex flex-col md:flex-row justify-between items-center gap-8 ${isDarkMode ? 'bg-white/[0.02] border-gray-800' : 'bg-gray-50 border-gray-100 shadow-inner'}`}>
                                <div className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em] flex items-center gap-4 italic">
                                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                                        <FaCoins size={12} />
                                    </div>
                                    Sector Audit reflects verified real-time capital settlements
                                </div>
                                <div className="flex gap-4 w-full md:w-auto">
                                    <button
                                        onClick={() => {
                                            setSelectedStudent(null);
                                            setFinancialData(null);
                                        }}
                                        className={`flex-1 md:flex-none px-12 py-4 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all duration-300 active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white border border-gray-800' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100 shadow-sm'}`}
                                    >
                                        DISMISS_MATRIX
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="flex-1 md:flex-none px-12 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl hover:from-orange-500 hover:to-amber-500 transition-all shadow-xl shadow-orange-600/20 active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <FaDownload size={12} /> GENERATE_REPORT
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout >
    );
};

export default FeeDueList;
