import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { 
    FaFilter, FaDownload, FaChevronDown, 
    FaEraser, FaTable, FaTh, FaPercentage, FaSearch, 
    FaBuilding, FaTag, FaTimes, FaCoins 
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

// Helper for currency formatting
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Date helpers matching Average Admission Fee page
const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getTodayRange = () => {
    const today = new Date();
    return { start: formatDate(today), end: formatDate(today) };
};

const getYesterdayRange = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: formatDate(yesterday), end: formatDate(yesterday) };
};

const getLast7DaysRange = () => {
    const today = new Date();
    const last7 = new Date();
    last7.setDate(today.getDate() - 6);
    return { start: formatDate(last7), end: formatDate(today) };
};

const getThisMonthRange = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: formatDate(start), end: formatDate(today) };
};

// Searchable Multi-Select Component matching Average Admission Fee
const MultiSelect = ({ placeholder, options, selected, onToggle, labelKey = "name", valueKey = "_id", isDarkMode }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ]       = useState("");
    const ref             = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const opts = options.filter(o => (o[labelKey] || "").toLowerCase().includes(q.toLowerCase()));
    const base = "min-w-[180px] h-10 px-3 border rounded-lg cursor-pointer flex justify-between items-center text-sm transition-all";
    const dm   = isDarkMode
        ? "bg-[#1a1f24] border-gray-700 text-gray-300 hover:border-blue-500"
        : "bg-white border-gray-300 text-gray-700 hover:border-blue-500 shadow-sm";

    return (
        <div className="relative" ref={ref}>
            <div onClick={() => setOpen(!open)} className={`${base} ${dm}`}>
                <span className="truncate">{selected.length === 0 ? placeholder : `${selected.length} selected`}</span>
                <FaChevronDown size={9} className={`ml-2 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className={`absolute top-full left-0 mt-1 w-64 z-50 border rounded-xl shadow-2xl max-h-64 flex flex-col
                            ${isDarkMode ? "bg-[#1a1f24] border-gray-700" : "bg-white border-gray-200"}`}
                    >
                        <div className={`p-2 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
                            <input autoFocus type="text" placeholder="Search..."
                                value={q} onChange={e => setQ(e.target.value)}
                                className={`w-full px-2 py-1.5 text-sm rounded-md outline-none border
                                    ${isDarkMode ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                                                 : "bg-gray-50 border-gray-200 text-gray-800"}`}
                            />
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {opts.length > 0 ? opts.map(opt => (
                                <div key={opt[valueKey]} onClick={() => onToggle(opt[valueKey])}
                                    className={`px-3 py-2.5 cursor-pointer flex items-center gap-2.5 transition-colors
                                        ${isDarkMode ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-50 text-gray-700"}`}
                                >
                                    <input type="checkbox" readOnly checked={selected.includes(opt[valueKey])} className="rounded text-blue-500 pointer-events-none" />
                                    <span className="text-sm truncate">{opt[labelKey]}</span>
                                </div>
                            )) : (
                                <div className="p-4 text-xs text-gray-400 text-center uppercase tracking-widest font-bold">No results</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const DiscountReport = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const card  = `rounded-2xl border transition-all ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`;

    const SummaryCard = ({ icon, label, value, grad }) => (
        <div className={`${card} p-5 flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${grad}`}>{icon}</div>
            <div className="min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{label}</p>
                <p className={`text-2xl font-black mt-0.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{value}</p>
            </div>
        </div>
    );

    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [sessions, setSessions] = useState([]);

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs
    const [selectedExamTags, setSelectedExamTags] = useState([]); // Array of IDs for multi-select
    const [selectedSessions, setSelectedSessions] = useState([]); // Array of session names
    const [selectedProgramme, setSelectedProgramme] = useState(""); // CRP or NCRP
    const [timePeriod, setTimePeriod] = useState("Today"); // Default to "Today"
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Pivot Grid Specific States
    const [pivotRawData, setPivotRawData] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedCell, setSelectedCell] = useState(null);

    // ---- Effects ----
    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        if (timePeriod === "Custom" && (!startDate || !endDate)) {
            return;
        }
        fetchReportData();
    }, [selectedCentres, selectedExamTags, selectedSessions, selectedProgramme, timePeriod, startDate, endDate]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, eRes, sRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers })
            ]);

            if (cRes.ok) {
                const resData = await cRes.json();
                let centerList = Array.isArray(resData) ? resData : resData.centres || [];

                // Filter by allocated centers
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    if (user.role !== 'superAdmin' && user.centres) {
                        const allowedIds = user.centres.map(id => typeof id === 'object' ? id._id : id);
                        centerList = centerList.filter(c => allowedIds.includes(c._id));
                    }
                }
                const sortedCentres = centerList.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setCentres(sortedCentres);
            }
            if (eRes.ok) setExamTags(await eRes.json());
            if (sRes.ok) {
                const sessionData = await sRes.json();
                const sessionList = (Array.isArray(sessionData) ? sessionData : [])
                    .filter(s => s.isGlobalActive)
                    .sort((a, b) => (b.sessionName || "").localeCompare(a.sessionName || ""));
                setSessions(sessionList);
            }
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (timePeriod === "Custom") {
                if (!startDate || !endDate) {
                    setLoading(false);
                    return;
                }
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else if (timePeriod === "Today") {
                const { start, end } = getTodayRange();
                params.append("startDate", start);
                params.append("endDate", end);
            } else if (timePeriod === "Yesterday") {
                const { start, end } = getYesterdayRange();
                params.append("startDate", start);
                params.append("endDate", end);
            } else if (timePeriod === "Last 7 Days") {
                const { start, end } = getLast7DaysRange();
                params.append("startDate", start);
                params.append("endDate", end);
            } else if (timePeriod === "This Month") {
                const { start, end } = getThisMonthRange();
                params.append("startDate", start);
                params.append("endDate", end);
            } else {
                const yr = new Date().getFullYear();
                params.append("year", timePeriod === "This Year" ? yr : yr - 1);
            }

            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedExamTags.length > 0) params.append("examTagId", selectedExamTags.join(","));
            if (selectedProgramme) params.append("programme", selectedProgramme);
            if (selectedSessions.length > 0) params.append("sessions", selectedSessions.join(","));

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/discount-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setPivotRawData(result.pivotData || []);
            } else {
                setPivotRawData([]);
            }
        } catch (error) {
            console.error("Error fetching report", error);
            setPivotRawData([]);
        } finally {
            setLoading(false);
        }
    };

    // ---- Handlers ----
    const openCellDetails = (rowKey, examTagName, details) => {
        setSelectedCell({ rowKey, examTagName, details });
    };

    const toggleCentreSelection = (id) => {
        setSelectedCentres(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleExamTagSelection = (id) => {
        setSelectedExamTags(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSessionSelection = (name) => {
        setSelectedSessions(prev =>
            prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
        );
    };

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedExamTags([]);
        setSelectedSessions([]);
        setSelectedProgramme("");
        setTimePeriod("This Month");
        setStartDate("");
        setEndDate("");
        setSearch("");
        toast.info("Filters reset");
    };

    // Pivot Data Structure Transformation - Grouped by Centre Name
    const pivotData = {};
    const allTagsInPivot = new Set();

    pivotRawData.forEach(item => {
        const rowKey = item.centre || "—";
        const t = item.examTagName || "Generic Tag";

        if (!pivotData[rowKey]) pivotData[rowKey] = {};
        if (!pivotData[rowKey][t]) {
            pivotData[rowKey][t] = {
                totalAdmissions: 0,
                discountGiven: 0,
                originalFees: 0,
                committedFees: 0,
                details: []
            };
        }

        pivotData[rowKey][t].totalAdmissions += item.totalAdmissions;
        pivotData[rowKey][t].discountGiven += item.discountGiven;
        pivotData[rowKey][t].originalFees += item.originalFees;
        pivotData[rowKey][t].committedFees += item.committedFees;
        pivotData[rowKey][t].details.push(item);
        allTagsInPivot.add(t);
    });

    const CUSTOM_ORDER = [
        "JEE 1 YEAR",
        "JEE 2 YEAR",
        "NEET 1 YEAR",
        "NEET 2 YEAR",
        "REPEATER",
        "FOUNDATION CLASS 10",
        "FOUNDATION CLASS 9",
        "FOUNDATION CLASS 8",
        "FOUNDATION CLASS 7",
        "FOUNDATION CLASS 6",
        "FOUNDATION CLASS 5"
    ];

    const uniqueTags = Array.from(allTagsInPivot).sort((a, b) => {
        const aIdx = CUSTOM_ORDER.indexOf(a.trim().toUpperCase());
        const bIdx = CUSTOM_ORDER.indexOf(b.trim().toUpperCase());
        
        if (aIdx !== -1 && bIdx !== -1) {
            return aIdx - bIdx;
        }
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        
        return a.localeCompare(b);
    });

    const rowKeys = Object.keys(pivotData).sort();
    const filteredRowKeys = rowKeys.filter(rk =>
        !search || rk.toLowerCase().includes(search.toLowerCase())
    );

    let totalDiscount = 0;
    let totalAdmissions = 0;
    filteredRowKeys.forEach(rowKey => {
        uniqueTags.forEach(tag => {
            const cell = pivotData[rowKey]?.[tag];
            if (cell) {
                totalDiscount += cell.discountGiven || 0;
                totalAdmissions += cell.totalAdmissions || 0;
            }
        });
    });
    const averageDiscount = totalAdmissions > 0 ? (totalDiscount / totalAdmissions) : 0;

    const tagIndexMap = {};
    uniqueTags.forEach((tag, i) => { tagIndexMap[tag] = i; });

    const TAG_BADGE = [
        "bg-blue-500/15   text-blue-400   border-blue-500/30",
        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        "bg-amber-500/15  text-amber-400  border-amber-500/30",
        "bg-violet-500/15 text-violet-400 border-violet-500/30",
        "bg-rose-500/15   text-rose-400   border-rose-500/30",
        "bg-cyan-500/15   text-cyan-400   border-cyan-500/30",
        "bg-orange-500/15 text-orange-400 border-orange-500/30",
        "bg-pink-500/15   text-pink-400   border-pink-500/30",
    ];
    const tagBadge = (i) => TAG_BADGE[i % TAG_BADGE.length];

    const handleDownloadExcel = () => {
        if (filteredRowKeys.length === 0) {
            toast.warn("No data to download");
            return;
        }

        const exportRows = filteredRowKeys.map((rk, idx) => {
            const rowObj = {
                "S.No": idx + 1,
                "Centre Name": rk
            };

            let rowTotalAdmissions = 0;
            let rowTotalDiscount = 0;

            uniqueTags.forEach(t => {
                const cell = pivotData[rk]?.[t];
                if (cell && cell.totalAdmissions > 0) {
                    rowObj[t] = `₹${cell.discountGiven.toLocaleString("en-IN")} (Fee: ₹${(cell.originalFees || 0).toLocaleString("en-IN")}) (${cell.totalAdmissions})`;
                    rowTotalAdmissions += cell.totalAdmissions;
                    rowTotalDiscount += cell.discountGiven;
                } else {
                    rowObj[t] = "-";
                }
            });

            rowObj["Total Discount Given (₹)"] = rowTotalDiscount;
            rowObj["Total Students"] = rowTotalAdmissions;

            return rowObj;
        });

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Discount_Pivot");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/octet-stream" }),
            `Discount_Report_Pivot_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Discount Analysis</h1>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SummaryCard 
                        icon={<FaCoins />} 
                        label="Total Discounted Amount" 
                        value={fmt(totalDiscount)} 
                        grad="bg-orange-500/15 text-orange-500" 
                    />
                    <SummaryCard 
                        icon={<FaPercentage />} 
                        label="Average Discounted Amount" 
                        value={fmt(averageDiscount)} 
                        grad="bg-blue-500/15 text-blue-500" 
                    />
                </div>

                {/* Filters Section */}
                <div className={`p-4 rounded-xl shadow-sm border transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Fee Discount Analytics</h2>
                        <button
                            onClick={handleDownloadExcel}
                            className="bg-[#22c55e] hover:bg-green-600 text-white px-4 py-2 rounded-md font-bold uppercase text-xs tracking-widest transition-all shadow-lg flex items-center gap-2 active:scale-95"
                        >
                            <FaDownload /> Download
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Centre Multi-Select */}
                        <MultiSelect
                            placeholder="All Centres"
                            options={centres}
                            selected={selectedCentres}
                            onToggle={toggleCentreSelection}
                            labelKey="centreName"
                            isDarkMode={isDarkMode}
                        />

                        {/* Exam Tags Multi-Select */}
                        <MultiSelect
                            placeholder="All Exam Tags"
                            options={examTags}
                            selected={selectedExamTags}
                            onToggle={toggleExamTagSelection}
                            labelKey="name"
                            isDarkMode={isDarkMode}
                        />

                        {/* Session Multi-Select */}
                        <MultiSelect
                            placeholder="All Active Sessions"
                            options={sessions}
                            selected={selectedSessions}
                            onToggle={toggleSessionSelection}
                            labelKey="sessionName"
                            valueKey="sessionName"
                            isDarkMode={isDarkMode}
                        />

                        {/* Programme Select Dropdown */}
                        <div className="min-w-[120px]">
                            <select
                                value={selectedProgramme}
                                onChange={(e) => setSelectedProgramme(e.target.value)}
                                className={`h-10 px-3 border rounded-lg text-sm outline-none font-bold transition-all ${
                                    isDarkMode 
                                        ? 'bg-[#1a1f24] border-gray-700 text-gray-400 focus:border-blue-500' 
                                        : 'bg-white border-gray-300 text-gray-600 focus:border-blue-500 shadow-sm'
                                }`}
                            >
                                <option value="">All Programs</option>
                                <option value="CRP">CRP</option>
                                <option value="NCRP">NCRP</option>
                            </select>
                        </div>

                        {/* Reset Button */}
                        <button
                            onClick={handleResetFilters}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            title="Reset Filters"
                        >
                            <FaEraser size={18} />
                        </button>
                    </div>

                    {/* Time Period Filter Center */}
                    <div className="flex justify-center items-center gap-4 mt-4">
                        <select
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value)}
                            className={`h-9 px-4 border rounded-md text-sm font-black uppercase tracking-widest outline-none transition-colors ${isDarkMode ? 'bg-black/20 border-gray-700 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-700 shadow-sm'
                                }`}
                        >
                            <option value="This Month">This Month</option>
                            <option value="This Year">This Year</option>
                            <option value="Last Year">Last Year</option>
                            <option value="Today">Today</option>
                            <option value="Yesterday">Yesterday</option>
                            <option value="Last 7 Days">Last 7 Days</option>
                            <option value="Custom">Custom Range</option>
                        </select>
                        {timePeriod === "Custom" && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`h-9 px-2 border rounded-md text-xs font-bold outline-none shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'
                                        }`}
                                />
                                <span className="text-gray-500 font-black text-[10px] uppercase">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`h-9 px-2 border rounded-md text-xs font-bold outline-none shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'
                                        }`}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* View Content Area */}
                <div className={`p-6 rounded-2xl shadow-xl border min-h-[500px] transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-xl font-bold mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                        Fee Discount Analysis
                    </h3>

                    {loading ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-black animate-pulse tracking-[0.2em] text-xs">CALCULATING DISCOUNTS...</p>
                            </div>
                        </div>
                    ) : pivotRawData.length === 0 ? (
                        <div className={`flex h-96 items-center justify-center flex-col gap-4 rounded-2xl border border-dashed transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                            <FaPercentage size={48} className="opacity-20" />
                            <p className="uppercase tracking-[0.2em] text-sm font-black opacity-50">No discount data available</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            {/* Pivot Toolbar - Search Box only */}
                            <div className="flex items-center justify-between px-6 py-4 border-b flex-wrap gap-3 border-gray-100 dark:border-gray-800">
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-72 ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                                    <FaSearch size={12} className="text-gray-400 flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search centre..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className={`bg-transparent outline-none text-sm flex-1 ${isDarkMode ? "text-gray-300 placeholder-gray-600" : "text-gray-700 placeholder-gray-400"}`}
                                    />
                                </div>
                            </div>

                            {/* Pivot Grid */}
                            {filteredRowKeys.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-20 gap-4 ${isDarkMode ? "text-gray-600" : "text-gray-300"}`}>
                                    <FaTable size={40} className="opacity-40" />
                                    <p className="text-xs font-black uppercase tracking-widest">No matching pivot data</p>
                                </div>
                            ) : (
                                <div className={`overflow-x-auto rounded-xl border transition-colors ${isDarkMode ? 'border-gray-800 shadow-xl' : 'border-gray-200 shadow-sm'}`}>
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className={`border-b ${isDarkMode ? "border-gray-800 bg-[#131619]" : "border-gray-100 bg-gray-50"}`}>
                                                <th className={`p-4 text-left text-[10px] font-black uppercase tracking-widest sticky left-0 z-10 ${isDarkMode ? "bg-[#131619]" : "bg-gray-50"} border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                    <span className="flex items-center gap-1.5"><FaBuilding className="inline text-gray-400" size={10} /> Centre Name</span>
                                                </th>
                                                {uniqueTags.map(tag => {
                                                    const ci = tagIndexMap[tag] ?? 0;
                                                    return (
                                                        <th key={tag} className="p-4 text-center min-w-[120px] text-[10px] font-black uppercase tracking-widest">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold border ${tagBadge(ci)}`}>
                                                                <FaTag size={8} /> {tag}
                                                            </span>
                                                        </th>
                                                    );
                                                })}
                                                <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500">
                                                    Total Discount / Students
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDarkMode ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                            {filteredRowKeys.map((rowKey, idx) => {
                                                let rowTotalAdmissions = 0;
                                                let rowTotalDiscount = 0;

                                                return (
                                                    <tr key={idx} className={`transition-colors ${isDarkMode ? "hover:bg-gray-800/25" : "hover:bg-blue-50/20"}`}>
                                                        <td className={`p-4 text-xs font-bold sticky left-0 z-10 ${isDarkMode ? "bg-[#1a1f24]" : "bg-white"} border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-tight ${isDarkMode ? "bg-slate-700/40 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                                                                {rowKey}
                                                            </span>
                                                        </td>
                                                        {uniqueTags.map(tag => {
                                                            const cell = pivotData[rowKey]?.[tag];
                                                            const count = cell?.totalAdmissions || 0;
                                                            const discount = cell?.discountGiven || 0;
                                                            const originalFees = cell?.originalFees || 0;

                                                            rowTotalAdmissions += count;
                                                            rowTotalDiscount += discount;

                                                            return (
                                                                <td key={tag} className="p-4 text-center text-xs">
                                                                    {count > 0 ? (
                                                                        <button
                                                                            onClick={() => openCellDetails(rowKey, tag, cell.details)}
                                                                            className={`px-3 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center mx-auto ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-slate-50'}`}
                                                                        >
                                                                            <span className="font-bold text-orange-500">{fmt(discount)} <span className="text-[10px] text-gray-400 font-normal">({fmt(originalFees)})</span></span>
                                                                            <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>({count})</span>
                                                                        </button>
                                                                    ) : (
                                                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`}>-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="p-4 text-center text-xs font-black bg-orange-500/5">
                                                            {rowTotalAdmissions > 0 ? (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <span className="font-black text-orange-600">{fmt(rowTotalDiscount)}</span>
                                                                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>({rowTotalAdmissions})</span>
                                                                </div>
                                                            ) : (
                                                                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`}>-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className={`border-t-2 font-black ${isDarkMode ? "border-gray-700 bg-[#131619]" : "border-gray-200 bg-gray-50"}`}>
                                                <td className={`p-4 sticky left-0 z-10 ${isDarkMode ? "bg-[#131619]" : "bg-gray-50"} border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} font-black uppercase tracking-widest text-[10px] text-gray-500`}>
                                                    Grand Total
                                                </td>
                                                {uniqueTags.map(tag => {
                                                    let colTotalAdmissions = 0;
                                                    let colTotalDiscount = 0;
                                                    let colTotalOriginalFees = 0;
                                                    filteredRowKeys.forEach(rowKey => {
                                                        const cell = pivotData[rowKey]?.[tag];
                                                        if (cell) {
                                                            colTotalAdmissions += cell.totalAdmissions;
                                                            colTotalDiscount += cell.discountGiven;
                                                            colTotalOriginalFees += cell.originalFees || 0;
                                                        }
                                                    });

                                                    return (
                                                        <td key={tag} className="p-4 text-center text-xs font-black">
                                                            {colTotalAdmissions > 0 ? (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <span className="font-bold text-orange-500">{fmt(colTotalDiscount)} <span className="text-[10px] text-gray-400 font-medium">({fmt(colTotalOriginalFees)})</span></span>
                                                                    <span className={`text-[10px] font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>({colTotalAdmissions})</span>
                                                                </div>
                                                            ) : '-'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-4 text-center text-sm font-black bg-orange-500/10">
                                                    {filteredRowKeys.reduce((acc, rowKey) => {
                                                        uniqueTags.forEach(tag => {
                                                            const cell = pivotData[rowKey]?.[tag];
                                                            if (cell) acc.totalAdmissions += cell.totalAdmissions;
                                                        });
                                                        return acc;
                                                    }, { totalAdmissions: 0 }).totalAdmissions > 0 ? (
                                                        <div className="flex flex-col items-center justify-center">
                                                            <span className="font-black text-orange-600">
                                                                {fmt(filteredRowKeys.reduce((sum, rowKey) => {
                                                                    uniqueTags.forEach(tag => {
                                                                        const cell = pivotData[rowKey]?.[tag];
                                                                        if (cell) sum += cell.discountGiven;
                                                                    });
                                                                    return sum;
                                                                }, 0))}
                                                            </span>
                                                            <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                ({filteredRowKeys.reduce((sum, rowKey) => {
                                                                    uniqueTags.forEach(tag => {
                                                                        const cell = pivotData[rowKey]?.[tag];
                                                                        if (cell) sum += cell.totalAdmissions;
                                                                    });
                                                                    return sum;
                                                                }, 0)})
                                                            </span>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Pivot Table cell details modal - Rendered inline to avoid AnimatePresence context bugs */}
            <AnimatePresence>
                {selectedCell && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border border-gray-700' : 'bg-white border border-gray-200'}`}
                        >
                            <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{`Details: ${selectedCell.rowKey} - ${selectedCell.examTagName}`}</h3>
                                <button onClick={() => setSelectedCell(null)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-100 text-gray-500 hover:text-gray-900'}`}>
                                    <FaTimes size={16} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className={`border-b ${isDarkMode ? "border-gray-700 bg-[#131619]" : "border-gray-200 bg-gray-50"}`}>
                                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Date</th>
                                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Admission Type</th>
                                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Centre</th>
                                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Course</th>
                                                <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Admissions</th>
                                                <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Original Fees</th>
                                                <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-orange-500">Discount Given</th>
                                                <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Committed Fees</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDarkMode ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                            {selectedCell.details.map((detail, idx) => (
                                                <tr key={idx} className={`transition-colors ${isDarkMode ? "hover:bg-gray-800/50" : "hover:bg-blue-50/30"}`}>
                                                    <td className="p-4 text-xs font-bold text-gray-400">{detail.date}</td>
                                                    <td className="p-4 text-xs">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                            detail.type === "Normal" 
                                                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                                                                : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                        }`}>
                                                            {detail.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-xs font-semibold text-gray-500">{detail.centre}</td>
                                                    <td className="p-4 text-xs font-semibold text-gray-400">{detail.courseName || "—"}</td>
                                                    <td className="p-4 text-center text-xs font-bold">{(detail.totalAdmissions || 0).toLocaleString("en-IN")}</td>
                                                    <td className="p-4 text-right text-xs font-bold text-gray-400">{fmt(detail.originalFees)}</td>
                                                    <td className="p-4 text-right text-xs font-bold text-orange-500">{fmt(detail.discountGiven)}</td>
                                                    <td className="p-4 text-right text-xs font-black text-blue-500">{fmt(detail.committedFees)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default DiscountReport;
