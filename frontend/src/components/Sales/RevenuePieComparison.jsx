import React, { useState, useMemo } from "react";
import {
    FaChartPie,
    FaBuilding,
    FaLayerGroup,
    FaExchangeAlt,
    FaArrowUp,
    FaArrowDown,
    FaRupeeSign,
    FaCalendarAlt,
    FaChartBar,
    FaTrophy,
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

const MONTH_COLORS = {
    "April": "#38bdf8",
    "May": "#818cf8",
    "June": "#c084fc",
    "July": "#f472b6",
    "August": "#fb7185",
    "September": "#fb923c",
    "October": "#facc15",
    "November": "#4ade80",
    "December": "#2dd4bf",
    "January": "#22d3ee",
    "February": "#60a5fa",
    "March": "#a78bfa"
};

const VIBRANT_PALETTE = [
    "#06b6d4", "#10b981", "#3b82f6", "#f59e0b",
    "#ec4899", "#8b5cf6", "#f97316", "#14b8a6",
    "#6366f1", "#84cc16", "#e11d48", "#0ea5e9",
    "#d946ef", "#eab308", "#22c55e", "#a855f7"
];

const getSliceColor = (label, index = 0) => {
    if (!label) return VIBRANT_PALETTE[index % VIBRANT_PALETTE.length];
    if (MONTH_COLORS[label]) return MONTH_COLORS[label];
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = label.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % VIBRANT_PALETTE.length;
    return VIBRANT_PALETTE[idx];
};

const CustomPieTooltip = ({ active, payload, isDarkMode, totalSum }) => {
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
                        <span>Amount:</span>
                        <span className="font-black text-cyan-400">
                            ₹{Number(item.value || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span>Share:</span>
                        <span className="font-bold text-emerald-400">{percent}%</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const calculateGrowth = (prev, curr) => {
    if (!prev || prev === 0) {
        if (curr && curr > 0) return "+100.0";
        return "0.0";
    }
    const pct = ((curr - prev) / prev) * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(1);
};

const RevenuePieComparison = ({
    viewMode = "month",
    comparisonData = [],
    yearWiseData = [],
    dayWiseData = [],
    isDarkMode = true
}) => {
    // Comparison Modes:
    // "yoy_comparison": Compare Previous Year vs Current Year for 1 centre (Default)
    // "target_vs_achieved": Compare Target vs Achievement
    // "centre_vs_centre": Compare Centre 1 vs Centre 2
    // "market_share": Contribution share across all centres
    const [comparisonMode, setComparisonMode] = useState("yoy_comparison");

    // Metric Selection:
    // "both": Both Target & Achievement
    // "target": Target Comparison
    // "achievement": Achievement Comparison
    const [metricSelection, setMetricSelection] = useState("both");

    // Independent Session / Financial Year for Left and Right charts
    // "2526": FY 2025-2026 | "2627": FY 2026-2027
    const [sessionLeft, setSessionLeft] = useState("2526");
    const [sessionRight, setSessionRight] = useState("2627");

    // Centre slots
    const [selectedCentre1, setSelectedCentre1] = useState("");
    const [selectedCentre2, setSelectedCentre2] = useState("");

    // Collapse toggle
    const [isExpanded, setIsExpanded] = useState(true);

    // Active dataset based on viewMode
    const activeData = useMemo(() => {
        if (viewMode === "year") return yearWiseData;
        if (viewMode === "day") return dayWiseData;
        return comparisonData;
    }, [viewMode, yearWiseData, dayWiseData, comparisonData]);

    // Unique centre list
    const centreList = useMemo(() => {
        const set = new Set();
        const list = [];
        activeData.forEach(row => {
            const cName = row.centre?.centreName;
            if (cName && !set.has(cName)) {
                set.add(cName);
                list.push({ id: row.centre._id, name: cName });
            }
        });
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [activeData]);

    const centreNames = useMemo(() => centreList.map(c => c.name), [centreList]);

    // Derived effective centres safely during render
    const centre1 = (selectedCentre1 && centreNames.includes(selectedCentre1))
        ? selectedCentre1
        : (centreNames[0] || "");

    const centre2 = (selectedCentre2 && centreNames.includes(selectedCentre2))
        ? selectedCentre2
        : (centreNames.length > 1 ? centreNames[1] : (centreNames[0] || ""));

    // Session options: strictly Previous Year (2025-2026) and Current Year (2026-2027)
    const sessionOptions = useMemo(() => [
        { value: "2526", label: "Session 2025-2026 (Previous Year)", shortLabel: "FY 2025-2026" },
        { value: "2627", label: "Session 2026-2027 (Current Year)", shortLabel: "FY 2026-2027" }
    ], []);

    // Comparison mode change preserves user-chosen sessions and centres
    const handleModeChange = (mode) => {
        setComparisonMode(mode);
    };

    // Quick swap centres
    const handleSwapCentres = () => {
        setSelectedCentre1(centre2);
        setSelectedCentre2(centre1);
    };

    // Quick swap sessions
    const handleSwapSessions = () => {
        const temp = sessionLeft;
        setSessionLeft(sessionRight);
        setSessionRight(temp);
    };

    // Calculate chart datasets based on comparisonMode, metricSelection, sessionLeft, sessionRight, and viewMode
    const { chartLeft, chartRight, comparisonDelta } = useMemo(() => {
        // Helper: get month-wise rows for a centre
        const getCentreMonthRows = (name) => {
            return comparisonData.filter(r => r.centre?.centreName === name);
        };

        // Helper: get year-wise row for a centre
        const getCentreYearRow = (name) => {
            return yearWiseData.find(r => r.centre?.centreName === name) || null;
        };

        // Helper: get day-wise row for a centre
        const getCentreDayRow = (name) => {
            return dayWiseData.find(r => r.centre?.centreName === name) || null;
        };

        // Helper to extract Target & Achievement for a centre and a given sessionKey ("2526" | "2627")
        const getCentreSessionData = (cName, sKey) => {
            const isCurr = sKey === "2627";
            const sessionLabel = isCurr ? "FY 2026-2027" : "FY 2025-2026";

            if (viewMode === "month") {
                const rows = getCentreMonthRows(cName);
                const targetKey = isCurr ? "target2627" : "target2526";
                const achKey = isCurr ? "achieved2627" : "achieved2526";
                const targetTotal = rows.reduce((s, r) => s + (Number(r[targetKey]) || 0), 0);
                const achievedTotal = rows.reduce((s, r) => s + (Number(r[achKey]) || 0), 0);
                return { targetTotal, achievedTotal, sessionLabel, isCurr, rows, targetKey, achKey };
            } else if (viewMode === "year") {
                const r = getCentreYearRow(cName);
                const targetTotal = (isCurr ? r?.target2627 : r?.target2526) || 0;
                const achievedTotal = (isCurr ? r?.achieved2627 : r?.achieved2526) || 0;
                return { targetTotal, achievedTotal, sessionLabel, isCurr, rows: [] };
            } else {
                const r = getCentreDayRow(cName);
                const targetTotal = (isCurr ? r?.currYearTarget : r?.prevYearDayTarget) || 0;
                const achievedTotal = (isCurr ? r?.currYearDayAmt : r?.prevYearDayAmt) || 0;
                return { targetTotal, achievedTotal, sessionLabel, isCurr, rows: [] };
            }
        };

        // Helper to construct a single chart card object
        const buildChartSlot = ({ cName, sKey, isLeft }) => {
            const { targetTotal, achievedTotal, sessionLabel, rows, targetKey, achKey } = getCentreSessionData(cName, sKey);
            const isMultiMonth = viewMode === "month" && rows.length > 1;
            const pct = targetTotal > 0 ? ((achievedTotal / targetTotal) * 100).toFixed(1) : "0.0";
            const shortfall = Math.max(0, targetTotal - achievedTotal);
            const surplus = Math.max(0, achievedTotal - targetTotal);

            // A) BOTH TARGET & ACHIEVEMENT
            if (metricSelection === "both") {
                const data = [
                    { name: "Achieved Collection", value: Math.round(achievedTotal), color: isLeft ? "#10b981" : "#6366f1" },
                    ...(shortfall > 0 ? [{ name: "Remaining Target", value: Math.round(shortfall), color: "#64748b" }] : []),
                    ...(surplus > 0 ? [{ name: "Overachievement", value: Math.round(surplus), color: "#06b6d4" }] : [])
                ].filter(d => d.value > 0);

                return {
                    title: `${cName} — ${sessionLabel}`,
                    badge: `${sessionLabel} (${pct}% Achieved)`,
                    subBadge: `${pct}% Target Achieved`,
                    total: Math.round(targetTotal),
                    centerLabel: `${pct}% Achieved`,
                    target: targetTotal,
                    achieved: achievedTotal,
                    pct,
                    data
                };
            }

            // B) TARGET COMPARISON
            if (metricSelection === "target") {
                const data = isMultiMonth
                    ? rows.map((r, idx) => ({
                        name: r.month,
                        value: Math.round(Number(r[targetKey]) || 0),
                        color: getSliceColor(r.month, idx)
                    })).filter(d => d.value > 0)
                    : [{ name: `${sessionLabel} Target`, value: Math.round(targetTotal), color: isLeft ? "#38bdf8" : "#818cf8" }].filter(d => d.value > 0);

                return {
                    title: `${cName} — ${sessionLabel} Target`,
                    badge: `${sessionLabel} Target`,
                    subBadge: "Target Budget",
                    total: Math.round(targetTotal),
                    target: targetTotal,
                    achieved: achievedTotal,
                    pct,
                    data
                };
            }

            // C) ACHIEVEMENT COMPARISON
            const data = isMultiMonth
                ? rows.map((r, idx) => ({
                    name: r.month,
                    value: Math.round(Number(r[achKey]) || 0),
                    color: getSliceColor(r.month, idx)
                })).filter(d => d.value > 0)
                : [{ name: `${sessionLabel} Collection`, value: Math.round(achievedTotal), color: isLeft ? "#10b981" : "#6366f1" }].filter(d => d.value > 0);

            return {
                title: `${cName} — ${sessionLabel} Collection`,
                badge: `${sessionLabel} Collection`,
                subBadge: "Actual Collection",
                total: Math.round(achievedTotal),
                target: targetTotal,
                achieved: achievedTotal,
                pct,
                data
            };
        };

        // ==========================================
        // MARKET SHARE (All Centres Contribution)
        // ==========================================
        if (comparisonMode === "market_share") {
            const buildMarketData = (sKey) => {
                const isCurr = sKey === "2627";
                const sessionLabel = isCurr ? "FY 2026-2027" : "FY 2025-2026";
                const isAch = metricSelection === "achievement";
                const isTgt = metricSelection === "target";

                const map = {};
                if (viewMode === "month") {
                    comparisonData.forEach(r => {
                        const c = r.centre?.centreName || "Unknown";
                        let val = 0;
                        if (isTgt) val = isCurr ? r.target2627 : r.target2526;
                        else if (isAch) val = isCurr ? r.achieved2627 : r.achieved2526;
                        else val = isCurr ? r.achieved2627 : r.target2627;
                        map[c] = (map[c] || 0) + (Number(val) || 0);
                    });
                } else if (viewMode === "year") {
                    yearWiseData.forEach(r => {
                        const c = r.centre?.centreName || "Unknown";
                        let val = 0;
                        if (isTgt) val = isCurr ? r.target2627 : r.target2526;
                        else if (isAch) val = isCurr ? r.achieved2627 : r.achieved2526;
                        else val = isCurr ? r.achieved2627 : r.target2627;
                        map[c] = (map[c] || 0) + (Number(val) || 0);
                    });
                } else {
                    dayWiseData.forEach(r => {
                        const c = r.centre?.centreName || "Unknown";
                        let val = 0;
                        if (isTgt) val = isCurr ? r.currYearTarget : r.prevYearDayTarget;
                        else if (isAch) val = isCurr ? r.currYearDayAmt : r.prevYearDayAmt;
                        else val = isCurr ? r.currYearDayAmt : r.currYearTarget;
                        map[c] = (map[c] || 0) + (Number(val) || 0);
                    });
                }

                const sorted = Object.entries(map).map(([name, value], idx) => ({
                    name,
                    value: Math.round(value),
                    color: VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]
                })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

                const top6 = sorted.slice(0, 6);
                const others = sorted.slice(6).reduce((s, d) => s + d.value, 0);
                if (others > 0) {
                    top6.push({ name: "Other Centres", value: others, color: "#64748b" });
                }
                const total = sorted.reduce((s, d) => s + d.value, 0);
                return { data: top6, total, sessionLabel };
            };

            const left = buildMarketData(sessionLeft);
            const right = buildMarketData(sessionRight);

            const mLabel = metricSelection === "target" ? "Target Share" : metricSelection === "achievement" ? "Collection Share" : "Market Share";

            return {
                chartLeft: {
                    title: `All Centres — ${left.sessionLabel} ${mLabel}`,
                    badge: `${left.sessionLabel} Share`,
                    subBadge: mLabel,
                    total: left.total,
                    data: left.data
                },
                chartRight: {
                    title: `All Centres — ${right.sessionLabel} ${mLabel}`,
                    badge: `${right.sessionLabel} Share`,
                    subBadge: mLabel,
                    total: right.total,
                    data: right.data
                },
                comparisonDelta: {
                    type: "market_share"
                }
            };
        }

        // ========================================================
        // YOY COMPARISON, TARGET VS ACHIEVED, & CENTRE VS CENTRE
        // ========================================================
        const leftCentreName = centre1;
        const rightCentreName = centre2;

        const leftSlot = buildChartSlot({
            cName: leftCentreName,
            sKey: sessionLeft,
            isLeft: true
        });

        const rightSlot = buildChartSlot({
            cName: rightCentreName,
            sKey: sessionRight,
            isLeft: false
        });

        // Compute Head-to-Head Comparative Delta
        const diffTarget = rightSlot.target - leftSlot.target;
        const diffAchieved = rightSlot.achieved - leftSlot.achieved;
        const targetGrowth = calculateGrowth(leftSlot.target, rightSlot.target);
        const achievementGrowth = calculateGrowth(leftSlot.achieved, rightSlot.achieved);

        const leftLabel = `${leftCentreName} (${sessionLeft === "2627" ? "FY 26-27" : "FY 25-26"})`;
        const rightLabel = `${rightCentreName} (${sessionRight === "2627" ? "FY 26-27" : "FY 25-26"})`;

        const comparisonDeltaObj = {
            type: "session_comparison_summary",
            leftLabel,
            rightLabel,
            targetLeft: leftSlot.target,
            targetRight: rightSlot.target,
            diffTarget,
            targetGrowth,
            achievedLeft: leftSlot.achieved,
            achievedRight: rightSlot.achieved,
            diffAchieved,
            achievementGrowth,
            pctLeft: leftSlot.pct,
            pctRight: rightSlot.pct,
            metricSelection,
            leader: diffAchieved > 0 ? rightLabel : (diffAchieved < 0 ? leftLabel : "Tied")
        };

        return {
            chartLeft: leftSlot,
            chartRight: rightSlot,
            comparisonDelta: comparisonDeltaObj
        };
    }, [
        comparisonMode,
        metricSelection,
        sessionLeft,
        sessionRight,
        centre1,
        centre2,
        viewMode,
        comparisonData,
        yearWiseData,
        dayWiseData
    ]);

    if (!activeData || activeData.length === 0) {
        return null;
    }

    return (
        <div className={`rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
            isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200"
        }`}>
            {/* Header & Controls Bar */}
            <div className={`p-4 md:p-5 border-b flex flex-wrap items-center justify-between gap-4 ${
                isDarkMode ? "bg-black/30 border-gray-800" : "bg-gray-50 border-gray-200"
            }`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                        <FaChartPie className="text-lg" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className={`text-base md:text-lg font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                Revenue Pie Chart Comparison
                            </h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Side-by-Side Visual
                            </span>
                        </div>
                        <p className="text-xs text-gray-400">
                            Select session / financial year and metrics to compare different periods side-by-side
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                            isDarkMode
                                ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100 shadow-sm"
                        }`}
                        title={isExpanded ? "Collapse Charts" : "Expand Charts"}
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
                    {/* Interactive Dropdowns Selection Bar (Only General Mode and Metric + Quick Swaps) */}
                    <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                        isDarkMode ? "bg-black/20 border-gray-800" : "bg-gray-50 border-gray-200"
                    }`}>
                        <div className="flex flex-wrap items-center gap-3">
                            {/* 1. Comparison Mode */}
                            <div className="min-w-[220px]">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                                    <FaBalanceScale className="text-cyan-400" /> Comparison Mode
                                </label>
                                <select
                                    value={comparisonMode}
                                    onChange={(e) => handleModeChange(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                                        isDarkMode
                                            ? "bg-[#131619] border-gray-700 text-white focus:border-cyan-400"
                                            : "bg-white border-gray-300 text-gray-800 focus:border-cyan-600 shadow-sm"
                                    }`}
                                >
                                    <option value="yoy_comparison">YoY Comparison (Prev Year vs Curr Year)</option>
                                    <option value="target_vs_achieved">Target vs Achievement</option>
                                    <option value="centre_vs_centre">Centre vs Centre</option>
                                    <option value="market_share">All Centres Market Share</option>
                                </select>
                            </div>

                            {/* 2. Metric Comparison Dropdown */}
                            <div className="min-w-[200px]">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                                    <FaLayerGroup className="text-amber-400" /> Metric Selection
                                </label>
                                <select
                                    value={metricSelection}
                                    onChange={(e) => setMetricSelection(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                                        isDarkMode
                                            ? "bg-[#131619] border-gray-700 text-amber-300 focus:border-amber-400"
                                            : "bg-white border-gray-300 text-amber-800 focus:border-amber-600 shadow-sm"
                                    }`}
                                >
                                    <option value="both">Both (Target & Achievement)</option>
                                    <option value="target">Target Comparison</option>
                                    <option value="achievement">Achievement Comparison</option>
                                </select>
                            </div>
                        </div>

                        {/* Quick Swap Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSwapCentres}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                                    isDarkMode
                                        ? "bg-[#131619] border-gray-700 text-cyan-400 hover:bg-gray-800"
                                        : "bg-white border-gray-200 text-cyan-700 hover:bg-gray-100 shadow-sm"
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
                                        ? "bg-[#131619] border-gray-700 text-indigo-400 hover:bg-gray-800"
                                        : "bg-white border-gray-200 text-indigo-700 hover:bg-gray-100 shadow-sm"
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
                                ? "bg-[#131619]/60 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
                                : "bg-white border-cyan-200 shadow-md"
                        }`}>
                            <div>
                                {/* Header with Card Centre & Session Selectors */}
                                <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-gray-800/40">
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                                            {comparisonMode === "market_share" ? (
                                                <h3 className={`text-base font-black truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
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
                                                                ? "bg-[#131619] border-cyan-500/40 text-cyan-300 focus:border-cyan-400"
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
                                        <div className="flex items-center gap-2 flex-wrap">
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
                                            <span className="text-[11px] font-bold text-gray-400">
                                                {chartLeft.subBadge}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[10px] uppercase font-black tracking-wider text-gray-400">
                                            {metricSelection === "both" ? "Target Total" : "Total Amount"}
                                        </div>
                                        <div className="text-xl font-black text-cyan-400 mt-0.5">
                                            ₹{Number(chartLeft.total || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Pie Graphic */}
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
                                                    stroke={isDarkMode ? "#131619" : "#ffffff"}
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
                                                            totalSum={chartLeft.total}
                                                        />
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <FaInfoCircle className="text-2xl mx-auto mb-2 opacity-50" />
                                            <p className="text-xs font-bold">No active data recorded for this selection</p>
                                        </div>
                                    )}

                                    {/* Donut Center Label */}
                                    {chartLeft.data && chartLeft.data.length > 0 && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                            {chartLeft.centerLabel ? (
                                                <>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                        Achievement
                                                    </span>
                                                    <span className="text-base font-black text-cyan-400 mt-0.5">
                                                        {chartLeft.centerLabel}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-500">
                                                        of ₹{Number(chartLeft.total || 0).toLocaleString()}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                        Share Total
                                                    </span>
                                                    <span className="text-sm font-black text-cyan-400 mt-0.5 max-w-[110px] truncate px-1">
                                                        ₹{Number(chartLeft.total || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-500">
                                                        {chartLeft.data.length} Segments
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Breakdown List */}
                            <div className="mt-4 pt-3 border-t border-gray-800/40">
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                                    <span>Breakdown Segment</span>
                                    <span>Amount (% Share)</span>
                                </div>
                                <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-700">
                                    {(chartLeft.data || []).map((item, idx) => {
                                        const share = chartLeft.total > 0
                                            ? ((item.value / chartLeft.total) * 100).toFixed(1)
                                            : "0.0";
                                        return (
                                            <div
                                                key={item.name}
                                                className={`p-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                                    isDarkMode ? "bg-gray-800/40 hover:bg-gray-800/70" : "bg-gray-50 hover:bg-gray-100"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    {idx === 0 && <FaTrophy className="text-amber-400 text-xs shrink-0" />}
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="font-bold truncate text-gray-200">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono shrink-0">
                                                    <span className="font-black text-cyan-400">
                                                        ₹{Number(item.value).toLocaleString()}
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
                                ? "bg-[#131619]/60 border-indigo-500/30 shadow-lg shadow-indigo-500/5"
                                : "bg-white border-indigo-200 shadow-md"
                        }`}>
                            <div>
                                {/* Header with Card Centre & Session Selectors */}
                                <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-gray-800/40">
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                                            {comparisonMode === "market_share" ? (
                                                <h3 className={`text-base font-black truncate ${isDarkMode ? "text-white" : "text-gray-900"}`}>
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
                                                                ? "bg-[#131619] border-indigo-500/40 text-indigo-300 focus:border-indigo-400"
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
                                        <div className="flex items-center gap-2 flex-wrap">
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
                                            <span className="text-[11px] font-bold text-gray-400">
                                                {chartRight.subBadge}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-[10px] uppercase font-black tracking-wider text-gray-400">
                                            {metricSelection === "both" ? "Target Total" : "Total Amount"}
                                        </div>
                                        <div className="text-xl font-black text-indigo-400 mt-0.5">
                                            ₹{Number(chartRight.total || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Pie Graphic */}
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
                                                    stroke={isDarkMode ? "#131619" : "#ffffff"}
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
                                                            totalSum={chartRight.total}
                                                        />
                                                    }
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <FaInfoCircle className="text-2xl mx-auto mb-2 opacity-50" />
                                            <p className="text-xs font-bold">No active data recorded for this selection</p>
                                        </div>
                                    )}

                                    {/* Donut Center Label */}
                                    {chartRight.data && chartRight.data.length > 0 && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                            {chartRight.centerLabel ? (
                                                <>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                        Achievement
                                                    </span>
                                                    <span className="text-base font-black text-indigo-400 mt-0.5">
                                                        {chartRight.centerLabel}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-500">
                                                        of ₹{Number(chartRight.total || 0).toLocaleString()}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                        Share Total
                                                    </span>
                                                    <span className="text-sm font-black text-indigo-400 mt-0.5 max-w-[110px] truncate px-1">
                                                        ₹{Number(chartRight.total || 0).toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-500">
                                                        {chartRight.data.length} Segments
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Breakdown List */}
                            <div className="mt-4 pt-3 border-t border-gray-800/40">
                                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                                    <span>Breakdown Segment</span>
                                    <span>Amount (% Share)</span>
                                </div>
                                <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-700">
                                    {(chartRight.data || []).map((item, idx) => {
                                        const share = chartRight.total > 0
                                            ? ((item.value / chartRight.total) * 100).toFixed(1)
                                            : "0.0";
                                        return (
                                            <div
                                                key={item.name}
                                                className={`p-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                                                    isDarkMode ? "bg-gray-800/40 hover:bg-gray-800/70" : "bg-gray-50 hover:bg-gray-100"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    {idx === 0 && <FaTrophy className="text-amber-400 text-xs shrink-0" />}
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: item.color }}
                                                    />
                                                    <span className="font-bold truncate text-gray-200">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono shrink-0">
                                                    <span className="font-black text-indigo-400">
                                                        ₹{Number(item.value).toLocaleString()}
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

                    {/* Comparative Head-to-Head Margin Summary */}
                    {comparisonDelta?.type === "session_comparison_summary" && (
                        <div className={`p-4 rounded-2xl border ${
                            isDarkMode ? "bg-black/30 border-gray-800" : "bg-gray-50 border-gray-200"
                        }`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-gray-800/40 mb-3">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <FaBalanceScale className="text-cyan-400" />
                                        Cross-Session Margin Comparison
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Comparing <strong className="text-cyan-400">{comparisonDelta.leftLabel}</strong> vs <strong className="text-indigo-400">{comparisonDelta.rightLabel}</strong>
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold truncate max-w-[200px]">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                                        <span className="truncate">{comparisonDelta.leftLabel}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 font-black">VS</span>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold truncate max-w-[200px]">
                                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                                        <span className="truncate">{comparisonDelta.rightLabel}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Target Comparison */}
                                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                                        Target Difference
                                    </span>
                                    <div className="text-lg font-black text-cyan-300 mt-1 flex items-center gap-2">
                                        <span>{comparisonDelta.targetGrowth}%</span>
                                        <span className="text-xs font-normal text-gray-400">
                                            (₹{Math.round(comparisonDelta.targetLeft).toLocaleString()} → ₹{Math.round(comparisonDelta.targetRight).toLocaleString()})
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        Net shift: {comparisonDelta.diffTarget >= 0 ? "+" : ""}₹{Math.round(comparisonDelta.diffTarget).toLocaleString()}
                                    </div>
                                </div>

                                {/* Achievement Comparison */}
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                        Collection Difference
                                    </span>
                                    <div className="text-lg font-black text-emerald-300 mt-1 flex items-center gap-2">
                                        <span>{comparisonDelta.achievementGrowth}%</span>
                                        <span className="text-xs font-normal text-gray-400">
                                            (₹{Math.round(comparisonDelta.achievedLeft).toLocaleString()} → ₹{Math.round(comparisonDelta.achievedRight).toLocaleString()})
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        Net shift: {comparisonDelta.diffAchieved >= 0 ? "+" : ""}₹{Math.round(comparisonDelta.diffAchieved).toLocaleString()}
                                    </div>
                                </div>

                                {/* Completion Rate Comparison */}
                                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                                        Target Completion Rate
                                    </span>
                                    <div className="text-lg font-black text-purple-300 mt-1 flex items-center gap-2">
                                        <span>{comparisonDelta.pctLeft}% → {comparisonDelta.pctRight}%</span>
                                        <span className="text-xs font-normal text-gray-400">
                                            ({(Number(comparisonDelta.pctRight) - Number(comparisonDelta.pctLeft)).toFixed(1)}% shift)
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        Left Rate: {comparisonDelta.pctLeft}% · Right Rate: {comparisonDelta.pctRight}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default RevenuePieComparison;
