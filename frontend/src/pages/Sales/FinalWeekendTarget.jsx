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
        if (!data?.centres?.length) { toast.warn("No data to export"); return; }
        
        const rows = [];
        data.centres.forEach(c => {
            const allDays = c.weeks.flatMap(w => w.days).filter(d => !d.isEmpty && !d.isHidden);
            
            const processPhase = (start, end) => {
                const phaseDays = allDays.filter(d => d.day >= start && d.day <= end);
                const phaseAchieved = phaseDays.reduce((sum, d) => sum + d.achievedWithGST, 0);
                const weekendAchieved = phaseDays.filter(d => d.isWeekend).reduce((sum, d) => sum + d.achievedWithGST, 0);
                const workingAchieved = phaseAchieved - weekendAchieved;
                
                const phaseTarget = (c.monthlyTargetWithGST / c.daysInMonth) * phaseDays.length;
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
            <div className={`min-h-screen transition-all duration-500 ${isDarkMode ? "bg-[#0a0c0f]" : "bg-gray-50"} p-4 md:p-8 relative overflow-hidden`}>
                
                {/* Background Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full -mr-48 -mt-48 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 blur-[120px] rounded-full -ml-48 -mb-48" />

                {/* Header */}
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-3 rounded-xl border transition-all ${isDarkMode ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:text-gray-900 shadow-sm"}`}
                        >
                            <FaArrowLeft size={16} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/20">
                                    <FaCrown className="text-white text-xl" />
                                </div>
                                <h1 className={`text-4xl font-black tracking-tighter uppercase italic ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                    Final <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Weekends</span> Target
                                </h1>
                            </div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 ${isDarkMode ? "text-amber-500/60" : "text-amber-600"}`}>
                                Precision Performance · Finalized Settlement · Verified Achievement
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className={`flex items-center gap-1 p-1 rounded-2xl border ${isDarkMode ? "bg-black/40 border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
                            <button onClick={toggleTheme} className={`p-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isDarkMode ? "bg-amber-500/20 text-amber-500 shadow-inner" : "bg-gray-100 text-gray-600"}`}>
                                {isDarkMode ? <><FaSun /> Gold Mode</> : <><FaMoon /> Night</>}
                            </button>
                        </div>
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-amber-600/30 hover:scale-105 active:scale-95"
                        >
                            <FaDownload size={14} /> Export Verified Report
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className={`relative z-10 rounded-3xl border p-6 mb-8 backdrop-blur-xl transition-all ${isDarkMode ? "bg-white/[0.03] border-white/10 shadow-2xl" : "bg-white/80 border-gray-200 shadow-xl"}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                <FaStar className="text-amber-500" /> Assessment Period
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                                    className={`w-full border-2 text-xs rounded-xl px-4 py-2.5 outline-none font-black transition-all ${isDarkMode ? "bg-black/50 border-white/5 text-white focus:border-amber-500/50" : "bg-gray-50 border-gray-100 text-gray-900 focus:border-amber-500"}`}>
                                    {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
                                    className={`w-full border-2 text-xs rounded-xl px-4 py-2.5 outline-none font-black transition-all ${isDarkMode ? "bg-black/50 border-white/5 text-white focus:border-amber-500/50" : "bg-gray-50 border-gray-100 text-gray-900 focus:border-amber-500"}`}>
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
                                className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" : "bg-gray-900 text-white hover:bg-gray-800 shadow-lg"}`}
                            >
                                <FaSync className={loading ? "animate-spin" : ""} />
                                Recalculate Final Data
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { label: "Total Monthly Target", value: data ? `₹${fmt(data.centres.reduce((s,c) => s + c.monthlyTargetWithGST, 0))}` : "₹0", icon: <FaGem />, color: "from-amber-400 to-orange-500", sub: "Sum of all centres" },
                        { label: "Verified Achievement", value: data ? `₹${fmt(data.centres.reduce((s,c) => s + c.totalAchievedWithGST, 0))}` : "₹0", icon: <FaCheckCircle />, color: "from-emerald-400 to-teal-500", sub: "Actual collections" },
                        { label: "Premium Weekend Gain", value: data ? `₹${fmt(data.centres.reduce((s,c) => s + c.totalWeekendWithGST, 0))}` : "₹0", icon: <FaCrown />, color: "from-purple-400 to-indigo-500", sub: "Weekend contribution" }
                    ].map((stat, i) => (
                        <div key={i} className={`group p-6 rounded-[32px] border transition-all duration-500 hover:-translate-y-2 ${isDarkMode ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-100 shadow-xl"}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.color} shadow-lg shadow-black/10 group-hover:scale-110 transition-transform`}>
                                    <span className="text-white text-xl">{stat.icon}</span>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${isDarkMode ? "bg-white/5 text-gray-500" : "bg-gray-50 text-gray-400"}`}>
                                    {stat.sub}
                                </div>
                            </div>
                            <h3 className={`text-3xl font-black tracking-tighter mb-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{stat.value}</h3>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className={`relative z-10 rounded-[40px] border overflow-hidden ${isDarkMode ? "bg-white/[0.02] border-white/10 shadow-3xl" : "bg-white border-gray-100 shadow-2xl"}`}>
                    <div className="p-8 border-b border-white/5 flex items-center justify-between">
                        <div>
                            <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>Verified Centre Performance</h2>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>Audit-ready settlement data for the month of {selectedMonth}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Live Finalization</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`${isDarkMode ? "bg-white/[0.02]" : "bg-gray-50"}`}>
                                    <th className="px-6 py-6 text-[12px] font-black uppercase tracking-[0.3em] text-gray-500">Window</th>
                                    
                                    <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Phase Target</th>
                                    <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500 text-right">Phase Achieved</th>
                                    
                                    <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-600 text-right">Working Target</th>
                                    <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-400 text-right">Working Achieved</th>
                                    
                                    <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-purple-600 text-right">Weekend Target</th>
                                    <th className="px-4 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-purple-400 text-right">Weekend Achieved</th>
                                    
                                    <th className="px-6 py-6 text-[12px] font-black uppercase tracking-[0.3em] text-gray-500 text-center">Score</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-white/5" : "divide-gray-100"}`}>
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="8" className="px-8 py-8 h-20 bg-white/5" />
                                        </tr>
                                    ))
                                ) : data?.centres.map(c => {
                                    const allDays = c.weeks.flatMap(w => w.days).filter(d => !d.isEmpty && !d.isHidden);
                                    
                                    const getPhaseData = (start, end) => {
                                        const phaseDays = allDays.filter(d => d.day >= start && d.day <= end);
                                        const phaseAchieved = phaseDays.reduce((sum, d) => sum + d.achievedWithGST, 0);
                                        const weekendAchieved = phaseDays.filter(d => d.isWeekend).reduce((sum, d) => sum + d.achievedWithGST, 0);
                                        const workingAchieved = phaseAchieved - weekendAchieved;
                                        
                                        const phaseTarget = (c.monthlyTargetWithGST / c.daysInMonth) * phaseDays.length;
                                        const workingTarget = phaseTarget * 0.40;
                                        const baseWeekendTarget = phaseTarget * 0.60;

                                        // Deficit Calculation
                                        const workingDeficit = Math.max(0, workingTarget - workingAchieved);
                                        const adjustedWeekendTarget = baseWeekendTarget + workingDeficit;
                                        const weekendDeficit = Math.max(0, adjustedWeekendTarget - weekendAchieved);
                                        
                                        const pct = phaseTarget > 0 ? (phaseAchieved / phaseTarget) * 100 : 0;
                                        return { 
                                            phaseAchieved, workingAchieved, weekendAchieved, 
                                            phaseTarget, workingTarget, baseWeekendTarget, 
                                            adjustedWeekendTarget, workingDeficit, weekendDeficit,
                                            pct, label: `${start}-${end} Days` 
                                        };
                                    };

                                    const phases = [
                                        getPhaseData(1, 10),
                                        getPhaseData(11, 20),
                                        getPhaseData(21, 31)
                                    ];

                                    return (
                                        <React.Fragment key={c.centreId}>
                                            <tr className={`${isDarkMode ? "bg-amber-500/10" : "bg-amber-100/50"} border-t-2 border-amber-500/30`}>
                                                <td colSpan="8" className="px-8 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <FaCrown className="text-amber-500" size={20} />
                                                        <span className={`text-lg font-black uppercase tracking-widest ${isDarkMode ? "text-amber-400" : "text-amber-800"}`}>
                                                            {c.centreName} <span className="opacity-30 mx-3">|</span> Monthly: ₹{fmt(c.monthlyTargetWithGST)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {phases.map((p, idx) => (
                                                <tr key={idx} className={`transition-all duration-300 hover:bg-white/[0.06] group`}>
                                                    <td className="px-6 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl ${isDarkMode ? "bg-white/5" : "bg-gray-100"} border ${isDarkMode ? "border-white/10" : "border-gray-200"} flex items-center justify-center text-[10px] font-black text-amber-500`}>
                                                                P{idx + 1}
                                                            </div>
                                                            <p className={`text-sm font-black tracking-tight ${isDarkMode ? "text-white" : "text-gray-900"}`}>{p.label}</p>
                                                        </div>
                                                    </td>
                                                    
                                                    {/* Phase Section */}
                                                    <td className="px-4 py-6 text-right">
                                                        <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>₹{fmt(p.phaseTarget)}</p>
                                                    </td>
                                                    <td className="px-4 py-6 text-right bg-emerald-500/5">
                                                        <p className={`text-[15px] font-black text-emerald-400`}>₹{fmt(p.phaseAchieved)}</p>
                                                    </td>
                                                    
                                                    {/* Working Section */}
                                                    <td className="px-4 py-6 text-right">
                                                        <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>₹{fmt(p.workingTarget)}</p>
                                                    </td>
                                                    <td className="px-4 py-6 text-right bg-cyan-500/5">
                                                        <p className={`text-[15px] font-black text-cyan-400`}>₹{fmt(p.workingAchieved)}</p>
                                                        {p.workingDeficit > 0 && (
                                                            <div className="flex items-center justify-end gap-1.5 text-red-500 mt-1.5 animate-pulse">
                                                                <FaChartLine className="rotate-180" size={12} />
                                                                <span className="text-[12px] font-black">SHORTFALL: -₹{fmt(p.workingDeficit)}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    
                                                    {/* Weekend Section */}
                                                    <td className="px-4 py-6 text-right">
                                                        <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>₹{fmt(p.baseWeekendTarget)}</p>
                                                        {p.workingDeficit > 0 && (
                                                            <div className="flex flex-col items-end mt-1.5 space-y-1">
                                                                <span className="text-[11px] font-black text-amber-400 bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/30 shadow-md">
                                                                    + ₹{fmt(p.workingDeficit)} RECOVERY
                                                                </span>
                                                                <p className="text-[13px] font-black text-amber-500">NEW TARGET: ₹{fmt(p.adjustedWeekendTarget)}</p>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-6 text-right bg-purple-500/5">
                                                        <p className={`text-[15px] font-black text-purple-400`}>₹{fmt(p.weekendAchieved)}</p>
                                                        {p.weekendDeficit > 0 && (
                                                            <div className="flex items-center justify-end gap-1.5 text-red-500 mt-1.5">
                                                                <FaChartLine className="rotate-180" size={12} />
                                                                <span className="text-[12px] font-black">SHORTFALL: -₹{fmt(p.weekendDeficit)}</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="px-6 py-6">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className={`text-base font-black ${p.pct >= 100 ? "text-amber-400" : isDarkMode ? "text-white" : "text-gray-900"}`}>
                                                                {fmtPct(p.pct)}
                                                            </span>
                                                            <div className={`w-24 h-2 rounded-full overflow-hidden ${isDarkMode ? "bg-white/10" : "bg-gray-100"}`}>
                                                                <div 
                                                                    className={`h-full rounded-full bg-gradient-to-r ${p.pct >= 100 ? "from-amber-400 to-orange-500" : "from-cyan-400 to-blue-500"} transition-all duration-1000`} 
                                                                    style={{ width: `${Math.min(p.pct, 100)}%` }} 
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
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
