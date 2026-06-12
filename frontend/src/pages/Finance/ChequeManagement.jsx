import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaSearch, FaCheckCircle, FaClock, FaTimes, FaSyncAlt, FaExclamationTriangle, FaFilter, FaDownload, FaRegFileAlt } from "react-icons/fa";
import { toast } from "react-toastify";
import Select from "react-select";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

const ChequeManagement = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
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

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [jumpToPage, setJumpToPage] = useState("");

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
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
        const isAuthorized = userRoles.some(r => {
            const norm = typeof r === "string" ? r.toLowerCase().replace(/\s+/g, "") : "";
            return norm === "superadmin" || norm === "accounts";
        });
        if (!isAuthorized) {
            toast.error("Access Denied: You do not have permission to view Cheque Management.");
            navigate("/");
        }
    }, [user, navigate]);

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

    const filteredCheques = cheques; // Now filtered by backend

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
            "Cheque Deposit Date": c.depositedDate ? new Date(c.depositedDate).toLocaleDateString('en-IN') : "N/A",
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
            background: "#131619",
            borderColor: state.isFocused ? "rgba(16, 185, 129, 0.5)" : "rgba(31, 41, 55, 1)",
            borderRadius: "0.75rem",
            padding: "2px",
            fontSize: "10px",
            fontWeight: "bold",
            color: "white",
            boxShadow: "none",
            "&:hover": {
                borderColor: "rgba(16, 185, 129, 0.3)"
            }
        }),
        menu: (base) => ({
            ...base,
            background: "#131619",
            border: "1px solid rgba(31, 41, 55, 1)",
            borderRadius: "0.75rem",
            zIndex: 100
        }),
        option: (base, state) => ({
            ...base,
            background: state.isFocused ? "rgba(16, 185, 129, 0.1)" : "transparent",
            color: state.isFocused ? "#10b981" : "#9ca3af",
            fontSize: "10px",
            fontWeight: "bold",
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
            color: "#4b5563"
        }),
        singleValue: (base) => ({
            ...base,
            color: "#e5e7eb"
        })
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PAID":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-emerald-500 bg-emerald-500/10 border-emerald-500/20 inline-flex items-center gap-1"><FaCheckCircle /> Cleared</span>;
            case "PENDING_CLEARANCE":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-yellow-500 bg-yellow-500/10 border-yellow-500/20 inline-flex items-center gap-1"><FaClock /> IN PROCESS</span>;
            case "REJECTED":
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center gap-1"><FaTimes /> Bounced</span>;
            default:
                return <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase border text-gray-500 bg-gray-500/10 border-gray-500/20">{status}</span>;
        }
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCheques.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCheques.length / itemsPerPage);

    const handleJumpToPage = (e) => {
        e.preventDefault();
        const page = parseInt(jumpToPage);
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        } else {
            toast.error(`Please enter a valid page number between 1 and ${totalPages}`);
        }
        setJumpToPage("");
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 md:p-10 max-w-[1700px] mx-auto min-h-screen pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">
                            Cheque <span className="text-emerald-500">Management</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Real-time Clearance & Rejection Tracking
                        </p>
                    </div>
                    <button
                        onClick={fetchCheques}
                        className="px-6 py-3 bg-gray-800 text-white font-black uppercase text-sm tracking-widest rounded-xl hover:bg-gray-700 transition-all flex items-center gap-2"
                    >
                        <FaSyncAlt className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                </div>

                {/* Main Filter Section */}
                <div className="bg-[#131619] border border-gray-800 rounded-3xl p-6 mb-8 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end mb-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Centre</label>
                            <Select
                                isMulti
                                options={metadata.centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                value={filters.centre.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("centre", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL CENTRES"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Course</label>
                            <Select
                                isMulti
                                options={metadata.courses.map(c => ({ value: c.courseName, label: c.courseName }))}
                                value={filters.course.map(c => ({ value: c, label: c }))}
                                onChange={(selected) => handleFilterChange("course", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL COURSES"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                            <Select
                                isMulti
                                options={metadata.departments.map(d => ({ value: d.departmentName, label: d.departmentName }))}
                                value={filters.department.map(d => ({ value: d, label: d }))}
                                onChange={(selected) => handleFilterChange("department", selected ? selected.map(s => s.value) : [])}
                                styles={customSelectStyles}
                                placeholder="ALL DEPARTMENTS"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Status Wise Filter</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange("status", e.target.value)}
                                className="w-full bg-[#131619] border border-gray-800 rounded-xl py-3 px-4 text-gray-200 font-bold text-xs uppercase outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Status (Active)</option>
                                <option value="pending">Pending Clearance</option>
                                <option value="cleared">Cleared</option>
                                <option value="bounced">Bounced/Rejected</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end mb-6">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Processing Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-2.5 px-4 text-gray-400 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Processing End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-2.5 px-4 text-gray-400 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque Start Date</label>
                            <input
                                type="date"
                                value={filters.chequeStartDate}
                                onChange={(e) => handleFilterChange("chequeStartDate", e.target.value)}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-2.5 px-4 text-gray-400 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cheque End Date</label>
                            <input
                                type="date"
                                value={filters.chequeEndDate}
                                onChange={(e) => handleFilterChange("chequeEndDate", e.target.value)}
                                className="w-full bg-black/40 border border-gray-800 rounded-xl py-2.5 px-4 text-gray-400 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-800/50">
                        <button
                            onClick={clearFilters}
                            className="flex-1 py-3 bg-gray-800 text-gray-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 hover:text-white transition-all border border-gray-700 flex items-center justify-center gap-2"
                        >
                            <FaTimes /> Clear All Filters
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex-1 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-500 hover:text-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5"
                        >
                            <FaDownload /> Export Management Data
                        </button>
                    </div>
                </div>

                {/* Sub-search */}
                <div className="relative group mb-8">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="SUB-SEARCH BY NAME, ADMISSION NO, OR CHEQUE NUMBER..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#131619] border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-gray-200 font-bold text-xs uppercase tracking-wider outline-none focus:border-emerald-500/50 transition-all"
                    />
                </div>

                {/* Table */}
                <div className="bg-[#131619] border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                            <tr className="bg-gray-900/50 border-b border-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <th className="p-6">Cheque Info</th>
                                <th className="p-6">Student Details</th>
                                <th className="p-6">Bank Name</th>
                                <th className="p-6">Amount</th>
                                <th className="p-6">Cheque Date</th>
                                <th className="p-6">Cheque Deposit Date</th>
                                <th className="p-6">Cleared/Rejected Date</th>
                                <th className="p-6">Receipt</th>
                                <th className="p-6">Status</th>
                                <th className="p-6">Processed By</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="11" className="p-20 text-center">
                                        <div className="animate-spin h-10 w-10 border-t-2 border-emerald-500 rounded-full mx-auto"></div>
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="p-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                        No cheques found in records
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((cheque) => (
                                    <tr key={cheque.paymentId} className="hover:bg-emerald-500/[0.02] transition-colors group">
                                        <td className="p-6">
                                            <div className="text-cyan-500 font-black"># {cheque.chequeNumber || "N/A"}</div>
                                            <div className="text-[9px] text-gray-500 font-bold uppercase mt-1">Ref: {cheque.paymentId.slice(-6)}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-white uppercase">{cheque.studentName}</div>
                                            <div className="text-[10px] text-emerald-500/70 font-bold uppercase">{cheque.admissionNumber}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-gray-300 font-bold text-xs uppercase">{cheque.bankName || "N/A"}</div>
                                            <div className="text-[9px] text-gray-500 uppercase mt-1">{cheque.centre}</div>
                                        </td>
                                        <td className="p-6 text-white font-black text-lg">₹{cheque.amount.toLocaleString()}</td>
                                        <td className="p-6 text-gray-300 font-bold text-xs">
                                            {cheque.chequeDate ? new Date(cheque.chequeDate).toLocaleDateString('en-IN') : "N/A"}
                                        </td>
                                        <td className="p-6 text-gray-300 font-bold text-xs">
                                            {cheque.depositedDate ? new Date(cheque.depositedDate).toLocaleDateString('en-IN') : "---"}
                                        </td>
                                        <td className="p-6 text-gray-300 font-bold text-xs">
                                            {cheque.clearedOrRejectedDate ? new Date(cheque.clearedOrRejectedDate).toLocaleDateString('en-IN') : "---"}
                                        </td>
                                        <td className="p-6">
                                            {cheque.receiptFile ? (
                                                <a
                                                    href={cheque.receiptFile}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500 hover:text-black font-black text-[9px] uppercase tracking-wider transition-all inline-flex items-center gap-1.5"
                                                >
                                                    <FaRegFileAlt /> View Slip
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-gray-500 font-bold uppercase">Not Deposited</span>
                                            )}
                                        </td>
                                        <td className="p-6">{getStatusBadge(cheque.status)}</td>
                                        <td className="p-6">
                                            <div className="text-gray-500 font-black text-[10px] uppercase italic">
                                                {cheque.status === "PAID" ? (cheque.processedBy || "System") : "---"}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            {cheque.status === "PENDING_CLEARANCE" && canManageCheques && (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setClearingId(cheque.paymentId);
                                                            setClearDate(new Date().toISOString().split('T')[0]);
                                                            setShowClearModal(true);
                                                        }}
                                                        className="px-4 py-2 bg-emerald-500/10 text-emerald-500 font-black text-[10px] uppercase rounded-lg hover:bg-emerald-500 hover:text-black transition-all border border-emerald-500/20"
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setRejectingId(cheque.paymentId);
                                                            setRejectDate(new Date().toISOString().split('T')[0]);
                                                            setShowRejectModal(true);
                                                        }}
                                                        className="px-4 py-2 bg-red-500/10 text-red-500 font-black text-[10px] uppercase rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                    >
                                                        Bounce
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

                    {/* Pagination UI */}
                    {!loading && filteredCheques.length > 0 && (
                        <div className="p-4 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#131619]">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCheques.length)} of {filteredCheques.length} entries
                                </span>
                                <div className="flex items-center gap-2">
                                    <label className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Rows per page:</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="bg-black/40 border border-gray-800 rounded-lg px-2 py-1 text-gray-300 text-[10px] font-bold outline-none focus:border-emerald-500/50"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 bg-gray-800 text-gray-300 font-bold text-[10px] uppercase rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Previous
                                </button>
                                <span className="text-gray-400 font-bold text-[10px] uppercase px-2">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 bg-gray-800 text-gray-300 font-bold text-[10px] uppercase rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Next
                                </button>
                                <form onSubmit={handleJumpToPage} className="flex items-center gap-2 ml-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max={totalPages}
                                        value={jumpToPage}
                                        onChange={(e) => setJumpToPage(e.target.value)}
                                        placeholder="PAGE"
                                        className="w-16 bg-black/40 border border-gray-800 rounded-lg px-2 py-1.5 text-gray-300 text-[10px] font-bold outline-none focus:border-emerald-500/50 text-center uppercase"
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-[10px] uppercase rounded-lg hover:bg-emerald-500 hover:text-black transition-all"
                                    >
                                        Go
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#131619] border border-gray-800 w-full max-w-md rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl">
                            <div className="p-8 border-b border-gray-800 flex items-center gap-4 bg-gradient-to-r from-red-500/10 to-transparent">
                                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-xl">
                                    <FaExclamationTriangle />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white italic uppercase">Bounce Cheque</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Provide a reason for rejection</p>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Rejected Date</label>
                                    <input
                                        type="date"
                                        value={rejectDate}
                                        onChange={(e) => setRejectDate(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-2.5 px-4 text-gray-400 font-bold text-[10px] outline-none focus:border-red-500/50 transition-all uppercase mb-4"
                                    />
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Reason</label>
                                    <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        placeholder="e.g. Insufficient Funds, Signature Mismatch..."
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-gray-200 font-bold text-xs uppercase tracking-widest outline-none focus:border-red-500/50 transition-all min-h-[120px] resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-8 border-t border-gray-800 flex gap-4 bg-black/40">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectReason("");
                                    }}
                                    className="flex-1 py-3 bg-gray-800 text-gray-300 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRejectCheque}
                                    className="flex-1 py-3 bg-red-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Confirm Bounce
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clear Modal */}
                {showClearModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#131619] border border-gray-800 w-full max-w-md rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300 shadow-2xl">
                            <div className="p-8 border-b border-gray-800 flex items-center gap-4 bg-gradient-to-r from-emerald-500/10 to-transparent">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-xl">
                                    <FaCheckCircle />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white italic uppercase">Clear Cheque</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Confirm clearing details</p>
                                </div>
                            </div>
                            <div className="p-8">
                                <div className="mb-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cleared Date</label>
                                    <input
                                        type="date"
                                        value={clearDate}
                                        onChange={(e) => setClearDate(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-800 rounded-xl py-2.5 px-4 text-gray-400 font-bold text-[10px] outline-none focus:border-emerald-500/50 transition-all uppercase"
                                    />
                                </div>
                            </div>
                            <div className="p-8 border-t border-gray-800 flex gap-4 bg-black/40">
                                <button
                                    onClick={() => {
                                        setShowClearModal(false);
                                        setClearDate(new Date().toISOString().split('T')[0]);
                                    }}
                                    className="flex-1 py-3 bg-gray-800 text-gray-300 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearCheque}
                                    className="flex-1 py-3 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    Confirm Clear
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
