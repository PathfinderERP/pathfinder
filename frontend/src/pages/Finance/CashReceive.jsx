import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { hasPermission } from "../../config/permissions";
import { FaInbox, FaExchangeAlt, FaLock, FaBuilding, FaUser, FaHistory, FaCheckCircle, FaTimes, FaSearch, FaFilter, FaHashtag, FaFileAlt } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";

const CashReceive = () => {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [processing, setProcessing] = useState(false);
    const [centres, setCentres] = useState([]);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canReceiveCash = hasPermission(user, 'financeFees', 'cashReceive', 'create');

    // Filters
    const [filters, setFilters] = useState({
        serialNumber: "",
        referenceNumber: "",
        status: "PENDING",
        centreId: "" // Target centre filter
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
            setCentres(res.data);
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

    return (
        <Layout activePage="Cash Receive">
            <div className="p-4 md:p-6 space-y-8 animate-in fade-in duration-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Incoming Cash</h1>
                        <p className="text-gray-400 mt-1">Verify and acknowledge cash transfers assigned to your center</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <select
                                className="bg-gray-800/80 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-cyan-500 transition-all outline-none appearance-none min-w-[150px]"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="PENDING">Pending Only</option>
                                <option value="RECEIVED">Received Only</option>
                                <option value="">All Transfers</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-gray-900/40 backdrop-blur-md border border-gray-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-xl">
                    <div className="relative flex-1 w-full">
                        <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm appearance-none"
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
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                            value={filters.serialNumber}
                            onChange={(e) => setFilters({ ...filters, serialNumber: e.target.value })}
                        />
                    </div>
                    <div className="relative flex-1 w-full">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Reference Number..."
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                            value={filters.referenceNumber}
                            onChange={(e) => setFilters({ ...filters, referenceNumber: e.target.value })}
                        />
                    </div>
                    <button
                        onClick={() => setFilters({ serialNumber: "", referenceNumber: "", status: "PENDING", centreId: "" })}
                        className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-all shrink-0"
                        title="Reset Filters"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Table View */}
                <div className="bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/80 border-b border-gray-700">
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Serial #</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Origin Node</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Amount</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Reference</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Timestamp</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Scanning Ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : requests.length > 0 ? (
                                    requests.map((req) => (
                                        <tr key={req._id} className="hover:bg-gray-800/30 transition-all group">
                                            <td className="p-5">
                                                <span className="text-cyan-400 font-black font-mono">#{req.serialNumber}</span>
                                            </td>
                                            <td className="p-5">
                                                <div>
                                                    <span className="text-white font-bold block">{req.fromCentre?.centreName}</span>
                                                    <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1 mt-1">
                                                        <FaUser className="text-[8px]" /> {req.transferredBy?.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <span className="text-lg font-black text-white">₹{req.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="p-5">
                                                <div className="space-y-1">
                                                    <span className="text-gray-300 font-mono text-xs block">{req.referenceNumber || 'N/A'}</span>
                                                    <span className="text-[9px] text-gray-500 uppercase tracking-tighter">A/C: {req.accountNumber}</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                {req.status === "PENDING" ? (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                        Transit
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        <FaCheckCircle />
                                                        Received
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-5 text-xs text-gray-400 font-bold">
                                                {new Date(req.transferDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {req.receiptFile && (
                                                        <a
                                                            href={req.receiptFile}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 bg-gray-800 text-cyan-400 rounded-xl hover:bg-cyan-600 hover:text-white transition-all border border-gray-700"
                                                            title="View Evidence"
                                                        >
                                                            <FaFileAlt />
                                                        </a>
                                                    )}
                                                    {req.status === "PENDING" && canReceiveCash && (
                                                        <button
                                                            onClick={() => handleOpenModal(req)}
                                                            className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all"
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-[0.3em] italic">
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
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-gray-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-white">Security Release</h2>
                                    <button onClick={() => !processing && setIsModalOpen(false)} className="p-2 bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
                                        <FaTimes />
                                    </button>
                                </div>

                                <div className="bg-cyan-500/5 border border-cyan-500/10 p-6 rounded-3xl space-y-4 text-center">
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic">Awaiting Funds From</p>
                                    <h4 className="text-cyan-400 font-black text-lg">{selectedRequest?.fromCentre?.centreName}</h4>
                                    <div className="text-3xl font-black text-white">₹{selectedRequest?.amount.toLocaleString()}</div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Authenticator Code</label>
                                    <input
                                        type="text"
                                        placeholder="••••••"
                                        className="w-full bg-gray-800 border-2 border-gray-700 rounded-2xl py-5 text-white text-3xl tracking-[0.6em] font-mono focus:outline-none focus:border-cyan-500 transition-all text-center placeholder:opacity-20"
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        maxLength={6}
                                    />
                                </div>

                                <button
                                    onClick={handleConfirmReceive}
                                    disabled={processing}
                                    className="w-full bg-cyan-600 text-white font-black py-5 rounded-3xl hover:bg-cyan-500 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    {processing ? "VERIFYING..." : "CONFIRM RECEIPT"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CashReceive;
