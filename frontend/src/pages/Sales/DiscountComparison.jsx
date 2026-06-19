import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../../components/Layout";
import { 
    FaFilter, FaDownload, FaChevronDown, 
    FaEraser, FaTable, FaCoins, FaPercentage, FaSearch, 
    FaBuilding, FaTag, FaTimes, FaCalendarAlt, FaChartBar
} from "react-icons/fa";
import { MdOutlineFilterListOff } from "react-icons/md";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, Cell 
} from "recharts";

// Helper for currency formatting
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Date helpers
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

const getThisWeekRange = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(today.setDate(diff));
    return { start: formatDate(start), end: formatDate(new Date()) };
};

const getLastWeekRange = () => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const lastMonday = new Date(today.setDate(diffToMonday - 7));
    const lastSunday = new Date(today.setDate(diffToMonday - 1));
    return { start: formatDate(lastMonday), end: formatDate(lastSunday) };
};

const getThisMonthRange = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: formatDate(start), end: formatDate(today) };
};

const getLastMonthRange = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: formatDate(start), end: formatDate(end) };
};

const getThisYearRange = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    return { start: formatDate(start), end: formatDate(today) };
};

// Searchable Multi-Select Component
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
    const base = "min-w-[160px] h-10 px-3 border rounded-lg cursor-pointer flex justify-between items-center text-sm transition-all";
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

