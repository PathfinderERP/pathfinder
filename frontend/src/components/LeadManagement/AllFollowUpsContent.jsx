import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    FaExclamationTriangle, FaCalendarAlt, FaHistory, FaChartLine,
    FaStar, FaSearch, FaTimes, FaRedo, FaMoon, FaSun, FaChevronDown
} from "react-icons/fa";
import { CardSkeleton } from "../common/Skeleton";
import { useTheme } from "../../context/ThemeContext";
import FollowUpActivityModal from "./FollowUpActivityModal";

// ── Date helpers ────────────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().split("T")[0];

const getPresetRange = (preset) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    // Start of current week (Monday)
    const dayOfWeek = now.getDay(); // 0=Sun
    const diffToMon = (dayOfWeek + 6) % 7;
    const thisMonStart = new Date(y, m, 1);
    const thisWeekMon = new Date(now); thisWeekMon.setDate(now.getDate() - diffToMon);
    const prevWeekMon = new Date(thisWeekMon); prevWeekMon.setDate(thisWeekMon.getDate() - 7);
    const prevWeekSun = new Date(thisWeekMon); prevWeekSun.setDate(thisWeekMon.getDate() - 1);
    const prevMonStart = new Date(y, m - 1, 1);
    const prevMonEnd = new Date(y, m, 0);
    const thisYearStart = new Date(y, 0, 1);
    const prevYearStart = new Date(y - 1, 0, 1);
    const prevYearEnd = new Date(y - 1, 11, 31);
    const today = fmt(now);
    const yesterday = fmt(new Date(now.getTime() - 86400000));

    switch (preset) {
        case "today":        return { from: today, to: today };
        case "yesterday":    return { from: yesterday, to: yesterday };
        case "thisWeek":     return { from: fmt(thisWeekMon), to: today };
        case "prevWeek":     return { from: fmt(prevWeekMon), to: fmt(prevWeekSun) };
        case "thisMonth":    return { from: fmt(thisMonStart), to: today };
        case "prevMonth":    return { from: fmt(prevMonStart), to: fmt(prevMonEnd) };
        case "thisYear":     return { from: fmt(thisYearStart), to: today };
        case "prevYear":     return { from: fmt(prevYearStart), to: fmt(prevYearEnd) };
        default:             return { from: "", to: "" };
    }
};

const PRESETS = [
    { key: "today",      label: "Today" },
    { key: "yesterday",  label: "Yesterday" },
    { key: "thisWeek",   label: "This Week" },
    { key: "prevWeek",   label: "Prev Week" },
    { key: "thisMonth",  label: "This Month" },
    { key: "prevMonth",  label: "Prev Month" },
    { key: "thisYear",   label: "This Year" },
    { key: "prevYear",   label: "Prev Year" },
    { key: "custom",     label: "Custom" },
];

