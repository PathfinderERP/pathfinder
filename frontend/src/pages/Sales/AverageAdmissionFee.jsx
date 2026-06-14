import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../../components/Layout";
import {
    FaDownload, FaChevronDown, FaFilter, FaSyncAlt, FaBuilding,
    FaBook, FaCalendarAlt, FaTable, FaSearch, FaTimes, FaCoins, FaUsers, FaTag
} from "react-icons/fa";
import { MdFilterListOff } from "react-icons/md";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

// ─── Searchable Multi-Select ──────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

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

const AverageAdmissionFee = () => {
    const { theme } = useTheme();
    const isDark    = theme === "dark";

    // ── master data ───────────────────────────────────────────────────────────
    const [centres, setCentres] = useState([]);
    const [examTags, setExamTags] = useState([]);

    // ── filters ───────────────────────────────────────────────────────────────
    const [selCentres, setSelectedCentres]   = useState([]);
    const [selTags, setSelectedTags]         = useState([]);
    const [selectedProgramme, setSelectedProgramme] = useState("");
    const [timePeriod, setTimePeriod]        = useState("This Month");
    const [startDate, setStartDate]          = useState("");
    const [endDate, setEndDate]              = useState("");
    const [search, setSearch]                = useState("");

    // ── data ──────────────────────────────────────────────────────────────────
    const [reportData, setReportData] = useState([]);
    const [summary, setSummary]       = useState({ totalAdmissions: 0, totalAdmissionFee: 0, averageAdmissionFee: 0 });
    const [loading, setLoading]       = useState(false);

    // ── fetch master centres and exam tags ────────────────────────────────────
    useEffect(() => {
        const fetchMaster = async () => {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            try {
                const [cRes, tRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                    fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers })
                ]);
                if (cRes.ok) {
                    const d = await cRes.json();
                    let list = (Array.isArray(d) ? d : d.centres || []).filter(c => c.status !== "deactive");
                    
                    const stored = localStorage.getItem("user");
                    if (stored) {
                        const u = JSON.parse(stored);
                        if (u.role !== "superAdmin" && u.centres) {
                            const ids = u.centres.map(x => typeof x === "object" ? x._id : x);
                            list = list.filter(c => ids.includes(c._id));
                        }
                    }
                    setCentres(list.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || "")));
                }
                if (tRes.ok) {
                    const tags = await tRes.json();
                    setExamTags(Array.isArray(tags) ? tags : tags.data || []);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchMaster();
    }, []);

    // ── build query params ────────────────────────────────────────────────────
    const buildParams = useCallback(() => {
        const p = new URLSearchParams();
        if (timePeriod === "Custom") {
            p.append("startDate", startDate);
            p.append("endDate",   endDate);
        } else if (timePeriod === "Today") {
            const { start, end } = getTodayRange();
            p.append("startDate", start);
            p.append("endDate",   end);
        } else if (timePeriod === "Yesterday") {
            const { start, end } = getYesterdayRange();
            p.append("startDate", start);
            p.append("endDate",   end);
        } else if (timePeriod === "Last 7 Days") {
            const { start, end } = getLast7DaysRange();
            p.append("startDate", start);
            p.append("endDate",   end);
        } else if (timePeriod === "This Month") {
            const { start, end } = getThisMonthRange();
            p.append("startDate", start);
            p.append("endDate",   end);
        } else {
            const yr = new Date().getFullYear();
            p.append("year", timePeriod === "This Year" ? yr : yr - 1);
        }
        if (selCentres.length) p.append("centreIds", selCentres.join(","));
        if (selTags.length) p.append("examTagIds", selTags.join(","));
        if (selectedProgramme) p.append("programme", selectedProgramme);
        return p.toString();
    }, [selCentres, selTags, selectedProgramme, timePeriod, startDate, endDate]);

    // ── fetch report ──────────────────────────────────────────────────────────
    const fetchReport = useCallback(async () => {
        if (timePeriod === "Custom" && (!startDate || !endDate)) return;
        setLoading(true);
        const token = localStorage.getItem("token");

        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/sales/average-admission-fee?${buildParams()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setReportData(data.reportData || []);
                setSummary(data.summary || { totalAdmissions: 0, totalAdmissionFee: 0, averageAdmissionFee: 0 });
            } else {
                setReportData([]);
                setSummary({ totalAdmissions: 0, totalAdmissionFee: 0, averageAdmissionFee: 0 });
            }
        } catch (e) {
            console.error(e);
            setReportData([]);
        } finally {
            setLoading(false);
        }
    }, [buildParams, timePeriod, startDate, endDate]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // ── helpers ───────────────────────────────────────────────────────────────
    const toggleCentre = (id) => setSelectedCentres(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleExamTag = (id) => setSelectedTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const resetAll = () => {
        setSelectedCentres([]);
        setSelectedTags([]);
        setSelectedProgramme("");
        setTimePeriod("This Month");
        setStartDate("");
        setEndDate("");
        setSearch("");
    };

    // Filter by search text (Centre or Exam Tag)
    const filteredData = reportData.filter(item => {
        const matchesSearch = !search ||
            (item.centre || "").toLowerCase().includes(search.toLowerCase()) ||
            (item.examTagName || "").toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    // Excel Export
    const handleExport = () => {
        if (!filteredData.length) return;
        const exportRows = filteredData.map((item, idx) => ({
            "S.No": idx + 1,
            "Date": item.date,
            "Centre": item.centre,
            "Exam Tag": item.examTagName,
            "Course Type": item.type,
            "Admissions Count": item.totalAdmissions,
            "Total Admission Fee (₹)": item.totalAdmissionFee,
            "Average Admission Fee (₹)": item.averageAdmissionFee
        }));

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Avg_Admission_Fee");
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/octet-stream" }),
            `Average_Admission_Fee_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // ── styles ────────────────────────────────────────────────────────────────
    const card  = `rounded-2xl border transition-all ${isDark ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`;
    const thCls = `p-4 text-left text-[10px] font-black uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`;
    const tdCls = `p-4 text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`;

    const SummaryCard = ({ icon, label, value, grad }) => (
        <div className={`${card} p-5 flex items-center gap-4`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${grad}`}>{icon}</div>
            <div className="min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-gray-500" : "text-gray-400"}`}>{label}</p>
                <p className={`text-2xl font-black mt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
            </div>
        </div>
    );

    return (
        <Layout activePage="Sales">
            <div className="space-y-6 pb-12">
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                            Average Admission Fee
                        </h1>
                        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Centre-wise daily course-wise admission fee amount analytics
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button onClick={handleExport} disabled={filteredData.length === 0}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                            <FaDownload /> Export Excel
                        </button>
                    </div>
                </div>

                {/* ── Summary Cards ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SummaryCard icon={<FaUsers />} label="Total Admissions" value={summary.totalAdmissions.toLocaleString("en-IN")} grad="bg-blue-500/15 text-blue-500" />
                    <SummaryCard icon={<FaCoins />} label="Total Admission Fees" value={fmt(summary.totalAdmissionFee)} grad="bg-emerald-500/15 text-emerald-500" />
                    <SummaryCard icon={<FaBook />}  label="Average Admission Fee" value={fmt(summary.averageAdmissionFee)} grad="bg-violet-500/15 text-violet-500" />
                </div>

                {/* ── Filters ──────────────────────────────────────────────── */}
                <div className={`${card} p-6`}>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            <FaFilter className="inline mr-2" />Filters
                        </h3>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Centre */}
                        <MultiSelect
                            placeholder="All Centres"
                            options={centres}
                            selected={selCentres}
                            onToggle={toggleCentre}
                            labelKey="centreName"
                            isDarkMode={isDark}
                        />

                        {/* Exam Tags */}
                        <MultiSelect
                            placeholder="All Exam Tags"
                            options={examTags}
                            selected={selTags}
                            onToggle={toggleExamTag}
                            labelKey="name"
                            isDarkMode={isDark}
                        />

                        {/* Programme */}
                        <div className="min-w-[120px]">
                            <select
                                value={selectedProgramme}
                                onChange={(e) => setSelectedProgramme(e.target.value)}
                                className={`h-10 px-3 border rounded-lg text-sm outline-none font-bold transition-all
                                    ${isDark ? "bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500" : "bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm"}`}
                            >
                                <option value="">All Programs</option>
                                <option value="CRP">CRP</option>
                                <option value="NCRP">NCRP</option>
                            </select>
                        </div>

                        {/* Time Period */}
                        <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)}
                            className={`h-10 px-3 border rounded-lg text-sm outline-none transition-all
                                ${isDark ? "bg-[#1a1f24] border-gray-700 text-gray-300" : "bg-white border-gray-300 text-gray-700 shadow-sm"}`}>
                            <option value="This Month">This Month</option>
                            <option value="This Year">This Year</option>
                            <option value="Last Year">Last Year</option>
                            <option value="Today">Today</option>
                            <option value="Yesterday">Yesterday</option>
                            <option value="Last 7 Days">Last 7 Days</option>
                            <option value="Custom">Custom Range</option>
                        </select>

                        {timePeriod === "Custom" && (
                            <div className="flex items-center gap-2">
                                <FaCalendarAlt className="text-gray-400" size={12} />
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className={`h-10 px-3 border rounded-lg text-sm outline-none
                                        ${isDark ? "bg-[#1a1f24] border-gray-700 text-gray-300" : "bg-white border-gray-300 text-gray-700"}`}
                                />
                                <span className={`font-bold text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>to</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className={`h-10 px-3 border rounded-lg text-sm outline-none
                                        ${isDark ? "bg-[#1a1f24] border-gray-700 text-gray-300" : "bg-white border-gray-300 text-gray-700"}`}
                                />
                            </div>
                        )}

                        <button onClick={resetAll}
                            className={`h-10 px-4 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all
                                ${isDark ? "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                            <MdFilterListOff size={14} /> Reset
                        </button>
                    </div>
                </div>

                {/* ── Content Table ─────────────────────────────────────────── */}
                <div className={`${card} overflow-hidden`}>
                    {/* Toolbar */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b flex-wrap gap-3
                        ${isDark ? "border-gray-800" : "border-gray-100"}`}>

                    {/* Search */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-72
                        ${isDark ? "bg-[#131619] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                        <FaSearch size={12} className="text-gray-400 flex-shrink-0" />
                        <input type="text" placeholder="Search centre or exam tag..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className={`bg-transparent outline-none text-sm flex-1
                                ${isDark ? "text-gray-300 placeholder-gray-600" : "text-gray-700 placeholder-gray-400"}`}
                        />
                    </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={fetchReport}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all
                                    ${isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                                <FaSyncAlt size={11} /> Refresh
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-32">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-14 h-14 rounded-full border-[5px] border-blue-600 border-t-transparent animate-spin" />
                                <p className={`text-xs font-black uppercase tracking-widest animate-pulse ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                    Loading metrics...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredData.length === 0 && (
                        <div className={`flex flex-col items-center justify-center py-32 gap-4 ${isDark ? "text-gray-600" : "text-gray-300"}`}>
                            <FaTable size={52} />
                            <p className="text-xs font-black uppercase tracking-widest">No data available for selected filters</p>
                        </div>
                    )}

                    {/* Data Table */}
                    {!loading && filteredData.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className={`border-b ${isDark ? "border-gray-800 bg-[#131619]" : "border-gray-100 bg-gray-50"}`}>
                                        <th className={thCls}>Date</th>
                                        <th className={thCls}>Centre</th>
                                        <th className={thCls}>Exam Tag</th>
                                        <th className={thCls}>Course Type</th>
                                        <th className={`${thCls} text-center`}>Admissions</th>
                                        <th className={`${thCls} text-right`}>Total Admission Fee</th>
                                        <th className={`${thCls} text-right`}>Average Admission Fee</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                    {filteredData.map((item, idx) => (
                                        <tr key={idx} className={`transition-colors ${isDark ? "hover:bg-gray-800/25" : "hover:bg-blue-50/20"}`}>
                                            <td className={tdCls}>
                                                <span className="font-semibold">{item.date}</span>
                                            </td>
                                            <td className={tdCls}>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold
                                                    ${isDark ? "bg-slate-700/40 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                                                    <FaBuilding size={9} /> {item.centre}
                                                </span>
                                            </td>
                                            <td className={tdCls}>
                                                <span className="font-bold flex items-center gap-2">
                                                    <FaTag size={10} className="text-blue-500/80" />
                                                    {item.examTagName}
                                                </span>
                                            </td>
                                            <td className={tdCls}>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                    item.type === "Normal" 
                                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20" 
                                                        : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                                }`}>
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className={`${tdCls} text-center font-bold`}>
                                                {item.totalAdmissions}
                                            </td>
                                            <td className={`${tdCls} text-right font-bold text-emerald-500`}>
                                                {fmt(item.totalAdmissionFee)}
                                            </td>
                                            <td className={`${tdCls} text-right font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                                                {fmt(item.averageAdmissionFee)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AverageAdmissionFee;
