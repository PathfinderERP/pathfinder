import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaHistory, FaSearch, FaTimes, FaArrowLeft, FaSyncAlt } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import CustomSearchSelect from "../../components/common/CustomSearchSelect";

const CashTransferHistory = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [recentTransfers, setRecentTransfers] = useState([]);
    const [historySearch, setHistorySearch] = useState("");
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        centreId: ""
    });
    const [allCentres, setAllCentres] = useState([]);

    useEffect(() => {
        fetchCentres();
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [filters.startDate, filters.endDate, filters.centreId]);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/master-data/centres?status=active`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllCentres(response.data || []);
        } catch (error) {
            console.error("Failed to fetch centres", error);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/cash/report`, {
                params: {
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                    centreId: filters.centreId
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentTransfers(response.data.recentTransfers || []);
        } catch (error) {
            console.error("Failed to fetch history", error);
            toast.error("Failed to load transfer history");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout activePage="Cash Transfer History">
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate("/finance/cash/transfer")}
                            className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-2xl border border-gray-700 transition-all"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                                <FaHistory className="text-cyan-400" />
                                Transfer History
                            </h1>
                            <p className="text-gray-400 text-sm mt-1 uppercase font-black tracking-widest opacity-60">Full Record of Cash Movements</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-gray-900/40 p-4 rounded-3xl border border-gray-800 backdrop-blur-xl">
                        <div className="flex items-center gap-3 min-w-[240px]">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Centre</label>
                            <div className="flex-1">
                                <CustomSearchSelect
                                    options={[
                                        { value: "", label: "ALL CENTRES" },
                                        ...allCentres.map(c => ({ value: c._id, label: c.centreName }))
                                    ]}
                                    value={filters.centreId}
                                    onChange={(val) => setFilters({...filters, centreId: val})}
                                    placeholder="SELECT CENTRE..."
                                    isDarkMode={true}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">From</label>
                            <input 
                                type="date"
                                className="bg-gray-800 border border-gray-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                                value={filters.startDate}
                                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">To</label>
                            <input 
                                type="date"
                                className="bg-gray-800 border border-gray-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                                value={filters.endDate}
                                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                            />
                        </div>
                        <button 
                            onClick={fetchHistory}
                            className="p-2.5 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600 hover:text-white rounded-xl border border-cyan-500/30 transition-all"
                        >
                            <FaSyncAlt className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Search & Actions */}
                <div className="bg-gray-900/40 border border-gray-800 p-4 rounded-3xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input 
                            type="text"
                            placeholder="SEARCH BY ID, CENTRE, A/C..."
                            className="w-full bg-gray-800/60 border border-gray-700 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 uppercase tracking-widest"
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
                            Total Records: {recentTransfers.length}
                        </p>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-gray-900/40 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900/60 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">
                                    <th className="p-6">Serial</th>
                                    <th className="p-6">Period / Date</th>
                                    <th className="p-6">From Centre</th>
                                    <th className="p-6">To Centre</th>
                                    <th className="p-6">Amount</th>
                                    <th className="p-6">Account</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-cyan-400">Secret Key</th>
                                    <th className="p-6">Initiated By</th>
                                    <th className="p-6">Action Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {recentTransfers
                                    .filter(t => 
                                        !historySearch || 
                                        t.serialNumber.toString().includes(historySearch) ||
                                        t.fromCentre?.centreName?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                        t.toCentre?.centreName?.toLowerCase().includes(historySearch.toLowerCase()) ||
                                        t.accountNumber?.includes(historySearch)
                                    )
                                    .map((transfer) => (
                                    <tr key={transfer._id} className="hover:bg-cyan-500/5 transition-all group">
                                        <td className="p-6">
                                            <span className="text-[11px] font-black text-white bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700 shadow-lg">
                                                #{transfer.serialNumber}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-gray-300 uppercase">
                                                    {transfer.fromDate ? `${new Date(transfer.fromDate).toLocaleDateString('en-GB')} - ${new Date(transfer.toDate).toLocaleDateString('en-GB')}` : 'N/A'}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">
                                                    Deposit: {new Date(transfer.debitedDate || transfer.createdAt).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-wider">{transfer.fromCentre?.centreName}</td>
                                        <td className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-wider">{transfer.toCentre?.centreName}</td>
                                        <td className="p-6">
                                            <span className="text-base font-black text-cyan-400 tracking-tighter">
                                                ₹{transfer.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-gray-500 font-mono">{transfer.accountNumber}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl border uppercase tracking-tighter ${
                                                transfer.status === 'RECEIVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                transfer.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                                            }`}>
                                                {transfer.status}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="group/key relative cursor-pointer">
                                                <span className="text-sm font-black text-white bg-cyan-500/10 px-4 py-2 rounded-xl border border-cyan-500/30 font-mono tracking-[0.2em] shadow-lg shadow-cyan-500/5 group-hover/key:border-cyan-400 transition-all">
                                                    {transfer.uniquePassword}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400 border border-indigo-500/20 shadow-inner">
                                                    {transfer.transferredBy?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase leading-none">{transfer.transferredBy?.name || 'System'}</span>
                                                    <span className="text-[8px] font-bold text-gray-600 uppercase mt-1">{new Date(transfer.createdAt).toLocaleDateString('en-GB')} {new Date(transfer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            {transfer.receivedBy ? (
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-[10px] font-black border shadow-inner ${
                                                        transfer.status === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-red-500/20 text-red-400 border-red-500/20'
                                                    }`}>
                                                        {transfer.receivedBy?.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase leading-none">{transfer.receivedBy?.name}</span>
                                                        <span className="text-[8px] font-bold text-gray-600 uppercase mt-1">
                                                            {new Date(transfer.receivedDate || transfer.updatedAt).toLocaleDateString('en-GB')} {new Date(transfer.receivedDate || transfer.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] font-bold text-gray-600 uppercase italic tracking-widest opacity-40">Pending Action</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {recentTransfers.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="10" className="p-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                <FaHistory size={64} className="text-gray-500" />
                                                <p className="text-sm font-black uppercase tracking-[0.5em] text-gray-500">
                                                    No History Found
                                                </p>
                                            </div>
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

export default CashTransferHistory;
