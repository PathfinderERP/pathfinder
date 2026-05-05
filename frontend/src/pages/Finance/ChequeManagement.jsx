import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaSearch, FaCheckCircle, FaClock, FaTimes, FaSyncAlt, FaExclamationTriangle, FaFilter, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import Select from "react-select";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";

const ChequeManagement = () => {
    const { isDarkMode } = useTheme();
    const [searchTerm, setSearchTerm] = useState("");
    const [cheques, setCheques] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ cleared: 0, pending: 0, bounced: 0, totalAmount: 0 });
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectDate, setRejectDate] = useState(new Date().toISOString().split('T')[0]);

    const [showClearModal, setShowClearModal] = useState(false);
    const [clearingId, setClearingId] = useState(null);
    const [clearDate, setClearDate] = useState(new Date().toISOString().split('T')[0]);

    const [filters, setFilters] = useState({
        centre: [],
        course: [],
        department: [],
        status: "all",
        startDate: "",
        endDate: "",
        chequeStartDate: "",
        chequeEndDate: ""
    });

    const [metadata, setMetadata] = useState({
        centres: [],
        courses: [],
        departments: []
    });

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canManageCheques = hasPermission(user, 'financeFees', 'chequeManagement', 'edit');

    useEffect(() => {
        fetchMetadata();
        fetchCheques();
    }, []);

    // Re-fetch when filters change (debounced for search)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCheques();
        }, 500);
        return () => clearTimeout(timer);
    }, [filters, searchTerm]);

    const fetchMetadata = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centresRes, coursesRes, deptsRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers })
            ]);

            const centres = await centresRes.json();
            const courses = await coursesRes.json();
            const depts = await deptsRes.json();

            // Filter centres based on user's authorized centres
            const filteredCentres = Array.isArray(centres)
                ? centres.filter(c =>
                    user.role === 'superAdmin' || user.role === 'Super Admin' ||
                    (user.centres && user.centres.some(uc => uc._id === c._id || (uc.centreName && c.centreName && uc.centreName.trim() === c.centreName.trim())))
                )
                : [];

            setMetadata({
                centres: filteredCentres,
                courses: Array.isArray(courses) ? courses : [],
                departments: Array.isArray(depts) ? depts.filter(dept => dept.showInAdmission !== false) : []
            });
        } catch (error) {
            console.error("Error fetching metadata:", error);
            toast.error("Failed to load metadata");
        }
    };

    const fetchCheques = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const queryParams = new URLSearchParams();

            // Handle multi-select arrays and other filters
            Object.entries(filters).forEach(([key, value]) => {
                if (key === 'status') {
                    if (value === 'cleared') queryParams.append('status', 'PAID');
                    else if (value === 'pending') queryParams.append('status', 'PENDING_CLEARANCE');
                    else if (value === 'bounced') queryParams.append('status', 'REJECTED');
                } else if (Array.isArray(value) && value.length > 0) {
                    value.forEach(v => queryParams.append(key, v));
                } else if (value && !Array.isArray(value)) {
                    queryParams.append(key, value);
                }
            });

            if (searchTerm) queryParams.append("search", searchTerm);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/pending-cheques?${queryParams.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setCheques(data);
                calculateStats(data);
            } else {
                toast.error("Failed to load cheques");
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            toast.error("Error loading data");
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        const statsObj = data.reduce((acc, c) => {
            if (c.status === "PAID") acc.cleared++;
            else if (c.status === "PENDING_CLEARANCE") acc.pending++;
            else if (c.status === "REJECTED") acc.bounced++;
            acc.totalAmount += (c.amount || 0);
            return acc;
        }, { cleared: 0, pending: 0, bounced: 0, totalAmount: 0 });
        setStats(statsObj);
    };

    const handleClearCheque = async () => {
        if (!clearDate) {
            toast.error("Please provide a cleared date");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/clear-cheque/${clearingId}`,
                {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}` 
                    },
                    body: JSON.stringify({ clearedDate: clearDate })
                }
            );

            if (response.ok) {
                const result = await response.json();
                toast.success(`Cheque cleared! Bill ID: ${result.billId}`);
                setShowClearModal(false);
                setClearingId(null);
                setClearDate(new Date().toISOString().split('T')[0]);
                fetchCheques();
            } else {
                const err = await response.json();
                toast.error(err.message || "Failed to clear cheque");
            }
        } catch (error) {
            console.error("Clear Error:", error);
            toast.error("Error clearing cheque");
        }
    };

    const handleRejectCheque = async () => {
        if (!rejectDate) {
            toast.error("Please provide a rejection date");
            return;
        }
        if (!rejectReason) {
            toast.error("Please provide a reason for rejection");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/reject-cheque/${rejectingId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ reason: rejectReason, rejectedDate: rejectDate })
                }
            );

            if (response.ok) {
                toast.success("Cheque rejected/bounced");
                setShowRejectModal(false);
                setRejectingId(null);
                setRejectReason("");
                fetchCheques();
            } else {
                toast.error("Failed to reject cheque");
            }
        } catch (error) {
            console.error("Reject Error:", error);
            toast.error("Error rejecting cheque");
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            centre: [],
            course: [],
            department: [],
            status: "all",
            startDate: "",
            endDate: "",
            chequeStartDate: "",
            chequeEndDate: ""
        });
        setSearchTerm("");
    };

    const exportToExcel = () => {
        if (cheques.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = cheques.map(c => ({
            "Cheque No": c.chequeNumber,
            "Student Name": c.studentName,
            "Admission No": c.admissionNumber,
            "Bank": c.bankName,
            "Amount": c.amount,
            "Cheque Date": c.chequeDate ? new Date(c.chequeDate).toLocaleDateString('en-IN') : "N/A",
            "Cleared/Rejected Date": c.clearedOrRejectedDate ? new Date(c.clearedOrRejectedDate).toLocaleDateString('en-IN') : "N/A",
            "Status": c.status === "PAID" ? "Cleared" : (c.status === "REJECTED" ? "Rejected" : "Pending"),
            "Centre": c.centre,
            "Course": c.courseName,
            "Department": c.department,
            "Processed By": c.processedBy
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cheque Management Report");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Cheque_Management_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Exported successfully!");
    };

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            background: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#fff",
            borderColor: state.isFocused ? "rgba(16, 185, 129, 0.5)" : (isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#e5e7eb"),
            borderRadius: "0.75rem",
            padding: "2px",
            fontSize: "10px",
            fontWeight: "black",
            color: isDarkMode ? "white" : "#111827",
            boxShadow: "none",
            "&:hover": {
                borderColor: "rgba(16, 185, 129, 0.3)"
            }
        }),
        menu: (base) => ({
            ...base,
            background: isDarkMode ? "#1a1f24" : "#fff",
            border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid #e5e7eb",
            borderRadius: "0.75rem",
            zIndex: 100
        }),
        option: (base, state) => ({
            ...base,
            background: state.isFocused ? "rgba(16, 185, 129, 0.1)" : "transparent",
            color: state.isFocused ? "#10b981" : (isDarkMode ? "#9ca3af" : "#4b5563"),
            fontSize: "10px",
            fontWeight: "black",
            textTransform: "uppercase",
            cursor: "pointer",
            "&:active": {
                background: "rgba(16, 185, 129, 0.2)"
            }
        }),
        multiValue: (base) => ({
            ...base,
            background: "rgba(16, 185, 129, 0.1)",
            borderRadius: "4px"
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "#10b981",
            fontSize: "9px",
            fontWeight: "black"
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: "#10b981",
            "&:hover": {
                background: "rgba(16, 185, 129, 0.2)",
                color: "#059669"
            }
        }),
        placeholder: (base) => ({
            ...base,
            color: isDarkMode ? "#4b5563" : "#9ca3af",
            textTransform: "uppercase"
        }),
        singleValue: (base) => ({
            ...base,
            color: isDarkMode ? "#e5e7eb" : "#111827"
        })
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-2"><FaCheckCircle /> Cleared</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-amber-500 bg-amber-500/10 border-amber-500/20 inline-flex items-center gap-2 animate-pulse"><FaClock /> In Process</span>;
            case "REJECTED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-2"><FaTimes /> Bounced</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20">{status}</span>;
        }
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Cheque <span className="text-emerald-500">Management</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic"> Real-time Clearance Ledger & Fiscal Rejection Monitoring </p>
                    </div>
                    <button
                        onClick={fetchCheques}
                        className={`px-8 py-4 font-black uppercase text-[10px] tracking-[0.2em] rounded-2xl transition-all flex items-center gap-3 active:scale-95 shadow-xl ${isDarkMode ? 'bg-white/5 border border-gray-800 text-white hover:bg-white/10' : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm'}`}
                    >
                        <FaSyncAlt className={loading ? "animate-spin" : ""} /> Sync Records
                    </button>
                </div>

                {/* Main Filter Section */}
                <div className={`border rounded-[2.5rem] p-10 mb-10 shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Entity (Centre)</label>
                            <Select
                                isMulti
                                options={metadata.centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                value={filters.centre.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("centre", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL ENTITIES"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Academic Stream</label>
                            <Select
                                isMulti
                                options={metadata.courses.map(c => ({ value: c.courseName, label: c.courseName }))}
                                value={filters.course.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("course", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL STREAMS"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Division</label>
                            <Select
                                isMulti
                                options={metadata.departments.map(d => ({ value: d.departmentName, label: d.departmentName }))}
                                value={filters.department.map(d => ({ value: d, label: d }))}
                                onChange={(selected) => handleFilterChange("department", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL DIVISIONS"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Fiscal Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange("status", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] uppercase tracking-widest outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                            >
                                <option value="all" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Global Status</option>
                                <option value="pending" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Pending Clearance</option>
                                <option value="cleared" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Cleared Assets</option>
                                <option value="bounced" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Bounced Protocol</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Audit Horizon Start</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Audit Horizon End</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Cheque Issued Start</label>
                            <input
                                type="date"
                                value={filters.chequeStartDate}
                                onChange={(e) => handleFilterChange("chequeStartDate", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Cheque Issued End</label>
                            <input
                                type="date"
                                value={filters.chequeEndDate}
                                onChange={(e) => handleFilterChange("chequeEndDate", e.target.value)}
                                className={`w-full border rounded-xl py-3.5 px-6 font-black text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                            />
                        </div>
                    </div>

                    <div className={`flex flex-col md:flex-row gap-6 pt-10 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <button
                            onClick={clearFilters}
                            className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all border flex items-center justify-center gap-3 active:scale-95 ${isDarkMode ? 'bg-white/5 text-gray-500 border-gray-800 hover:text-white hover:bg-white/10 hover:border-gray-700' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:text-gray-900'}`}
                        >
                            <FaTimes size={12} /> Reset Parameters
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <FaDownload size={12} /> Export Intelligence Data
                        </button>
                    </div>
                </div>

                {/* Sub-search */}
                <div className="relative group mb-10">
                    <FaSearch className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-gray-700 group-focus-within:text-emerald-500' : 'text-gray-400 group-focus-within:text-emerald-600'}`} />
                    <input
                        type="text"
                        placeholder="TRACING BY IDENTITY, ADMISSION SEQUENCE, OR INSTRUMENT NUMBER..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full border rounded-3xl py-5 pl-16 pr-6 font-black text-[11px] uppercase tracking-[0.2em] outline-none focus:border-emerald-500/50 transition-all duration-500 shadow-2xl ${isDarkMode ? 'bg-white/5 border-gray-800 text-white placeholder:text-gray-700' : 'bg-white border-gray-200 text-gray-900 shadow-sm'}`}
                    />
                </div>

                {/* Table */}
                <div className={`border rounded-[3rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)] transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <th className="p-8">Instrument Info</th>
                                    <th className="p-8">Entity Details</th>
                                    <th className="p-8">Financial Node (Bank)</th>
                                    <th className="p-8">Asset Value</th>
                                    <th className="p-8">Issue Date</th>
                                    <th className="p-8">Processing Timestamp</th>
                                    <th className="p-8">Fiscal Status</th>
                                    <th className="p-8">Authorized By</th>
                                    <th className="p-8 text-right">Intervention</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="p-32 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-16 h-16 border-4 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] italic animate-pulse">Syncing Fiscal Instruments...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCheques.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="p-32 text-center text-gray-600 font-black uppercase tracking-[0.4em] italic text-xs">
                                            No matched instruments in local records
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCheques.map((cheque) => (
                                        <tr key={cheque.paymentId} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5 bg-transparent' : 'hover:bg-emerald-500/[0.02] bg-white'}`}>
                                            <td className="p-8">
                                                <div className="text-cyan-500 font-black font-mono text-base tracking-widest leading-none"># {cheque.chequeNumber || "N/A"}</div>
                                                <div className="text-[9px] text-gray-500 font-black uppercase mt-2 italic tracking-widest">Protocol: {cheque.paymentId.slice(-6)}</div>
                                            </td>
                                            <td className="p-8">
                                                <div className={`font-black uppercase italic tracking-tighter text-base leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{cheque.studentName}</div>
                                                <div className="text-[10px] text-emerald-500/70 font-black uppercase mt-1.5 tracking-widest italic">{cheque.admissionNumber}</div>
                                            </td>
                                            <td className="p-8">
                                                <div className={`font-black text-[11px] uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{cheque.bankName || "UNDEFINED"}</div>
                                                <div className="text-[9px] text-gray-500 uppercase mt-1.5 font-black tracking-widest italic">{cheque.centre}</div>
                                            </td>
                                            <td className={`p-8 font-black text-2xl tracking-tighter italic tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{cheque.amount.toLocaleString()}</td>
                                            <td className={`p-8 font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {cheque.chequeDate ? new Date(cheque.chequeDate).toLocaleDateString('en-IN') : "N/A"}
                                            </td>
                                            <td className={`p-8 font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {cheque.clearedOrRejectedDate ? new Date(cheque.clearedOrRejectedDate).toLocaleDateString('en-IN') : "---"}
                                            </td>
                                            <td className="p-8">{getStatusBadge(cheque.status)}</td>
                                            <td className="p-8">
                                                <div className="text-gray-500 font-black text-[10px] uppercase italic tracking-widest">
                                                    {cheque.status === "PAID" ? (cheque.processedBy || "SYSTEM_NODE") : "---"}
                                                </div>
                                            </td>
                                            <td className="p-8 text-right">
                                                {cheque.status === "PENDING_CLEARANCE" && canManageCheques && (
                                                    <div className="flex justify-end gap-3">
                                                        <button
                                                            onClick={() => {
                                                                setClearingId(cheque.paymentId);
                                                                setClearDate(new Date().toISOString().split('T')[0]);
                                                                setShowClearModal(true);
                                                            }}
                                                            className="px-5 py-2.5 bg-emerald-500/10 text-emerald-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-500/20 active:scale-95 shadow-xl shadow-emerald-600/5"
                                                        >
                                                            Authorize
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setRejectingId(cheque.paymentId);
                                                                setRejectDate(new Date().toISOString().split('T')[0]);
                                                                setShowRejectModal(true);
                                                            }}
                                                            className="px-5 py-2.5 bg-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-500/20 active:scale-95 shadow-xl shadow-red-500/5"
                                                        >
                                                            Flag Bounce
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                        <div className={`border w-full max-w-xl rounded-[3rem] overflow-hidden animate-in fade-in zoom-in-95 duration-300 shadow-[0_40px_100px_rgba(0,0,0,0.8)] ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className={`p-10 border-b flex items-center gap-6 bg-gradient-to-r from-red-500/10 to-transparent ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="w-16 h-16 rounded-3xl bg-red-500/20 flex items-center justify-center text-red-500 text-2xl shadow-inner">
                                    <FaExclamationTriangle />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Bounce <span className="text-red-500">Protocol</span></h2>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Identify instrument failure parameters</p>
                                </div>
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Failure Timestamp</label>
                                    <input
                                        type="date"
                                        value={rejectDate}
                                        onChange={(e) => setRejectDate(e.target.value)}
                                        className={`w-full border rounded-2xl py-4 px-6 font-black text-[11px] outline-none focus:border-red-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Reason for Rejection</label>
                                    <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="E.G. INSUFFICIENT LIQUIDITY, SIGNATURE MISMATCH, INSTRUMENT STALE..."
                                        className={`w-full border rounded-2xl p-6 font-black text-[11px] uppercase tracking-widest outline-none focus:border-red-500/50 transition-all min-h-[150px] resize-none ${isDarkMode ? 'bg-white/5 border-gray-800 text-white placeholder:text-gray-800' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                    />
                                </div>
                            </div>
                            <div className={`p-10 border-t flex gap-6 ${isDarkMode ? 'bg-white/[0.02] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectReason("");
                                    }}
                                    className={`flex-1 py-5 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 shadow-sm'}`}
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleRejectCheque}
                                    className="flex-1 py-5 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-red-500 transition-all shadow-2xl shadow-red-600/30 active:scale-95"
                                >
                                    Confirm Bounce
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clear Modal */}
                {showClearModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                        <div className={`border w-full max-w-xl rounded-[3rem] overflow-hidden animate-in fade-in zoom-in-95 duration-300 shadow-[0_40px_100px_rgba(0,0,0,0.8)] ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100'}`}>
                            <div className={`p-10 border-b flex items-center gap-6 bg-gradient-to-r from-emerald-500/10 to-transparent ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-2xl shadow-inner">
                                    <FaCheckCircle />
                                </div>
                                <div>
                                    <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Asset <span className="text-emerald-500">Authorization</span></h2>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Confirm final instrument clearance</p>
                                </div>
                            </div>
                            <div className="p-10">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Liquidity Clearing Timestamp</label>
                                    <input
                                        type="date"
                                        value={clearDate}
                                        onChange={(e) => setClearDate(e.target.value)}
                                        className={`w-full border rounded-2xl py-4 px-6 font-black text-[11px] outline-none focus:border-emerald-500/50 transition-all uppercase [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700 shadow-inner'}`}
                                    />
                                </div>
                            </div>
                            <div className={`p-10 border-t flex gap-6 ${isDarkMode ? 'bg-white/[0.02] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                <button
                                    onClick={() => {
                                        setShowClearModal(false);
                                        setClearDate(new Date().toISOString().split('T')[0]);
                                    }}
                                    className={`flex-1 py-5 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-95 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 shadow-sm'}`}
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleClearCheque}
                                    className="flex-1 py-5 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-600/30 active:scale-95"
                                >
                                    Authorize Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ChequeManagement;
