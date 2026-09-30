import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { 
    FaInbox, FaExchangeAlt, FaLock, FaBuilding, FaUser, FaHistory, 
    FaCheckCircle, FaTimes, FaSearch, FaFilter, FaHashtag, FaFileAlt, 
    FaFileExcel, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaEye,
    FaGraduationCap, FaReceipt, FaRupeeSign
} from "react-icons/fa";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";

const CashReceive = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [processing, setProcessing] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [centres, setCentres] = useState([]);

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Student Breakdown Modal States
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [selectedTransferForStudents, setSelectedTransferForStudents] = useState(null);
    const [studentBreakdown, setStudentBreakdown] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState("");

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canReceiveCash = hasPermission(user, 'financeFees', 'cashReceive', 'create');

    // Filters
    const [filters, setFilters] = useState({
        serialNumber: "",
        referenceNumber: "",
        status: "",
        centreId: "", // Target Centre
        fromCentreId: "", // Origin Centre
        startDate: "",
        endDate: ""
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        fetchRequests();
    }, [filters]);

    const fetchInitialData = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const filteredCentres = Array.isArray(res.data)
                ? res.data.filter(c =>
                    user.role === 'superAdmin' ||
                    (user.centres && user.centres.some(uc => uc._id === c._id || uc.centreName === c.centreName))
                )
                : [];
            setCentres(filteredCentres);
        } catch (error) {
            console.error("Failed to fetch centres");
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (filters.serialNumber) params.append("serialNumber", filters.serialNumber);
            if (filters.referenceNumber) params.append("referenceNumber", filters.referenceNumber);
            if (filters.status) params.append("status", filters.status);
            if (filters.centreId) params.append("centreId", filters.centreId);
            if (filters.fromCentreId) params.append("fromCentreId", filters.fromCentreId);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);

            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/cash/receive-requests?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(response.data);
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
            } else {
                toast.error("Failed to load receive requests");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (req) => {
        setSelectedRequest(req);
        setIsModalOpen(true);
        setPasswordInput("");
    };

    const handleConfirmReceive = async () => {
        try {
            setProcessing(true);
            const token = localStorage.getItem("token");
            await axios.post(`${import.meta.env.VITE_API_URL}/finance/cash/confirm-receive`, {
                transferId: selectedRequest._id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Cash receipt confirmed successfully!");
            setIsModalOpen(false);
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || "Verification failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleRejectTransfer = async () => {
        try {
            setProcessing(true);
            const token = localStorage.getItem("token");
            await axios.post(`${import.meta.env.VITE_API_URL}/finance/cash/reject-transfer`, {
                transferId: selectedRequest._id,
                reason: rejectReason
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Cash transfer rejected and returned to sender");
            setIsRejectModalOpen(false);
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || "Rejection failed");
        } finally {
            setProcessing(false);
        }
    };

    const exportToExcel = () => {
        if (requests.length === 0) return toast.info("No data to export");

        const dataToExport = requests.map(req => ({
            "Serial #": req.serialNumber,
            "Origin Node": req.fromCentre?.centreName,
            "Target Node": req.toCentre?.centreName,
            "Transferred By": req.transferredBy?.name,
            "Amount": req.amount,
            "Reference": req.referenceNumber || "N/A",
            "Account": req.accountNumber,
            "Status": req.status,
            "Debited Date": req.debitedDate ? new Date(req.debitedDate).toLocaleDateString() : "N/A",
            "From Collection": req.fromDate ? new Date(req.fromDate).toLocaleDateString() : "N/A",
            "To Collection": req.toDate ? new Date(req.toDate).toLocaleDateString() : "N/A",
            "Transfer Date": new Date(req.transferDate).toLocaleDateString(),
            "Accepted By": req.receivedBy?.name || "N/A",
            "Accepted Date": req.receivedDate ? new Date(req.receivedDate).toLocaleDateString() : "N/A",
            "Remarks": req.remarks || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Incoming Cash");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `Incoming_Cash_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleOpenStudentBreakdown = async (req) => {
        setSelectedTransferForStudents(req);
        setIsStudentModalOpen(true);
        setLoadingStudents(true);
        setStudentBreakdown([]);
        setStudentSearchQuery("");

        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/finance/cash/transfer-students/${req._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.students) {
                setStudentBreakdown(res.data.students);
            }
        } catch (error) {
            console.error("Failed to fetch student cash breakdown:", error);
            toast.error(error.response?.data?.message || "Failed to load student cash details");
        } finally {
            setLoadingStudents(false);
        }
    };

    const exportStudentBreakdownToExcel = () => {
        if (!studentBreakdown || studentBreakdown.length === 0) {
            return toast.info("No student breakdown records to export");
        }

        const dataToExport = studentBreakdown.map((s, idx) => ({
            "Sl No": idx + 1,
            "Receiving Date": s.receivingDate ? new Date(s.receivingDate).toLocaleDateString() : "—",
            "Student Name": s.studentName || "—",
            "Enrollment No": s.enrollmentNo || "—",
            "Bill No": s.billNo || "—",
            "Amount (₹)": s.amount || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student Breakdown");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `Student_Cash_Breakdown_${selectedTransferForStudents?.serialNumber || 'Transfer'}.xlsx`);
    };

    const resetFilters = () => {
        setFilters({
            serialNumber: "",
            referenceNumber: "",
            status: "",
            centreId: "",
            fromCentreId: "",
            startDate: "",
            endDate: ""
        });
    };

    // Pagination calculations
    const totalRequests = requests.length;
    const totalPages = Math.ceil(totalRequests / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRequests);
    const paginatedRequests = requests.slice(startIndex, endIndex);

    // Filter students inside modal
    const filteredStudentBreakdown = studentBreakdown.filter(s => {
        if (!studentSearchQuery) return true;
        const q = studentSearchQuery.toLowerCase();
        return (
            (s.studentName && s.studentName.toLowerCase().includes(q)) ||
            (s.enrollmentNo && s.enrollmentNo.toLowerCase().includes(q)) ||
            (s.billNo && s.billNo.toLowerCase().includes(q))
        );
    });

    return (
        <Layout activePage="Cash Receive">
            <div className="p-4 md:p-6 space-y-8 animate-in fade-in duration-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>Incoming Cash</h1>
                        <p className="text-gray-400 mt-1">Verify and acknowledge cash transfers assigned to your center</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <select
                                className={`border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-cyan-500 transition-all outline-none appearance-none min-w-[150px] ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">All Statuses</option>
                                <option value="PENDING">Pending Only</option>
                                <option value="RECEIVED">Received Only</option>
                                <option value="REJECTED">Rejected Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className={`backdrop-blur-md border p-4 rounded-2xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-center shadow-xl ${isDarkMode ? "bg-gray-900/40 border-gray-800" : "bg-white border-gray-200"}`}>
                    <div className="relative flex-1 w-full">
                        <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select
                            className={`w-full border rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-[11px] appearance-none ${isDarkMode ? "bg-gray-800/50 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            value={filters.fromCentreId}
                            onChange={(e) => setFilters({ ...filters, fromCentreId: e.target.value })}
                        >
                            <option value="">All Origin Nodes</option>
                            {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 w-full">
                        <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select
                            className={`w-full border rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-[11px] appearance-none ${isDarkMode ? "bg-gray-800/50 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            value={filters.centreId}
                            onChange={(e) => setFilters({ ...filters, centreId: e.target.value })}
                        >
                            <option value="">All Target Centres</option>
                            {centres.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                        </select>
                    </div>
                    <div className="relative flex-1 w-full">
                        <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Serial Number..."
                            className={`w-full border rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm ${isDarkMode ? "bg-gray-800/50 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            value={filters.serialNumber}
                            onChange={(e) => setFilters({ ...filters, serialNumber: e.target.value })}
                        />
                    </div>
                    <div className="relative flex-1 w-full">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Reference Number..."
                            className={`w-full border rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm ${isDarkMode ? "bg-gray-800/50 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                            value={filters.referenceNumber}
                            onChange={(e) => setFilters({ ...filters, referenceNumber: e.target.value })}
                        />
                    </div>
                    <div className="relative flex-1 w-full flex gap-4">
                        <div className="relative flex-1">
                            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="date"
                                className={`w-full border rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm ${isDarkMode ? "bg-gray-800/50 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                title="Start Date"
                            />
                        </div>
                        <div className="relative flex-1">
                            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="date"
                                className={`w-full border rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm ${isDarkMode ? "bg-gray-800/50 border-gray-700 text-white [color-scheme:dark]" : "bg-white border-gray-300 text-gray-800"}`}
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                title="End Date"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={exportToExcel}
                            className="p-2.5 bg-emerald-600/20 border border-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 text-sm font-bold"
                            title="Export to Excel"
                        >
                            <FaFileExcel />
                            <span className="hidden md:inline">Export</span>
                        </button>
                        <button
                            onClick={resetFilters}
                            className={`p-2.5 border rounded-xl transition-all shrink-0 ${isDarkMode ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-gray-900"}`}
                            title="Reset Filters"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Table View */}
                <div className={`backdrop-blur-md border rounded-3xl overflow-hidden shadow-2xl ${isDarkMode ? "bg-gray-900/40 border-gray-800" : "bg-white border-gray-200"}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-500"}`}>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Serial #</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Origin Node</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-right">Amount</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Reference</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Collection Period</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Debited</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Timestamp</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em]">Accepted By</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-200"}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="10" className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Scanning Ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedRequests.length > 0 ? (
                                    paginatedRequests.map((req) => (
                                        <tr key={req._id} className={`transition-all group ${isDarkMode ? "hover:bg-gray-800/30" : "hover:bg-gray-50"}`}>
                                            <td className="p-5">
                                                <span className="text-cyan-400 font-black font-mono">#{req.serialNumber}</span>
                                            </td>
                                            <td className="p-5">
                                                <div>
                                                    <span className={`font-bold block ${isDarkMode ? "text-white" : "text-gray-900"}`}>{req.fromCentre?.centreName}</span>
                                                    <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1 mt-1">
                                                        <FaUser className="text-[8px]" /> {req.transferredBy?.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenStudentBreakdown(req)}
                                                    className={`group/amt inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-cyan-500/40 hover:bg-cyan-500/10 cursor-pointer ${isDarkMode ? "hover:shadow-cyan-500/10" : "hover:bg-cyan-50"}`}
                                                    title="Click to view student cash payment breakdown"
                                                >
                                                    <span className={`text-lg font-black transition-colors group-hover/amt:text-cyan-400 group-hover/amt:underline ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                                        ₹{req.amount.toLocaleString()}
                                                    </span>
                                                    <span className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] opacity-70 group-hover/amt:opacity-100 transition-opacity">
                                                        <FaEye />
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="p-5">
                                                <div className="space-y-1">
                                                    <span className={`font-mono text-xs block ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{req.referenceNumber || 'N/A'}</span>
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-tighter">A/C: {req.accountNumber}</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                {req.status === "PENDING" ? (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                        Transit
                                                    </div>
                                                ) : req.status === "REJECTED" ? (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                                                        <FaTimes />
                                                        Rejected
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        <FaCheckCircle />
                                                        Received
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <div className="space-y-1">
                                                    <span className={`text-[10px] font-bold block ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                                        {req.fromDate ? new Date(req.fromDate).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                    <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black">TO</span>
                                                    <span className={`text-[10px] font-bold block ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                                        {req.toDate ? new Date(req.toDate).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`p-5 text-xs font-bold whitespace-nowrap ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                                {req.debitedDate ? new Date(req.debitedDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className={`p-5 text-xs font-bold whitespace-nowrap ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                                                {new Date(req.transferDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-2">
                                                    {req.receivedBy ? (
                                                        <div className="flex flex-col">
                                                            <span className={`font-black text-[10px] uppercase tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>{req.receivedBy.name}</span>
                                                            <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                                <FaCheckCircle size={8} /> {req.receivedDate ? new Date(req.receivedDate).toLocaleDateString() : 'Confirmed'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest italic animate-pulse">Waiting...</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {req.receiptFile && (
                                                        <a
                                                            href={req.receiptFile}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`p-2 rounded-xl hover:bg-cyan-600 hover:text-white transition-all border ${isDarkMode ? "bg-gray-800 text-cyan-400 border-gray-700" : "bg-white text-cyan-600 border-gray-300"}`}
                                                            title="View Evidence"
                                                        >
                                                            <FaFileAlt />
                                                        </a>
                                                    )}
                                                    {req.status === "PENDING" && canReceiveCash && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRequest(req);
                                                                    setIsRejectModalOpen(true);
                                                                    setRejectReason("");
                                                                }}
                                                                className="px-4 py-2 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
                                                            >
                                                                Reject
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenModal(req)}
                                                                className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all cursor-pointer"
                                                            >
                                                                Confirm
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="10" className="p-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-[0.3em] italic">
                                            No incoming movements found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalRequests > 0 && (
                        <div className={`p-4 md:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkMode ? "border-gray-800 bg-gray-900/60" : "border-gray-200 bg-gray-50"}`}>
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                <span>
                                    Showing <strong className={isDarkMode ? "text-white" : "text-gray-900"}>{totalRequests > 0 ? startIndex + 1 : 0}</strong> to <strong className={isDarkMode ? "text-white" : "text-gray-900"}>{endIndex}</strong> of <strong className={isDarkMode ? "text-white" : "text-gray-900"}>{totalRequests}</strong> movements
                                </span>
                                <div className="flex items-center gap-1.5 ml-2">
                                    <label htmlFor="pageSizeSelect" className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Rows:</label>
                                    <select
                                        id="pageSizeSelect"
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className={`border rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer ${isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
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
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                                        isDarkMode 
                                            ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" 
                                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                                    }`}
                                    title="Previous Page"
                                >
                                    <FaChevronLeft className="text-[10px]" />
                                    <span className="hidden sm:inline">Prev</span>
                                </button>

                                {/* Page Numbers */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                            if (totalPages <= 7) return true;
                                            if (page === 1 || page === totalPages) return true;
                                            if (Math.abs(page - currentPage) <= 1) return true;
                                            return false;
                                        })
                                        .reduce((acc, page, idx, arr) => {
                                            if (idx > 0 && page - arr[idx - 1] > 1) {
                                                acc.push(-idx);
                                            }
                                            acc.push(page);
                                            return acc;
                                        }, [])
                                        .map((page, idx) => {
                                            if (page < 0) {
                                                return <span key={`ellipsis-${idx}`} className="px-1 text-gray-500 font-black text-xs">...</span>;
                                            }
                                            const isActive = page === currentPage;
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                        isActive
                                                            ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                                                            : isDarkMode
                                                                ? "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                                                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })
                                    }
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed ${
                                        isDarkMode 
                                            ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" 
                                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                                    }`}
                                    title="Next Page"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <FaChevronRight className="text-[10px]" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Verification Modal (Passcode removed) */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className={`border p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-950"}`}>
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Confirm Cash Receipt</h2>
                                    <button onClick={() => !processing && setIsModalOpen(false)} className={`p-2 rounded-xl text-gray-400 hover:text-white transition-colors ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className={`border p-6 rounded-3xl space-y-4 text-center ${isDarkMode ? "bg-cyan-500/5 border-cyan-500/10" : "bg-cyan-50 border-cyan-200"}`}>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">Awaiting Funds From</p>
                                    <h4 className="text-cyan-400 font-black text-lg">{selectedRequest?.fromCentre?.centreName}</h4>
                                    <div className={`text-3xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>₹{selectedRequest?.amount.toLocaleString()}</div>
                                </div>

                                <p className={`text-sm text-center ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Please verify that the cash has been physically received before confirming.</p>

                                <button
                                    onClick={handleConfirmReceive}
                                    disabled={processing}
                                    className="w-full bg-cyan-600 text-white font-black py-4 rounded-3xl hover:bg-cyan-500 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? "CONFIRMING..." : "CONFIRM RECEIPT"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rejection Modal */}
                {isRejectModalOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className={`border p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-950"}`}>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Reject Transfer</h2>
                                    <button onClick={() => !processing && setIsRejectModalOpen(false)} className={`p-2 rounded-xl text-gray-400 hover:text-white transition-colors ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className={`border p-6 rounded-3xl space-y-2 text-center ${isDarkMode ? "bg-red-500/5 border-red-500/10" : "bg-red-50 border-red-200"}`}>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">Rejecting Amount From</p>
                                    <h4 className="text-red-400 font-black text-lg">{selectedRequest?.fromCentre?.centreName}</h4>
                                    <div className={`text-3xl font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>₹{selectedRequest?.amount.toLocaleString()}</div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Reason for Rejection</label>
                                    <textarea
                                        className={`w-full border rounded-2xl p-4 text-sm focus:outline-none focus:border-red-500 transition-all resize-none ${isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-800"}`}
                                        rows="3"
                                        placeholder="Explain why this transfer is being rejected..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleRejectTransfer}
                                    disabled={processing}
                                    className="w-full bg-red-600 text-white font-black py-4 rounded-3xl hover:bg-red-500 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? "REJECTING..." : "CONFIRM REJECTION"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Student Breakdown Modal */}
                {isStudentModalOpen && selectedTransferForStudents && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                        <div className={`border rounded-[2.5rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-300 ${isDarkMode ? "bg-gray-900 border-gray-800 text-white" : "bg-white border-gray-200 text-gray-950"}`}>
                            {/* Modal Header */}
                            <div className={`p-6 md:p-8 border-b flex items-start justify-between gap-4 ${isDarkMode ? "border-gray-800 bg-gray-900/80" : "border-gray-200 bg-gray-50/80"}`}>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            <FaReceipt className="text-xl" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl md:text-2xl font-black">Student Cash Details</h2>
                                                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono font-black text-xs border border-cyan-500/20">
                                                    #{selectedTransferForStudents.serialNumber}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Cash collected from students at <strong className={isDarkMode ? "text-gray-200" : "text-gray-800"}>{selectedTransferForStudents.fromCentre?.centreName}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Transfer Context Badges */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <span className="text-[11px] px-3 py-1 rounded-xl bg-gray-800/80 text-gray-300 border border-gray-700 font-medium flex items-center gap-1.5">
                                            <FaCalendarAlt className="text-cyan-400 text-[10px]" />
                                            <span>Collection:</span>
                                            <strong className="text-white">
                                                {selectedTransferForStudents.fromDate ? new Date(selectedTransferForStudents.fromDate).toLocaleDateString() : 'N/A'}
                                            </strong>
                                            <span>to</span>
                                            <strong className="text-white">
                                                {selectedTransferForStudents.toDate ? new Date(selectedTransferForStudents.toDate).toLocaleDateString() : 'N/A'}
                                            </strong>
                                        </span>

                                        <span className="text-[11px] px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-black">
                                            Transfer Amount: ₹{selectedTransferForStudents.amount?.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsStudentModalOpen(false)}
                                    className={`p-2.5 rounded-2xl text-gray-400 hover:text-white transition-all cursor-pointer ${isDarkMode ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-100 hover:bg-gray-200"}`}
                                    title="Close dialog"
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Search and Action Toolbar */}
                            <div className={`p-4 md:px-8 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${isDarkMode ? "border-gray-800 bg-gray-950/40" : "border-gray-100 bg-gray-50/40"}`}>
                                <div className="relative flex-1 max-w-md">
                                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                                    <input
                                        type="text"
                                        placeholder="Search by student name, enrollment no, or bill no..."
                                        value={studentSearchQuery}
                                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                                        className={`w-full border rounded-xl py-2 pl-10 pr-4 text-xs font-medium outline-none focus:border-cyan-500 transition-all ${
                                            isDarkMode ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-800 placeholder-gray-400"
                                        }`}
                                    />
                                    {studentSearchQuery && (
                                        <button
                                            onClick={() => setStudentSearchQuery("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            <FaTimes className="text-xs" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-bold text-gray-400">
                                        {filteredStudentBreakdown.length} of {studentBreakdown.length} Student{studentBreakdown.length !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={exportStudentBreakdownToExcel}
                                        disabled={studentBreakdown.length === 0}
                                        className="px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                        title="Export student cash list to Excel"
                                    >
                                        <FaFileExcel className="text-xs" />
                                        <span>Export Excel</span>
                                    </button>
                                </div>
                            </div>

                            {/* Table Content (Scrollable) */}
                            <div className="overflow-y-auto flex-1 p-4 md:p-8">
                                {loadingStudents ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                                        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                            Fetching student cash receipts...
                                        </p>
                                    </div>
                                ) : filteredStudentBreakdown.length > 0 ? (
                                    <div className={`border rounded-2xl overflow-hidden shadow-sm ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-600"}`}>
                                                    <th className="p-4 w-12 text-center">#</th>
                                                    <th className="p-4">Receiving Date</th>
                                                    <th className="p-4">Student Name</th>
                                                    <th className="p-4">Enrollment No.</th>
                                                    <th className="p-4">Bill No.</th>
                                                    <th className="p-4 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y text-xs ${isDarkMode ? "divide-gray-800" : "divide-gray-200"}`}>
                                                {filteredStudentBreakdown.map((student, idx) => (
                                                    <tr key={student._id || idx} className={`transition-all ${isDarkMode ? "hover:bg-gray-800/40" : "hover:bg-gray-50"}`}>
                                                        <td className="p-4 text-center font-mono text-gray-500 font-bold">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-1.5 font-bold">
                                                                <FaCalendarAlt className="text-gray-500 text-[10px]" />
                                                                <span>{student.receivingDate ? new Date(student.receivingDate).toLocaleDateString('en-GB') : "—"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-black">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`p-1 rounded-md text-[10px] ${isDarkMode ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-100 text-cyan-700"}`}>
                                                                    <FaUser />
                                                                </span>
                                                                <span className={`capitalize ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                                                    {student.studentName}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono font-bold">
                                                            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px]">
                                                                {student.enrollmentNo || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 font-mono font-bold">
                                                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px]">
                                                                {student.billNo || "—"}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right font-black">
                                                            <span className={`text-sm ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                                                                ₹{Number(student.amount || 0).toLocaleString()}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-16 text-center">
                                        <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-800 flex items-center justify-center text-gray-500 mb-3">
                                            <FaReceipt className="text-xl" />
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-300">No Student Cash Records Found</h4>
                                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                            {studentSearchQuery 
                                                ? `No students matching "${studentSearchQuery}". Try clearing search.` 
                                                : "No cash collection records from individual students found in this collection date window."}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer Summary */}
                            <div className={`p-4 md:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkMode ? "border-gray-800 bg-gray-950" : "border-gray-200 bg-gray-50"}`}>
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="text-xs">
                                        <span className="text-gray-400">Total Students: </span>
                                        <strong className="text-cyan-400 font-black">{studentBreakdown.length}</strong>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-gray-400">Calculated Cash: </span>
                                        <strong className="text-emerald-400 font-black text-sm">
                                            ₹{studentBreakdown.reduce((sum, s) => sum + (s.amount || 0), 0).toLocaleString()}
                                        </strong>
                                    </div>
                                    <div className="text-xs">
                                        <span className="text-gray-400">Transfer Slip Amount: </span>
                                        <strong className="text-white font-black text-sm">
                                            ₹{selectedTransferForStudents.amount?.toLocaleString()}
                                        </strong>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsStudentModalOpen(false)}
                                    className="px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout >
    );
};

export default CashReceive;
