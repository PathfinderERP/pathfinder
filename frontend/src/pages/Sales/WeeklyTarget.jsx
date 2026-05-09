import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import {
    FaCalendarWeek, FaSync, FaSun, FaMoon, FaDownload, FaArrowLeft, FaTable,
    FaArrowUp, FaArrowDown
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { hasPermission } from "../../config/permissions";

import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ComposedChart, Cell
} from "recharts";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const fmt = (n) =>
    !n || isNaN(n) ? "0" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtPct = (n) =>
    !n || isNaN(n) ? "0.0%" : `${Number(n).toFixed(1)}%`;

const pctColor = (pct) => {
    const v = parseFloat(pct);
    if (v >= 75) return "text-emerald-400";
    if (v >= 40) return "text-yellow-400";
    return "text-red-400";
};

const progressGrad = (pct) => {
    const v = parseFloat(pct);
    if (v >= 75) return "from-emerald-500 to-emerald-400";
    if (v >= 40) return "from-yellow-500 to-yellow-400";
    return "from-red-500 to-red-400";
};

// Column headers for the 7-column calendar grid (Mon-Sun)
const COL_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKEND_COLS = new Set(["Sat", "Sun"]);
const PAYMENT_METHODS = ["CASH", "CHEQUE", "ONLINE", "UPI", "NEFT", "RTGS", "OTHER"];

// ── Difference Indicator ──────────────────────────────────────────────────────
const DiffIndicator = ({ target, achieved, fontSize = "text-[9px]", isDarkMode }) => {
    const diff = achieved - target;
    if (Math.abs(diff) < 1) return null;
    const isSurplus = diff > 0;
    return (
        <div className={`${fontSize} font-black flex items-center gap-0.5 ${isSurplus ? "text-emerald-400" : "text-red-500"} mt-0.5`}>
            {isSurplus ? <FaArrowUp size={fontSize.includes('lg') ? 12 : 8} /> : <FaArrowDown size={fontSize.includes('lg') ? 12 : 8} />}
            <span>₹{fmt(Math.abs(diff))}</span>
        </div>
    );
};