const DiscountComparison = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const card = `rounded-2xl border transition-all ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`;

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
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [selectedProgramme, setSelectedProgramme] = useState("");
    const [timePeriod, setTimePeriod] = useState("This Month");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Comparison Config
    const [comparedExamTag, setComparedExamTag] = useState("");
    const [metricUnit, setMetricUnit] = useState("amount"); // amount (₹) or percentage (%)

    // Data States
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
    }, [selectedCentres, selectedSessions, selectedProgramme, timePeriod, startDate, endDate]);

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
            if (eRes.ok) {
                const tags = await eRes.json();
                const sortedTags = (Array.isArray(tags) ? tags : tags.data || [])
                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setExamTags(sortedTags);
                if (sortedTags.length > 0) {
                    // Try to default to "JEE 1 YEAR" or "NEET 1 YEAR" if present, otherwise first available
                    const firstOption = sortedTags.find(t => t.name.toUpperCase().includes("JEE 1 YEAR")) || sortedTags[0];
                    setComparedExamTag(firstOption.name);
                }
            }
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
            } else if (timePeriod === "This Week") {
                const { start, end } = getThisWeekRange();
                params.append("startDate", start);
                params.append("endDate", end);
            } else if (timePeriod === "Last Week") {
                const { start, end } = getLastWeekRange();
                params.append("startDate", start);
                params.append("endDate", end);
            } else if (timePeriod === "This Month") {
                const { start, end } = getThisMonthRange();
                params.append("startDate", start);
                params.append("endDate", end);
            } else if (timePeriod === "Last Month") {
                const { start, end } = getLastMonthRange();
                params.append("startDate", start);
                params.append("endDate", end);
            } else if (timePeriod === "This Year") {
                const { start, end } = getThisYearRange();
                params.append("startDate", start);
                params.append("endDate", end);
            }

            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
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
    const toggleCentreSelection = (id) => {
        setSelectedCentres(prev =>
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
        setSelectedSessions([]);
        setSelectedProgramme("");
        setTimePeriod("This Month");
        setStartDate("");
        setEndDate("");
        setSearch("");
        toast.info("Filters reset");
    };

    const openCellDetails = (rowKey, examTagName, details) => {
        setSelectedCell({ rowKey, examTagName, details });
    };

    // ---- Data Grouping and Analytics Aggregation ----
    const groupedByCentre = {};
    let totalDiscountOverall = 0;
    let totalDiscountCompared = 0;
    let totalOriginalFeesOverall = 0;
    let totalOriginalFeesCompared = 0;
    let totalAdmissionsOverall = 0;
    let totalAdmissionsCompared = 0;

    pivotRawData.forEach(item => {
        const c = item.centre || "—";
        const t = item.examTagName || "Generic Tag";
        const discount = item.discountGiven || 0;
        const original = item.originalFees || 0;
        const admissions = item.totalAdmissions || 0;

        totalDiscountOverall += discount;
        totalOriginalFeesOverall += original;
        totalAdmissionsOverall += admissions;

        if (t === comparedExamTag) {
            totalDiscountCompared += discount;
            totalOriginalFeesCompared += original;
            totalAdmissionsCompared += admissions;
        }

        if (!groupedByCentre[c]) {
            groupedByCentre[c] = {
                centreName: c,
                overallDiscount: 0,
                overallOriginalFees: 0,
                overallAdmissions: 0,
                comparedDiscount: 0,
                comparedOriginalFees: 0,
                comparedAdmissions: 0,
                details: [],
                comparedDetails: []
            };
        }

        groupedByCentre[c].overallDiscount += discount;
        groupedByCentre[c].overallOriginalFees += original;
        groupedByCentre[c].overallAdmissions += admissions;
        groupedByCentre[c].details.push(item);

        if (t === comparedExamTag) {
            groupedByCentre[c].comparedDiscount += discount;
            groupedByCentre[c].comparedOriginalFees += original;
            groupedByCentre[c].comparedAdmissions += admissions;
            groupedByCentre[c].comparedDetails.push(item);
        }
    });

    const averageDiscountPercentOverall = totalOriginalFeesOverall > 0 
        ? ((totalDiscountOverall / totalOriginalFeesOverall) * 100).toFixed(2) 
        : 0;
    
    const averageDiscountPercentCompared = totalOriginalFeesCompared > 0 
        ? ((totalDiscountCompared / totalOriginalFeesCompared) * 100).toFixed(2) 
        : 0;

    // Filter centres by search query
    const filteredCentres = Object.keys(groupedByCentre)
        .filter(c => !search || c.toLowerCase().includes(search.toLowerCase()))
        .sort();

    // Map data for Recharts Bar Chart
    const barChartData = filteredCentres.map(c => {
        const item = groupedByCentre[c];
        const overallPct = item.overallOriginalFees > 0 ? (item.overallDiscount / item.overallOriginalFees) * 100 : 0;
        const comparedPct = item.comparedOriginalFees > 0 ? (item.comparedDiscount / item.comparedOriginalFees) * 100 : 0;

        return {
            name: c,
            // Absolute Value Mode
            overallDiscount: item.overallDiscount,
            comparedDiscount: item.comparedDiscount,
            // Percentage Mode
            overallDiscountPercent: parseFloat(overallPct.toFixed(2)),
            comparedDiscountPercent: parseFloat(comparedPct.toFixed(2)),
            // Context Tooltip details
            overallAdmissions: item.overallAdmissions,
            comparedAdmissions: item.comparedAdmissions
        };
    });

    // Excel Export function
    const handleDownloadExcel = () => {
        if (filteredCentres.length === 0) {
            toast.warn("No data to download");
            return;
        }

        const exportRows = filteredCentres.map((c, idx) => {
            const item = groupedByCentre[c];
            const overallPct = item.overallOriginalFees > 0 ? (item.overallDiscount / item.overallOriginalFees) * 100 : 0;
            const comparedPct = item.comparedOriginalFees > 0 ? (item.comparedDiscount / item.comparedOriginalFees) * 100 : 0;

            return {
                "S.No": idx + 1,
                "Centre Name": c,
                "Overall Admissions": item.overallAdmissions,
                "Overall Discount (₹)": item.overallDiscount,
                "Overall Original Fees (₹)": item.overallOriginalFees,
                "Overall Discount (%)": parseFloat(overallPct.toFixed(2)),
                [`Compared Admissions (${comparedExamTag})`]: item.comparedAdmissions,
                [`Compared Discount (${comparedExamTag}) (₹)`]: item.comparedDiscount,
                [`Compared Original Fees (${comparedExamTag}) (₹)`]: item.comparedOriginalFees,
                [`Compared Discount (${comparedExamTag}) (%)`]: parseFloat(comparedPct.toFixed(2))
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Discount_Comparison");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/octet-stream" }),
            `Discount_Comparison_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // Custom recharts tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className={`p-4 rounded-xl shadow-2xl border text-xs leading-relaxed transition-all
                    ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'}`}
                >
                    <p className="font-black border-b pb-1.5 mb-2 uppercase tracking-wide">{data.name}</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-6">
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-violet-500" /> Overall Discount:</span>
                            <span className="font-bold text-right">
                                {metricUnit === "amount" ? fmt(data.overallDiscount) : `${data.overallDiscountPercent}%`}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 -mt-1 ml-4">Admissions: {data.overallAdmissions}</p>

                        <div className="flex justify-between items-center gap-6 mt-1">
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500" /> {comparedExamTag}:</span>
                            <span className="font-bold text-emerald-500 text-right">
                                {metricUnit === "amount" ? fmt(data.comparedDiscount) : `${data.comparedDiscountPercent}%`}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-400/80 -mt-1 ml-4">Admissions: {data.comparedAdmissions}</p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Discount Comparison Analysis</h1>
                        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                            Compare overall fee discounts with specific examtag courses across all operational centres
                        </p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <SummaryCard 
                        icon={<FaCoins />} 
                        label="Total Overall Discount" 
                        value={fmt(totalDiscountOverall)} 
                        grad="bg-violet-500/15 text-violet-500" 
                    />
                    <SummaryCard 
                        icon={<FaPercentage />} 
                        label="Avg Overall Discount (%)" 
                        value={`${averageDiscountPercentOverall}%`} 
                        grad="bg-blue-500/15 text-blue-500" 
                    />
                    <SummaryCard 
                        icon={<FaTag />} 
                        label={`Discount: ${comparedExamTag || 'Selected Course'}`} 
                        value={fmt(totalDiscountCompared)} 
                        grad="bg-emerald-500/15 text-emerald-500" 
                    />
                    <SummaryCard 
                        icon={<FaPercentage />} 
                        label="Avg Course Discount (%)" 
                        value={`${averageDiscountPercentCompared}%`} 
                        grad="bg-orange-500/15 text-orange-500" 
                    />
                </div>

                {/* Filters Section */}
                <div className={`p-6 rounded-xl shadow-sm border transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-1.5 h-5 bg-violet-600 rounded-full" />
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            <FaFilter className="inline mr-2" />Filters & Presets
                        </h3>
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
                        <div className="min-w-[140px]">
                            <select
                                value={selectedProgramme}
                                onChange={(e) => setSelectedProgramme(e.target.value)}
                                className={`h-10 w-full px-3 border rounded-lg text-sm outline-none font-bold transition-all ${
                                    isDarkMode 
                                        ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-blue-500' 
                                        : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500 shadow-sm'
                                }`}
                            >
                                <option value="">All Programs</option>
                                <option value="CRP">CRP</option>
                                <option value="NCRP">NCRP</option>
                            </select>
                        </div>

                        {/* Date Preset Filter */}
                        <div className="min-w-[140px]">
                            <select
                                value={timePeriod}
                                onChange={(e) => setTimePeriod(e.target.value)}
                                className={`h-10 w-full px-3 border rounded-lg text-sm outline-none font-bold transition-all ${
                                    isDarkMode 
                                        ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-blue-500' 
                                        : 'bg-white border-gray-300 text-gray-700 focus:border-blue-500 shadow-sm'
                                }`}
                            >
                                <option value="Today">Today</option>
                                <option value="Yesterday">Yesterday</option>
                                <option value="This Week">This Week</option>
                                <option value="Last Week">Last Week</option>
                                <option value="This Month">This Month</option>
                                <option value="Last Month">Last Month</option>
                                <option value="This Year">This Year</option>
                                <option value="Custom">Custom Range</option>
                            </select>
                        </div>

                        {/* Custom Datepicker */}
                        {timePeriod === "Custom" && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`h-10 px-3 border rounded-lg text-sm font-bold outline-none shadow-sm transition-colors ${
                                        isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'
                                    }`}
                                />
                                <span className="text-gray-500 font-black text-[10px] uppercase">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`h-10 px-3 border rounded-lg text-sm font-bold outline-none shadow-sm transition-colors ${
                                        isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'
                                    }`}
                                />
                            </div>
                        )}

                        {/* Reset Filters */}
                        <button
                            onClick={handleResetFilters}
                            className={`h-10 px-4 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all ${
                                isDarkMode ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                            title="Reset Filters"
                        >
                            <MdOutlineFilterListOff size={15} /> Reset
                        </button>
                    </div>
                </div>

                {/* Chart Section */}
                <div className={`p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                        <h3 className={`text-xl font-bold flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            <div className="w-2 h-8 bg-violet-600 rounded-full"></div>
                            Discount Comparison Chart
                        </h3>

                        {/* Chart Controls */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Exam Tag Select for Comparison */}
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Compare Tag:</span>
                                <select
                                    value={comparedExamTag}
                                    onChange={(e) => setComparedExamTag(e.target.value)}
                                    className={`h-9 px-3 border rounded-lg text-xs outline-none font-bold transition-all ${
                                        isDarkMode 
                                            ? 'bg-black/20 border-gray-700 text-emerald-400 focus:border-emerald-500' 
                                            : 'bg-emerald-50 border-emerald-100 text-emerald-700 focus:border-emerald-500 shadow-sm'
                                    }`}
                                >
                                    {examTags.map(tag => (
                                        <option key={tag._id} value={tag.name}>{tag.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Metric Unit Toggle */}
                            <div className={`flex rounded-lg overflow-hidden border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <button
                                    onClick={() => setMetricUnit("amount")}
                                    className={`px-3 py-1.5 text-xs font-bold transition-all ${
                                        metricUnit === "amount" 
                                            ? "bg-violet-600 text-white" 
                                            : (isDarkMode ? "bg-gray-800 text-gray-400 hover:text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100")
                                    }`}
                                >
                                    Value (₹)
                                </button>
                                <button
                                    onClick={() => setMetricUnit("percentage")}
                                    className={`px-3 py-1.5 text-xs font-bold transition-all ${
                                        metricUnit === "percentage" 
                                            ? "bg-violet-600 text-white" 
                                            : (isDarkMode ? "bg-gray-800 text-gray-400 hover:text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100")
                                    }`}
                                >
                                    Percent (%)
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-black animate-pulse tracking-[0.2em] text-xs">GENERATING VISUALIZATION...</p>
                            </div>
                        </div>
                    ) : barChartData.length === 0 ? (
                        <div className={`flex h-96 items-center justify-center flex-col gap-4 rounded-2xl border border-dashed transition-colors ${
                            isDarkMode ? 'bg-[#131619] border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-300 text-gray-400'
                        }`}>
                            <FaChartBar size={48} className="opacity-20 animate-pulse" />
                            <p className="uppercase tracking-[0.2em] text-sm font-black opacity-50">No comparative data to plot</p>
                        </div>
                    ) : (
                        <div className="h-96 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={barChartData}
                                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                                >
                                    <CartesianGrid 
                                        strokeDasharray="3 3" 
                                        vertical={false} 
                                        stroke={isDarkMode ? "#374151" : "#e5e7eb"} 
                                    />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke={isDarkMode ? "#9ca3af" : "#4b5563"} 
                                        fontSize={10} 
                                        fontWeight="bold" 
                                        tickLine={false} 
                                        dy={10}
                                    />
                                    <YAxis 
                                        stroke={isDarkMode ? "#9ca3af" : "#4b5563"} 
                                        fontSize={10} 
                                        fontWeight="bold" 
                                        tickLine={false} 
                                        tickFormatter={val => metricUnit === "amount" ? `₹${(val / 1000)}k` : `${val}%`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }} />
                                    <Legend 
                                        verticalAlign="top" 
                                        height={36} 
                                        iconSize={10}
                                        iconType="circle"
                                        formatter={(val) => <span className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{val}</span>}
                                    />
                                    <Bar 
                                        name="Overall Discount" 
                                        dataKey={metricUnit === "amount" ? "overallDiscount" : "overallDiscountPercent"} 
                                        fill="#a855f7" 
                                        radius={[4, 4, 0, 0]} 
                                        maxBarSize={40}
                                    />
                                    <Bar 
                                        name={`${comparedExamTag} Discount`} 
                                        dataKey={metricUnit === "amount" ? "comparedDiscount" : "comparedDiscountPercent"} 
                                        fill="#10b981" 
                                        radius={[4, 4, 0, 0]} 
                                        maxBarSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Table Data Grid Section */}
                <div className={`p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDownloadExcel}
                                className="bg-[#22c55e] hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-lg flex items-center gap-2 active:scale-95"
                            >
                                <FaDownload /> Export Excel
                            </button>
                        </div>
                    </div>

                    {!loading && filteredCentres.length === 0 ? (
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
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            Overall Admissions
                                        </th>
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-500">
                                            Overall Discount Given
                                        </th>
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-violet-400">
                                            Overall Discount (%)
                                        </th>
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                            Course Admissions
                                        </th>
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                            Course Discount Given
                                        </th>
                                        <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                            Course Discount (%)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                    {filteredCentres.map((c, idx) => {
                                        const item = groupedByCentre[c];
                                        const overallPct = item.overallOriginalFees > 0 ? (item.overallDiscount / item.overallOriginalFees) * 100 : 0;
                                        const comparedPct = item.comparedOriginalFees > 0 ? (item.comparedDiscount / item.comparedOriginalFees) * 100 : 0;

                                        return (
                                            <tr key={idx} className={`transition-colors ${isDarkMode ? "hover:bg-gray-800/25" : "hover:bg-blue-50/20"}`}>
                                                <td className={`p-4 text-xs font-bold sticky left-0 z-10 ${isDarkMode ? "bg-[#1a1f24]" : "bg-white"} border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-tight ${isDarkMode ? "bg-slate-700/40 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                                                        {c}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center text-xs font-bold text-gray-500">
                                                    {item.overallAdmissions}
                                                </td>
                                                <td className="p-4 text-center text-xs">
                                                    {item.overallDiscount > 0 ? (
                                                        <button
                                                            onClick={() => openCellDetails(c, "Overall", item.details)}
                                                            className={`px-3 py-1.5 rounded-xl font-bold text-violet-500 transition-all hover:scale-105 active:scale-95 hover:bg-violet-500/10 mx-auto`}
                                                        >
                                                            {fmt(item.overallDiscount)}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center text-xs font-bold text-violet-400">
                                                    {overallPct > 0 ? `${overallPct.toFixed(2)}%` : "-"}
                                                </td>
                                                <td className="p-4 text-center text-xs font-bold text-gray-500">
                                                    {item.comparedAdmissions}
                                                </td>
                                                <td className="p-4 text-center text-xs">
                                                    {item.comparedDiscount > 0 ? (
                                                        <button
                                                            onClick={() => openCellDetails(c, comparedExamTag, item.comparedDetails)}
                                                            className={`px-3 py-1.5 rounded-xl font-bold text-emerald-500 transition-all hover:scale-105 active:scale-95 hover:bg-emerald-500/10 mx-auto`}
                                                        >
                                                            {fmt(item.comparedDiscount)}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center text-xs font-bold text-emerald-400">
                                                    {comparedPct > 0 ? `${comparedPct.toFixed(2)}%` : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Pivot Table cell details modal */}
            <AnimatePresence>
                {selectedCell && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`relative w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border border-gray-700' : 'bg-white border border-gray-200'}`}
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
                                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Course Type</th>
                                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Course Name</th>
                                                <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Exam Tag</th>
                                                <th className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">Admissions</th>
                                                <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Original Fees</th>
                                                <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-orange-500">Discount Given</th>
                                                <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">Committed Fees</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDarkMode ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                            {selectedCell.details.map((detail, idx) => (
                                                <tr key={idx} className={`transition-colors ${isDarkMode ? "hover:bg-gray-800/50" : "hover:bg-blue-50/30"}`}>
                                                    <td className="p-4 text-xs font-bold text-gray-500">{detail.date}</td>
                                                    <td className="p-4 text-xs font-bold text-gray-500">{detail.type}</td>
                                                    <td className="p-4 text-xs text-gray-500">{detail.courseName}</td>
                                                    <td className="p-4 text-xs">
                                                        <span className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-2 py-0.5 rounded text-[10px] font-bold">
                                                            {detail.examTagName}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center text-xs font-bold text-gray-600">{detail.totalAdmissions}</td>
                                                    <td className="p-4 text-right text-xs font-bold text-gray-600">{fmt(detail.originalFees)}</td>
                                                    <td className="p-4 text-right text-xs font-bold text-orange-500">{fmt(detail.discountGiven)}</td>
                                                    <td className="p-4 text-right text-xs font-bold text-gray-600">{fmt(detail.committedFees)}</td>
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

export default DiscountComparison;
