import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import {
    FaCrown, FaSync, FaSun, FaMoon, FaDownload, FaArrowLeft, FaTable,
    FaStar, FaGem
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { hasPermission } from "../../config/permissions";

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const fmt = (n) =>
    !n || isNaN(n) ? "₹0" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const fmtPct = (n) =>
    !n || isNaN(n) ? "0.0%" : `${Number(n).toFixed(1)}%`;

// ── Column definitions per week ───────────────────────────────────────────────
const WEEK_COLS = [
    { key: "phaseTarget", label: "Weekly Target", color: "blue" },
    { key: "phaseAchieved", label: "Weekly Achieved", color: "emerald" },
    { key: "cumulativeTarget", label: "Cumulative Target", color: "blue" },
    { key: "cumulativeAchieved", label: "Cumulative Achieved", color: "emerald" },
    { key: "cumulativeShortfall", label: "Cumulative Shortfall", color: "red" },
];

const getActiveCols = () => WEEK_COLS;

// Compute derived values for a single week object from backend
const weekMetrics = (w) => ({
    phaseTarget: w?.phaseTarget || 0,
    phaseAchieved: w?.phaseAchieved || 0,
    cumulativeTarget: w?.cumulativeTarget || 0,
    cumulativeAchieved: w?.cumulativeAchieved || 0,
    cumulativeShortfall: w?.cumulativeShortfall || 0,
});

// Header colour helpers
const headerBg = (color, dark) => {
    const map = {
        blue: dark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700",
        emerald: dark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700",
        red: dark ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700",
        indigo: dark ? "bg-indigo-500/20 text-indigo-300" : "bg-indigo-100 text-indigo-700",
        purple: dark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700",
    };
    return map[color] || "";
};

const cellColor = (key, value, dark) => {
    if ((key === "phaseShortfall" || key === "weekendDeficit" || key === "cumulativeShortfall") && value > 0)
        return dark ? "text-red-400 font-black" : "text-red-600 font-black";
    if ((key === "phaseShortfall" || key === "weekendDeficit" || key === "cumulativeShortfall") && value === 0)
        return dark ? "text-emerald-400 font-bold" : "text-emerald-600 font-bold";
    if (key === "phaseAchieved" || key === "weekendAchieved" || key === "workingAchieved" || key === "satAchieved" || key === "sunAchieved" || key === "cumulativeAchieved")
        return dark ? "text-emerald-400 font-bold" : "text-emerald-600 font-bold";
    if (key === "phaseTarget" || key === "adjustedWeekendTarget" || key === "workingTarget" || key === "satTarget" || key === "sunTarget" || key === "cumulativeTarget")
        return dark ? "text-blue-300 font-semibold" : "text-blue-700 font-semibold";
    return dark ? "text-gray-200" : "text-gray-700";
};

// ─────────────────────────────────────────────────────────────────────────────

const FinalWeekendTarget = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === "dark";
    const navigate = useNavigate();

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(monthNames[today.getMonth()]);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [centres, setCentres] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [zones, setZones] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canView = hasPermission(user, "sales", "centreTarget", "view");

    const [editingTargets, setEditingTargets] = useState({});

    const userRoleLower = user?.role?.toLowerCase()?.replace(/\s+/g, "") || "";
    const isEditableRole = ["superadmin", "zonalmanager", "digital", "digitalmarketing", "digitalexecutive", "digitalteam", "digitallead"].includes(userRoleLower) || userRoleLower.includes("digital");

    const handleSaveOverride = async (centreId, weekNumber, value) => {
        const numericVal = parseFloat(value);
        if (isNaN(numericVal) || numericVal < 0) {
            toast.error("Please enter a valid target amount");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/weekly-target/override`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    centreId,
                    year: selectedYear,
                    month: selectedMonth,
                    weekNumber,
                    target: numericVal
                })
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Weekly target updated");
                setEditingTargets(prev => {
                    const copy = { ...prev };
                    delete copy[`${centreId}-${weekNumber}`];
                    return copy;
                });
                fetchData();
            } else {
                toast.error(json.message || "Failed to update weekly target");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error saving weekly target override");
        }
    };

    const handleCancelBulk = () => {
        setEditingTargets({});
        toast.info("Unsaved changes discarded");
    };

    const handleSaveBulk = async () => {
        const overrides = Object.keys(editingTargets).map(key => {
            const [centreId, weekNumberStr] = key.split("-");
            const weekNumber = parseInt(weekNumberStr, 10);
            const val = parseFloat(editingTargets[key]);
            return {
                centreId,
                year: selectedYear,
                month: selectedMonth,
                weekNumber,
                target: isNaN(val) ? 0 : val
            };
        });

        if (overrides.length === 0) return;

        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/weekly-target/override-bulk`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ overrides })
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("All weekly targets updated successfully");
                setEditingTargets({});
                fetchData();
            } else {
                toast.error(json.message || "Failed to update weekly targets");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error saving bulk changes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!canView && user.role !== "superAdmin") {
            toast.error("Access Denied");
            navigate("/");
        }
    }, [canView, user.role, navigate]);

    // ── Fetch centres & zones ────────────────────────────────────────────────
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const token = localStorage.getItem("token");
                const [resCentres, resZones] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${import.meta.env.VITE_API_URL}/zone`, { headers: { Authorization: `Bearer ${token}` } })
                ]);

                if (resCentres.ok) {
                    const raw = await resCentres.json();
                    let list = Array.isArray(raw) ? raw : raw.centres || [];
                    if (user.role !== "superAdmin" && user.centres) {
                        const allowed = user.centres.map(id => typeof id === "object" ? id._id : id);
                        list = list.filter(c => allowed.includes(c._id));
                    }
                    list = list.filter(c => c.status === "active");
                    setCentres(list.sort((a, b) => a.centreName.localeCompare(b.centreName)));
                }

                if (resZones.ok) {
                    const rawZ = await resZones.json();
                    const zList = Array.isArray(rawZ) ? rawZ : (rawZ.data || rawZ.zones || []);
                    setZones(zList.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
                }
            } catch (e) { console.error(e); }
        };
        fetchMasterData();
    }, []);

    // ── Zone Matching Helper ──────────────────────────────────────────────────
    const zoneCentreMatchInfo = React.useMemo(() => {
        if (!selectedZones || selectedZones.length === 0) return null;
        const allowedIds = new Set();
        const allowedNames = new Set();

        zones.filter(z => selectedZones.includes(z._id)).forEach(z => {
            (z.centres || []).forEach(c => {
                const id = typeof c === 'object' ? c._id : c;
                if (id) allowedIds.add(id.toString());
                const name = typeof c === 'object' ? c.centreName : null;
                if (name) allowedNames.add(name.toLowerCase().trim());
            });
        });

        return { ids: allowedIds, names: allowedNames };
    }, [zones, selectedZones]);

    const isCentreAllowedByZone = useCallback((cId, cName) => {
        if (!zoneCentreMatchInfo) return true;
        if (!cId && !cName) return false;

        const idStr = cId ? cId.toString() : "";
        const nameStr = (cName || "").toLowerCase().trim();

        if (idStr && zoneCentreMatchInfo.ids.has(idStr)) return true;
        if (nameStr && zoneCentreMatchInfo.names.has(nameStr)) return true;

        const cleanName = nameStr.replace(/phsps/gi, "").replace(/[^a-z0-9]/gi, "");
        for (const zoneCentreName of zoneCentreMatchInfo.names) {
            const cleanZoneCentreName = zoneCentreName.replace(/phsps/gi, "").replace(/[^a-z0-9]/gi, "");
            if (cleanZoneCentreName && cleanName && (cleanName.includes(cleanZoneCentreName) || cleanZoneCentreName.includes(cleanName))) {
                return true;
            }
        }

        return false;
    }, [zoneCentreMatchInfo]);

    const availableCentres = React.useMemo(() => {
        if (!zoneCentreMatchInfo) return centres;
        return centres.filter(c => isCentreAllowedByZone(c._id, c.centreName));
    }, [centres, zoneCentreMatchInfo, isCentreAllowedByZone]);

    // ── Fetch week-wise data ──────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ month: selectedMonth, year: selectedYear });
            
            let effectiveCentreIds = [];
            if (selectedCentres.length > 0) {
                effectiveCentreIds = selectedCentres;
            } else if (selectedZones.length > 0) {
                effectiveCentreIds = availableCentres.map(c => c._id);
            }

            if (effectiveCentreIds.length > 0) {
                params.append("centre", effectiveCentreIds.join(","));
            }

            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/sales/final-weekend-target?${params}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const json = await res.json();
            if (res.ok) setData(json);
            else toast.error(json.message || "Failed to load data");
        } catch (e) {
            console.error(e);
            toast.error("Error loading final targets");
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, selectedCentres, selectedZones, availableCentres]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Derive week list from first active centre ─────────────────────────────
    const weekList = data?.centres?.find(c => c.status === "active")?.weeks || [];

    // ── Summary cards & filtered active centres ──────────────────────────────
    const activeCentres = React.useMemo(() => {
        const raw = data?.centres?.filter(c => c.status === "active") || [];
        return raw.filter(c => isCentreAllowedByZone(c.centreId, c.centreName));
    }, [data, isCentreAllowedByZone]);
    const totalTarget = activeCentres.reduce((s, c) => s + c.monthlyTargetExclGST, 0);
    const totalAchieved = activeCentres.reduce((s, c) => s + c.totalAchievedExclGST, 0);
    const totalWeekend = activeCentres.reduce((s, c) => s + c.totalWeekendExclGST, 0);

    // ── Export ────────────────────────────────────────────────────────────────
    const handleExport = () => {
        if (!activeCentres.length) { toast.warn("No data to export"); return; }

        const rows = [];
        activeCentres.forEach(c => {
            const row = {
                "Centre": c.centreName,
                "Monthly Target": Math.round(c.monthlyTargetExclGST),
            };

            (c.weeks || []).forEach(w => {
                const m = weekMetrics(w);
                const label = `W${w.weekNumber} (${w.startDay}-${w.endDay})`;
                row[`${label} Weekly Target`] = Math.round(m.phaseTarget);
                row[`${label} Weekly Achieved`] = Math.round(m.phaseAchieved);
                row[`${label} Cumulative Target`] = Math.round(m.cumulativeTarget);
                row[`${label} Cumulative Achieved`] = Math.round(m.cumulativeAchieved);
                row[`${label} Cumulative Shortfall`] = Math.round(m.cumulativeShortfall);
            });

            const totalShortfall = Math.max(0, c.monthlyTargetExclGST - c.totalAchievedExclGST);
            row["Total %"] = c.overallPct.toFixed(1) + "%";
            row["Total Shortfall"] = Math.round(totalShortfall);
            rows.push(row);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Weekly_Settlement");
        saveAs(
            new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })],
                { type: "application/octet-stream" }),
            `Weekend_Weekly_${selectedMonth}_${selectedYear}.xlsx`
        );
        toast.success("Exported successfully");
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Layout activePage="Sales">
            <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-[#131619]" : "bg-gray-50"} p-4 md:p-6 space-y-5`}>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/sales/centre-target")}
                            className={`p-2.5 rounded-lg border transition-all ${isDarkMode ? "text-gray-400 border-gray-700 bg-[#1a1f24] hover:text-white" : "text-gray-500 border-gray-300 bg-white hover:text-gray-800 shadow-sm"}`}
                        >
                            <FaArrowLeft size={14} />
                        </button>
                        <div>
                            <h1 className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                Weekends Target
                            </h1>
                            <p className={`text-xs font-semibold ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                Week-wise settlement — fixed 7-day periods · one row per centre
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isDarkMode
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black"
                                : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white"}`}
                        >
                            {isDarkMode ? <><FaSun size={12} /> Day</> : <><FaMoon size={12} /> Night</>}
                        </button>
                        <button
                            onClick={handleExport}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${isDarkMode
                                ? "bg-green-600/90 text-white hover:bg-green-500"
                                : "bg-green-600 text-white hover:bg-green-700 shadow-md"}`}
                        >
                            <FaDownload size={13} /> Export
                        </button>
                    </div>
                </div>

                {/* View Mode Tabs */}
                <div className={`${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"} px-4 py-3 rounded-xl border flex flex-wrap items-center gap-3`}>
                    <FaTable className="text-cyan-400" />
                    <div className={`${isDarkMode ? "bg-gray-800" : "bg-gray-100"} rounded-lg p-1 flex flex-wrap gap-1`}>
                        {["Monthly", "Quarterly", "Yearly", "Custom", "Weekend"].map(mode => (
                            <button
                                key={mode}
                                onClick={() => {
                                    if (mode === "Weekend") navigate("/sales/final-weekend-target");
                                    else navigate("/sales/centre-target", { state: { viewMode: mode } });
                                }}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${mode === "Weekend"
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : `${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {Object.keys(editingTargets).length > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-xs font-bold uppercase tracking-wider">
                                You have {Object.keys(editingTargets).length} unsaved weekly target changes
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCancelBulk}
                                className="px-4 py-1.5 rounded-lg border border-gray-600 hover:bg-gray-800 text-xs font-bold uppercase transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveBulk}
                                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                Save All Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className={`${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"} p-5 rounded-xl border`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                <FaStar className="text-cyan-400" size={10} /> Period
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                                    className={`w-full border-2 text-xs rounded-xl px-3 py-2.5 outline-none font-black transition-all ${isDarkMode ? "bg-black/50 border-white/5 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-100 text-gray-900 focus:border-cyan-500"}`}>
                                    {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                                    className={`w-full border-2 text-xs rounded-xl px-3 py-2.5 outline-none font-black transition-all ${isDarkMode ? "bg-black/50 border-white/5 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-100 text-gray-900 focus:border-cyan-500"}`}>
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                <FaGem className="text-cyan-400" size={10} /> Zones
                            </label>
                            <CustomMultiSelect
                                options={zones.map(z => ({ value: z._id, label: z.name }))}
                                value={zones.map(z => ({ value: z._id, label: z.name })).filter(o => selectedZones.includes(o.value))}
                                onChange={sel => setSelectedZones(sel ? sel.map(o => o.value) : [])}
                                placeholder="All Zones"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                <FaGem className="text-cyan-400" size={10} /> Centres
                            </label>
                            <CustomMultiSelect
                                options={availableCentres.map(c => ({ value: c._id, label: c.centreName }))}
                                value={availableCentres.map(c => ({ value: c._id, label: c.centreName })).filter(o => selectedCentres.includes(o.value))}
                                onChange={sel => setSelectedCentres(sel ? sel.map(o => o.value) : [])}
                                placeholder="All Operational Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        <div>
                            <button onClick={fetchData}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${isDarkMode ? "bg-cyan-600/90 text-white hover:bg-cyan-500" : "bg-cyan-600 text-white hover:bg-cyan-700 shadow-md"}`}>
                                <FaSync className={loading ? "animate-spin" : ""} size={13} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Total Monthly Target", value: totalTarget, color: "text-blue-500", border: "border-blue-500/20" },
                        { label: "Total Achieved", value: totalAchieved, color: "text-emerald-500", border: "border-emerald-500/20" },
                        { label: "Total Shortfall", value: Math.max(0, totalTarget - totalAchieved), color: "text-red-500", border: "border-red-500/20" },
                    ].map((c, i) => (
                        <div key={i} className={`${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200"} p-4 rounded-2xl border shadow-sm`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{c.label}</p>
                            <p className={`text-xl font-black mt-1 ${c.color}`}>{fmt(c.value)}</p>
                        </div>
                    ))}
                </div>

                {/* ── MAIN TABLE ─────────────────────────────────────────────── */}
                <div className={`${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-xl"} rounded-xl border overflow-hidden`}>
                    {/* Table heading bar */}
                    <div className={`px-6 py-4 border-b ${isDarkMode ? "border-gray-800" : "border-gray-100"} flex items-center justify-between`}>
                        <div>
                            <h2 className={`text-lg font-black ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                Verified Centre Performance
                            </h2>
                            <p className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                {selectedMonth} {selectedYear} · Each row = one centre · Each group of 5 cols = one week
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Live Finalization</span>
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[65vh]">
                        <table className="text-left border-collapse" style={{ minWidth: `${200 + 140 + weekList.reduce((acc, w) => acc + getActiveCols(w).length, 0) * 110 + 240}px` }}>
                            <thead className="sticky top-0 z-30 shadow-md">
                                {/* ── Row 1: Week group headers ─────────────────── */}
                                <tr className={isDarkMode ? "bg-[#0d1015]" : "bg-gray-100"}>
                                    {/* Centre column */}
                                    <th rowSpan={2} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-r-2 sticky left-0 z-40 ${isDarkMode ? "bg-[#0d1015] text-gray-400 border-gray-700" : "bg-gray-100 text-gray-500 border-gray-300"}`}>
                                        Centre
                                    </th>
                                    {/* Total Monthly Target column */}
                                    <th rowSpan={2} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center border-r-2 sticky left-[200px] z-40 whitespace-nowrap ${isDarkMode ? "bg-[#0f172a] text-blue-300 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-300"}`}>
                                        Total Monthly<br />Target
                                    </th>
                                    {/* Week group spans */}
                                    {weekList.map(w => {
                                        const activeCols = getActiveCols(w);
                                        return (
                                            <th key={w.weekNumber} colSpan={activeCols.length}
                                                className={`px-3 py-2 text-[11px] font-black uppercase tracking-widest text-center border-l-2 ${isDarkMode ? "text-cyan-300 border-cyan-500/30 bg-cyan-500/10" : "text-cyan-700 border-cyan-300 bg-cyan-50"}`}>
                                                W{w.weekNumber} &nbsp;·&nbsp; {w.startDay}–{w.endDay}
                                                <span className={`ml-2 text-[9px] font-semibold ${isDarkMode ? "text-cyan-500" : "text-cyan-500"}`}>
                                                    ({w.actualDays} days)
                                                </span>
                                            </th>
                                        );
                                    })}
                                    {/* Summary group */}
                                    <th colSpan={2}
                                        className={`px-3 py-2 text-[11px] font-black uppercase tracking-widest text-center border-l-2 ${isDarkMode ? "text-amber-300 border-amber-500/30 bg-amber-500/10" : "text-amber-700 border-amber-300 bg-amber-50"}`}>
                                        Summary
                                    </th>
                                </tr>

                                {/* ── Row 2: Sub-column labels ──────────────────── */}
                                <tr className={isDarkMode ? "bg-[#0d1015]" : "bg-gray-50"}>
                                    {weekList.map((w, wi) => {
                                        const activeCols = getActiveCols(w);
                                        return activeCols.map((col, ci) => (
                                            <th key={`${wi}-${col.key}`}
                                                className={`px-3 py-2 text-[9px] font-black uppercase tracking-wide text-center whitespace-nowrap ${ci === 0 ? `border-l-2 ${isDarkMode ? "border-cyan-500/30" : "border-cyan-300"}` : ""} ${headerBg(col.color, isDarkMode)}`}>
                                                {col.label}
                                            </th>
                                        ));
                                    })}
                                    {/* Summary sub-cols */}
                                    {[
                                        { label: "Total %", color: "amber" },
                                        { label: "Total Shortfall", color: "red" },
                                    ].map((col, i) => (
                                        <th key={`sum-${i}`}
                                            className={`px-3 py-2 text-[9px] font-black uppercase tracking-wide text-center whitespace-nowrap border-l-2 ${i === 0 ? isDarkMode ? "border-amber-500/30" : "border-amber-300" : ""} ${headerBg(col.color, isDarkMode)}`}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className={`divide-y ${isDarkMode ? "divide-gray-800/60" : "divide-gray-100"}`}>
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i}>
                                            <td colSpan={2 + weekList.reduce((acc, w) => acc + getActiveCols(w).length, 0) + 2} className="h-14 animate-pulse bg-gray-500/5" />
                                        </tr>
                                    ))
                                ) : activeCentres.length === 0 ? (
                                    <tr>
                                        <td colSpan={2 + weekList.reduce((acc, w) => acc + getActiveCols(w).length, 0) + 2} className={`px-6 py-16 text-center text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                            No data available for the selected filters.
                                        </td>
                                    </tr>
                                ) : activeCentres.map((c, ri) => {
                                    const weeks = c.weeks || [];
                                    const totalShortfall = Math.max(0, c.monthlyTargetExclGST - c.totalAchievedExclGST);
                                    const overallPct = c.overallPct || 0;

                                    const rowBg = ri % 2 === 0
                                        ? (isDarkMode ? "bg-[#1a1f24]" : "bg-white")
                                        : (isDarkMode ? "bg-[#16191e]" : "bg-gray-50");

                                    const targetBg = ri % 2 === 0
                                        ? (isDarkMode ? "bg-[#1d283a]" : "bg-[#f0f7ff]")
                                        : (isDarkMode ? "bg-[#182232]" : "bg-[#e8f1fa]");

                                    return (
                                        <tr key={c.centreId} className={`${rowBg} hover:brightness-110 transition-all`}>
                                            {/* Centre name cell — sticky */}
                                            <td className={`px-4 py-4 border-r-2 sticky left-0 z-10 ${isDarkMode ? "border-gray-700" : "border-gray-200"} ${rowBg}`}>
                                                <div className="flex items-center gap-2 min-w-[160px]">
                                                    <FaCrown className="text-blue-500 shrink-0" size={14} />
                                                    <div>
                                                        <div className={`text-xs font-black uppercase tracking-wide ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                                            {c.centreName}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Total Monthly Target cell — sticky */}
                                            <td className={`px-4 py-4 text-center border-r-2 sticky left-[200px] z-10 whitespace-nowrap text-xs font-black ${isDarkMode ? "border-blue-500/20 text-blue-300" : "border-blue-200 text-blue-700"} ${targetBg}`}>
                                                {fmt(c.monthlyTargetExclGST)}
                                            </td>

                                            {/* Week data cells */}
                                            {weeks.map((w, wi) => {
                                                const activeCols = getActiveCols(w);
                                                const m = weekMetrics(w);
                                                return activeCols.map((col, ci) => {
                                                    const val = m[col.key];
                                                    const isShortfall = col.key === "cumulativeShortfall";

                                                    if (col.key === "phaseTarget" && isEditableRole) {
                                                        const key = `${c.centreId}-${w.weekNumber}`;
                                                        const displayVal = editingTargets[key] !== undefined ? editingTargets[key] : Math.round(val);
                                                        return (
                                                            <td key={`${wi}-${col.key}`}
                                                                className={`px-2 py-3 text-center text-xs whitespace-nowrap ${ci === 0 ? `border-l-2 ${isDarkMode ? "border-cyan-500/20" : "border-cyan-200"}` : ""} ${cellColor(col.key, val, isDarkMode)}`}>
                                                                <input
                                                                    type="number"
                                                                    value={displayVal}
                                                                    onChange={(e) => setEditingTargets(prev => ({ ...prev, [key]: e.target.value }))}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleSaveOverride(c.centreId, w.weekNumber, e.target.value);
                                                                            e.target.blur();
                                                                        }
                                                                    }}
                                                                    className={`w-24 text-center bg-transparent border-b border-dashed border-cyan-500 focus:border-solid focus:border-blue-500 outline-none font-black text-xs ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}
                                                                />
                                                            </td>
                                                        );
                                                    }

                                                    return (
                                                        <td key={`${wi}-${col.key}`}
                                                            className={`px-3 py-4 text-center text-xs whitespace-nowrap ${ci === 0 ? `border-l-2 ${isDarkMode ? "border-cyan-500/20" : "border-cyan-200"}` : ""} ${cellColor(col.key, val, isDarkMode)}`}>
                                                            {isShortfall && val === 0 ? (
                                                                <span className={`text-[10px] font-black ${isDarkMode ? "text-emerald-500" : "text-emerald-600"}`}>✓ Met</span>
                                                            ) : (
                                                                <>
                                                                    {isShortfall && val > 0 && <span className="mr-0.5">−</span>}
                                                                    {fmt(val)}
                                                                </>
                                                            )}
                                                        </td>
                                                    );
                                                });
                                            })}

                                            {/* Summary cells */}
                                            {/* Total % */}
                                            <td className={`px-4 py-4 text-center border-l-2 ${isDarkMode ? "border-amber-500/20" : "border-amber-200"}`}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`text-sm font-black ${overallPct >= 100 ? "text-emerald-400" : overallPct >= 70 ? (isDarkMode ? "text-amber-400" : "text-amber-600") : "text-red-500"}`}>
                                                        {fmtPct(overallPct)}
                                                    </span>
                                                    <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                                                        <div
                                                            className={`h-full rounded-full ${overallPct >= 100 ? "bg-emerald-500" : overallPct >= 70 ? "bg-amber-400" : "bg-red-500"}`}
                                                            style={{ width: `${Math.min(overallPct, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Total Shortfall */}
                                            <td className={`px-3 py-4 text-center text-xs whitespace-nowrap ${totalShortfall > 0 ? "text-red-500 font-black" : "text-emerald-500 font-black"}`}>
                                                {totalShortfall > 0 ? `−${fmt(totalShortfall)}` : <span className="text-emerald-500 text-[10px]">✓ Achieved</span>}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* ── Totals footer row ──────────────────────────── */}
                                {activeCentres.length > 1 && !loading && (
                                    <tr className={`sticky bottom-0 z-20 ${isDarkMode ? "bg-gray-800 border-t-2 border-gray-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]" : "bg-gray-200 border-t-2 border-gray-400 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"}`}>
                                        <td className={`px-4 py-3 text-xs font-black uppercase tracking-widest sticky left-0 z-30 border-r-2 ${isDarkMode ? "bg-gray-800 text-white border-gray-700" : "bg-gray-200 text-gray-900 border-gray-400"}`}>
                                            ALL CENTRES
                                        </td>
                                        {/* Total Monthly Target footer */}
                                        <td className={`px-4 py-3 text-center text-xs font-black sticky left-[200px] z-30 border-r-2 whitespace-nowrap ${isDarkMode ? "bg-gray-800 border-blue-500/30 text-blue-300" : "bg-gray-200 border-blue-300 text-blue-700"}`}>
                                            {fmt(totalTarget)}
                                        </td>
                                        {weekList.map((w, wi) => {
                                            const activeCols = getActiveCols(w);
                                            // Sum each metric across centres for this week
                                            const totals = activeCols.reduce((acc, col) => {
                                                if (col.key === "cumulativeShortfall") {
                                                    const totalCumTarget = activeCentres.reduce((s, c) => s + (c.weeks?.[wi]?.cumulativeTarget || 0), 0);
                                                    const totalCumAchieved = activeCentres.reduce((s, c) => s + (c.weeks?.[wi]?.cumulativeAchieved || 0), 0);
                                                    acc[col.key] = Math.max(0, totalCumTarget - totalCumAchieved);
                                                } else {
                                                    const sum = activeCentres.reduce((s, c) => {
                                                        const m = weekMetrics(c.weeks?.[wi] || {});
                                                        return s + (m[col.key] || 0);
                                                    }, 0);
                                                    acc[col.key] = sum;
                                                }
                                                return acc;
                                            }, {});

                                            return activeCols.map((col, ci) => (
                                                <td key={`tot-${wi}-${col.key}`}
                                                    className={`px-3 py-3 text-center text-[10px] font-black whitespace-nowrap ${ci === 0 ? `border-l-2 ${isDarkMode ? "border-cyan-500/30" : "border-cyan-300"}` : ""} ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                                                    {fmt(totals[col.key])}
                                                </td>
                                            ));
                                        })}
                                        {/* Summary totals */}
                                        <td className={`px-4 py-3 text-center text-xs font-black border-l-2 ${isDarkMode ? "border-amber-500/30 text-amber-300" : "border-amber-300 text-amber-700"}`}>
                                            {fmtPct(totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0)}
                                        </td>
                                        <td className={`px-3 py-3 text-center text-xs font-black ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                                            {fmt(Math.max(0, totalTarget - totalAchieved))}
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

export default FinalWeekendTarget;