// ── Single Day Cell (calendar style) ──────────────────────────────────────────
const DayCell = ({ day, isDarkMode, onToggle, isSelected }) => {
    const isWeekend = WEEKEND_COLS.has(day.colName);

    if (day.isEmpty || day.isHidden) {
        return (
            <div className={`rounded-lg p-2 min-h-[72px] border ${isDarkMode
                ? "bg-[#0a0c0f] border-gray-900"
                : "bg-gray-100 border-gray-100"
                } ${day.isHidden ? "opacity-20" : ""}`} />
        );
    }

    const hasAmount = day.achievedWithGST > 0;
    const isBlurred = day.isBlurred;
    const dayTarget = day.targetWithGST || 0;
    const dayPct = dayTarget > 0 ? (day.achievedWithGST / dayTarget) * 100 : 0;

    return (
        <div
            onClick={() => onToggle(day.day)}
            className={`rounded-lg p-1.5 md:p-2 min-h-[60px] md:min-h-[80px] border flex flex-col items-center justify-between transition-all cursor-pointer select-none group ${isSelected
                ? isDarkMode ? "ring-2 ring-cyan-500 bg-cyan-950/30 border-cyan-500/50" : "ring-2 ring-cyan-600 bg-cyan-50 border-cyan-600"
                : isBlurred
                    ? "opacity-30 grayscale-[0.5] scale-[0.98]"
                    : isWeekend
                        ? isDarkMode
                            ? "bg-purple-950/40 border-purple-800/50 shadow-sm shadow-purple-900/20 hover:border-purple-600"
                            : "bg-purple-50 border-purple-200 hover:border-purple-400"
                        : isDarkMode
                            ? "bg-[#131619] border-gray-800/50 hover:border-gray-600"
                            : "bg-white border-gray-200 hover:border-gray-400"
                }`}>
            {/* Date number & Mini Tag */}
            <div className="w-full flex items-center justify-between">
                <span className={`text-[10px] font-black ${isSelected ? "text-cyan-400" : isWeekend ? "text-purple-400" : isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                    {day.day}
                </span>
                {day.isWeekend && !isSelected && (
                    <span className="text-[7px] font-black uppercase text-purple-500/60 tracking-tighter">
                        {day.colName === "Sat" ? "Sat (40%)" : "Sun (60%)"}
                    </span>
                )}
                {isSelected && (
                    <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" />
                )}
            </div>

            {/* Target vs Achieved Stack */}
            <div className="w-full flex flex-col items-center gap-0.5">
                <span className={`text-[10px] md:text-[11px] font-bold opacity-60 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    T: ₹{fmt(Math.round(dayTarget))}
                </span>
                <span className={`text-[12px] md:text-[14px] font-black tracking-tight transition-transform group-hover:scale-105 ${!hasAmount
                    ? isDarkMode ? "text-gray-800" : "text-gray-300"
                    : isSelected
                        ? "text-cyan-300"
                        : isWeekend
                            ? "text-purple-300"
                            : isDarkMode ? "text-emerald-400" : "text-emerald-600"
                    }`}>
                    {hasAmount ? `₹${fmt(day.achievedWithGST)}` : "—"}
                </span>
                {day.day && !day.isEmpty && (
                    <DiffIndicator target={dayTarget} achieved={day.achievedWithGST} isDarkMode={isDarkMode} />
                )}
            </div>

            {/* Mini Progress bar if achieved */}
            {hasAmount && (
                <div className="w-full h-0.5 bg-gray-800/50 rounded-full overflow-hidden mt-1">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${dayPct >= 100 ? "bg-emerald-500" : "bg-cyan-500"}`}
                        style={{ width: `${Math.min(dayPct, 100)}%` }}
                    />
                </div>
            )}
        </div>
    );
};

// ── Week Card (calendar grid) ──────────────────────────────────────────────────
const WeekCard = ({ week, isDarkMode, onDateToggle, selectedDates }) => {
    const pct = parseFloat(week.weekAchievementPct);
    const progressW = Math.min(pct, 100);

    return (
        <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "bg-[#0f1215] border-gray-800/60" : "bg-gray-50 border-gray-200"
            }`}>
            {/* Week header row */}
            <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 border-b ${isDarkMode ? "border-gray-800/50" : "border-gray-200"
                }`}>
                {/* Left side: Week details */}
                <div className="flex items-center justify-between lg:justify-start gap-3 min-w-[150px]">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${isDarkMode ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"
                        }`}>
                        Week {week.weekNumber}
                    </span>
                    <span className={`text-[11px] font-semibold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {week.startDay}–{week.endDay} · {week.actualDays}D
                    </span>
                </div>

                {/* Middle: Target Info */}
                <div className="flex-1 flex justify-center w-full">
                    <div className={`px-3 py-1.5 rounded-lg border w-full lg:w-auto ${isDarkMode ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"
                        }`}>
                        <p className={`text-[10px] md:text-xs font-black uppercase tracking-wider text-center ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                            Target: <span className="text-xs md:text-sm">₹{fmt(week.weeklyTargetWithGST)}</span>
                            <span className={`mx-2 opacity-30 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>|</span>
                            <span className="text-[9px] md:text-[10px] opacity-80 lowercase">
                                {week.actualDays} of {week.daysInMonth || 31} days
                            </span>
                        </p>
                    </div>
                </div>

                {/* Right side: Stats */}
                <div className="grid grid-cols-3 lg:flex items-center gap-2 md:gap-5 text-center lg:text-right min-w-[200px] justify-between border-t lg:border-t-0 pt-2 lg:pt-0 border-gray-800/50">
                    <div>
                        <p className={`text-[12px] md:text-lg font-black ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                            ₹{fmt(week.weekTotalWithGST)}
                        </p>
                        <DiffIndicator target={week.weeklyTargetWithGST} achieved={week.weekTotalWithGST} fontSize="text-[10px] md:text-xs" isDarkMode={isDarkMode} />
                        <p className={`text-[8px] uppercase tracking-wider ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                            Total
                        </p>
                    </div>
                    <div>
                        <p className={`text-[12px] md:text-sm font-black ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                            <span className="text-[10px] opacity-40 font-normal mr-1">T:</span>
                            ₹{fmt(Math.round(week.weekendTargetWithGST || 0))}
                        </p>
                        <p className="text-[12px] md:text-sm font-black text-purple-400">
                            <span className="text-[10px] opacity-40 font-normal mr-1">A:</span>
                            ₹{fmt(week.weekendTotalWithGST)}
                        </p>
                        <DiffIndicator target={week.weekendTargetWithGST} achieved={week.weekendTotalWithGST} fontSize="text-[9px]" isDarkMode={isDarkMode} />
                        <p className={`text-[8px] uppercase tracking-wider ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                            Weekend
                        </p>
                    </div>
                    <div className="bg-black/20 lg:bg-transparent rounded-lg py-1 lg:py-0">
                        <p className={`text-[11px] md:text-sm font-black ${pctColor(pct)}`}>{fmtPct(pct)}</p>
                        <p className={`text-[8px] uppercase tracking-wider ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                            Achievement
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className={`mx-4 my-2 h-1.5 rounded-full ${isDarkMode ? "bg-gray-800" : "bg-gray-200"}`}>
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressGrad(pct)} transition-all duration-700`}
                    style={{ width: `${progressW}%` }}
                />
            </div>

            {/* ── Calendar Grid ── */}
            <div className="px-4 pb-4">
                {/* Column headers */}
                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1">
                    {COL_HEADERS.map(col => (
                        <div
                            key={col}
                            className={`text-center text-[8px] md:text-[10px] font-black uppercase tracking-widest py-1 rounded ${WEEKEND_COLS.has(col)
                                ? "text-purple-400"
                                : isDarkMode ? "text-gray-500" : "text-gray-400"
                                }`}
                        >
                            {col}
                        </div>
                    ))}
                </div>

                {/* Day cells row */}
                <div className="grid grid-cols-7 gap-1">
                    {week.days.map((day, idx) => (
                        <DayCell
                            key={idx}
                            day={day}
                            isDarkMode={isDarkMode}
                            onToggle={onDateToggle}
                            isSelected={day.day && selectedDates.includes(day.day)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

// ── Centre Card ────────────────────────────────────────────────────────────────
const CentreCard = ({ centreData, isDarkMode, onDateToggle, selectedDates }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-lg"
            }`}>
            {/* Header */}
            <div
                className={`flex items-center justify-between px-6 py-4 cursor-pointer select-none ${isDarkMode ? "bg-[#131619] border-b border-gray-800" : "bg-gray-50 border-b border-gray-200"
                    }`}
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full" />
                    <div>
                        <h2 className={`font-black text-lg tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {centreData.centreName}
                        </h2>
                        <p className={`text-xs font-semibold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                            {centreData.numberOfWeeks} Weeks · Monthly Target ₹{fmt(centreData.monthlyTargetWithGST)} (incl. GST)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className={`text-2xl font-black ${pctColor(centreData.overallPct)}`}>
                            {fmtPct(centreData.overallPct)}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                            Overall
                        </p>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-lg font-black text-purple-400">₹{fmt(centreData.totalWeekendWithGST)}</p>
                        <DiffIndicator target={centreData.weeks.reduce((acc, w) => acc + w.weekendTargetWithGST, 0)} achieved={centreData.totalWeekendWithGST} fontSize="text-[10px]" isDarkMode={isDarkMode} />
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                            Weekend Total
                        </p>
                    </div>
                    <div className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""} ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Weeks */}
            {expanded && (
                <div className="p-4 space-y-4">
                    {centreData.weeks.map(week => (
                        <WeekCard
                            key={week.weekNumber}
                            week={week}
                            isDarkMode={isDarkMode}
                            onDateToggle={onDateToggle}
                            selectedDates={selectedDates}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main Page ───────────────────────────────────────────────────────────────────
const WeeklyTarget = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === "dark";
    const navigate = useNavigate();

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(monthNames[today.getMonth()]);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [centres, setCentres] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedDays, setSelectedDays] = useState([]);
    const [selectedMethods, setSelectedMethods] = useState([]);
    const [selectedDates, setSelectedDates] = useState([]);

    const [data, setData] = useState(null);
    const [isTabular, setIsTabular] = useState(true);

    const [loading, setLoading] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canView = hasPermission(user, 'sales', 'weeklyTarget', 'view') ||
        hasPermission(user, 'sales', 'weeklyTarget', 'create') ||
        hasPermission(user, 'sales', 'weeklyTarget', 'edit') ||
        hasPermission(user, 'sales', 'weeklyTarget', 'delete');

    useEffect(() => {
        if (!canView && user.role !== 'superAdmin') {
            toast.error("You don't have permission to access this page");
            navigate("/");
        }
    }, [canView, user.role, navigate]);


    const years = [today.getFullYear() + 1, today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2];

    // Fetch centre list
    useEffect(() => {
        const fetchCentres = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const raw = await res.json();
                    let list = Array.isArray(raw) ? raw : raw.centres || [];
                    const user = JSON.parse(localStorage.getItem("user") || "{}");
                    if (user.role !== "superAdmin" && user.centres) {
                        const allowed = user.centres.map(id => (typeof id === "object" ? id._id : id));
                        list = list.filter(c => allowed.includes(c._id));
                    }
                    setCentres(list.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || "")));
                }
            } catch (e) { console.error(e); }
        };
        fetchCentres();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setData(null);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ month: selectedMonth, year: selectedYear });
            if (selectedCentres.length > 0) params.append("centre", selectedCentres.join(","));
            if (selectedDays.length > 0) params.append("days", selectedDays.join(","));
            if (selectedMethods.length > 0) params.append("paymentMethods", selectedMethods.join(","));
            if (selectedDates.length > 0) params.append("selectedDates", selectedDates.join(","));

            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/sales/weekly-target?${params}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const json = await res.json();
            if (res.ok) setData(json);
            else toast.error(json.message || "Failed to load data");
        } catch (e) {
            console.error(e);
            toast.error("Error loading weekly targets");
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, selectedCentres, selectedDays, selectedMethods, selectedDates]);

    useEffect(() => { fetchData(); }, [fetchData, selectedCentres, selectedDays, selectedMethods, selectedDates, selectedMonth, selectedYear]);

    const handleDateToggle = (day) => {
        if (!day) return;
        setSelectedDates(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleWeekendOnly = () => {
        setSelectedDays(["Sat", "Sun"]);
    };

    // Export
    const handleExport = () => {
        if (!data?.centres?.length) { toast.warn("No data to export"); return; }
        const rows = [];
        data.centres.forEach(c => {
            c.weeks.forEach(w => {
                w.days.forEach(d => {
                    if (d.isEmpty) return;
                    rows.push({
                        Centre: c.centreName,
                        Week: `Week ${w.weekNumber}`,
                        "Day": d.day,
                        "Day Name": d.dayName,
                        "Is Weekend": d.isWeekend ? "Yes" : "No",
                        "Achieved (incl. GST)": d.achievedWithGST || 0,
                        "Achieved (excl. GST)": d.achievedExclGST || 0,
                        "Week Target (incl. GST)": w.weeklyTargetWithGST,
                        "Week Total (incl. GST)": w.weekTotalWithGST,
                        "Weekend Total (incl. GST)": w.weekendTotalWithGST,
                        "Week Achievement %": w.weekAchievementPct,
                        "Monthly Target (incl. GST)": c.monthlyTargetWithGST,
                        "Overall %": c.overallPct
                    });
                });
            });
        });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "WeeklyTarget");
        saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }),
            `WeeklyTarget_${selectedMonth}_${selectedYear}.xlsx`);
    };

    // Summary
    const summary = data?.centres?.length ? {
        totalMonthlyTarget: data.centres.reduce((s, c) => s + c.monthlyTargetWithGST, 0),
        totalAchieved: data.centres.reduce((s, c) => s + c.totalAchievedWithGST, 0),
        totalWeekend: data.centres.reduce((s, c) => s + c.totalWeekendWithGST, 0)
    } : null;

    // Chart Data Preparation
    const getChartData = () => {
        if (!data?.centres?.length) return [];
        // Group by day across all centres
        const dayAggregate = {};
        data.centres.forEach(c => {
            c.weeks.forEach(w => {
                w.days.forEach(d => {
                    if (d.isEmpty || d.isHidden) return;
                    if (!dayAggregate[d.day]) dayAggregate[d.day] = { day: d.day, achieved: 0, target: 0 };
                    dayAggregate[d.day].achieved += d.achievedWithGST;
                    // Proportional daily target: MonthlyTarget / daysInMonth
                    dayAggregate[d.day].target += (c.monthlyTargetWithGST / c.daysInMonth);
                });
            });
        });
        return Object.values(dayAggregate).sort((a, b) => a.day - b.day);
    };

    const getMethodData = () => {
        if (!data?.centres?.length) return [];
        const methods = {};
        data.centres.forEach(c => {
            if (c.methodBreakdown) {
                Object.entries(c.methodBreakdown).forEach(([m, amt]) => {
                    methods[m] = (methods[m] || 0) + amt;
                });
            }
        });
        return Object.entries(methods).map(([name, value]) => ({ name, value }));
    };

    const chartData = getChartData();
    const methodData = getMethodData();

    return (
        <Layout activePage="Sales">
            <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-[#0d1014]" : "bg-gray-50"} p-4 md:p-8`}>

                {/* Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/sales/centre-target")}
                            className={`p-2 rounded-lg border transition-all ${isDarkMode ? "text-gray-400 border-gray-700 hover:text-white" : "text-gray-500 border-gray-300 hover:text-gray-800"
                                }`}
                        >
                            <FaArrowLeft size={14} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <FaCalendarWeek className="text-cyan-400 text-xl" />
                                <h1 className={`text-3xl font-black tracking-tight italic uppercase ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                    Weekly <span className="text-cyan-400">Weekends</span> Target
                                </h1>
                            </div>
                            <p className={`text-xs font-bold uppercase tracking-[0.2em] mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                Real calendar weeks (Mon–Sun) · Proportional targets · Sat &amp; Sun highlighted
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button onClick={toggleTheme} className={`p-2.5 rounded-lg border text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isDarkMode ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white"
                            }`}>
                            {isDarkMode ? <><FaSun /> Day</> : <><FaMoon /> Night</>}
                        </button>
                        <button onClick={() => setIsTabular(!isTabular)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${isTabular
                            ? "bg-cyan-600 border-cyan-600 text-white shadow-lg shadow-cyan-600/20"
                            : isDarkMode ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-600 hover:text-white" : "bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-600 hover:text-white"
                            }`}>
                            <FaTable size={12} /> Open Tabular
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-green-600/20">
                            <FaDownload size={12} /> Export Excel
                        </button>

                    </div>
                </div>

                {/* Filters & Mini Analysis Section */}
                <div className={`rounded-2xl border p-4 mb-6 flex flex-col lg:flex-row gap-6 ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-xl"
                    }`}>
                    {/* Left: Filters */}
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <div className="min-w-[100px]">
                                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Month</label>
                                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                                    className={`w-full border text-xs rounded-lg px-2 py-1.5 outline-none font-bold ${isDarkMode ? "bg-[#131619] border-gray-700 text-gray-200" : "bg-gray-50 border-gray-300 text-gray-800"}`}>
                                    {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="min-w-[80px]">
                                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Year</label>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                                    className={`w-full border text-xs rounded-lg px-2 py-1.5 outline-none font-bold ${isDarkMode ? "bg-[#131619] border-gray-700 text-gray-200" : "bg-gray-50 border-gray-300 text-gray-800"}`}>
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="min-w-[160px] flex-1">
                                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Centres</label>
                                <CustomMultiSelect
                                    options={centres.map(c => ({ value: c._id, label: c.centreName }))}
                                    value={centres.map(c => ({ value: c._id, label: c.centreName })).filter(o => selectedCentres.includes(o.value))}
                                    onChange={sel => setSelectedCentres(sel ? sel.map(o => o.value) : [])}
                                    placeholder="All"
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="min-w-[160px] flex-1">
                                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Days</label>
                                <CustomMultiSelect
                                    options={COL_HEADERS.map(d => ({ value: d, label: d }))}
                                    value={COL_HEADERS.map(d => ({ value: d, label: d })).filter(o => selectedDays.includes(o.value))}
                                    onChange={sel => setSelectedDays(sel ? sel.map(o => o.value) : [])}
                                    placeholder="All Days"
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                            <div className="min-w-[160px] flex-1">
                                <label className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Methods</label>
                                <CustomMultiSelect
                                    options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))}
                                    value={PAYMENT_METHODS.map(m => ({ value: m, label: m })).filter(o => selectedMethods.includes(o.value))}
                                    onChange={sel => setSelectedMethods(sel ? sel.map(o => o.value) : [])}
                                    placeholder="All Methods"
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button onClick={handleWeekendOnly}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${selectedDays.length === 2 && selectedDays.includes("Sat")
                                    ? "bg-purple-600 border-purple-600 text-white"
                                    : isDarkMode ? "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20" : "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"
                                    }`}>
                                Weekends
                            </button>
                            <button onClick={() => { setSelectedDays([]); setSelectedMethods([]); setSelectedDates([]); setSelectedCentres([]); }}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${isDarkMode ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                                    }`}>
                                Clear
                            </button>
                            <div className="flex-1" />
                            <button onClick={fetchData} disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-cyan-600/20">
                                <FaSync className={loading ? "animate-spin" : ""} size={10} />
                                Sync
                            </button>
                        </div>
                    </div>

                    {/* Right: Mini Analysis Charts */}
                    <div className={`lg:w-1/3 xl:w-2/5 flex flex-col gap-4 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l ${isDarkMode ? "border-gray-800" : "border-gray-200"}`}>
                        {!loading && chartData.length > 0 ? (
                            <div className="grid grid-cols-2 gap-4 h-full min-h-[140px]">
                                {/* Mini Performance Chart */}
                                <div className="flex flex-col">
                                    <p className={`text-[9px] font-black uppercase tracking-[0.1em] mb-2 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>Daily Trend</p>
                                    <div className="flex-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="miniColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="2 2" vertical={false} stroke={isDarkMode ? "#2d3748" : "#f1f5f9"} />
                                                <XAxis dataKey="day" hide />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: isDarkMode ? "#1a1f24" : "#fff", border: "1px solid #333", fontSize: "10px" }}
                                                />
                                                <Area type="monotone" dataKey="achieved" stroke="#10b981" fill="url(#miniColor)" strokeWidth={2} />
                                                <Bar dataKey="target" barSize={4} fill="#06b6d4" opacity={0.1} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Mini Methods Chart */}
                                <div className="flex flex-col">
                                    <p className={`text-[9px] font-black uppercase tracking-[0.1em] mb-2 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>Method Mix</p>
                                    <div className="flex-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={methodData} layout="vertical">
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" hide />
                                                <Tooltip contentStyle={{ fontSize: "10px" }} cursor={{ fill: 'transparent' }} />
                                                <Bar dataKey="value" barSize={10} radius={[0, 4, 4, 0]}>
                                                    {methodData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-[10px] font-bold text-gray-600">
                                {loading ? "Analyzing..." : "No data to analyze"}
                            </div>
                        )}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    {[
                        { color: "bg-purple-500", label: "Weekend (Sat & Sun)" },
                        { color: "bg-emerald-500", label: "Weekday Achievement" },
                        { color: isDarkMode ? "bg-gray-700" : "bg-gray-300", label: "No Collection / Empty" }
                    ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${color}`} />
                            <span className={`text-xs font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Summary strip */}
                {summary && !loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        {[
                            { label: "Total Monthly Target", value: `₹${fmt(summary.totalMonthlyTarget)}`, color: "text-cyan-400", sub: "incl. GST" },
                            { label: "Total Achieved", value: `₹${fmt(summary.totalAchieved)}`, color: "text-emerald-400", sub: "incl. GST" },
                            { label: "Weekend Achieved", value: `₹${fmt(summary.totalWeekend)}`, color: "text-purple-400", sub: "Sat + Sun" }
                        ].map(s => (
                            <div key={s.label} className={`rounded-xl border p-5 ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
                                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                                <p className={`text-xs font-black uppercase tracking-widest mt-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{s.label}</p>
                                <p className={`text-[10px] ${isDarkMode ? "text-gray-700" : "text-gray-300"}`}>{s.sub}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`rounded-2xl border h-20 animate-pulse ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200"}`} />
                        ))}
                    </div>
                ) : !data || data.centres?.length === 0 ? (
                    <div className={`rounded-2xl border p-16 text-center ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200"}`}>
                        <FaCalendarWeek className={`mx-auto text-5xl mb-4 ${isDarkMode ? "text-gray-700" : "text-gray-300"}`} />
                        <p className={`text-lg font-black ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>No Data Found</p>
                        <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>
                            No monthly targets set for <strong>{selectedMonth} {selectedYear}</strong> or no transactions match the filters.
                        </p>
                    </div>
                ) : isTabular ? (
                    <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-xl"}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`border-b ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Centre Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Monthly Target</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Achieved</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Weekend Total</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">Achievement %</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-100"}`}>
                                    {data.centres.map(c => (
                                        <tr key={c.centreId} className={`transition-colors ${isDarkMode ? "hover:bg-white/5" : "hover:bg-gray-50"}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1 h-4 bg-cyan-500 rounded-full" />
                                                    <span className={`font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>{c.centreName}</span>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>₹{fmt(c.monthlyTargetWithGST)}</td>
                                            <td className={`px-6 py-4 text-right font-black ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>₹{fmt(c.totalAchievedWithGST)}</td>
                                            <td className={`px-6 py-4 text-right font-black text-purple-400`}>₹{fmt(c.totalWeekendWithGST)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-sm font-black ${pctColor(c.overallPct)}`}>{fmtPct(c.overallPct)}</span>
                                                    <div className={`w-20 h-1 rounded-full ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                                                        <div className={`h-full rounded-full bg-gradient-to-r ${progressGrad(c.overallPct)}`} style={{ width: `${Math.min(parseFloat(c.overallPct), 100)}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {data.centres.map(c => (
                            <CentreCard
                                key={c.centreId}
                                centreData={c}
                                isDarkMode={isDarkMode}
                                onDateToggle={handleDateToggle}
                                selectedDates={selectedDates}
                            />
                        ))}
                    </div>
                )}

            </div>
        </Layout>
    );
};

export default WeeklyTarget;
