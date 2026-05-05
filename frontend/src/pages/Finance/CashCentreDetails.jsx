import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaArrowLeft, FaExchangeAlt, FaBuilding, FaSearch, FaFilter, FaArrowUp, FaArrowDown, FaFileInvoiceDollar, FaRegClock, FaCheckCircle, FaHashtag, FaFileAlt, FaTimes, FaCalendarAlt, FaUser } from "react-icons/fa";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";

const CashCentreDetails = () => {
    const { isDarkMode } = useTheme();
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
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-colors duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => navigate("/finance/cash/report")}
                            className={`p-4 border rounded-2xl transition-all shadow-xl active:scale-95 ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 shadow-sm'}`}
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <div className="flex items-center gap-4">
                                <h1 className={`text-3xl md:text-4xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{centreInfo?.centreName || 'Loading...'}</h1>
                                <span className="px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-1">Transaction History</span>
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-6 mt-3">
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <FaBuilding className="text-cyan-500" /> Centre Code: <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{centreInfo?.enterCode || '...'}</span>
                                </p>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <FaFileInvoiceDollar className="text-cyan-500" /> Linked A/C: <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{centreInfo?.enterCode || 'N/A'}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-2xl border flex gap-1.5 transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                            {["ALL", "SENT", "RECEIVED"].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFilters({ ...filters, type })}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 ${filters.type === type
                                        ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
                                        : `text-gray-500 hover:bg-white/5 ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Granular Filters */}
                <div className={`border p-8 rounded-[2rem] shadow-2xl transition-all duration-300 mb-8 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="relative group">
                            <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="SERIAL #"
                                className={`w-full border rounded-xl py-3 pl-11 pr-4 font-black uppercase tracking-widest focus:outline-none focus:border-cyan-500 transition-all text-[10px] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                value={filters.serialNumber}
                                onChange={(e) => setFilters({ ...filters, serialNumber: e.target.value })}
                            />
                        </div>
                        <div className="relative group">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="REF / UTR..."
                                className={`w-full border rounded-xl py-3 pl-11 pr-4 font-black uppercase tracking-widest focus:outline-none focus:border-cyan-500 transition-all text-[10px] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                value={filters.referenceNumber}
                                onChange={(e) => setFilters({ ...filters, referenceNumber: e.target.value })}
                            />
                        </div>
                        <div className="relative group">
                            <FaFileInvoiceDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="ACCOUNT #..."
                                className={`w-full border rounded-xl py-3 pl-11 pr-4 font-black uppercase tracking-widest focus:outline-none focus:border-cyan-500 transition-all text-[10px] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                value={filters.accountNumber}
                                onChange={(e) => setFilters({ ...filters, accountNumber: e.target.value })}
                            />
                        </div>
                        <div className="relative group">
                            <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type="date"
                                className={`w-full border rounded-xl py-3 pl-11 pr-4 font-bold focus:outline-none focus:border-cyan-500 transition-all text-xs [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div className="relative flex items-center gap-3">
                            <input
                                type="date"
                                className={`w-full border rounded-xl py-3 px-4 font-bold focus:outline-none focus:border-cyan-500 transition-all text-xs [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                            <button
                                onClick={resetFilters}
                                className={`p-3.5 border rounded-xl transition-all shrink-0 active:scale-95 ${isDarkMode ? 'bg-white/5 border-gray-800 text-gray-500 hover:text-white hover:bg-red-600 hover:border-red-600' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100 shadow-sm'}`}
                                title="Reset"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className={`border rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                    <th className="p-8">S.No</th>
                                    <th className="p-8">Flow</th>
                                    <th className="p-8">Partner Node</th>
                                    <th className="p-8 text-right">Amount</th>
                                    <th className="p-8">Reference/AC</th>
                                    <th className="p-8">Status</th>
                                    <th className="p-8">Debited</th>
                                    <th className="p-8">Timestamp</th>
                                    <th className="p-8 text-center">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 font-black uppercase text-[10px] tracking-[0.3em] italic animate-pulse mt-4">Scanning Fiscal Ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : transfers.length > 0 ? (
                                    transfers.map((t) => {
                                        const isOutgoing = t.fromCentre._id === centreId;
                                        return (
                                            <tr key={t._id} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5 bg-transparent' : 'hover:bg-cyan-500/[0.02] bg-white'}`}>
                                                <td className="p-8">
                                                    <span className="font-black text-cyan-400 font-mono text-base tracking-widest leading-none shrink-0">#{t.serialNumber}</span>
                                                </td>
                                                <td className="p-8">
                                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${isOutgoing ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                        }`}>
                                                        {isOutgoing ? <FaArrowUp /> : <FaArrowDown />}
                                                        {isOutgoing ? "Debit" : "Credit"}
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div>
                                                        <span className={`font-black block text-base leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{isOutgoing ? t.toCentre?.centreName : t.fromCentre?.centreName}</span>
                                                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1.5 block italic">CODE: {isOutgoing ? t.toCentre?.enterCode : t.fromCentre?.enterCode}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8 text-right">
                                                    <span className={`text-xl font-black tabular-nums tracking-tighter ${isOutgoing ? "text-red-500" : "text-emerald-500"}`}>
                                                        {isOutgoing ? "-" : "+"}₹{t.amount.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="p-8">
                                                    <div className="space-y-1.5">
                                                        <span className={`font-mono text-[11px] block font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t.referenceNumber || 'N/A'}</span>
                                                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block">A/C: {t.accountNumber}</span>
                                                        <span className="text-[9px] text-cyan-500 uppercase flex items-center gap-2 mt-2 font-black italic whitespace-nowrap"><FaUser className="text-[8px]" /> By: {t.transferredBy?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    {t.status === "PENDING" ? (
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            Transit
                                                        </div>
                                                    ) : t.status === "REJECTED" ? (
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                                                            <FaTimes />
                                                            Rejected
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                            <FaCheckCircle />
                                                            Cleared
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`p-8 text-[11px] font-black whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {t.debitedDate ? new Date(t.debitedDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="p-8">
                                                    <div className="space-y-1 whitespace-nowrap">
                                                        <span className={`text-[11px] font-black block ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(t.transferDate).toLocaleDateString()}</span>
                                                        <span className="text-gray-500 text-[10px] flex items-center gap-2 font-black uppercase italic leading-none"><FaRegClock className="text-[9px] text-cyan-500" /> {new Date(t.transferDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8 text-center">
                                                    {t.receiptFile ? (
                                                        <a
                                                            href={t.receiptFile}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`p-3 border rounded-xl transition-all inline-flex shadow-xl active:scale-90 ${isDarkMode ? 'bg-white/5 text-cyan-400 border-gray-800 hover:bg-cyan-600 hover:text-white hover:border-cyan-600' : 'bg-white text-cyan-600 border-gray-200 hover:bg-cyan-50 shadow-sm'}`}
                                                            title="View Evidence"
                                                        >
                                                            <FaFileAlt />
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-600 font-black text-xs">NA</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="p-24 text-center text-gray-500 font-black uppercase text-[10px] tracking-[0.3em] italic">
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
