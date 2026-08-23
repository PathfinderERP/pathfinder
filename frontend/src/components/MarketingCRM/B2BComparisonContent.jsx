import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    FaSchool, FaChartLine, FaExclamationTriangle, FaCheckCircle,
    FaHourglassHalf, FaDownload, FaSync, FaSearch, FaFilter,
    FaChevronDown, FaTimes, FaFileExcel, FaEdit, FaEye, FaArrowUp,
    FaArrowDown, FaBuilding, FaUserTie, FaCalendarAlt, FaHandsHelping,
    FaSort, FaFire
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";

const CATEGORIES = [
    { id: "All", label: "All B2B Records", icon: <FaSchool /> },
    { id: "Lost Tie-ups", label: "1. Lost / At-Risk Tie-ups", icon: <FaExclamationTriangle className="text-rose-500" /> },
    { id: "New Tie-ups", label: "2. Current Year New Tie-ups", icon: <FaCheckCircle className="text-emerald-500" /> },
    { id: "High Turnout No Visit", label: "3. High Turnout (No Visit)", icon: <FaChartLine className="text-amber-500" /> },
    { id: "P1 Schools", label: "4. High Action Schools", icon: <FaFire className="text-orange-500" /> },
    { id: "Pending Visits", label: "5. Pending Visits Backlog", icon: <FaHourglassHalf className="text-cyan-500" /> }
];

