import React, { useState, useMemo } from "react";
import {
    FaChartPie,
    FaBuilding,
    FaLayerGroup,
    FaExchangeAlt,
    FaArrowUp,
    FaArrowDown,
    FaRupeeSign,
    FaUserGraduate,
    FaTrophy,
    FaCalendarAlt,
    FaPercent,
    FaChevronDown,
    FaChevronUp,
    FaInfoCircle,
    FaBalanceScale
} from "react-icons/fa";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from "recharts";

// Consistent color palette for departments
const DEPT_COLORS = {
    "Foundation": "#06b6d4",       // Cyan
    "Medical": "#10b981",          // Emerald
    "Engineering": "#3b82f6",      // Blue
    "Target": "#f59e0b",           // Amber
    "Crash Course": "#ec4899",     // Pink
    "Distance Learning": "#8b5cf6",// Purple
    "Commerce": "#f97316",         // Orange
    "Arts": "#14b8a6",             // Teal
    "Integrated": "#6366f1",       // Indigo
    "Repeaters": "#e11d48",        // Rose
    "School": "#84cc16",           // Lime
    "General": "#64748b"           // Slate
};

const VIBRANT_PALETTE = [
    "#06b6d4", "#10b981", "#3b82f6", "#f59e0b",
    "#ec4899", "#8b5cf6", "#f97316", "#14b8a6",
    "#6366f1", "#84cc16", "#e11d48", "#0ea5e9",
    "#d946ef", "#eab308", "#22c55e", "#a855f7"
];

