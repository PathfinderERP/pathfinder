import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaInbox, FaExchangeAlt, FaLock, FaBuilding, FaUser, FaHistory, FaCheckCircle, FaTimes, FaSearch, FaFilter, FaHashtag, FaFileAlt, FaFileExcel, FaCalendarAlt } from "react-icons/fa";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";

const CashReceive = () => {
    const { isDarkMode } = useTheme();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [processing, setProcessing] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [centres, setCentres] = useState([]);

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
        if (!passwordInput) return toast.warn("Password is required");

        try {
            setProcessing(true);
            const token = localStorage.getItem("token");
            await axios.post(`${import.meta.env.VITE_API_URL}/finance/cash/confirm-receive`, {
                transferId: selectedRequest._id,
                password: passwordInput.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Cash receipt confirmed successfully!");
            setIsModalOpen(false);
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.message || "Invalid password or verification failed");
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
            "Remarks": req.remarks || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Incoming Cash");

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(data, `Incoming_Cash_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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

    return (
        <Layout activePage="Cash Receive">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-colors duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Incoming <span className="text-cyan-500">Cash</span>
                        </h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Verify and acknowledge cash transfers assigned to your center
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <select
                                className={`border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-cyan-500 transition-all outline-none appearance-none min-w-[150px] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-700 shadow-sm'}`}
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>All Statuses</option>
                                <option value="PENDING" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Pending Only</option>
                                <option value="RECEIVED" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Received Only</option>
                                <option value="REJECTED" className={isDarkMode ? 'bg-[#1a1f24]' : ''}>Rejected Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className={`border p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-center shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="relative flex-1 w-full">
                        <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select
                            className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-[11px] appearance-none ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
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
                            className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-[11px] appearance-none ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
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
                            className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                            value={filters.serialNumber}
                            onChange={(e) => setFilters({ ...filters, serialNumber: e.target.value })}
                        />
                    </div>
                    <div className="relative flex-1 w-full">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Reference Number..."
                            className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                            value={filters.referenceNumber}
                            onChange={(e) => setFilters({ ...filters, referenceNumber: e.target.value })}
                        />
                    </div>
                    <div className="relative flex-1 w-full flex gap-4">
                        <div className="relative flex-1">
                            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="date"
                                className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm [color-scheme:dark] ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                title="Start Date"
                            />
                        </div>
                        <div className="relative flex-1">
                            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="date"
                                className={`w-full border rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-cyan-500 transition-all text-sm [color-scheme:dark] ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                title="End Date"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={exportToExcel}
                            className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                            title="Export to Excel"
                        >
                            <FaFileExcel />
                            <span className="hidden md:inline">Export</span>
                        </button>
                        <button
                            onClick={resetFilters}
                            className={`p-3 border rounded-xl text-gray-500 hover:text-white transition-all shrink-0 ${isDarkMode ? 'bg-white/5 border-gray-700 hover:bg-gray-800' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 shadow-sm'}`}
                            title="Reset Filters"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Table View */}
                <div className={`border rounded-[2.5rem] overflow-hidden shadow-2xl mt-8 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                    <th className="p-8">Serial #</th>
                                    <th className="p-8">Origin Node</th>
                                    <th className="p-8 text-right">Amount</th>
                                    <th className="p-8">Reference</th>
                                    <th className="p-8">Status</th>
                                    <th className="p-8">Collection Period</th>
                                    <th className="p-8">Debited</th>
                                    <th className="p-8">Timestamp</th>
                                    <th className="p-8 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 uppercase text-[10px] tracking-widest font-black italic animate-pulse">Scanning Ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : requests.length > 0 ? (
                                    requests.map((req) => (
                                        <tr key={req._id} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5 bg-transparent' : 'hover:bg-gray-50 bg-white'}`}>
                                            <td className="p-8">
                                                <span className="text-cyan-400 font-black font-mono tracking-widest">#{req.serialNumber}</span>
                                            </td>
                                            <td className="p-8">
                                                <div>
                                                    <span className={`font-black block text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{req.fromCentre?.centreName}</span>
                                                    <span className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-2 mt-1 tracking-widest">
                                                        <FaUser className="text-[8px] text-cyan-500" /> {req.transferredBy?.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-8 text-right">
                                                <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{req.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="p-8">
                                                <div className="space-y-1">
                                                    <span className={`font-mono text-xs block font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{req.referenceNumber || 'N/A'}</span>
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black">A/C: {req.accountNumber}</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
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
                                            <td className="p-8">
                                                <div className="space-y-1">
                                                    <span className={`text-[10px] font-black block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {req.fromDate ? new Date(req.fromDate).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                    <span className="text-[8px] text-cyan-500 uppercase tracking-widest font-black">TO</span>
                                                    <span className={`text-[10px] font-black block ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {req.toDate ? new Date(req.toDate).toLocaleDateString() : 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`p-8 text-[11px] font-black whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {req.debitedDate ? new Date(req.debitedDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className={`p-8 text-[11px] font-black whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {new Date(req.transferDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-8 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    {req.receiptFile && (
                                                        <a
                                                            href={req.receiptFile}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`p-3 rounded-xl hover:bg-cyan-600 hover:text-white transition-all border shadow-lg ${isDarkMode ? 'bg-white/5 text-cyan-400 border-gray-700' : 'bg-white text-cyan-600 border-gray-200 hover:shadow-cyan-200'}`}
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
                                                                className="px-5 py-2.5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg active:scale-95"
                                                            >
                                                                Reject
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenModal(req)}
                                                                className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all"
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
                                        <td colSpan="9" className="p-24 text-center text-gray-500 font-black uppercase text-[10px] tracking-[0.3em] italic">
                                            No incoming movements found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Verification Modal (Passcode) */}
                {isModalOpen && (
                    <div className={`fixed inset-0 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isDarkMode ? 'bg-black/90' : 'bg-gray-900/40'}`}>
                        <div className={`border p-10 rounded-[3rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#0f1215] border-gray-800 shadow-[0_0_100px_rgba(6,182,212,0.1)]' : 'bg-white border-gray-200 shadow-cyan-900/10'}`}>
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h2 className={`text-3xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Security <span className="text-cyan-500">Release</span></h2>
                                    <button onClick={() => !processing && setIsModalOpen(false)} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'}`}>
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className={`border p-8 rounded-[2rem] space-y-4 text-center shadow-inner ${isDarkMode ? 'bg-white/5 border-cyan-500/10' : 'bg-cyan-50 border-cyan-100'}`}>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">Awaiting Funds From</p>
                                    <h4 className="text-cyan-400 font-black text-xl tracking-tight">{selectedRequest?.fromCentre?.centreName}</h4>
                                    <div className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{selectedRequest?.amount.toLocaleString()}</div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Authenticator Code</label>
                                    <input
                                        type="text"
                                        placeholder="••••••"
                                        className={`w-full border-2 rounded-[2rem] py-6 text-4xl tracking-[0.8em] font-mono focus:outline-none focus:border-cyan-500 transition-all text-center placeholder:opacity-20 shadow-inner ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        maxLength={6}
                                    />
                                </div>

                                <button
                                    onClick={handleConfirmReceive}
                                    disabled={processing}
                                    className="w-full bg-cyan-600 text-white font-black py-6 rounded-[2rem] hover:bg-cyan-500 transition-all shadow-xl shadow-cyan-600/20 active:scale-95 disabled:opacity-50 text-[11px] uppercase tracking-widest"
                                >
                                    {processing ? "VERIFYING SECURITY..." : "CONFIRM FISCAL RECEIPT"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rejection Modal */}
                {isRejectModalOpen && (
                    <div className={`fixed inset-0 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isDarkMode ? 'bg-black/90' : 'bg-gray-900/40'}`}>
                        <div className={`border p-10 rounded-[3rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 ${isDarkMode ? 'bg-[#0f1215] border-gray-800 shadow-[0_0_100px_rgba(239,68,68,0.1)]' : 'bg-white border-gray-200 shadow-red-900/10'}`}>
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h2 className={`text-3xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reject <span className="text-red-500">Transfer</span></h2>
                                    <button onClick={() => !processing && setIsRejectModalOpen(false)} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900 shadow-sm'}`}>
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className={`border p-8 rounded-[2rem] space-y-4 text-center shadow-inner ${isDarkMode ? 'bg-white/5 border-red-500/10' : 'bg-red-50 border-red-100'}`}>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">Rejecting Amount From</p>
                                    <h4 className="text-red-400 font-black text-xl tracking-tight">{selectedRequest?.fromCentre?.centreName}</h4>
                                    <div className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{selectedRequest?.amount.toLocaleString()}</div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Reason for Rejection</label>
                                    <textarea
                                        className={`w-full border-2 rounded-[2rem] p-6 text-sm focus:outline-none focus:border-red-500 transition-all resize-none shadow-inner ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                        rows="4"
                                        placeholder="Explain why this transfer is being rejected..."
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleRejectTransfer}
                                    disabled={processing}
                                    className="w-full bg-red-600 text-white font-black py-6 rounded-[2rem] hover:bg-red-500 transition-all shadow-xl shadow-red-600/20 active:scale-95 disabled:opacity-50 text-[11px] uppercase tracking-widest"
                                >
                                    {processing ? "PROCESSING REJECTION..." : "CONFIRM FISCAL REJECTION"}
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