export default function B2BComparisonContent() {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState({
        totalRecords: 0,
        lostTieUps: 0,
        newTieUps: 0,
        highTurnoutNoVisit: 0,
        p1Schools: 0,
        pendingVisits: 0,
        distinctCentresCount: 0
    });

    const [centresList, setCentresList] = useState([]);
    const [activeCategory, setActiveCategory] = useState("All");
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedMockTieUp, setSelectedMockTieUp] = useState("All");
    const [selectedVisited, setSelectedVisited] = useState("All");
    const [selectedHoHelp, setSelectedHoHelp] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [totalFiltered, setTotalFiltered] = useState(0);

    // Sorting
    const [sortBy, setSortBy] = useState("centerName");
    const [sortOrder, setSortOrder] = useState("asc");

    // Edit Modal State
    const [editingRecord, setEditingRecord] = useState(null);
    const [editForm, setEditForm] = useState({
        currentMockTieUp: "",
        currentStatus: "",
        schoolAccess: "YES",
        remarks: ""
    });
    const [savingEdit, setSavingEdit] = useState(false);

    // Sync / Re-import State
    const [syncing, setSyncing] = useState(false);

    // Dropdown open states
    const [centreDropdownOpen, setCentreDropdownOpen] = useState(false);

    const token = localStorage.getItem("token");

    // Fetch data from API
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeCategory !== "All") params.append("category", activeCategory);
            if (selectedCentres.length > 0) params.append("centerNames", selectedCentres.join(","));
            if (selectedMockTieUp !== "All") params.append("currentMockTieUp", selectedMockTieUp);
            if (selectedVisited !== "All") params.append("visitedThisYear", selectedVisited);
            if (selectedHoHelp !== "All") params.append("hoHelpNeeded", selectedHoHelp);
            if (searchQuery.trim()) params.append("search", searchQuery.trim());

            params.append("page", currentPage);
            params.append("limit", pageSize);
            params.append("sortBy", sortBy);
            params.append("sortOrder", sortOrder);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/marketing/b2b-comparison?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const json = await res.json();
            if (json.success) {
                setRecords(json.data || []);
                setSummary(json.summary || {});
                setCentresList(json.centres || []);
                setTotalPages(json.pagination?.pages || 1);
                setTotalFiltered(json.pagination?.total || 0);
            } else {
                toast.error(json.message || "Failed to load B2B comparison data");
            }
        } catch (error) {
            console.error("Error loading B2B comparison:", error);
            toast.error("Network error while loading data");
        } finally {
            setLoading(false);
        }
    }, [
        activeCategory,
        selectedCentres,
        selectedMockTieUp,
        selectedVisited,
        selectedHoHelp,
        searchQuery,
        currentPage,
        pageSize,
        sortBy,
        sortOrder,
        token
    ]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortOrder("asc");
        }
    };

    const handleSaveEdit = async () => {
        if (!editingRecord) return;
        setSavingEdit(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/marketing/b2b-comparison/${editingRecord._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });
            const json = await res.json();
            if (json.success) {
                toast.success("School status updated successfully");
                setEditingRecord(null);
                fetchData();
            } else {
                toast.error(json.message || "Failed to update record");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error saving updates");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleSyncData = async (e) => {
        const file = e.target.files?.[0];
        setSyncing(true);
        try {
            const formData = new FormData();
            if (file) formData.append("file", file);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/marketing/b2b-comparison/sync-excel`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            const json = await res.json();
            if (json.success) {
                toast.success(json.message || "B2B Comparison data synchronized");
                fetchData();
            } else {
                toast.error(json.message || "Failed to sync Excel data");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error syncing Excel data");
        } finally {
            setSyncing(false);
            e.target.value = "";
        }
    };

    const [exporting, setExporting] = useState(false);

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (activeCategory !== "All") params.append("category", activeCategory);
            if (selectedCentres.length > 0) params.append("centerNames", selectedCentres.join(","));
            if (selectedMockTieUp !== "All") params.append("currentMockTieUp", selectedMockTieUp);
            if (selectedVisited !== "All") params.append("visitedThisYear", selectedVisited);
            if (selectedHoHelp !== "All") params.append("hoHelpNeeded", selectedHoHelp);
            if (searchQuery.trim()) params.append("search", searchQuery.trim());
            params.append("exportAll", "true");
            params.append("sortBy", sortBy);
            params.append("sortOrder", sortOrder);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/marketing/b2b-comparison?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const json = await res.json();
            const allExportRecords = json.data || [];

            if (!allExportRecords.length) {
                toast.warn("No data available to export");
                return;
            }

            const rows = allExportRecords.map((r, idx) => ({
                "S.No": idx + 1,
                "Centre": r.centerName,
                "School Name": r.schoolName,
                "Category View": r.category,
                "Tie-up Type Last Year": r.lastYearTieUp || "—",
                "Students Appeared Last Year": r.studentsAppearedLastYear || "—",
                "Current Mock Tie-up": r.currentMockTieUp || "Not confirmed",
                "Current B2B Status": r.liveStatus || r.currentStatus || "—",
                "Tier": r.tier || "—",
                "School Access": r.schoolAccess || "—",
                "Visited This Year": r.visitedThisYear || "—",
                "Last Visit Date": r.lastVisitDate ? new Date(r.lastVisitDate).toLocaleDateString("en-IN") : "—",
                "Last Executive": r.lastExecutive || "—",
                "HO Help Needed": r.hoHelpNeeded || "—",
                "Visit Notes": r.visitNotes || "—"
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "B2B_Comparison");
            const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            saveAs(
                new Blob([out], { type: "application/octet-stream" }),
                `B2B_Comparison_${activeCategory.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`
            );
            toast.success(`Exported all ${rows.length} records successfully`);
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to export Excel data");
        } finally {
            setExporting(false);
        }
    };

    const resetFilters = () => {
        setSelectedCentres([]);
        setSelectedMockTieUp("All");
        setSelectedVisited("All");
        setSelectedHoHelp("All");
        setSearchQuery("");
        setCurrentPage(1);
    };

    const renderMockTieUpBadge = (status) => {
        const isConf = status && /confirmed/i.test(status) && !/not/i.test(status);
        if (isConf) {
            return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Confirmed
            </span>;
        }
        return <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Not Confirmed
        </span>;
    };

    const renderCategoryBadge = (cat) => {
        if (cat === "Lost Tie-ups") return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">1. Lost Tie-up</span>;
        if (cat === "New Tie-ups") return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">2. New Tie-up</span>;
        if (cat === "High Turnout No Visit") return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">3. High Turnout (No Visit)</span>;
        if (cat === "P1 Schools") return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">4. High Action</span>;
        if (cat === "Pending Visits") return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">5. Pending Visit</span>;
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-500/20 text-gray-300">General</span>;
    };

    return (
        <div className="space-y-6">
            <ToastContainer position="top-right" autoClose={3000} theme={isDark ? "dark" : "light"} />

            {/* Top Header & Action Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/20">
                            <FaSchool size={20} />
                        </span>
                        B2B School Comparison & Status Analysis
                    </h1>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Correlated Previous Year vs Current Year school tie-up statuses, turnouts, and action plans.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md shadow-indigo-600/20 transition-all">
                        <FaSync className={syncing ? "animate-spin" : ""} />
                        <span>{syncing ? "Syncing..." : "Sync / Import Excel"}</span>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleSyncData}
                            disabled={syncing}
                        />
                    </label>

                    <button
                        onClick={handleExportExcel}
                        disabled={exporting}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                        <FaDownload size={12} className={exporting ? "animate-bounce" : ""} />
                        <span>{exporting ? "Exporting All..." : "Export Excel"}</span>
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div
                    onClick={() => { setActiveCategory("All"); setCurrentPage(1); }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${activeCategory === "All"
                        ? "bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 border-indigo-500 shadow-lg shadow-indigo-500/10"
                        : "bg-white dark:bg-[#15191f] border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Total B2B</span>
                        <FaSchool className="text-indigo-400" size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white mt-1.5">
                        {summary.totalRecords}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">{summary.distinctCentresCount} Centres</div>
                </div>

                <div
                    onClick={() => { setActiveCategory("Lost Tie-ups"); setCurrentPage(1); }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${activeCategory === "Lost Tie-ups"
                        ? "bg-gradient-to-br from-rose-900/40 to-rose-800/20 border-rose-500 shadow-lg shadow-rose-500/10"
                        : "bg-white dark:bg-[#15191f] border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400">1. Lost Tie-ups</span>
                        <FaExclamationTriangle className="text-rose-500" size={15} />
                    </div>
                    <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
                        {summary.lostTieUps}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Recovery list</div>
                </div>

                <div
                    onClick={() => { setActiveCategory("New Tie-ups"); setCurrentPage(1); }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${activeCategory === "New Tie-ups"
                        ? "bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-500 shadow-lg shadow-emerald-500/10"
                        : "bg-white dark:bg-[#15191f] border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 dark:text-emerald-400">2. New Wins</span>
                        <FaCheckCircle className="text-emerald-400" size={15} />
                    </div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
                        {summary.newTieUps}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Confirmed wins</div>
                </div>

                <div
                    onClick={() => { setActiveCategory("High Turnout No Visit"); setCurrentPage(1); }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${activeCategory === "High Turnout No Visit"
                        ? "bg-gradient-to-br from-amber-900/40 to-amber-800/20 border-amber-500 shadow-lg shadow-amber-500/10"
                        : "bg-white dark:bg-[#15191f] border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">3. High Turnout</span>
                        <FaChartLine className="text-amber-400" size={15} />
                    </div>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
                        {summary.highTurnoutNoVisit}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">No visit matched</div>
                </div>

                <div
                    onClick={() => { setActiveCategory("P1 Schools"); setCurrentPage(1); }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${activeCategory === "P1 Schools"
                        ? "bg-gradient-to-br from-orange-900/40 to-orange-800/20 border-orange-500 shadow-lg shadow-orange-500/10"
                        : "bg-white dark:bg-[#15191f] border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-500 dark:text-orange-400">4. High Action</span>
                        <FaFire className="text-orange-400" size={15} />
                    </div>
                    <div className="text-xl font-black text-orange-600 dark:text-orange-400 mt-1.5">
                        {summary.p1Schools || 0}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Centre-wise reason</div>
                </div>

                <div
                    onClick={() => { setActiveCategory("Pending Visits"); setCurrentPage(1); }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${activeCategory === "Pending Visits"
                        ? "bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border-cyan-500 shadow-lg shadow-cyan-500/10"
                        : "bg-white dark:bg-[#15191f] border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-500 dark:text-cyan-400">5. Pending Visits</span>
                        <FaHourglassHalf className="text-cyan-400" size={15} />
                    </div>
                    <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-1.5">
                        {summary.pendingVisits}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Approval backlog</div>
                </div>
            </div>

            {/* Category Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-[#15191f] border border-gray-200 dark:border-gray-800">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setCurrentPage(1); }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${activeCategory === cat.id
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                    >
                        {cat.icon}
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Filters Bar (Cleaned up, no Priority dropdown) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#15191f] border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="lg:col-span-2 relative">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Search School / Details</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by school, centre, executive, notes..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full bg-gray-50 dark:bg-[#111317] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 pl-9 text-xs text-gray-900 dark:text-white outline-none focus:border-indigo-500 font-medium"
                            />
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        </div>
                    </div>

                    {/* Centre Multi-Select */}
                    <div className="relative">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Centre</label>
                        <button
                            type="button"
                            onClick={() => setCentreDropdownOpen(prev => !prev)}
                            className="w-full bg-gray-50 dark:bg-[#111317] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-left font-bold flex items-center justify-between text-gray-800 dark:text-gray-200"
                        >
                            <span className="truncate">
                                {selectedCentres.length === 0 ? "All Centres" : `${selectedCentres.length} Centres`}
                            </span>
                            <FaChevronDown size={10} className={`transition-transform ${centreDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {centreDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto p-2">
                                <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-100 dark:border-gray-800 text-[10px]">
                                    <button onClick={() => setSelectedCentres([])} className="text-rose-500 hover:underline">Clear</button>
                                    <button onClick={() => setSelectedCentres(centresList)} className="text-indigo-400 hover:underline">Select All</button>
                                </div>
                                {centresList.map(c => (
                                    <label key={c} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedCentres.includes(c)}
                                            onChange={e => {
                                                if (e.target.checked) setSelectedCentres(prev => [...prev, c]);
                                                else setSelectedCentres(prev => prev.filter(item => item !== c));
                                                setCurrentPage(1);
                                            }}
                                            className="rounded text-indigo-600"
                                        />
                                        <span className="text-gray-800 dark:text-gray-200">{c}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Mock Tie-Up Status */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Current Mock Status</label>
                        <select
                            value={selectedMockTieUp}
                            onChange={e => { setSelectedMockTieUp(e.target.value); setCurrentPage(1); }}
                            className="w-full bg-gray-50 dark:bg-[#111317] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-200 font-bold outline-none"
                        >
                            <option value="All">All Mock Statuses</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Not confirmed">Not Confirmed</option>
                        </select>
                    </div>

                    {/* Reset Button */}
                    <div className="flex items-end">
                        <button
                            onClick={resetFilters}
                            className="w-full py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <FaTimes size={11} /> Reset Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Records Table */}
            <div className="bg-white dark:bg-[#15191f] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        Showing <span className="text-gray-900 dark:text-white font-black">{records.length}</span> of <span className="text-gray-900 dark:text-white font-black">{totalFiltered}</span> records
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400 font-bold">Rows:</label>
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            className="bg-gray-50 dark:bg-[#111317] border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 text-xs text-gray-800 dark:text-gray-200 font-bold"
                        >
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50/80 dark:bg-[#111317] text-gray-400 uppercase tracking-wider text-[10px] font-black border-b border-gray-200 dark:border-gray-800">
                                <th className="p-3.5">#</th>
                                <th onClick={() => handleSort("centerName")} className="p-3.5 cursor-pointer hover:text-white">
                                    <div className="flex items-center gap-1">Centre <FaSort size={9} /></div>
                                </th>
                                <th onClick={() => handleSort("schoolName")} className="p-3.5 cursor-pointer hover:text-white min-w-[220px]">
                                    <div className="flex items-center gap-1">School Name <FaSort size={9} /></div>
                                </th>
                                <th className="p-3.5">Category View</th>
                                <th className="p-3.5">Last Year Status</th>
                                <th className="p-3.5">Turnout (Last Yr)</th>
                                <th onClick={() => handleSort("currentMockTieUp")} className="p-3.5 cursor-pointer hover:text-white">
                                    <div className="flex items-center gap-1">Mock Tie-Up <FaSort size={9} /></div>
                                </th>
                                <th className="p-3.5 min-w-[160px]">Current B2B Status</th>
                                <th onClick={() => handleSort("lastVisitDate")} className="p-3.5 cursor-pointer hover:text-white min-w-[120px]">
                                    <div className="flex items-center gap-1">Last Visit Date <FaSort size={9} /></div>
                                </th>
                                <th onClick={() => handleSort("lastExecutive")} className="p-3.5 cursor-pointer hover:text-white min-w-[140px]">
                                    <div className="flex items-center gap-1">Last Executive <FaSort size={9} /></div>
                                </th>
                                <th className="p-3.5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="p-12 text-center text-gray-400 font-bold">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-2"></div>
                                        <p>Loading B2B comparison data...</p>
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="p-12 text-center text-gray-400">
                                        <FaSchool size={32} className="mx-auto mb-2 opacity-30" />
                                        <p className="font-bold text-sm">No school records found</p>
                                        <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or search query.</p>
                                    </td>
                                </tr>
                            ) : (
                                records.map((r, idx) => (
                                    <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                                            {(currentPage - 1) * pageSize + idx + 1}
                                        </td>
                                        <td className="p-3.5 font-bold text-gray-900 dark:text-white">
                                            {r.centerName}
                                        </td>
                                        <td className="p-3.5 font-bold text-gray-800 dark:text-gray-200">
                                            <div className="flex flex-col">
                                                <span>{r.schoolName}</span>
                                                {r.tier && (
                                                    <span className="text-[10px] text-gray-400 font-normal">
                                                        Tier: {r.tier} · Access: {r.schoolAccess || "YES"}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            {renderCategoryBadge(r.category)}
                                        </td>
                                        <td className="p-3.5 text-gray-600 dark:text-gray-300 font-semibold">
                                            {r.lastYearTieUp || "—"}
                                        </td>
                                        <td className="p-3.5">
                                            {r.studentsAppearedLastYear > 0 ? (
                                                <span className="px-2 py-0.5 rounded font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                                                    {r.studentsAppearedLastYear} students
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="p-3.5">
                                            {renderMockTieUpBadge(r.currentMockTieUp)}
                                        </td>
                                        <td className="p-3.5 text-gray-700 dark:text-gray-300">
                                            <span className="text-[11px] font-semibold bg-gray-100 dark:bg-gray-800/80 px-2 py-1 rounded-md block truncate max-w-[200px]" title={r.liveStatus || r.currentStatus}>
                                                {r.liveStatus || r.currentStatus || "—"}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">
                                            {r.lastVisitDate ? (
                                                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800/50">
                                                    {new Date(r.lastVisitDate).toLocaleDateString("en-IN")}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-[11px] italic">No visit</span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-gray-800 dark:text-gray-200 font-bold">
                                            {r.lastExecutive ? (
                                                <span>{r.lastExecutive}</span>
                                            ) : (
                                                <span className="text-gray-400 font-normal text-[11px] italic">—</span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <button
                                                onClick={() => {
                                                    setEditingRecord(r);
                                                    const liveStatus = r.liveStatus || r.currentStatus || "ONLY INFORMATION GIVEN TO STUDENTS";
                                                    const isMock = /mock/i.test(liveStatus) || liveStatus === "MOCK TEST TIE-UP";
                                                    setEditForm({
                                                        currentMockTieUp: isMock ? "Confirmed" : "Not confirmed",
                                                        currentStatus: liveStatus,
                                                        schoolAccess: r.schoolAccess || "YES",
                                                        remarks: r.remarks || ""
                                                    });
                                                }}
                                                className="p-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-all"
                                                title="Edit Status"
                                            >
                                                <FaEdit size={13} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="text-xs text-gray-400 font-medium">
                        Page {currentPage} of {totalPages}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage <= 1 || loading}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm">
                            {currentPage}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages || loading}
                            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Edit Modal (No Next Action Field) */}
            {editingRecord && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1a1f24] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3">
                            <div>
                                <h3 className="text-base font-black text-gray-900 dark:text-white">
                                    Update School Status
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {editingRecord.schoolName} · <span className="text-indigo-400 font-bold">{editingRecord.centerName}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingRecord(null)}
                                className="text-gray-400 hover:text-white p-1 rounded-lg"
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                    B2B Relationship Status (Master Data)
                                </label>
                                <select
                                    value={editForm.currentStatus}
                                    onChange={e => {
                                        const statusVal = e.target.value;
                                        const isMock = /mock/i.test(statusVal) || statusVal === "MOCK TEST TIE-UP";
                                        setEditForm(prev => ({
                                            ...prev,
                                            currentStatus: statusVal,
                                            currentMockTieUp: isMock ? "Confirmed" : "Not confirmed"
                                        }));
                                    }}
                                    className="w-full bg-gray-50 dark:bg-[#111317] border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-gray-800 dark:text-white font-bold outline-none"
                                >
                                    <option value="MOCK TEST TIE-UP">MOCK TEST TIE-UP</option>
                                    <option value="CRP TIE-UP">CRP TIE-UP</option>
                                    <option value="(INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT">(INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT</option>
                                    <option value="ONLY INFORMATION GIVEN TO STUDENTS">ONLY INFORMATION GIVEN TO STUDENTS</option>
                                    <option value="OTHERS">OTHERS</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                    Mock Tie-Up Status
                                </label>
                                <select
                                    value={editForm.currentMockTieUp}
                                    onChange={e => {
                                        const mockVal = e.target.value;
                                        const isConfirmed = mockVal === "Confirmed";
                                        setEditForm(prev => ({
                                            ...prev,
                                            currentMockTieUp: mockVal,
                                            currentStatus: isConfirmed
                                                ? "MOCK TEST TIE-UP"
                                                : (prev.currentStatus === "MOCK TEST TIE-UP" ? "(INDERICT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT" : prev.currentStatus)
                                        }));
                                    }}
                                    className="w-full bg-gray-50 dark:bg-[#111317] border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-gray-800 dark:text-white font-bold outline-none"
                                >
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Not confirmed">Not Confirmed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                    School Access
                                </label>
                                <select
                                    value={editForm.schoolAccess}
                                    onChange={e => setEditForm(prev => ({ ...prev, schoolAccess: e.target.value }))}
                                    className="w-full bg-gray-50 dark:bg-[#111317] border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-gray-800 dark:text-white font-bold outline-none"
                                >
                                    <option value="YES">YES</option>
                                    <option value="NO">NO</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2.5 border-t border-gray-100 dark:border-gray-800 pt-4">
                            <button
                                type="button"
                                onClick={() => setEditingRecord(null)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
                            >
                                {savingEdit ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