const getDepartmentColor = (deptName, index = 0) => {
    if (!deptName) return VIBRANT_PALETTE[index % VIBRANT_PALETTE.length];
    if (DEPT_COLORS[deptName]) return DEPT_COLORS[deptName];
    let hash = 0;
    for (let i = 0; i < deptName.length; i++) {
        hash = deptName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % VIBRANT_PALETTE.length;
    return VIBRANT_PALETTE[idx];
};

// Custom Tooltip component for Pie Chart
const CustomPieTooltip = ({ active, payload, isDarkMode, isCurrency, totalSum }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        const percent = totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : "0.0";

        return (
            <div
                className={`p-3 rounded-xl shadow-2xl border text-xs backdrop-blur-md transition-all ${
                    isDarkMode
                        ? "bg-slate-900/95 border-slate-700/80 text-white"
                        : "bg-white/95 border-slate-200 text-slate-800"
                }`}
                style={{ minWidth: "160px" }}
            >
                <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-700/40">
                    <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="font-extrabold text-sm truncate">{item.name}</span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                        <span>Value:</span>
                        <span className="font-black text-cyan-400">
                            {isCurrency ? `₹${Number(item.value).toLocaleString()}` : `${Number(item.value).toLocaleString()}`}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span>Share:</span>
                        <span className="font-bold text-emerald-400">{percent}%</span>
                    </div>
                    {item.prevValue !== undefined && item.prevValue > 0 && (
                        <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                            <span>Alternate Period:</span>
                            <span className="font-medium text-slate-300">
                                {isCurrency ? `₹${Number(item.prevValue).toLocaleString()}` : item.prevValue}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const CentrePieComparison = ({
    rows = [],
    departments = [],
    initialMetric = "revenue",
    isDarkMode = true,
    viewMode = "month"
}) => {
    // Mode of comparison:
    // "centre_vs_centre" (Primary: compare 2 centres side-by-side with independent sessions)
    // "period_comparison" (Current vs Previous period for 1 centre)
    // "metric_comparison" (Revenue vs Admissions for 1 centre)
    // "market_share" (Overall distribution across centres)
    const [comparisonMode, setComparisonMode] = useState("centre_vs_centre");

    // Metrics toggle: "revenue" | "admissions"
    const [selectedMetric, setSelectedMetric] = useState(initialMetric === "admissions" ? "admissions" : "revenue");

    // Independent Session Selectors for Left and Right charts
    // "previous": Previous Year (FY 2025-2026) | "current": Current Year (FY 2026-2027)
    const [sessionLeft, setSessionLeft] = useState("previous");
    const [sessionRight, setSessionRight] = useState("current");

    // Centre slots for side-by-side
    const [selectedCentre1, setSelectedCentre1] = useState("");
    const [selectedCentre2, setSelectedCentre2] = useState("");

    // Market share department filter
    const [marketDept, setMarketDept] = useState("ALL");

    // Accordion / Collapsible state
    const [isExpanded, setIsExpanded] = useState(true);

    // List of available centre names
    const centreNames = useMemo(() => {
        return rows.map(r => r.centre).sort((a, b) => a.localeCompare(b));
    }, [rows]);

    // Derive effective centres safely during render without side effects
    const centre1 = (selectedCentre1 && centreNames.includes(selectedCentre1))
        ? selectedCentre1
        : (centreNames[0] || "");

    const centre2 = (selectedCentre2 && centreNames.includes(selectedCentre2))
        ? selectedCentre2
        : (centreNames.length > 1 ? centreNames[1] : (centreNames[0] || ""));

    // Session options: strictly Previous Year (2025-2026) and Current Year (2026-2027)
    const sessionOptions = useMemo(() => [
        { value: "previous", label: "Session 2025-2026 (Previous Year)", shortLabel: "FY 2025-2026" },
        { value: "current", label: "Session 2026-2027 (Current Year)", shortLabel: "FY 2026-2027" }
    ], []);

    // Swap Centres
    const handleSwapCentres = () => {
        setSelectedCentre1(centre2);
        setSelectedCentre2(centre1);
    };

    // Swap Sessions / Years
    const handleSwapSessions = () => {
        const temp = sessionLeft;
        setSessionLeft(sessionRight);
        setSessionRight(temp);
    };

    // Handle comparison mode switch without resetting user session selections
    const handleModeChange = (mode) => {
        setComparisonMode(mode);
    };

    // Data for Left & Right Slots based on comparisonMode and independent sessions
    const { chartLeft, chartRight, comparisonDelta } = useMemo(() => {
        const leftSessionObj = sessionOptions.find(o => o.value === sessionLeft) || sessionOptions[0];
        const rightSessionObj = sessionOptions.find(o => o.value === sessionRight) || sessionOptions[1];

        // Helper to get row by centre name
        const getCentreRow = (name) => {
            return rows.find(r => r.centre === name) || null;
        };

        // Prepare Pie Data for a given centre, metric, and session period ("current" | "previous")
        const getPieData = (centreName, metric, period) => {
            const row = getCentreRow(centreName);
            if (!row) return { data: [], total: 0, row: null };

            const isRev = metric === "revenue";
            const isCurr = period === "current";

            const deptMap = isCurr
                ? (isRev ? row.deptRevenueCurrent : row.deptAdmissionsCurrent)
                : (isRev ? row.deptRevenuePrevious : row.deptAdmissionsPrevious);

            const altDeptMap = isCurr
                ? (isRev ? row.deptRevenuePrevious : row.deptAdmissionsPrevious)
                : (isRev ? row.deptRevenueCurrent : row.deptAdmissionsCurrent);

            const total = isCurr
                ? (isRev ? row.revenueCurrent : row.admissionsCurrent)
                : (isRev ? row.revenuePrevious : row.admissionsPrevious);

            const data = (departments || [])
                .map((dept, idx) => {
                    const val = deptMap?.[dept] || 0;
                    const pVal = altDeptMap?.[dept] || 0;
                    return {
                        name: dept,
                        value: Math.max(0, val),
                        prevValue: pVal,
                        color: getDepartmentColor(dept, idx)
                    };
                })
                .filter(item => item.value > 0)
                .sort((a, b) => b.value - a.value);

            return { data, total: total || 0, row };
        };

        // ==========================================
        // 1. CENTRE VS CENTRE (With Independent Sessions)
        // ==========================================
        if (comparisonMode === "centre_vs_centre") {
            const left = getPieData(centre1, selectedMetric, sessionLeft);
            const right = getPieData(centre2, selectedMetric, sessionRight);

            // Compute delta head-to-head (Left vs Right)
            const deltaValue = (left.total || 0) - (right.total || 0);
            const deltaPercent = right.total > 0
                ? Number(((deltaValue / right.total) * 100).toFixed(1))
                : (left.total > 0 ? 100 : 0);

            // Department-level comparison between Left and Right selections
            const deptDiffs = (departments || []).map(dept => {
                const lVal = (sessionLeft === "current"
                    ? (selectedMetric === "revenue" ? left.row?.deptRevenueCurrent?.[dept] : left.row?.deptAdmissionsCurrent?.[dept])
                    : (selectedMetric === "revenue" ? left.row?.deptRevenuePrevious?.[dept] : left.row?.deptAdmissionsPrevious?.[dept])) || 0;

                const rVal = (sessionRight === "current"
                    ? (selectedMetric === "revenue" ? right.row?.deptRevenueCurrent?.[dept] : right.row?.deptAdmissionsCurrent?.[dept])
                    : (selectedMetric === "revenue" ? right.row?.deptRevenuePrevious?.[dept] : right.row?.deptAdmissionsPrevious?.[dept])) || 0;

                return {
                    department: dept,
                    leftVal: lVal,
                    rightVal: rVal,
                    diff: lVal - rVal,
                    leader: lVal > rVal
                        ? `${centre1} (${leftSessionObj.shortLabel})`
                        : (rVal > lVal ? `${centre2} (${rightSessionObj.shortLabel})` : "Tied")
                };
            }).filter(d => d.leftVal > 0 || d.rightVal > 0);

            const leftLabel = `${centre1} (${leftSessionObj.shortLabel})`;
            const rightLabel = `${centre2} (${rightSessionObj.shortLabel})`;

            return {
                chartLeft: {
                    title: centre1 || "Centre A",
                    zone: left.row?.zone || "General Zone",
                    badge: leftSessionObj.shortLabel,
                    sessionKey: sessionLeft,
                    metricLabel: selectedMetric === "revenue" ? "Revenue (₹)" : "Admissions",
                    isCurrency: selectedMetric === "revenue",
                    ...left
                },
                chartRight: {
                    title: centre2 || "Centre B",
                    zone: right.row?.zone || "General Zone",
                    badge: rightSessionObj.shortLabel,
                    sessionKey: sessionRight,
                    metricLabel: selectedMetric === "revenue" ? "Revenue (₹)" : "Admissions",
                    isCurrency: selectedMetric === "revenue",
                    ...right
                },
                comparisonDelta: {
                    type: "centre_vs_centre",
                    leftLabel,
                    rightLabel,
                    deltaValue,
                    deltaPercent,
                    leader: deltaValue > 0 ? leftLabel : (deltaValue < 0 ? rightLabel : "Tied"),
                    deptDiffs
                }
            };
        } else if (comparisonMode === "period_comparison") {
            // ==========================================
            // 2. GROWTH (Curr vs Prev)
            // ==========================================
            const left = getPieData(centre1, selectedMetric, sessionLeft);
            const right = getPieData(centre2, selectedMetric, sessionRight);

            const deltaValue = (right.total || 0) - (left.total || 0);
            const deltaPercent = left.total > 0
                ? Number(((deltaValue / left.total) * 100).toFixed(1))
                : (right.total > 0 ? 100 : 0);

            const leftLabel = `${centre1} (${leftSessionObj.shortLabel})`;
            const rightLabel = `${centre2} (${rightSessionObj.shortLabel})`;

            return {
                chartLeft: {
                    title: `${centre1} — ${leftSessionObj.shortLabel}`,
                    zone: left.row?.zone || "General Zone",
                    badge: leftSessionObj.shortLabel,
                    sessionKey: sessionLeft,
                    metricLabel: selectedMetric === "revenue" ? "Revenue (₹)" : "Admissions",
                    isCurrency: selectedMetric === "revenue",
                    ...left
                },
                chartRight: {
                    title: `${centre2} — ${rightSessionObj.shortLabel}`,
                    zone: right.row?.zone || "General Zone",
                    badge: rightSessionObj.shortLabel,
                    sessionKey: sessionRight,
                    metricLabel: selectedMetric === "revenue" ? "Revenue (₹)" : "Admissions",
                    isCurrency: selectedMetric === "revenue",
                    ...right
                },
                comparisonDelta: {
                    type: "period_comparison",
                    leftLabel,
                    rightLabel,
                    deltaValue,
                    deltaPercent,
                    isGrowth: deltaValue >= 0
                }
            };
        } else if (comparisonMode === "metric_comparison") {
            // ==========================================
            // 3. REVENUE VS ADMISSIONS
            // ==========================================
            const left = getPieData(centre1, "revenue", sessionLeft);
            const right = getPieData(centre2, "admissions", sessionRight);

            return {
                chartLeft: {
                    title: `${centre1} — Revenue Share`,
                    zone: left.row?.zone || "General Zone",
                    badge: `${leftSessionObj.shortLabel} Revenue`,
                    sessionKey: sessionLeft,
                    metricLabel: "Revenue (₹)",
                    isCurrency: true,
                    ...left
                },
                chartRight: {
                    title: `${centre2} — Admissions Share`,
                    zone: right.row?.zone || "General Zone",
                    badge: `${rightSessionObj.shortLabel} Admissions`,
                    sessionKey: sessionRight,
                    metricLabel: "Admissions (Count)",
                    isCurrency: false,
                    ...right
                },
                comparisonDelta: {
                    type: "metric_comparison",
                    topDeptRev: left.data[0]?.name || "N/A",
                    topDeptAdm: right.data[0]?.name || "N/A"
                }
            };
        } else {
            // ==========================================
            // 4. MARKET SHARE (Distribution Across Centres)
            // ==========================================
            const prepareMarketData = (isRev, periodKey) => {
                const isCurr = periodKey === "current";
                const sorted = [...rows].map((r, idx) => {
                    let val = 0;
                    if (marketDept === "ALL") {
                        val = isRev
                            ? (isCurr ? r.revenueCurrent : r.revenuePrevious)
                            : (isCurr ? r.admissionsCurrent : r.admissionsPrevious);
                    } else {
                        val = isRev
                            ? (isCurr ? r.deptRevenueCurrent?.[marketDept] : r.deptRevenuePrevious?.[marketDept])
                            : (isCurr ? r.deptAdmissionsCurrent?.[marketDept] : r.deptAdmissionsPrevious?.[marketDept]);
                    }
                    return {
                        name: r.centre,
                        value: Math.max(0, val || 0),
                        color: VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]
                    };
                }).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

                const top6 = sorted.slice(0, 6);
                const othersVal = sorted.slice(6).reduce((s, x) => s + x.value, 0);
                if (othersVal > 0) {
                    top6.push({
                        name: "Other Centres",
                        value: othersVal,
                        color: "#64748b"
                    });
                }
                const total = sorted.reduce((s, x) => s + x.value, 0);
                return { data: top6, total };
            };

            const left = prepareMarketData(selectedMetric === "revenue" || selectedMetric === "both", sessionLeft);
            const right = prepareMarketData(selectedMetric === "revenue" || selectedMetric === "both", sessionRight);

            const mName = selectedMetric === "admissions" ? "Admissions" : "Revenue";

            return {
                chartLeft: {
                    title: `All Centres — ${leftSessionObj.shortLabel} ${mName}`,
                    zone: "Organization-Wide",
                    badge: leftSessionObj.shortLabel,
                    sessionKey: sessionLeft,
                    metricLabel: selectedMetric === "admissions" ? "Admissions (Count)" : "Revenue (₹)",
                    isCurrency: selectedMetric !== "admissions",
                    ...left
                },
                chartRight: {
                    title: `All Centres — ${rightSessionObj.shortLabel} ${mName}`,
                    zone: "Organization-Wide",
                    badge: rightSessionObj.shortLabel,
                    sessionKey: sessionRight,
                    metricLabel: selectedMetric === "admissions" ? "Admissions (Count)" : "Revenue (₹)",
                    isCurrency: selectedMetric !== "admissions",
                    ...right
                },
                comparisonDelta: {
                    type: "market_share"
                }
            };
        }
    }, [
        comparisonMode,
        centre1,
        centre2,
        selectedMetric,
        sessionLeft,
        sessionRight,
        marketDept,
        rows,
        departments,
        sessionOptions
    ]);

    if (!rows || rows.length === 0) {
        return null;
    }

    return (
        <div className={`rounded-2xl border transition-all duration-300 mb-6 shadow-xl overflow-hidden ${
            isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
        }`}>
            {/* Header & Controls Bar */}
            <div className={`p-4 md:p-5 border-b flex flex-wrap items-center justify-between gap-4 ${
                isDarkMode ? "bg-slate-950/70 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
            }`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                        <FaChartPie className="text-lg" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className={`text-base md:text-lg font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                Centre Department Pie Comparison
                            </h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Cross-Session Analysis
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Select independent sessions (e.g. Previous Year vs Current Year) and centres to compare side-by-side ({viewMode} view)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                            isDarkMode
                                ? "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
                        }`}
                        title={isExpanded ? "Collapse Pie Charts" : "Expand Pie Charts"}
                    >
                        {isExpanded ? (
                            <>
                                <FaChevronUp className="text-xs" />
                                <span className="hidden sm:inline">Minimize</span>
                            </>
                        ) : (
                            <>
                                <FaChevronDown className="text-xs" />
                                <span className="hidden sm:inline">Expand Charts</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="p-4 md:p-6 space-y-6">
                    {/* Interactive Dropdowns Selection Bar (Only General Mode, Metric, and Quick Swaps) */}
                    <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                        isDarkMode ? "bg-slate-950/40 border-slate-800/60" : "bg-slate-50 border-slate-200"
                    }`}>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* 1. Comparison Mode Dropdown */}
                            <div className="min-w-[220px]">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                    <FaBalanceScale className="text-cyan-400" /> Comparison Mode
                                </label>
                                <select
                                    value={comparisonMode}
                                    onChange={(e) => handleModeChange(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                                        isDarkMode
                                            ? "bg-slate-800 border-slate-700 text-white focus:border-cyan-400"
                                            : "bg-white border-slate-300 text-slate-800 focus:border-cyan-600 shadow-sm"
                                    }`}
                                >
                                    <option value="centre_vs_centre">Centre vs Centre (Dept Share)</option>
                                    <option value="period_comparison">Single Centre: Growth (Curr vs Prev)</option>
                                    <option value="metric_comparison">Single Centre: Rev vs Admissions</option>
                                    <option value="market_share">All Centres: Contribution Share</option>
                                </select>
                            </div>

                            {/* 2. Metric Selector Dropdown */}
                            {(comparisonMode === "centre_vs_centre" || comparisonMode === "period_comparison" || comparisonMode === "market_share") && (
                                <div className="min-w-[180px]">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                        <FaLayerGroup className="text-amber-400" /> Metric
                                    </label>
                                    <select
                                        value={selectedMetric}
                                        onChange={(e) => setSelectedMetric(e.target.value)}
                                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                                            isDarkMode
                                                ? "bg-slate-800 border-slate-700 text-amber-300 focus:border-amber-400"
                                                : "bg-white border-slate-300 text-amber-800 focus:border-amber-600 shadow-sm"
                                        }`}
                                    >
                                        <option value="revenue">Revenue (₹)</option>
                                        <option value="admissions">Admissions (Count)</option>
                                    </select>
                                </div>
                            )}

                            {/* 3. Department Filter for Market Share */}
                            {comparisonMode === "market_share" && (
                                <div className="min-w-[200px]">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
                                        <FaLayerGroup className="text-purple-400" /> Department Focus
                                    </label>
                                    <select
                                        value={marketDept}
                                        onChange={(e) => setMarketDept(e.target.value)}
                                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                                            isDarkMode
                                                ? "bg-slate-800 border-slate-700 text-purple-300 focus:border-purple-400"
                                                : "bg-white border-slate-300 text-purple-800 focus:border-purple-600 shadow-sm"
                                        }`}
                                    >
                                        <option value="ALL">All Departments (Overall Total)</option>
                                        {departments.map(d => (
                                            <option key={d} value={d}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Quick Swap Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSwapCentres}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                                    isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-cyan-400 hover:bg-slate-700"
                                        : "bg-white border-slate-200 text-cyan-700 hover:bg-slate-100 shadow-sm"
                                }`}
                                title="Swap Left and Right Centres"
                            >
                                <FaExchangeAlt />
                                <span>Swap Centres</span>
                            </button>
                            <button
                                onClick={handleSwapSessions}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                                    isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700"
                                        : "bg-white border-slate-200 text-indigo-700 hover:bg-slate-100 shadow-sm"
                                }`}
                                title="Swap Left and Right Financial Years"
                            >
                                <FaCalendarAlt />
                                <span>Swap Years</span>
                            </button>
                        </div>
                    </div>

                    {/* Side-by-Side Pie Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        {/* Left Pie Card */}
                        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                            isDarkMode
                                ? "bg-slate-900/50 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                                : "bg-white border-cyan-200 shadow-md"
                        }`}>
                            <div>
                                {/* Card Header with Direct Centre & Session Dropdowns */}
                                <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-800/40">
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                                            {comparisonMode === "market_share" ? (
                                                <h3 className={`text-base font-black truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                                    All Centres (Market Share)
                                                </h3>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
                                                        Centre:
                                                    </span>
                                                    <select
                                                        value={centre1}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setSelectedCentre1(val);
                                                            if (!selectedCentre2) {
                                                                setSelectedCentre2(centre2);
                                                            }
                                                        }}
                                                        className={`text-sm font-black px-2.5 py-1 rounded-xl border transition-colors outline-none cursor-pointer max-w-[210px] truncate ${
                                                            isDarkMode
                                                                ? "bg-slate-800 border-cyan-500/40 text-cyan-300 focus:border-cyan-400"
                                                                : "bg-white border-cyan-400 text-cyan-900 focus:border-cyan-600 shadow-sm"
                                                        }`}
                                                    >
                                                        {centreNames.map(c => (
                                                            <option key={c} value={c} className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-800"}>
                                                                {c}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                                                {chartLeft.zone}
                                            </span>
                                            {/* Header Session Selector */}
                                            <select
                                                value={sessionLeft}
                                                onChange={(e) => setSessionLeft(e.target.value)}
                                                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors outline-none cursor-pointer ${
                                                    isDarkMode
                                                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 focus:border-cyan-400"
                                                        : "bg-cyan-50 border-cyan-300 text-cyan-800 focus:border-cyan-600 shadow-sm"
                                                }`}
                                            >
                                                {sessionOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value} className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-800"}>
                                                        {opt.shortLabel}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                                            Total {chartLeft.metricLabel}
                                        </div>
                                        <div className="text-xl font-black text-cyan-400 mt-0.5">
                                            {chartLeft.isCurrency
                                                ? `₹${Number(chartLeft.total || 0).toLocaleString()}`
                                                : Number(chartLeft.total || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Pie Chart Graphic */}
                                <div className="h-[280px] w-full relative flex items-center justify-center min-w-0">
                                    {chartLeft.data && chartLeft.data.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartLeft.data}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={65}
                                                    outerRadius={105}
                                                    paddingAngle={3}
                                                    stroke={isDarkMode ? "#0f172a" : "#ffffff"}
                                                    strokeWidth={2}
                                                >
                                                    {chartLeft.data.map((entry, index) => (
                                                        <Cell key={`left-cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    content={
                                                        <CustomPieTooltip
                                                            isDarkMode={isDarkMode}
                                                            isCurrency={chartLeft.isCurrency}
                                                            totalSum={chartLeft.total}
                                                        />
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-12 text-slate-500">
                                            <FaInfoCircle className="text-2xl mx-auto mb-2 opacity-50" />
                                            <p className="text-xs font-bold">No active data recorded for this selection</p>
                                        </div>
                                    )}

                                    {/* Center Donut Label */}
                                    {chartLeft.data && chartLeft.data.length > 0 && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                Share Total
                                            </span>
                                            <span className="text-sm font-black text-cyan-400 mt-0.5 max-w-[110px] truncate px-1">
                                                {chartLeft.isCurrency
                                                    ? `₹${Number(chartLeft.total || 0).toLocaleString()}`
                                                    : Number(chartLeft.total || 0).toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500">
                                                {chartLeft.data.length} Depts
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Department Breakdown Pills / Mini List */}
                            <div className="mt-4 pt-3 border-t border-slate-800/40">
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                                    <span>Department Breakdown</span>
                                    <span>Value (% Share)</span>
                                </div>
                                <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                    {(chartLeft.data || []).map((item, idx) => {
                                        const share = chartLeft.total > 0
                                            ? ((item.value / chartLeft.total) * 100).toFixed(1)
                                            : "0.0";
                                        return (
                                            <div
                                                key={item.name}
                                                className={`p-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                                    isDarkMode ? "bg-slate-800/40 hover:bg-slate-800/70" : "bg-slate-50 hover:bg-slate-100"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    {idx === 0 && <FaTrophy className="text-amber-400 text-xs shrink-0" />}
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="font-extrabold truncate text-slate-200">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono shrink-0">
                                                    <span className="font-black text-cyan-400">
                                                        {chartLeft.isCurrency
                                                            ? `₹${Number(item.value).toLocaleString()}`
                                                            : Number(item.value).toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                                                        {share}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right Pie Card */}
                        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                            isDarkMode
                                ? "bg-slate-900/50 border-indigo-500/30 shadow-lg shadow-indigo-500/5"
                                : "bg-white border-indigo-200 shadow-md"
                        }`}>
                            <div>
                                {/* Card Header with Direct Centre & Session Dropdowns */}
                                <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-800/40">
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                                            {comparisonMode === "market_share" ? (
                                                <h3 className={`text-base font-black truncate ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                                    All Centres (Market Share)
                                                </h3>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400">
                                                        Centre:
                                                    </span>
                                                    <select
                                                        value={centre2}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setSelectedCentre2(val);
                                                            if (!selectedCentre1) {
                                                                setSelectedCentre1(centre1);
                                                            }
                                                        }}
                                                        className={`text-sm font-black px-2.5 py-1 rounded-xl border transition-colors outline-none cursor-pointer max-w-[210px] truncate ${
                                                            isDarkMode
                                                                ? "bg-slate-800 border-indigo-500/40 text-indigo-300 focus:border-indigo-400"
                                                                : "bg-white border-indigo-400 text-indigo-900 focus:border-indigo-600 shadow-sm"
                                                        }`}
                                                    >
                                                        {centreNames.map(c => (
                                                            <option key={c} value={c} className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-800"}>
                                                                {c}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                                                {chartRight.zone}
                                            </span>
                                            {/* Header Session Selector */}
                                            <select
                                                value={sessionRight}
                                                onChange={(e) => setSessionRight(e.target.value)}
                                                className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors outline-none cursor-pointer ${
                                                    isDarkMode
                                                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300 focus:border-indigo-400"
                                                        : "bg-indigo-50 border-indigo-300 text-indigo-800 focus:border-indigo-600 shadow-sm"
                                                }`}
                                            >
                                                {sessionOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value} className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-800"}>
                                                        {opt.shortLabel}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                                            Total {chartRight.metricLabel}
                                        </div>
                                        <div className="text-xl font-black text-indigo-400 mt-0.5">
                                            {chartRight.isCurrency
                                                ? `₹${Number(chartRight.total || 0).toLocaleString()}`
                                                : Number(chartRight.total || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Pie Chart Graphic */}
                                <div className="h-[280px] w-full relative flex items-center justify-center min-w-0">
                                    {chartRight.data && chartRight.data.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartRight.data}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={65}
                                                    outerRadius={105}
                                                    paddingAngle={3}
                                                    stroke={isDarkMode ? "#0f172a" : "#ffffff"}
                                                    strokeWidth={2}
                                                >
                                                    {chartRight.data.map((entry, index) => (
                                                        <Cell key={`right-cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    content={
                                                        <CustomPieTooltip
                                                            isDarkMode={isDarkMode}
                                                            isCurrency={chartRight.isCurrency}
                                                            totalSum={chartRight.total}
                                                        />
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-12 text-slate-500">
                                            <FaInfoCircle className="text-2xl mx-auto mb-2 opacity-50" />
                                            <p className="text-xs font-bold">No active data recorded for this selection</p>
                                        </div>
                                    )}

                                    {/* Center Donut Label */}
                                    {chartRight.data && chartRight.data.length > 0 && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                Share Total
                                            </span>
                                            <span className="text-sm font-black text-indigo-400 mt-0.5 max-w-[110px] truncate px-1">
                                                {chartRight.isCurrency
                                                    ? `₹${Number(chartRight.total || 0).toLocaleString()}`
                                                    : Number(chartRight.total || 0).toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500">
                                                {chartRight.data.length} Depts
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Department Breakdown Pills / Mini List */}
                            <div className="mt-4 pt-3 border-t border-slate-800/40">
                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                                    <span>Department Breakdown</span>
                                    <span>Value (% Share)</span>
                                </div>
                                <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                    {(chartRight.data || []).map((item, idx) => {
                                        const share = chartRight.total > 0
                                            ? ((item.value / chartRight.total) * 100).toFixed(1)
                                            : "0.0";
                                        return (
                                            <div
                                                key={item.name}
                                                className={`p-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                                    isDarkMode ? "bg-slate-800/40 hover:bg-slate-800/70" : "bg-slate-50 hover:bg-slate-100"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    {idx === 0 && <FaTrophy className="text-amber-400 text-xs shrink-0" />}
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="font-extrabold truncate text-slate-200">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono shrink-0">
                                                    <span className="font-black text-indigo-400">
                                                        {chartRight.isCurrency
                                                            ? `₹${Number(item.value).toLocaleString()}`
                                                            : Number(item.value).toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                                                        {share}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Head-to-Head Comparative Delta Summary */}
                    {(comparisonDelta?.type === "centre_vs_centre" || comparisonDelta?.type === "period_comparison") && (
                        <div className={`p-4 rounded-2xl border ${
                            isDarkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                        }`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/40 mb-3">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                        <FaBalanceScale className="text-cyan-400" />
                                        Cross-Session Margin Comparison
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {comparisonDelta.leader !== "Tied" ? (
                                            <>
                                                <strong className="text-cyan-400">
                                                    {comparisonDelta.leader}
                                                </strong>{" "}
                                                is leading by{" "}
                                                <span className="font-black text-emerald-400">
                                                    {selectedMetric === "revenue"
                                                        ? `₹${Math.abs(comparisonDelta.deltaValue).toLocaleString()}`
                                                        : Math.abs(comparisonDelta.deltaValue).toLocaleString()}{" "}
                                                    ({Math.abs(comparisonDelta.deltaPercent)}%)
                                                </span>
                                            </>
                                        ) : (
                                            "Both sides are balanced in total volume for their selected sessions."
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                        <span>{comparisonDelta.leftLabel}</span>
                                    </div>
                                    <span className="text-xs text-slate-500 font-black">VS</span>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                                        <span>{comparisonDelta.rightLabel}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Department Diff Matrix Badges */}
                            {comparisonDelta.deptDiffs && comparisonDelta.deptDiffs.length > 0 && (
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">
                                        Department Margin Breakdown
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {comparisonDelta.deptDiffs.map(d => {
                                            const isL = d.diff > 0;
                                            const isR = d.diff < 0;
                                            return (
                                                <div
                                                    key={d.department}
                                                    className={`p-2.5 rounded-xl border text-xs transition-all ${
                                                        isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
                                                    }`}
                                                >
                                                    <div className="font-extrabold text-[11px] truncate text-slate-300">
                                                        {d.department}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                                                        <span>Left: {selectedMetric === "revenue" ? `₹${d.leftVal.toLocaleString()}` : d.leftVal}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 flex justify-between">
                                                        <span>Right: {selectedMetric === "revenue" ? `₹${d.rightVal.toLocaleString()}` : d.rightVal}</span>
                                                    </div>
                                                    <div className="mt-1.5 pt-1.5 border-t border-slate-800/40 text-[10px] font-black flex items-center gap-1">
                                                        {isL ? (
                                                            <span className="text-cyan-400 flex items-center gap-0.5">
                                                                <FaArrowUp /> +{selectedMetric === "revenue" ? `₹${Math.abs(d.diff).toLocaleString()}` : Math.abs(d.diff)}
                                                            </span>
                                                        ) : isR ? (
                                                            <span className="text-indigo-400 flex items-center gap-0.5">
                                                                <FaArrowUp /> +{selectedMetric === "revenue" ? `₹${Math.abs(d.diff).toLocaleString()}` : Math.abs(d.diff)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500">Tied</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CentrePieComparison;
