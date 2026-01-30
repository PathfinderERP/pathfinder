import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaSearch, FaFilter, FaDownload, FaSyncAlt, FaCalendarAlt,
    FaUser, FaExclamationCircle, FaCheckCircle, FaClock,
    FaPhone, FaEnvelope, FaMapMarkerAlt, FaFileInvoice, FaMoneyBillWave
} from "react-icons/fa";
import { toast } from "react-toastify";

const FeeDueList = () => {
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
    const [loadingDetails, setLoadingDetails] = useState(false);

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
                setCentres(filteredCentres);
            }
            if (courseRes.ok) {
                const data = await courseRes.json();
                setCourses(data || []);
            }
            if (deptRes.ok) {
                const data = await deptRes.json();
                setDepartments(data || []);
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
    };

    const handleSelectStudent = async (studentId) => {
        setLoadingDetails(true);
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
                toast.error("Failed to load details");
            }
        } catch (error) {
            console.error("Error loading details:", error);
            toast.error("Error loading student details");
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleExport = () => {
        if (dueList.length === 0) {
            toast.info("No data to export");
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
        link.setAttribute("download", `Fee_Due_List_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
            case "COMPLETED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"><FaCheckCircle /> {status}</span>;
            case "CRITICAL":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaExclamationCircle /> {status}</span>;
            case "OVERDUE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-orange-500 bg-orange-500/10 border-orange-500/20 inline-flex items-center gap-1"><FaExclamationCircle /> {status}</span>;
            case "DUE TODAY":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> {status}</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> IN PROCESS</span>;
            case "REJECTED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaExclamationCircle /> REJECTED</span>;
            case "PENDING":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20 inline-flex items-center gap-1"><FaClock /> {status}</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20">{status}</span>;
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                            Fee Due <span className="text-orange-500">List</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Track and Manage Outstanding Payments
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleRefresh}
                            className="px-6 py-3 bg-gray-800 text-white font-black uppercase text-sm tracking-widest rounded-xl hover:bg-gray-700 transition-all flex items-center gap-2"
                        >
                            <FaSyncAlt /> Refresh
                        </button>
                        <button
                            onClick={handleExport}
                            className="px-6 py-3 bg-emerald-500 text-black font-black uppercase text-sm tracking-widest rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2"
                        >
                            <FaDownload /> Export CSV
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-red-500/20 to-transparent border border-red-500/20 p-6 rounded-2xl relative overflow-hidden group">
                        <FaExclamationCircle className="absolute -right-4 -bottom-4 text-8xl text-red-500/10 group-hover:scale-110 transition-transform" />
                        <div className="text-red-500 text-xs font-black uppercase tracking-widest mb-2">Critical (7+ Days Overdue)</div>
                        <div className="text-5xl font-black text-white">{stats.critical}</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/20 p-6 rounded-2xl relative overflow-hidden group">
                        <FaClock className="absolute -right-4 -bottom-4 text-8xl text-orange-500/10 group-hover:scale-110 transition-transform" />
                        <div className="text-orange-500 text-xs font-black uppercase tracking-widest mb-2">Overdue (1-7 Days)</div>
                        <div className="text-5xl font-black text-white">{stats.overdue}</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/20 to-transparent border border-yellow-500/20 p-6 rounded-2xl relative overflow-hidden group">
                        <FaCalendarAlt className="absolute -right-4 -bottom-4 text-8xl text-yellow-500/10 group-hover:scale-110 transition-transform" />
                        <div className="text-yellow-500 text-xs font-black uppercase tracking-widest mb-2">Due Today</div>
                        <div className="text-5xl font-black text-white">{stats.dueToday}</div>
                    </div>
                </div>

                {/* Filter Section */}
                <div className="bg-[#131619] border border-gray-800 rounded-2xl p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2 relative group">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-orange-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="SEARCH BY NAME, ADMISSION NO..."
                                value={filters.searchTerm}
                                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                onKeyPress={(e) => e.key === "Enter" && fetchDueList()}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-200 font-bold text-xs uppercase tracking-widest outline-none focus:border-orange-500/50 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={filters.centre}
                                onChange={(e) => setFilters({ ...filters, centre: e.target.value })}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-gray-200 font-bold text-xs uppercase outline-none focus:border-orange-500/50 transition-all appearance-none"
                            >
                                <option value="">Select Centre</option>
                                {centres.map((c, i) => (
                                    <option key={i} value={c.centreName}>{c.centreName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <select
                                value={filters.course}
                                onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-gray-200 font-bold text-xs uppercase outline-none focus:border-orange-500/50 transition-all appearance-none"
                            >
                                <option value="">Select Course</option>
                                {courses.map((c, i) => (
                                    <option key={i} value={c._id}>{c.courseName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <select
                                value={filters.department}
                                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 px-4 text-gray-200 font-bold text-xs uppercase outline-none focus:border-orange-500/50 transition-all appearance-none"
                            >
                                <option value="">Select Department</option>
                                {departments.map((d, i) => (
                                    <option key={i} value={d._id}>{d.departmentName}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchDueList}
                            className="bg-orange-500 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl hover:bg-orange-400 transition-all"
                        >
                            Apply Filters
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-4">
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest w-20">From Date:</span>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="flex-1 bg-black/40 border border-gray-800 rounded-xl py-2 px-4 text-gray-200 font-bold text-xs outline-none focus:border-orange-500/50 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest w-20">To Date:</span>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="flex-1 bg-black/40 border border-gray-800 rounded-xl py-2 px-4 text-gray-200 font-bold text-xs outline-none focus:border-orange-500/50 transition-all"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-black/20 p-4 rounded-xl border border-gray-800/30">
                        <div className="flex items-center gap-4">
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest w-20">Min Due:</span>
                            <input
                                type="number"
                                placeholder="Min Amount"
                                value={filters.minAmount}
                                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                className="flex-1 bg-black/40 border border-gray-800 rounded-xl py-2 px-4 text-gray-200 font-bold text-xs outline-none focus:border-orange-500/50 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest w-20">Max Due:</span>
                            <input
                                type="number"
                                placeholder="Max Amount"
                                value={filters.maxAmount}
                                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                className="flex-1 bg-black/40 border border-gray-800 rounded-xl py-2 px-4 text-gray-200 font-bold text-xs outline-none focus:border-orange-500/50 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-[#131619] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <th className="p-6">Admission No.</th>
                                <th className="p-6">Student Details</th>
                                <th className="p-6">Course / Centre</th>
                                <th className="p-6">Due Amount</th>
                                <th className="p-6">Due Date</th>
                                <th className="p-6">Stay Period</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-20 text-center">
                                        <div className="animate-spin h-12 w-12 border-t-2 border-orange-500 rounded-full mx-auto"></div>
                                    </td>
                                </tr>
                            ) : dueList.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                        No overdue payments found matching filters
                                    </td>
                                </tr>
                            ) : (
                                dueList.map((item, index) => (
                                    <tr key={index} className="hover:bg-orange-500/[0.02] transition-colors group">
                                        <td className="p-6">
                                            <span className="text-orange-500 font-black">{item.admissionNumber}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-white">{item.studentName}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">{item.phoneNumber}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-gray-300 font-bold text-xs">{item.course}</div>
                                            <div className="text-[9px] text-gray-500 uppercase tracking-tighter">{item.department}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mt-1 tracking-widest">{item.centre}</div>
                                        </td>
                                        <td className="p-6 text-white font-black">₹{item.amount.toLocaleString()}</td>
                                        <td className="p-6 text-gray-300">
                                            <div className="font-bold text-xs">{new Date(item.dueDate).toLocaleDateString('en-IN')}</div>
                                            <div className="text-[9px] text-red-500 font-black uppercase">Inst # {item.installmentNumber}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-black ${item.daysOverdue >= 7 ? 'text-red-500' : 'text-orange-500'}`}>
                                                    {item.daysOverdue} DAYS
                                                </span>
                                                {item.monthsOverdue > 0 && (
                                                    <span className="text-[10px] text-gray-500 font-bold">
                                                        ({item.monthsOverdue} MONTH{item.monthsOverdue > 1 ? 'S' : ''})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="p-6 text-right">
                                            <button
                                                onClick={() => handleSelectStudent(item.studentId)}
                                                className="px-4 py-2 bg-orange-500/10 text-orange-500 font-bold text-xs uppercase rounded-lg hover:bg-orange-500 hover:text-black transition-all"
                                            >
                                                View Info
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Student Details Popup Modal */}
                {selectedStudent && financialData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#131619] border border-gray-800 w-full max-w-6xl max-h-[90vh] rounded-[2rem] overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-300">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-gray-800 flex items-start justify-between bg-gradient-to-r from-orange-500/10 to-transparent">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 text-xl font-black">
                                            {selectedStudent.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white">{selectedStudent.name}</h2>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 font-bold uppercase tracking-widest">
                                                <span className="flex items-center gap-1"><FaEnvelope className="text-orange-500" /> {selectedStudent.email}</span>
                                                <span className="flex items-center gap-1"><FaPhone className="text-orange-500" /> {selectedStudent.mobile}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedStudent(null);
                                        setFinancialData(null);
                                    }}
                                    className="p-3 bg-gray-800/50 text-gray-400 rounded-full hover:bg-red-500 hover:text-white transition-all"
                                >
                                    <FaSyncAlt className="rotate-45" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Fees</div>
                                        <div className="text-xl font-black text-white">₹{financialData.summary.totalFeesAcrossAll.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Paid</div>
                                        <div className="text-xl font-black text-emerald-500">₹{financialData.summary.totalPaidAcrossAll.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/40 border border-orange-500/20 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Total Remaining</div>
                                        <div className="text-xl font-black text-orange-500">₹{financialData.summary.totalRemainingAcrossAll.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Centre</div>
                                        <div className="text-xl font-black text-white">{selectedStudent.centre}</div>
                                    </div>
                                </div>

                                {/* Admissions Breakdown */}
                                {financialData.admissions.map((adm, i) => (
                                    <div key={i} className="mb-8 last:mb-0 border border-gray-800 rounded-2xl p-6 bg-black/20">
                                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
                                            <div>
                                                <h3 className="text-xl font-black text-white uppercase italic">{adm.course}</h3>
                                                <div className="text-xs text-orange-500 font-bold uppercase tracking-widest mt-1">
                                                    Admission No: {adm.admissionNumber} • Status: {adm.paymentStatus}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-500 font-black uppercase mb-1">Total Paid This Course</div>
                                                <div className="text-lg font-black text-emerald-500">₹{adm.totalPaidAmount.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Installments Table */}
                                            <div>
                                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <FaFileInvoice className="text-orange-500" /> Installment Breakdown
                                                </h4>
                                                <div className="bg-black/40 rounded-xl overflow-hidden border border-gray-800">
                                                    <table className="w-full text-left text-[10px]">
                                                        <thead>
                                                            <tr className="bg-gray-900/50 border-b border-gray-800 text-gray-500 uppercase font-black">
                                                                <th className="p-3">#</th>
                                                                <th className="p-3">Due Date</th>
                                                                <th className="p-3">Amount</th>
                                                                <th className="p-3">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-800">
                                                            {adm.paymentBreakdown.map((p, pi) => (
                                                                <tr key={pi} className="hover:bg-white/5 transition-colors">
                                                                    <td className="p-3 font-bold text-orange-500">{p.installmentNumber}</td>
                                                                    <td className="p-3 font-bold">{new Date(p.dueDate).toLocaleDateString('en-IN')}</td>
                                                                    <td className="p-3 font-bold">₹{p.amount.toLocaleString()}</td>
                                                                    <td className="p-3">{getStatusBadge(p.status)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            {/* Payment History */}
                                            <div>
                                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <FaMoneyBillWave className="text-emerald-500" /> Transaction History
                                                </h4>
                                                <div className="bg-black/40 rounded-xl overflow-hidden border border-gray-800">
                                                    <table className="w-full text-left text-[10px]">
                                                        <thead>
                                                            <tr className="bg-gray-900/50 border-b border-gray-800 text-gray-500 uppercase font-black">
                                                                <th className="p-3">Date</th>
                                                                <th className="p-3">Amount</th>
                                                                <th className="p-3">Method</th>
                                                                <th className="p-3">Recorded By</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-800">
                                                            {adm.paymentHistory && adm.paymentHistory.length > 0 ? (
                                                                adm.paymentHistory.map((h, hi) => (
                                                                    <tr key={hi} className="hover:bg-white/5 transition-colors">
                                                                        <td className="p-3 font-bold">{new Date(h.createdAt).toLocaleDateString('en-IN')}</td>
                                                                        <td className="p-3 font-bold text-emerald-500">₹{h.paidAmount.toLocaleString()}</td>
                                                                        <td className="p-3 font-bold">{h.paymentMethod}</td>
                                                                        <td className="p-3">{h.recordedBy}</td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="4" className="p-6 text-center text-gray-600 font-bold uppercase tracking-widest text-[8px]">No transactions yet</td>
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

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-800 flex justify-end gap-4 bg-black/40">
                                <button
                                    onClick={() => {
                                        setSelectedStudent(null);
                                        setFinancialData(null);
                                    }}
                                    className="px-8 py-3 bg-gray-800 text-gray-300 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 transition-all"
                                >
                                    Close Window
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="px-8 py-3 bg-orange-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-orange-400 transition-all"
                                >
                                    Print Report
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default FeeDueList;
