import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import {
    FaCrown, FaSync, FaSun, FaMoon, FaDownload, FaArrowLeft, FaTable,
    FaCheckCircle, FaStar, FaGem, FaChartLine
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
    !n || isNaN(n) ? "0" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtPct = (n) =>
    !n || isNaN(n) ? "0.0%" : `${Number(n).toFixed(1)}%`;

const FinalWeekendTarget = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === "dark";
    const navigate = useNavigate();

    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(monthNames[today.getMonth()]);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [centres, setCentres] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canView = hasPermission(user, 'sales', 'centreTarget', 'view');

    useEffect(() => {
        if (!canView && user.role !== 'superAdmin') {
            toast.error("Access Denied");
            navigate("/");
        }
    }, [canView, user.role, navigate]);

    // Fetch centres
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
                    if (user.role !== "superAdmin" && user.centres) {
                        const allowed = user.centres.map(id => (typeof id === "object" ? id._id : id));
                        list = list.filter(c => allowed.includes(c._id));
                    }
                    list = list.filter(c => c.status === "active");
                    setCentres(list.sort((a, b) => a.centreName.localeCompare(b.centreName)));
                }
            } catch (e) { console.error(e); }
        };
        fetchCentres();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ month: selectedMonth, year: selectedYear });
            if (selectedCentres.length > 0) params.append("centre", selectedCentres.join(","));

            // Reusing the same endpoint for now but styling it as 'Final'
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/sales/weekly-target?${params}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (e) {
            console.error(e);
            toast.error("Error loading final targets");
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, selectedCentres]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleExport = () => {
        const activeCentres = data?.centres?.filter(c => c.status === "active") || [];
        if (!activeCentres.length) { toast.warn("No data to export"); return; }
        
        const rows = [];
        activeCentres.forEach(c => {
            const allDays = c.weeks.flatMap(w => w.days).filter(d => !d.isEmpty && !d.isHidden);
            
            const processPhase = (start, end) => {
                const phaseDays = allDays.filter(d => d.day >= start && d.day <= end);
                const phaseAchieved = phaseDays.reduce((sum, d) => sum + d.achievedExclGST, 0);
                const weekendAchieved = phaseDays.filter(d => d.isWeekend).reduce((sum, d) => sum + d.achievedExclGST, 0);
                const workingAchieved = phaseAchieved - weekendAchieved;
                
                const phaseTarget = (c.monthlyTargetExclGST / c.daysInMonth) * phaseDays.length;
                const workingTarget = phaseTarget * 0.40;
                const baseWeekendTarget = phaseTarget * 0.60;

                const workingDeficit = Math.max(0, workingTarget - workingAchieved);
                const adjustedWeekendTarget = baseWeekendTarget + workingDeficit;
                const weekendDeficit = Math.max(0, adjustedWeekendTarget - weekendAchieved);
                const score = phaseTarget > 0 ? (phaseAchieved / phaseTarget) * 100 : 0;

                rows.push({
                    "Centre Name": c.centreName,
                    "Month": selectedMonth,
                    "Year": selectedYear,
                    "Window (Days)": `${start}-${end}`,
                    "Phase Total Target": Math.round(phaseTarget),
                    "Phase Total Achieved": Math.round(phaseAchieved),
                    "Working Target (40%)": Math.round(workingTarget),
                    "Working Achieved": Math.round(workingAchieved),
                    "Working Shortfall": Math.round(workingDeficit),
                    "Weekend Target (Base 60%)": Math.round(baseWeekendTarget),
                    "Carry Forward (from Working)": Math.round(workingDeficit),
                    "Final Weekend Target (Adjusted)": Math.round(adjustedWeekendTarget),
                    "Weekend Achieved": Math.round(weekendAchieved),
                    "Weekend Shortfall": Math.round(weekendDeficit),
                    "Efficiency Score (%)": score.toFixed(1) + "%"
                });
            };

            processPhase(1, 10);
            processPhase(11, 20);
            processPhase(21, 31);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Final_Settlement_Report");
        const fileName = `Final_Weekend_Target_${selectedMonth}_${selectedYear}.xlsx`;
        saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), fileName);
        toast.success("Detailed report exported successfully");
    };

    return (
        <Layout activePage="Sales">
            <div className={`space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'} p-4 md:p-8`}>
                
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
                            <h1 className={`text-3xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Weekends Target</h1>
                            <p className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} font-semibold`}>Verified performance and settlement calculations</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isDarkMode
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black'
                                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'
                                }`}
                        >
                            {isDarkMode ? <><FaSun /> Day Mode</> : <><FaMoon /> Night Mode</>}
                        </button>
                        <button 
                            onClick={handleExport}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${isDarkMode
                                ? 'bg-green-600/90 text-white hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/20'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                                }`}
                        >
                            <FaDownload size={14} /> Export Verified Report
                        </button>
                    </div>
                </div>

                {/* View Modes Tabs Bar */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'} p-4 rounded-xl border flex flex-wrap items-center gap-4 mb-6`}>
                    <h3 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold flex items-center gap-2`}>
                        <FaTable className="text-cyan-400" /> View Modes
                    </h3>
                    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-1 flex flex-wrap gap-1`}>
                        {["Monthly", "Quarterly", "Yearly", "Custom", "Weekend"].map(mode => (
                            <button
                                key={mode}
                                onClick={() => {
                                    if (mode === "Weekend") {
                                        navigate("/sales/final-weekend-target");
                                    } else {
                                        navigate("/sales/centre-target", { state: { viewMode: mode } });
                                    }
                                }}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold uppercase tracking-widest transition-all ${mode === "Weekend"
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} p-6 rounded-xl border mb-6`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                <FaStar className="text-cyan-400" /> Assessment Period
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                                    className={`w-full border-2 text-xs rounded-xl px-4 py-2.5 outline-none font-black transition-all ${isDarkMode ? "bg-black/50 border-white/5 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-100 text-gray-900 focus:border-cyan-500"}`}>
                                    {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                                    className={`w-full border-2 text-xs rounded-xl px-4 py-2.5 outline-none font-black transition-all ${isDarkMode ? "bg-black/50 border-white/5 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-100 text-gray-900 focus:border-cyan-500"}`}>
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                <FaGem className="text-cyan-400" /> Selective Centre Intelligence
                            </label>
                            <CustomMultiSelect
                                options={centres.map(c => ({ value: c._id, label: c.centreName }))}
                                value={centres.map(c => ({ value: c._id, label: c.centreName })).filter(o => selectedCentres.includes(o.value))}
                                onChange={sel => setSelectedCentres(sel ? sel.map(o => o.value) : [])}
                                placeholder="Aggregating All Operational Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        <div className="flex items-end">
                            <button 
                                onClick={fetchData}
                                className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${isDarkMode ? "bg-green-600/90 text-white hover:bg-green-500" : "bg-green-600 text-white hover:bg-green-700 shadow-md"}`}
                            >
                                <FaSync className={loading ? "animate-spin" : ""} />
                                Recalculate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                        const activeCentres = data ? data.centres.filter(c => c.status === "active") : [];
                        const stats = [
                            {
                                label: "Total Monthly Target",
                                value: activeCentres.reduce((s,c) => s + c.monthlyTargetExclGST, 0),
                                color: "text-blue-500",
                                bgColor: isDarkMode ? "bg-blue-500/10" : "bg-blue-50"
                            },
                            {
                                label: "Verified Achievement",
                                value: activeCentres.reduce((s,c) => s + c.totalAchievedExclGST, 0),
                                color: "text-emerald-500",
                                bgColor: isDarkMode ? "bg-emerald-500/10" : "bg-emerald-50"
                            },
                            {
                                label: "Premium Weekend Gain",
                                value: activeCentres.reduce((s,c) => s + c.weeks.reduce((ws, w) => ws + w.weekendTotalExclGST, 0), 0),
                                color: "text-purple-500",
                                bgColor: isDarkMode ? "bg-purple-500/10" : "bg-purple-50"
                            }
                        ];

                        return stats.map((card, i) => (
                            <div key={i} className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all hover:scale-[1.02] duration-300`}>
                                <div className="flex flex-col gap-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {card.label}
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-2xl font-black ${card.color}`}>
                                            ₹{Math.round(card.value).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                </div>

                {/* Main Content Area */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-xl border overflow-hidden`}>
                    <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} flex items-center justify-between`}>
                        <div>
                            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>Verified Centre Performance</h2>
                            <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Audit-ready settlement data for the month of {selectedMonth}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Live Finalization</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`${isDarkMode ? "bg-[#131619]" : "bg-gray-50"}`}>
                                    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Metric</th>
                                    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>P1 (1-10)</th>
                                    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>P2 (11-20)</th>
                                    <th className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>P3 (21-31)</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-100"}`}>
                                {loading ? (
                                    [1, 2].map(i => <tr key={i}><td colSpan="4" className="h-20 animate-pulse bg-gray-500/5" /></tr>)
                                ) : data?.centres.filter(c => c.status === "active").map(c => {
                                    const allDays = c.weeks.flatMap(w => w.days).filter(d => !d.isEmpty && !d.isHidden);
                                    
                                    const getPhaseData = (start, end) => {
                                        const phaseDays = allDays.filter(d => d.day >= start && d.day <= end);
                                        const phaseAchieved = phaseDays.reduce((sum, d) => sum + d.achievedExclGST, 0);
                                        const weekendAchieved = phaseDays.filter(d => d.isWeekend).reduce((sum, d) => sum + d.achievedExclGST, 0);
                                        const workingAchieved = phaseAchieved - weekendAchieved;
                                        
                                        const phaseTarget = (c.monthlyTargetExclGST / c.daysInMonth) * phaseDays.length;
                                        const workingTarget = phaseTarget * 0.40;
                                        const baseWeekendTarget = phaseTarget * 0.60;

                                        const workingDeficit = Math.max(0, workingTarget - workingAchieved);
                                        const adjustedWeekendTarget = baseWeekendTarget + workingDeficit;
                                        const weekendDeficit = Math.max(0, adjustedWeekendTarget - weekendAchieved);
                                        
                                        const pct = phaseTarget > 0 ? (phaseAchieved / phaseTarget) * 100 : 0;
                                        return { 
                                            phaseAchieved, workingAchieved, weekendAchieved, 
                                            phaseTarget, workingTarget, baseWeekendTarget, 
                                            adjustedWeekendTarget, workingDeficit, weekendDeficit,
                                            pct 
                                        };
                                    };

                                    const phases = [getPhaseData(1, 10), getPhaseData(11, 20), getPhaseData(21, 31)];

                                    return (
                                        <React.Fragment key={c.centreId}>
                                            <tr className={`${isDarkMode ? "bg-blue-500/10" : "bg-blue-50"} border-t-2 border-blue-500/30`}>
                                                <td colSpan="4" className="px-8 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <FaCrown className="text-blue-500" size={20} />
                                                        <span className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? "text-blue-400" : "text-blue-800"}`}>
                                                            {c.centreName} <span className="opacity-30 mx-3">|</span> Monthly: ₹{fmt(c.monthlyTargetExclGST)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr className={`${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"}`}>
                                                <td className={`px-6 py-4 font-semibold text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Phase Target</td>
                                                {phases.map((p, idx) => <td key={idx} className={`px-6 py-4 text-center text-sm font-bold ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>₹{fmt(p.phaseTarget)}</td>)}
                                            </tr>
                                            <tr className={`${isDarkMode ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "bg-emerald-50/30 hover:bg-emerald-50"}`}>
                                                <td className={`px-6 py-4 font-black text-sm ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>Phase Achieved</td>
                                                {phases.map((p, idx) => <td key={idx} className={`px-6 py-4 text-center text-sm font-black ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>₹{fmt(p.phaseAchieved)}</td>)}
                                            </tr>
                                            <tr className={`${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"}`}>
                                                <td className={`px-6 py-4 font-semibold text-sm ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>Working Target (40%)</td>
                                                {phases.map((p, idx) => <td key={idx} className={`px-6 py-4 text-center text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-500"}`}>₹{fmt(p.workingTarget)}</td>)}
                                            </tr>
                                            <tr className={`${isDarkMode ? "bg-cyan-500/5 hover:bg-cyan-500/10" : "bg-cyan-50/30 hover:bg-cyan-50"}`}>
                                                <td className={`px-6 py-4 font-black text-sm ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>Working Achieved</td>
                                                {phases.map((p, idx) => (
                                                    <td key={idx} className={`px-6 py-4 text-center text-sm font-black ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                                        <div>₹{fmt(p.workingAchieved)}</div>
                                                        {p.workingDeficit > 0 && <div className={`text-[10px] font-bold mt-1 ${isDarkMode ? "text-red-400" : "text-red-500"}`}>Shortfall: -₹{fmt(p.workingDeficit)}</div>}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr className={`${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"}`}>
                                                <td className={`px-6 py-4 font-semibold text-sm ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>Weekend Target (60%)</td>
                                                {phases.map((p, idx) => (
                                                    <td key={idx} className={`px-6 py-4 text-center text-sm font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-500"}`}>
                                                        <div>₹{fmt(p.baseWeekendTarget)}</div>
                                                        {p.workingDeficit > 0 && (
                                                            <div className="flex flex-col items-center mt-1 space-y-1">
                                                                <span className="text-[9px] font-black text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                                                                    + ₹{fmt(p.workingDeficit)} Recovery
                                                                </span>
                                                                <p className={`text-[11px] font-black ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}>New Target: ₹{fmt(p.adjustedWeekendTarget)}</p>
                                                            </div>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr className={`${isDarkMode ? "bg-blue-500/5 hover:bg-blue-500/10" : "bg-blue-50/30 hover:bg-blue-50"}`}>
                                                <td className={`px-6 py-4 font-black text-sm ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>Weekend Achieved</td>
                                                {phases.map((p, idx) => (
                                                    <td key={idx} className={`px-6 py-4 text-center text-sm font-black ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                                                        <div>₹{fmt(p.weekendAchieved)}</div>
                                                        {p.weekendDeficit > 0 && <div className={`text-[10px] font-bold mt-1 ${isDarkMode ? "text-red-400" : "text-red-500"}`}>Shortfall: -₹{fmt(p.weekendDeficit)}</div>}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr className={`${isDarkMode ? "hover:bg-white/[0.02]" : "hover:bg-gray-50"} border-b ${isDarkMode ? "border-gray-800" : "border-gray-100"}`}>
                                                <td className={`px-6 py-4 font-black text-sm ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>Efficiency Score</td>
                                                {phases.map((p, idx) => (
                                                    <td key={idx} className="px-6 py-4">
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <span className={`text-sm font-black ${p.pct >= 100 ? "text-emerald-400" : isDarkMode ? "text-white" : "text-gray-900"}`}>
                                                                {fmtPct(p.pct)}
                                                            </span>
                                                            <div className={`w-24 h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                                                                <div className={`h-full rounded-full bg-gradient-to-r ${p.pct >= 100 ? "from-emerald-400 to-teal-500" : "from-cyan-400 to-blue-500"}`} style={{ width: `${Math.min(p.pct, 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default FinalWeekendTarget;
