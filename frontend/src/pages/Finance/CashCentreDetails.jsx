import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaArrowLeft, FaExchangeAlt, FaBuilding, FaSearch, FaFilter, FaArrowUp, FaArrowDown, FaFileInvoiceDollar, FaRegClock, FaCheckCircle, FaHashtag, FaFileAlt, FaTimes, FaCalendarAlt, FaUser } from "react-icons/fa";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const CashCentreDetails = () => {
    const { centreId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [transfers, setTransfers] = useState([]);
    const [centreInfo, setCentreInfo] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        serialNumber: "",
        referenceNumber: "",
        accountNumber: "",
        startDate: "",
        endDate: "",
        type: "ALL" // ALL, SENT, RECEIVED
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [centreId, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            const params = new URLSearchParams();
            if (filters.serialNumber) params.append("serialNumber", filters.serialNumber);
            if (filters.referenceNumber) params.append("referenceNumber", filters.referenceNumber);
            if (filters.accountNumber) params.append("accountNumber", filters.accountNumber);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);
            if (filters.type !== "ALL") params.append("type", filters.type);

            const [transfersRes, centresRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/finance/cash/centre-details/${centreId}?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            setTransfers(transfersRes.data);
            const centre = centresRes.data.find(c => c._id === centreId);
            setCentreInfo(centre);
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                navigate("/");
            } else {
                toast.error("Failed to load centre details");
            }
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilters({
            serialNumber: "",
            referenceNumber: "",
            accountNumber: "",
            startDate: "",
            endDate: "",
            type: "ALL"
        });
    };

    return (
        <Layout activePage="Cash Report">
            <div className="p-4 md:p-6 space-y-8 animate-in slide-in-from-right-10 duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/finance/cash/report")}
                            className="p-3 bg-gray-800 border border-gray-700 rounded-2xl text-gray-400 hover:text-white transition-all shadow-lg"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl md:text-3xl font-black text-white">{centreInfo?.centreName || 'Loading...'}</h1>
                                <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest mt-1">Transaction History</span>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mt-1">
                                <p className="text-gray-500 text-sm flex items-center gap-2">
                                    <FaBuilding className="text-xs" /> Code: {centreInfo?.enterCode || '...'}
                                </p>
                                <p className="text-gray-500 text-sm flex items-center gap-2">
                                    <FaFileInvoiceDollar className="text-xs" /> A/C: {centreInfo?.enterCode || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-gray-900/40 p-1 rounded-2xl border border-gray-800 flex gap-1">
                            {["ALL", "SENT", "RECEIVED"].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilters({ ...filters, type })}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filters.type === type
                                        ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/20"
                                        : "text-gray-500 hover:text-gray-300"
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Granular Filters */}
                <div className="bg-gray-900/40 backdrop-blur-md border border-gray-800 p-6 rounded-3xl space-y-6 shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="relative">
                            <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <input
                                type="text"
                                placeholder="Serial #"
                                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                value={filters.serialNumber}
                                onChange={(e) => setFilters({ ...filters, serialNumber: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <input
                                type="text"
                                placeholder="Ref / UTR..."
                                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                value={filters.referenceNumber}
                                onChange={(e) => setFilters({ ...filters, referenceNumber: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <FaFileInvoiceDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <input
                                type="text"
                                placeholder="Account #..."
                                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                value={filters.accountNumber}
                                onChange={(e) => setFilters({ ...filters, accountNumber: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                            <input
                                type="date"
                                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-2.5 pl-11 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm [color-scheme:dark]"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div className="relative flex items-center gap-2">
                            <input
                                type="date"
                                className="w-full bg-gray-800/80 border border-gray-700 rounded-xl py-2.5 px-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm [color-scheme:dark]"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                            <button
                                onClick={resetFilters}
                                className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-all shrink-0"
                                title="Reset"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-gray-900/40 backdrop-blur-md border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/80 border-b border-gray-700">
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">S.No</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Flow</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Partner Node</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Amount</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Reference/AC</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Debited</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Timestamp</th>
                                    <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Scanning Ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : transfers.length > 0 ? (
                                    transfers.map((t) => {
                                        const isOutgoing = t.fromCentre._id === centreId;
                                        return (
                                            <tr key={t._id} className="hover:bg-gray-800/30 transition-all group">
                                                <td className="p-5">
                                                    <span className="font-black text-cyan-400 font-mono text-sm leading-none shrink-0">#{t.serialNumber}</span>
                                                </td>
                                                <td className="p-5">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${isOutgoing ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        }`}>
                                                        {isOutgoing ? <FaArrowUp /> : <FaArrowDown />}
                                                        {isOutgoing ? "Debit" : "Credit"}
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <div>
                                                        <span className="text-white font-bold block leading-none">{isOutgoing ? t.toCentre?.centreName : t.fromCentre?.centreName}</span>
                                                        <span className="text-[10px] text-gray-500 uppercase font-mono mt-1 block">CODE: {isOutgoing ? t.toCentre?.enterCode : t.fromCentre?.enterCode}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <span className={`text-base font-black ${isOutgoing ? "text-red-400" : "text-emerald-400"}`}>
                                                        {isOutgoing ? "-" : "+"}₹{t.amount.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <div className="space-y-1">
                                                        <span className="text-gray-300 font-mono text-xs block">{t.referenceNumber || 'N/A'}</span>
                                                        <span className="text-[9px] text-gray-500 uppercase tracking-tighter block">AC: {t.accountNumber}</span>
                                                        <span className="text-[9px] text-gray-500 uppercase flex items-center gap-1 mt-1 font-bold whitespace-nowrap"><FaUser className="text-[8px] text-cyan-500" /> By: {t.transferredBy?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    {t.status === "PENDING" ? (
                                                        <div className="flex items-center gap-2 text-amber-500 font-bold text-[10px] uppercase tracking-wider">
                                                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                            Transit
                                                        </div>
                                                    ) : t.status === "REJECTED" ? (
                                                        <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-wider">
                                                            <FaTimes />
                                                            Rejected
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase tracking-wider">
                                                            <FaCheckCircle />
                                                            Cleared
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-5 text-xs text-gray-400 font-bold whitespace-nowrap">
                                                    {t.debitedDate ? new Date(t.debitedDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="p-5">
                                                    <div className="space-y-0.5 whitespace-nowrap">
                                                        <span className="text-white text-xs font-bold block">{new Date(t.transferDate).toLocaleDateString()}</span>
                                                        <span className="text-gray-500 text-[10px] flex items-center gap-1 font-mono uppercase italic leading-none"><FaRegClock className="text-[8px]" /> {new Date(t.transferDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="p-5 text-center">
                                                    {t.receiptFile ? (
                                                        <a
                                                            href={t.receiptFile}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl text-cyan-400 hover:bg-cyan-600 hover:text-white transition-all inline-flex shadow-lg"
                                                            title="View Evidence"
                                                        >
                                                            <FaFileAlt />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-600 font-bold text-xs">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="p-20 text-center text-gray-600 font-black uppercase text-[10px] tracking-[0.3em] italic">
                                            No movement detected in this fiscal node
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CashCentreDetails;
