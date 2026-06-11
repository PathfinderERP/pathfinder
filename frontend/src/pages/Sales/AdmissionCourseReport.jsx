import React, { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../../components/Layout";
import {
    FaDownload, FaChevronDown, FaFilter, FaSyncAlt, FaBuilding,
    FaTag, FaGraduationCap, FaRupeeSign, FaCalendarAlt, FaTable,
    FaChartBar, FaSearch, FaLayerGroup, FaTimes
} from "react-icons/fa";
import { MdFilterListOff } from "react-icons/md";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell
} from "recharts";
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

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ isOpen, onClose, title, children, isDarkMode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`relative w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border border-gray-700' : 'bg-white border border-gray-200'}`}
            >
                <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <h3 className={`text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
                        <FaTimes size={16} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};


// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PALETTE = [
    "#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6",
    "#06b6d4","#ec4899","#84cc16","#f97316","#6366f1",
    "#14b8a6","#a855f7","#f43f5e","#0ea5e9","#22c55e"
];

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

// ─── Month names ──────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ══════════════════════════════════════════════════════════════════════════════
const AdmissionCourseReport = () => {
    const { theme } = useTheme();
    const isDark    = theme === "dark";

    // ── master data ───────────────────────────────────────────────────────────
    const [centres,  setCentres]  = useState([]);
    const [examTags, setExamTags] = useState([]);

    // ── filters ───────────────────────────────────────────────────────────────
    const [selCentres,  setSelCentres]  = useState([]);
    const [selTags,     setSelTags]     = useState([]);
    const [timePeriod,  setTimePeriod]  = useState("This Year");
    const [startDate,   setStartDate]   = useState("");
    const [endDate,     setEndDate]     = useState("");

    // ── display ───────────────────────────────────────────────────────────────
    const [search,      setSearch]      = useState("");

    // ── data ──────────────────────────────────────────────────────────────────
    // Each row: { examTagId, examTagName, centreName, courseName, month, count }
    const [rows,    setRows]    = useState([]);
    const [summary, setSummary] = useState({ total: 0, tags: 0, centres: 0, courses: 0 });
    const [loading, setLoading] = useState(false);

    // Modal State
    const [selectedCell, setSelectedCell] = useState(null); // { centreName, examTagName, details: [] }

    // ── fetch master ──────────────────────────────────────────────────────────
    useEffect(() => { fetchMaster(); }, []);

    const fetchMaster = async () => {
        const token = localStorage.getItem("token");
        const h     = { Authorization: `Bearer ${token}` };
        try {
            const [cR, tR] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`,  { headers: h }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers: h }),
            ]);
            if (cR.ok) {
                const d = await cR.json();
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
            if (tR.ok) {
                const tags = await tR.json();
                setExamTags(Array.isArray(tags) ? tags : tags.data || []);
            }
        } catch (e) { console.error(e); }
    };

    // ── build query params ────────────────────────────────────────────────────
    const buildParams = (tagId = null) => {
        const p = new URLSearchParams();
        if (timePeriod === "Custom") {
            p.append("startDate", startDate);
            p.append("endDate",   endDate);
        } else {
            const yr = new Date().getFullYear();
            p.append("year", timePeriod === "This Year" ? yr : yr - 1);
        }
        if (selCentres.length) p.append("centreIds", selCentres.join(","));
        if (tagId)             p.append("examTagId", tagId);  // backend uses examTagId
        return p.toString();
    };

    // ── fetch report ──────────────────────────────────────────────────────────
    const fetchReport = useCallback(async () => {
        if (timePeriod === "Custom" && (!startDate || !endDate)) return;
        setLoading(true);
        const token = localStorage.getItem("token");

        try {
            // Which tags to query
            const tagsToFetch = selTags.length > 0
                ? examTags.filter(t => selTags.includes(t._id))
                : examTags;

            if (!tagsToFetch.length) {
                setRows([]); setSummary({ total: 0, tags: 0, centres: 0, courses: 0 });
                return;
            }

            // Parallel fetch — one call per exam tag
            const results = await Promise.all(
                tagsToFetch.map(async (tag) => {
                    try {
                        const res = await fetch(
                            `${import.meta.env.VITE_API_URL}/sales/admission-report?${buildParams(tag._id)}`,
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        if (!res.ok) return [];
                        const data = await res.json();

                        // detailedTrend: [{ month, monthName, centre, courseName, className, count }]
                        const detail = data.detailedTrend || [];

                        if (detail.length > 0) {
                            return detail.map(r => ({
                                examTagId:   tag._id,
                                examTagName: tag.name,
                                centreName:  r.centre     || "—",
                                courseName:  r.courseName || "—",
                                className:   r.className  || "—",
                                monthName:   r.monthName  || MONTHS[(r.month || 1) - 1],
                                date:        r.date       || "—",
                                count:       r.count      || 0,
                                downPayment: r.downPayment || 0,
                            }));
                        }

                        // Fallback: if no detail, create one aggregate row per tag
                        const total = (data.status?.admitted || 0);
                        if (total === 0) return [];
                        return [{
                            examTagId:   tag._id,
                            examTagName: tag.name,
                            centreName:  "All Centres",
                            courseName:  "—",
                            className:   "—",
                            monthName:   "—",
                            date:        "—",
                            count:       total,
                            downPayment: 0,
                        }];
                    } catch { return []; }
                })
            );

            const merged = results.flat();
            setRows(merged);

            const total   = merged.reduce((a, r) => a + r.count, 0);
            const tags    = new Set(merged.map(r => r.examTagId)).size;
            const cntrs   = new Set(merged.map(r => r.centreName)).size;
            const courses  = new Set(merged.map(r => r.courseName)).size;
            setSummary({ total, tags, centres: cntrs, courses });
        } catch (e) {
            console.error(e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [selCentres, selTags, timePeriod, startDate, endDate, examTags]);

    // Trigger fetch on filter changes
    useEffect(() => {
        if (examTags.length > 0) fetchReport();
    }, [selCentres, selTags, timePeriod, startDate, endDate, examTags]);

    // ── helpers ───────────────────────────────────────────────────────────────
    const toggle     = setter => id => setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const resetAll   = () => { setSelCentres([]); setSelTags([]); setTimePeriod("This Year"); setStartDate(""); setEndDate(""); setSearch(""); };

    // Unique tag → index for stable colour
    const tagIndexMap = {};
    [...new Set(rows.map(r => r.examTagId))].forEach((id, i) => { tagIndexMap[id] = i; });

    // Build the full list of centres to display:
    // Start from the master centres list (respecting the centre filter dropdown),
    // then merge in any centre names that came back in the rows data (edge cases).
    // This ensures centres with 0 admissions still appear in the table and Excel export.
    const masterCentreNames = (
        selCentres.length > 0
            ? centres.filter(c => selCentres.includes(c._id))
            : centres
    ).map(c => c.centreName);

    const rowCentreNames = rows.map(r => r.centreName);
    const allCentreNames = [...new Set([...masterCentreNames, ...rowCentreNames])];

    // Search (filter centres based on search term)
    const filteredCentres = allCentreNames
        .filter(c => !search || (c || "").toLowerCase().includes(search.toLowerCase()))
        .sort();

    // Pivot Data Structure
    // pivotData[centreName][examTagName] = { count: 0, details: [] }
    const pivotData = {};
    const allTagsInPivot = new Set();
    
    rows.forEach(r => {
        if(!pivotData[r.centreName]) pivotData[r.centreName] = {};
        if(!pivotData[r.centreName][r.examTagName]) pivotData[r.centreName][r.examTagName] = { count: 0, details: [] };
        
        pivotData[r.centreName][r.examTagName].count += r.count;
        pivotData[r.centreName][r.examTagName].details.push(r);
        allTagsInPivot.add(r.examTagName);
    });

    const uniqueTags = Array.from(allTagsInPivot).sort();

    // Grand total for share %
    const grandTotal = rows.reduce((a, r) => a + r.count, 0);


    // ── excel export ──────────────────────────────────────────────────────────
    const handleExport = () => {
        if (!filteredCentres.length) return;
        const wb   = XLSX.utils.book_new();
        
        // Pivot Table Export — includes centres with 0 admissions (all tag counts will be 0)
        const pivotExportData = filteredCentres.map(c => {
            const rowObj = { "Centre": c };
            let total = 0;
            uniqueTags.forEach(t => {
                const count = pivotData[c]?.[t]?.count || 0;
                rowObj[t] = count;
                total += count;
            });
            rowObj["Total"] = total;
            return rowObj;
        });

        const ws = XLSX.utils.json_to_sheet(pivotExportData);
        XLSX.utils.book_append_sheet(wb, ws, "Pivot_Report");

        // Detailed Report Export - ensure all filtered centres appear
        // Group existing rows by centre name for quick lookup
        const rowsByCentre = {};
        rows.forEach(r => {
            if (!rowsByCentre[r.centreName]) {
                rowsByCentre[r.centreName] = [];
            }
            rowsByCentre[r.centreName].push(r);
        });

        const detailExportData = [];
        let counter = 1;

        filteredCentres.forEach(c => {
            const centreRows = rowsByCentre[c] || [];
            if (centreRows.length > 0) {
                centreRows.forEach(r => {
                    detailExportData.push({
                        "#":               counter++,
                        "Date":            r.date,
                        "Exam Tag":        r.examTagName,
                        "Centre":          r.centreName,
                        "Course":          r.courseName,
                        "Class":           r.className,
                        "Month":           r.monthName,
                        "Admissions":      r.count,
                        "Down Payment":    r.downPayment || 0,
                    });
                });
            } else {
                // Generate a placeholder row for centres with 0 admissions
                detailExportData.push({
                    "#":               counter++,
                    "Date":            "—",
                    "Exam Tag":        "—",
                    "Centre":          c,
                    "Course":          "—",
                    "Class":           "—",
                    "Month":           "—",
                    "Admissions":      0,
                    "Down Payment":    0,
                });
            }
        });

        const wsDetail = XLSX.utils.json_to_sheet(detailExportData);
        XLSX.utils.book_append_sheet(wb, wsDetail, "Detailed_Report");

        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buf], { type: "application/octet-stream" }),
            `ExamTag_Admission_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

    const openCellDetails = (centreName, examTagName, details) => {
        setSelectedCell({ centreName, examTagName, details });
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Layout activePage="Sales">
            <div className="space-y-6 pb-12">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                            Admission &amp; Course Report
                        </h1>
                        <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            Exam-Tag vs Centre admissions matrix
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button onClick={handleExport}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                            <FaDownload /> Export Excel
                        </button>
                    </div>
                </div>

                {/* ── Summary Cards ────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard icon={<FaGraduationCap />} label="Total Admissions" value={summary.total.toLocaleString("en-IN")} grad="bg-blue-500/15 text-blue-500" />
                    <SummaryCard icon={<FaTag />}           label="Exam Tags"        value={summary.tags}                          grad="bg-violet-500/15 text-violet-500" />
                    <SummaryCard icon={<FaBuilding />}      label="Centres"          value={summary.centres}                       grad="bg-amber-500/15 text-amber-500" />
                    <SummaryCard icon={<FaLayerGroup />}    label="Courses"          value={summary.courses}                       grad="bg-emerald-500/15 text-emerald-500" />
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
                            onToggle={toggle(setSelCentres)}
                            labelKey="centreName"
                            isDarkMode={isDark}
                        />

                        {/* Exam Tags */}
                        <MultiSelect
                            placeholder="All Exam Tags"
                            options={examTags}
                            selected={selTags}
                            onToggle={toggle(setSelTags)}
                            labelKey="name"
                            isDarkMode={isDark}
                        />

                        {/* Time Period */}
                        <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)}
                            className={`h-10 px-3 border rounded-lg text-sm outline-none transition-all
                                ${isDark ? "bg-[#1a1f24] border-gray-700 text-gray-300" : "bg-white border-gray-300 text-gray-700 shadow-sm"}`}>
                            <option value="This Year">This Year</option>
                            <option value="Last Year">Last Year</option>
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

                {/* ── Content ──────────────────────────────────────────────── */}
                <div className={`${card} overflow-hidden`}>

                    {/* Toolbar */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b flex-wrap gap-3
                        ${isDark ? "border-gray-800" : "border-gray-100"}`}>

                        {/* Search */}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border w-72
                            ${isDark ? "bg-[#131619] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                            <FaSearch size={12} className="text-gray-400 flex-shrink-0" />
                            <input type="text" placeholder="Search centre..."
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

                    {/* ── Loading ── */}
                    {loading && (
                        <div className="flex items-center justify-center py-32">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-14 h-14 rounded-full border-[5px] border-blue-600 border-t-transparent animate-spin" />
                                <p className={`text-xs font-black uppercase tracking-widest animate-pulse ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                                    Loading exam-tag data...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Empty ── */}
                    {!loading && filteredCentres.length === 0 && (
                        <div className={`flex flex-col items-center justify-center py-32 gap-4 ${isDark ? "text-gray-600" : "text-gray-300"}`}>
                            <FaLayerGroup size={52} />
                            <p className="text-xs font-black uppercase tracking-widest">No data for selected filters</p>
                        </div>
                    )}

                    {/* ══ PIVOT TABLE ══════════════════════════════════════════════ */}
                    {!loading && filteredCentres.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className={`border-b ${isDark ? "border-gray-800 bg-[#131619]" : "border-gray-100 bg-gray-50"}`}>
                                        <th className={`${thCls} sticky left-0 z-10 ${isDark ? "bg-[#131619]" : "bg-gray-50"} border-r ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                                            <FaBuilding className="inline mr-1" />Centre
                                        </th>
                                        {uniqueTags.map(tag => {
                                            const tagObj = examTags.find(t => t.name === tag);
                                            const ci = tagObj ? (tagIndexMap[tagObj._id] ?? 0) : 0;
                                            return (
                                                <th key={tag} className={`${thCls} text-center min-w-[120px]`}>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border ${tagBadge(ci)}`}>
                                                        <FaTag size={8} /> {tag}
                                                    </span>
                                                </th>
                                            );
                                        })}
                                        <th className={`${thCls} text-center font-black bg-blue-500/10 text-blue-500`}>Total</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                    {filteredCentres.map((centre, idx) => {
                                        let rowTotal = 0;
                                        return (
                                            <tr key={idx} className={`transition-colors ${isDark ? "hover:bg-gray-800/25" : "hover:bg-blue-50/20"}`}>
                                                <td className={`${tdCls} sticky left-0 z-10 ${isDark ? "bg-[#1a1f24]" : "bg-white"} border-r ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold
                                                        ${isDark ? "bg-slate-700/40 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                                                        <FaBuilding size={9} /> {centre}
                                                    </span>
                                                </td>
                                                {uniqueTags.map(tag => {
                                                    const cellData = pivotData[centre]?.[tag];
                                                    const count = cellData?.count || 0;
                                                    rowTotal += count;
                                                    return (
                                                        <td key={tag} className={`${tdCls} text-center`}>
                                                            {count > 0 ? (
                                                                <button 
                                                                    onClick={() => openCellDetails(centre, tag, cellData.details)}
                                                                    className={`px-3 py-1 rounded-md text-sm font-bold transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                                                >
                                                                    {count.toLocaleString("en-IN")}
                                                                </button>
                                                            ) : (
                                                                <span className={`text-xs font-medium ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className={`${tdCls} text-center font-black ${isDark ? 'text-white' : 'text-gray-900'} bg-blue-500/5`}>
                                                    {rowTotal.toLocaleString("en-IN")}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>

                                {/* Footer (Column Totals) */}
                                <tfoot>
                                    <tr className={`border-t-2 font-black ${isDark ? "border-gray-700 bg-[#131619]" : "border-gray-200 bg-gray-50"}`}>
                                        <td className={`${tdCls} sticky left-0 z-10 ${isDark ? "bg-[#131619]" : "bg-gray-50"} border-r ${isDark ? 'border-gray-800' : 'border-gray-200'} font-black uppercase tracking-widest text-xs`}>
                                            Grand Total
                                        </td>
                                        {uniqueTags.map(tag => {
                                            const colTotal = filteredCentres.reduce((sum, centre) => sum + (pivotData[centre]?.[tag]?.count || 0), 0);
                                            return (
                                                <td key={tag} className={`${tdCls} text-center text-sm font-black ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                                    {colTotal > 0 ? colTotal.toLocaleString("en-IN") : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className={`${tdCls} text-center text-lg font-black ${isDark ? "text-white" : "text-gray-900"} bg-blue-500/10`}>
                                            {grandTotal.toLocaleString("en-IN")}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Details Modal ──────────────────────────────────────────────── */}
            <Modal 
                isOpen={!!selectedCell} 
                onClose={() => setSelectedCell(null)}
                title={`Details: ${selectedCell?.centreName} - ${selectedCell?.examTagName}`}
                isDarkMode={isDark}
            >
                {selectedCell && (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className={`border-b ${isDark ? "border-gray-700 bg-[#131619]" : "border-gray-200 bg-gray-50"}`}>
                                    <th className={thCls}>Date</th>
                                    <th className={thCls}>Course Name</th>
                                    <th className={thCls}>Class</th>
                                    <th className={thCls}>Month</th>
                                    <th className={`${thCls} text-right`}>Admissions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? "divide-gray-800/50" : "divide-gray-100"}`}>
                                {selectedCell.details.map((detail, idx) => (
                                    <tr key={idx} className={`transition-colors ${isDark ? "hover:bg-gray-800/50" : "hover:bg-blue-50/30"}`}>
                                        <td className={`${tdCls} text-xs font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                            {detail.date}
                                        </td>
                                        <td className={tdCls}>
                                            <span className={`font-medium block ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                                                {detail.courseName}
                                            </span>
                                        </td>
                                        <td className={tdCls}>
                                            <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                                                {detail.className}
                                            </span>
                                        </td>
                                        <td className={`${tdCls} text-xs font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                            {detail.monthName}
                                        </td>
                                        <td className={`${tdCls} text-right font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                                            {detail.count.toLocaleString("en-IN")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className={`border-t-2 font-black ${isDark ? "border-gray-700 bg-[#131619]" : "border-gray-200 bg-gray-50"}`}>
                                    <td colSpan={4} className={`${tdCls} font-black uppercase tracking-widest text-xs text-right`}>Total</td>
                                    <td className={`${tdCls} text-right text-lg font-black ${isDark ? "text-white" : "text-gray-900"}`}>
                                        {selectedCell.details.reduce((a, d) => a + d.count, 0).toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Modal>
        </Layout>
    );
};

export default AdmissionCourseReport;