// ── Component ────────────────────────────────────────────────────────────────
const AllFollowUpsContent = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === "dark";

    const [statsLoading, setStatsLoading] = useState(true);
    const [followUpStats, setFollowUpStats] = useState({
        totalFollowUps: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        neutralLeads: 0,
        invalidLeads: 0,
        totalScheduled: 0,
        totalPreviousPending: 0,
        recentActivity: [],
        scheduledList: [],
        previousPendingList: []
    });

    const [activePreset, setActivePreset] = useState(""); // tracks which preset button is active
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [showCustom, setShowCustom] = useState(false);

    const [leadTypeFilter, setLeadTypeFilter] = useState([]);
    const [activityModal, setActivityModal] = useState({ isOpen: false, title: "", data: [] });

    // ── Fetch stats ───────────────────────────────────────────────────────────
    const fetchFollowUpStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            leadTypeFilter.forEach(v => {
                const val = typeof v === "object" && "value" in v ? v.value : v;
                if (val) params.append("leadType", val);
            });

            if (fromDate) params.append("fromDate", fromDate);
            if (toDate) params.append("toDate", toDate);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/lead-management/stats/today-followups?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) setFollowUpStats(await response.json());
        } catch (err) {
            console.error("Error fetching follow-up stats:", err);
        } finally {
            setStatsLoading(false);
        }
    }, [leadTypeFilter, fromDate, toDate]);

    useEffect(() => { fetchFollowUpStats(); }, [fetchFollowUpStats]);

    // ── Preset handler ─────────────────────────────────────────────────────
    const applyPreset = (key) => {
        if (key === "custom") {
            setShowCustom(true);
            setActivePreset("custom");
            return;
        }
        setShowCustom(false);
        const { from, to } = getPresetRange(key);
        setFromDate(from);
        setToDate(to);
        setActivePreset(key);
    };

    const handleReset = () => {
        setActivePreset("");
        setFromDate("");
        setToDate("");
        setShowCustom(false);
        setLeadTypeFilter([]);
    };

    // ── Card click ─────────────────────────────────────────────────────────
    const handleCardClick = (type) => {
        let title = "";
        let filteredData = [];
        switch (type) {
            case "total":
                title = "Total Follow-up Activity";
                filteredData = followUpStats.recentActivity;
                break;
            case "hot":
                title = "Hot Interest Leads";
                filteredData = followUpStats.recentActivity.filter(a =>
                    ["HOT LEAD", "ADMISSION TAKEN"].includes(a.status?.toUpperCase()));
                break;
            case "warm":
                title = "Warm Interest Leads";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === "WARM LEAD");
                break;
            case "cold":
                title = "Cold Lead Discussions";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === "COLD LEAD");
                break;
            case "neutral":
                title = "Neutral Lead Discussions";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === "NEUTRAL LEAD");
                break;
            case "invalid":
                title = "Invalid Lead Discussions";
                filteredData = followUpStats.recentActivity.filter(a => a.status?.toUpperCase() === "INVALID LEAD");
                break;
            case "scheduled":
                title = "Scheduled Follow-ups";
                filteredData = followUpStats.scheduledList;
                break;
            case "previous_pending":
                title = "Previous Follow Ups Not Done";
                filteredData = followUpStats.previousPendingList || [];
                break;
            default: return;
        }
        setActivityModal({ isOpen: true, title, data: filteredData });
    };

    // ── Shared button style helper ─────────────────────────────────────────
    const presetBtnClass = (key) => {
        const active = activePreset === key;
        if (active) return "bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]";
        return isDarkMode
            ? "bg-[#0f1115] text-gray-400 border-gray-700 hover:text-white hover:border-cyan-500/50 hover:bg-gray-800"
            : "bg-white text-gray-600 border-gray-200 hover:border-cyan-500 hover:text-gray-900";
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-[#131619]" : "bg-gray-50"}`}>
            <div className="p-4 sm:p-6 md:p-8 max-w-[2000px] mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-2xl sm:text-4xl font-black mb-1 tracking-tighter uppercase italic ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            All <span className="text-cyan-500">Follow Ups</span>
                        </h1>
                        <p className={`${isDarkMode ? "text-gray-500" : "text-gray-400"} font-bold text-[10px] uppercase tracking-[0.3em]`}>
                            Follow Up Tracking &amp; Management
                        </p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`self-start sm:self-auto p-3 rounded-[2px] border transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${isDarkMode ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white"}`}
                    >
                        {isDarkMode ? <><FaSun size={12} /> Day Mode</> : <><FaMoon size={12} /> Night Mode</>}
                    </button>
                </div>

                {/* ── Date Range Filter Bar ── */}
                <div className={`rounded-[2px] border p-4 transition-all ${isDarkMode ? "bg-[#0a0a0b] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                        {PRESETS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => applyPreset(key)}
                                className={`px-3 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 ${presetBtnClass(key)}`}
                            >
                                {key === "custom" && <FaChevronDown size={8} className={activePreset === "custom" ? "rotate-180" : ""} style={{ transition: "transform .2s" }} />}
                                {label}
                            </button>
                        ))}

                        {/* Active range label */}
                        {(fromDate || toDate) && activePreset !== "custom" && (
                            <span className={`text-[9px] font-bold px-3 py-1.5 rounded-[2px] border ${isDarkMode ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"}`}>
                                {fromDate} → {toDate || "now"}
                            </span>
                        )}

                        <div className={`h-6 w-[1px] mx-1 hidden sm:block ${isDarkMode ? "bg-gray-800" : "bg-gray-200"}`} />

                        {/* Reset */}
                        <button
                            onClick={handleReset}
                            className={`px-3 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${isDarkMode ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white" : "bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white"}`}
                        >
                            <FaRedo size={9} /> Reset
                        </button>
                    </div>

                    {/* Custom date inputs — shown only when Custom is selected */}
                    {showCustom && (
                        <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-dashed border-gray-700/50">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>Custom Range</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>From</span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? "bg-[#131619] border-gray-700 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-cyan-500"}`}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>To</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? "bg-[#131619] border-gray-700 text-white focus:border-cyan-500" : "bg-gray-50 border-gray-300 text-gray-900 focus:border-cyan-500"}`}
                                />
                            </div>
                            {fromDate && toDate && (
                                <span className={`text-[9px] font-bold px-3 py-1.5 rounded-[2px] border ${isDarkMode ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"}`}>
                                    {fromDate} → {toDate}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Analytics Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                    {statsLoading ? (
                        <>{Array(8).fill(0).map((_, i) => <CardSkeleton key={i} isDarkMode={isDarkMode} />)}</>
                    ) : (
                        <>
                            {/* Previous Follow Ups Not Done */}
                            <div
                                onClick={() => handleCardClick("previous_pending")}
                                className={`p-5 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:border-amber-500/40 ${isDarkMode ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50 border-amber-100 shadow-sm"}`}
                            >
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>Previous Follow Ups Not Done</p>
                                        <h3 className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? "text-white" : "text-gray-900"}`}>{followUpStats.totalPreviousPending || 0}</h3>
                                    </div>
                                    <div className="p-2.5 rounded-[20px] bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                                        <FaExclamationTriangle size={16} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform group-hover:scale-110 transition-transform text-amber-500">
                                    <FaExclamationTriangle size={100} />
                                </div>
                            </div>

                            {/* Upcoming Followups */}
                            <div
                                onClick={() => handleCardClick("scheduled")}
                                className={`p-5 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:border-cyan-500/40 ${isDarkMode ? "bg-cyan-500/5 border-cyan-500/20" : "bg-cyan-50 border-cyan-100 shadow-sm"}`}
                            >
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>Upcoming Followups</p>
                                        <h3 className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? "text-white" : "text-gray-900"}`}>{followUpStats.totalScheduled}</h3>
                                    </div>
                                    <div className="p-2.5 rounded-[20px] bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                                        <FaCalendarAlt size={16} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform group-hover:scale-110 transition-transform text-cyan-500">
                                    <FaCalendarAlt size={100} />
                                </div>
                            </div>

                            {/* Followed Up Till Date */}
                            <div
                                onClick={() => handleCardClick("total")}
                                className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:border-gray-500/30 ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`}
                            >
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                            {fromDate || toDate ? "Filtered Follow Up" : "Followed Up Till Date"}
                                        </p>
                                        <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? "text-white" : "text-gray-900"}`}>{followUpStats.totalFollowUps}</h3>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fetchFollowUpStats(); }}
                                        className={`p-3 rounded-[2px] transition-all hover:rotate-180 duration-500 ${isDarkMode ? "bg-cyan-500/10 text-cyan-500" : "bg-cyan-50 text-cyan-600"}`}
                                    >
                                        <FaHistory size={20} />
                                    </button>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                                    <FaHistory size={100} />
                                </div>
                            </div>

                            {/* Hot Leads */}
                            <div onClick={() => handleCardClick("hot")} className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:border-red-500/30 ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`}>
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Hot Leads</p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-red-500">{followUpStats.hotLeads}</h3>
                                    </div>
                                    <div className="p-3 bg-red-500/10 text-red-500 rounded-[2px]"><FaChartLine size={20} /></div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><FaChartLine size={100} /></div>
                            </div>

                            {/* Warm Leads */}
                            <div onClick={() => handleCardClick("warm")} className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:border-orange-500/30 ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`}>
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Warm Leads</p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-orange-500">{followUpStats.warmLeads}</h3>
                                    </div>
                                    <div className="p-3 bg-orange-500/10 text-orange-500 rounded-[2px]"><FaStar size={20} /></div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-orange-500"><FaStar size={100} /></div>
                            </div>

                            {/* Cold Leads */}
                            <div onClick={() => handleCardClick("cold")} className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:border-blue-500/30 ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`}>
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Cold Leads</p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-blue-500">{followUpStats.coldLeads}</h3>
                                    </div>
                                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-[2px]"><FaSearch size={20} /></div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform"><FaSearch size={100} /></div>
                            </div>

                            {/* Neutral Leads */}
                            <div onClick={() => handleCardClick("neutral")} className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:border-purple-500/30 ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`}>
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Neutral Leads</p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-purple-500">{followUpStats.neutralLeads || 0}</h3>
                                    </div>
                                    <div className="p-3 bg-purple-500/10 text-purple-500 rounded-[2px]"><FaSearch size={20} /></div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-purple-500"><FaSearch size={100} /></div>
                            </div>

                            {/* Invalid Leads */}
                            <div onClick={() => handleCardClick("invalid")} className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:border-gray-500/30 ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-100 shadow-sm"}`}>
                                <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Invalid Leads</p>
                                        <h3 className="text-3xl font-black italic tracking-tighter text-gray-500">{followUpStats.invalidLeads || 0}</h3>
                                    </div>
                                    <div className="p-3 bg-gray-500/10 text-gray-500 rounded-[2px]"><FaTimes size={20} /></div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform text-gray-500"><FaTimes size={100} /></div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Lead Type Quick Filters ── */}
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                    {[
                        { key: [], label: "All Data", active: leadTypeFilter.length === 0, activeCls: "bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]", hoverCls: isDarkMode ? "hover:text-white hover:border-gray-700" : "hover:border-gray-300" },
                        { key: [{ value: "HOT LEAD", label: "HOT LEAD" }], label: "Only Hot Lead", active: leadTypeFilter[0]?.value === "HOT LEAD", activeCls: "bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]", hoverCls: isDarkMode ? "hover:text-red-500 hover:border-red-500/50" : "hover:border-red-500" },
                        { key: [{ value: "WARM LEAD", label: "WARM LEAD" }], label: "Only Warm Lead", active: leadTypeFilter[0]?.value === "WARM LEAD", activeCls: "bg-orange-500 text-white border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]", hoverCls: isDarkMode ? "hover:text-orange-500 hover:border-orange-500/50" : "hover:border-orange-500" },
                        { key: [{ value: "COLD LEAD", label: "COLD LEAD" }], label: "Only Cold Lead", active: leadTypeFilter[0]?.value === "COLD LEAD", activeCls: "bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]", hoverCls: isDarkMode ? "hover:text-blue-500 hover:border-blue-500/50" : "hover:border-blue-500" },
                        { key: [{ value: "NEUTRAL LEAD", label: "NEUTRAL LEAD" }], label: "Only Neutral Lead", active: leadTypeFilter[0]?.value === "NEUTRAL LEAD", activeCls: "bg-purple-500 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]", hoverCls: isDarkMode ? "hover:text-purple-500 hover:border-purple-500/50" : "hover:border-purple-500" },
                        { key: [{ value: "INVALID LEAD", label: "INVALID LEAD" }], label: "Only Invalid Lead", active: leadTypeFilter[0]?.value === "INVALID LEAD", activeCls: "bg-gray-500 text-white border-gray-500 shadow-[0_0_15px_rgba(107,114,128,0.3)]", hoverCls: isDarkMode ? "hover:text-gray-400 hover:border-gray-500/50" : "hover:border-gray-500" },
                    ].map(({ key, label, active, activeCls, hoverCls }) => (
                        <button
                            key={label}
                            onClick={() => setLeadTypeFilter(key)}
                            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[2px] text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all border ${active ? activeCls : `${isDarkMode ? "bg-[#131619] text-gray-500 border-gray-800" : "bg-white text-gray-500 border-gray-200"} ${hoverCls}`}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Activity Detail Modal */}
            <FollowUpActivityModal
                isOpen={activityModal.isOpen}
                onClose={() => setActivityModal({ ...activityModal, isOpen: false })}
                title={activityModal.title}
                data={activityModal.data}
                isDarkMode={isDarkMode}
            />
        </div>
    );
};

export default AllFollowUpsContent;
