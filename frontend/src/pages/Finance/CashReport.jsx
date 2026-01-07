import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
    FaMoneyBillWave, FaExchangeAlt, FaHistory, FaFilter, FaSearch, FaArrowUp, FaArrowDown,
    FaBuilding, FaInfoCircle, FaFileInvoiceDollar, FaTimes, FaHashtag, FaCalendarAlt,
    FaFileAlt, FaCheckCircle, FaRegClock, FaUser, FaChevronLeft, FaChevronRight,
    FaChevronDown, FaCheckSquare, FaSquare
} from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const CashReport = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState([]);
    const [recentTransfers, setRecentTransfers] = useState([]);
    const [summary, setSummary] = useState({
        totalCashLeft: 0,
        totalTransit: 0,
        totalTransferredLastMonth: 0
    });
    const [showCentreDropdown, setShowCentreDropdown] = useState(false);
    const [dropdownSearchTerm, setDropdownSearchTerm] = useState("");
    const centreDropdownRef = React.useRef(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filters
    const [filters, setFilters] = useState({
        centreName: [], // Changed to array for multiple selection
        accountNumber: "",
        serialNumber: "",
        referenceNumber: "",
        startDate: "",
        endDate: "",
        minAmount: "",
        maxAmount: "",
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchReport();
        }, 300);
        return () => clearTimeout(timer);
    }, [filters]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (filters.serialNumber) params.append("serialNumber", filters.serialNumber);
            if (filters.referenceNumber) params.append("referenceNumber", filters.referenceNumber);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);

            const response = await axios.get(`${import.meta.env.VITE_API_URL}/finance/cash/report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setReportData(response.data.report);
            setSummary(response.data.summary);
            // Ensure recentTransfers are sorted by transferDate in reverse chronological order
            const sortedRecentTransfers = (response.data.recentTransfers || []).sort((a, b) => new Date(b.transferDate) - new Date(a.transferDate));
            setRecentTransfers(sortedRecentTransfers);
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                navigate("/");
            } else {
                toast.error("Failed to fetch cash report");
            }
        } finally {
            setLoading(false);
        }
    };

    const resetFilters = () => {
        setFilters({
            centreName: "",
            accountNumber: "",
            serialNumber: "",
            referenceNumber: "",
            startDate: "",
            endDate: "",
            minAmount: "",
            maxAmount: "",
        });
        setCurrentPage(1); // Reset pagination on filter reset
    };

    const toggleCentreSelection = (name) => {
        setFilters(prev => {
            const newSelection = prev.centreName.includes(name)
                ? prev.centreName.filter(c => c !== name)
                : [...prev.centreName, name];
            return { ...prev, centreName: newSelection };
        });
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (centreDropdownRef.current && !centreDropdownRef.current.contains(event.target)) {
                setShowCentreDropdown(false);
                setDropdownSearchTerm(""); // Reset search when closing
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const exportToExcel = () => {
        if (mergedLedger.length === 0) {
            toast.info("No data to export");
            return;
        }

        const dataToExport = mergedLedger.map(item => ({
            "Centre Name": item.centreName,
            "A/C Number": item.activeAccountNumber,
            "Liquid Cash (Available)": item.cashLeft,
            "Total Collected (Inflow)": item.totalCollected,
            "Last Activity Serial": item.lastActivity?.serialNumber || "N/A",
            "Last Reference/UTR": item.lastActivity?.referenceNumber || "N/A",
            "Last Activity Date": item.lastActivity ? new Date(item.lastActivity.transferDate).toLocaleDateString() : "No Activity",
            "Status": item.lastActivity ? item.lastActivity.status : "Stable",
            "Partner Centre": item.lastActivity?.fromCentre?._id === item.centreId ? item.lastActivity?.toCentre?.centreName : item.lastActivity?.fromCentre?.centreName || 'DIRECT'
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Report");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" });
        saveAs(data, `Cash_Intelligence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel report exported successfully");
    };

    // MERGE LOGIC: Combine Centre Summary with its Latest Transfer Details
    const mergedLedger = reportData.map(centre => {
        // Find the most recent transfer where this centre was involved
        const lastActivity = recentTransfers.find(t =>
            t.fromCentre?._id === centre.centreId ||
            t.toCentre?._id === centre.centreId
        );
        // User wants the account number from the latest transfer if available, otherwise the centre's default
        const activeAccountNumber = lastActivity?.accountNumber || centre.accountNumber || "N/A";
        return { ...centre, lastActivity, activeAccountNumber };
    }).filter(item => {
        const matchesName = filters.centreName.length === 0 || filters.centreName.includes(item.centreName);
        const matchesAccount = item.activeAccountNumber.toLowerCase().includes(filters.accountNumber.toLowerCase());
        const matchesMinAmount = !filters.minAmount || item.cashLeft >= parseFloat(filters.minAmount);
        const matchesMaxAmount = !filters.maxAmount || item.cashLeft <= parseFloat(filters.maxAmount);
        return matchesName && matchesAccount && matchesMinAmount && matchesMaxAmount;
    });

    // Pagination Logic
    const totalPages = Math.ceil(mergedLedger.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedLedger = mergedLedger.slice(startIndex, startIndex + itemsPerPage);

    return (
        <Layout activePage="Cash Report">
            <div className="p-4 md:p-6 space-y-8 animate-in fade-in duration-700">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white italic tracking-tight">CASH INTELLIGENCE <span className="text-cyan-500">LEDGER</span></h1>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mt-1">Unified Financial Flow & Liquidity Control</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest whitespace-nowrap">Show:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-[#131619] border border-gray-800 rounded-xl px-4 py-2 text-[10px] font-black text-white outline-none focus:border-cyan-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value={10}>10 ROWS</option>
                            <option value={25}>25 ROWS</option>
                            <option value={50}>50 ROWS</option>
                        </select>
                        <button
                            onClick={exportToExcel}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95"
                        >
                            <FaFileAlt /> Export Excel
                        </button>
                    </div>
                </div>

                {/* KPI Summary Grid */}
                <div className="grid col-span-full md:grid-cols-3 gap-6">
                    <div className="bg-[#131619] border border-gray-800 p-6 rounded-[2rem] hover:border-cyan-500/30 transition-all shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FaMoneyBillWave className="text-7xl -rotate-12" />
                        </div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                                <FaMoneyBillWave className="text-3xl text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Net Reserves</p>
                                <h3 className="text-3xl font-black text-white mt-1 group-hover:text-cyan-400 transition-colors">₹{summary.totalCashLeft.toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#131619] border border-gray-800 p-6 rounded-[2rem] hover:border-amber-500/30 transition-all shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FaExchangeAlt className="text-7xl -rotate-12" />
                        </div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                <FaExchangeAlt className="text-3xl text-amber-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Assets In Transit</p>
                                <h3 className="text-3xl font-black text-white mt-1 group-hover:text-amber-400 transition-colors">₹{summary.totalTransit.toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#131619] border border-gray-800 p-6 rounded-[2rem] hover:border-emerald-500/30 transition-all shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FaHistory className="text-7xl -rotate-12" />
                        </div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                <FaHistory className="text-3xl text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Monthly Velocity</p>
                                <h3 className="text-3xl font-black text-white mt-1 group-hover:text-emerald-400 transition-colors">₹{summary.totalTransferredLastMonth.toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tactical Search & High-End Filters */}
                <div className={`bg-gray-900/40 backdrop-blur-md border border-gray-800 p-6 rounded-[2.5rem] shadow-2xl space-y-4 relative ${showCentreDropdown ? 'z-[100]' : 'z-20'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className={`relative ${showCentreDropdown ? 'z-[110]' : 'z-10'}`} ref={centreDropdownRef}>
                            <button
                                onClick={() => setShowCentreDropdown(!showCentreDropdown)}
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm flex items-center justify-between text-left"
                            >
                                <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <span className="truncate">
                                    {filters.centreName.length === 0
                                        ? "Select Centres..."
                                        : `${filters.centreName.length} Centres Selected`}
                                </span>
                                <FaChevronDown className={`text-xs transition-transform ${showCentreDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showCentreDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1f24] border border-gray-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[9999] max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700 pointer-events-auto">
                                    <div className="flex justify-between items-center px-3 py-2 border-b border-gray-800 mb-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Available Nodes</span>
                                        {filters.centreName.length > 0 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setFilters({ ...filters, centreName: [] }); }}
                                                className="text-[10px] font-black text-cyan-500 hover:text-cyan-400 uppercase tracking-widest"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    {/* Dropdown Search Input */}
                                    <div className="px-2 mb-2 sticky top-0 bg-[#1a1f24] pb-2 border-b border-gray-800/50">
                                        <div className="relative">
                                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs" />
                                            <input
                                                type="text"
                                                placeholder="Quick Search..."
                                                value={dropdownSearchTerm}
                                                onChange={(e) => setDropdownSearchTerm(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full bg-gray-800/80 border border-gray-700 rounded-lg py-1.5 pl-8 pr-3 text-[11px] text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-gray-600"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        {reportData
                                            .filter(c => c.centreName.toLowerCase().includes(dropdownSearchTerm.toLowerCase()))
                                            .map(c => (
                                                <div
                                                    key={c.centreId}
                                                    onClick={() => toggleCentreSelection(c.centreName)}
                                                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
                                                >
                                                    {filters.centreName.includes(c.centreName) ? (
                                                        <FaCheckSquare className="text-cyan-500" />
                                                    ) : (
                                                        <FaSquare className="text-gray-700 group-hover:text-gray-600" />
                                                    )}
                                                    <span className={`text-[11px] font-bold ${filters.centreName.includes(c.centreName) ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                                        {c.centreName}
                                                    </span>
                                                </div>
                                            ))}
                                        {reportData.filter(c => c.centreName.toLowerCase().includes(dropdownSearchTerm.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest italic">
                                                No matches found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search Serial #..."
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                value={filters.serialNumber}
                                onChange={(e) => setFilters({ ...filters, serialNumber: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Ref / UTR Number..."
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                value={filters.referenceNumber}
                                onChange={(e) => setFilters({ ...filters, referenceNumber: e.target.value })}
                            />
                        </div>
                        <div className="relative">
                            <FaFileInvoiceDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="A/C Number..."
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                value={filters.accountNumber}
                                onChange={(e) => setFilters({ ...filters, accountNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                        <div className="flex-[2] grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                            <div className="relative">
                                <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="date"
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm [color-scheme:dark]"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="date"
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm [color-scheme:dark]"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="Min Cash Left"
                                    className="w-full bg-gray-800/50 border border-gray-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                    value={filters.minAmount}
                                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="Max Cash Left"
                                    className="w-full bg-gray-800/50 border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-500 transition-all text-sm"
                                    value={filters.maxAmount}
                                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                />
                            </div>
                        </div>
                        <button
                            onClick={resetFilters}
                            className="w-full lg:w-auto px-8 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 font-bold"
                        >
                            <FaTimes /> Reset
                        </button>
                    </div>
                </div>

                {/* UNIFIED MASTER LEDGER TABLE */}
                <div className="bg-[#131619]/60 backdrop-blur-xl border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/80 border-b border-gray-700">
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Network Entity</th>
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">A/C Number</th>
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] text-right">Liquidity (Available)</th>
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] text-center">Movement Status</th>
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Last Serial #</th>
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Last Reference / UTR</th>
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Last Debited</th>
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Last Timestamp</th>
                                    <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] text-center">Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                                                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest italic">Synchronizing Global Ledger...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedLedger.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="p-20 text-center text-gray-700 font-black uppercase text-xs tracking-[0.3em] italic">
                                            No matched records in global fiscal nodes
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLedger.map((item, index) => (
                                        <tr key={item.centreId} className="hover:bg-gray-800/30 transition-all group">
                                            {/* Node Identity */}
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center border border-gray-700 group-hover:border-cyan-500/50 transition-all shrink-0">
                                                        <FaBuilding className="text-gray-400 group-hover:text-cyan-400 text-xl" />
                                                    </div>
                                                    <div>
                                                        <span className="text-white font-black block text-base leading-none">{item.centreName}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Account Number Column */}
                                            <td className="p-6">
                                                <span className="text-[11px] text-cyan-500 font-black font-mono tracking-widest uppercase">{item.activeAccountNumber}</span>
                                            </td>

                                            {/* Liquidity */}
                                            <td className="p-6 text-right">
                                                <div className="space-y-1">
                                                    <span className={`text-xl font-black ${item.cashLeft > 0 ? "text-emerald-400" : "text-gray-600"}`}>
                                                        ₹{item.cashLeft.toLocaleString()}
                                                    </span>
                                                    <div className="text-[9px] text-gray-500 font-bold uppercase flex items-center justify-end gap-1">
                                                        <FaArrowDown className="text-emerald-500" /> ₹{item.totalCollected.toLocaleString()} Total Inflow
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Movement Status */}
                                            <td className="p-6 text-center">
                                                {item.lastActivity ? (
                                                    item.lastActivity.status === "PENDING" ? (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                            In Transit
                                                        </span>
                                                    ) : item.lastActivity.status === "REJECTED" ? (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                                                            <FaTimes className="text-[8px]" />
                                                            Rejected
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                            <FaCheckCircle className="text-[8px]" />
                                                            Cleared
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-gray-700 text-[10px] font-black uppercase tracking-widest italic">Stable</span>
                                                )}
                                            </td>

                                            {/* Serial # */}
                                            <td className="p-6">
                                                {item.lastActivity ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-cyan-400 font-black font-mono text-base leading-none">#{item.lastActivity.serialNumber}</span>
                                                        {item.lastActivity.fromCentre?._id === item.centreId ? (
                                                            <span className="text-[8px] text-red-500 font-black uppercase mt-1 tracking-tighter shrink-0">Outgoing Transfer</span>
                                                        ) : (
                                                            <span className="text-[8px] text-emerald-500 font-black uppercase mt-1 tracking-tighter shrink-0">Incoming Transfer</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-700 font-bold">-</span>
                                                )}
                                            </td>

                                            {/* Reference / UTR */}
                                            <td className="p-6">
                                                <div className="space-y-1 max-w-[150px]">
                                                    <span className="text-gray-300 font-mono text-xs block truncate">{item.lastActivity?.referenceNumber || 'N/A'}</span>
                                                    <span className="text-[8px] text-gray-500 uppercase tracking-tighter block truncate">Partner: {item.lastActivity?.fromCentre?._id === item.centreId ? item.lastActivity?.toCentre?.centreName : item.lastActivity?.fromCentre?.centreName || 'DIRECT'}</span>
                                                </div>
                                            </td>

                                            {/* Debited Date */}
                                            <td className="p-6">
                                                {item.lastActivity?.debitedDate ? (
                                                    <span className="text-white text-[11px] font-bold block">{new Date(item.lastActivity.debitedDate).toLocaleDateString()}</span>
                                                ) : (
                                                    <span className="text-gray-700 text-[10px] font-bold">-</span>
                                                )}
                                            </td>

                                            {/* Timestamp */}
                                            <td className="p-6">
                                                {item.lastActivity ? (
                                                    <div className="space-y-0.5 whitespace-nowrap">
                                                        <span className="text-white text-[11px] font-bold block">{new Date(item.lastActivity.transferDate).toLocaleDateString()}</span>
                                                        <span className="text-gray-500 text-[9px] flex items-center gap-1 font-mono uppercase italic leading-none"><FaRegClock className="text-[8px]" /> {new Date(item.lastActivity.transferDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-700 text-[10px] font-bold">No Movement</span>
                                                )}
                                            </td>

                                            {/* Audit Access */}
                                            <td className="p-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {item.lastActivity?.receiptFile && (
                                                        <a href={item.lastActivity.receiptFile} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-gray-800 text-cyan-400 rounded-xl hover:bg-cyan-600 hover:text-white transition-all border border-gray-700 shadow-lg" title="View Evidence">
                                                            <FaFileAlt />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => navigate(`/finance/cash/centre/${item.centreId}`)}
                                                        className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all flex items-center gap-2"
                                                    >
                                                        History
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {!loading && mergedLedger.length > 0 && (
                        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gray-900/30 p-6 rounded-3xl border border-gray-800/50">
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">
                                Node Map: {startIndex + 1} - {Math.min(startIndex + itemsPerPage, mergedLedger.length)} OF {mergedLedger.length} Active Entities
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-gray-500 disabled:opacity-20 hover:text-cyan-400 transition-all active:scale-95"
                                >
                                    <FaChevronLeft size={14} />
                                </button>

                                <div className="flex items-center gap-2">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all active:scale-90 ${currentPage === pageNum ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/40' : 'bg-gray-800/30 border border-gray-800 text-gray-500 hover:bg-gray-800'}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                            return <span key={pageNum} className="text-gray-700 text-xs">•••</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-gray-500 disabled:opacity-20 hover:text-cyan-400 transition-all active:scale-95"
                                >
                                    <FaChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default CashReport;
