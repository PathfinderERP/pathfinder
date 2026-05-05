import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSync, FaDownload, FaChartBar, FaTable, FaTh, FaSun, FaMoon } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const TargetAchievementReport = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs
    const [displayMode, setDisplayMode] = useState("chart"); // chart, table, card
    const [sessions, setSessions] = useState([]);
    const { isDarkMode } = useTheme();

    // Filters
    const [viewMode, setViewMode] = useState("Monthly"); // Monthly, Quarterly, Yearly, Custom
    const [filterFinancialYear, setFilterFinancialYear] = useState("");
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterMonth, setFilterMonth] = useState("December"); // Default to current month
    const [filterQuarter, setFilterQuarter] = useState("Q3");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const quarters = ["Q1", "Q2", "Q3", "Q4"];

    useEffect(() => {
        fetchMasterData();
        const currentMonthIndex = new Date().getMonth();
        setFilterMonth(months[currentMonthIndex]);
    }, []);

    useEffect(() => {
        fetchAnalysis();
    }, [viewMode, filterFinancialYear, filterYear, filterMonth, filterQuarter, selectedCentres, startDate, endDate]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centreRes, sessionRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers })
            ]);

            if (centreRes.ok) {
                const resData = await centreRes.json();
                let centerList = Array.isArray(resData) ? resData : resData.centres || [];

                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    if (user.role !== 'superAdmin' && user.centres) {
                        const allowedIds = user.centres.map(id => typeof id === 'object' ? id._id : id);
                        centerList = centerList.filter(c => allowedIds.includes(c._id));
                    }
                }

                const sortedCentres = centerList.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setCentres(sortedCentres);
                if (centerList.length > 0) {
                    setSelectedCentres(centerList.map(c => c._id));
                }
            }

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                const sessionList = (Array.isArray(sessionData) ? sessionData : []).sort((a, b) => (b.sessionName || "").localeCompare(a.sessionName || ""));
                setSessions(sessionList);
                if (sessionList.length > 0 && !filterFinancialYear) {
                    const defaultSession = sessionList.find(s => s.sessionName === "2026-2027");
                    setFilterFinancialYear(defaultSession ? defaultSession.sessionName : sessionList[0].sessionName);
                }
            }
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchAnalysis = async () => {
        if (!filterFinancialYear) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                viewMode,
                financialYear: filterFinancialYear,
                year: filterYear,
                month: filterMonth,
                quarter: filterQuarter,
                centreIds: selectedCentres.join(','),
                startDate,
                endDate
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/target-analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                const sortedData = (result.data || []).sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setData(sortedData);
            } else {
                toast.error("Failed to load report");
            }
        } catch (error) {
            console.error("Error fetching analysis", error);
            toast.error("Failed to load chart data");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data || data.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const wb = XLSX.utils.book_new();
        const reportType = `Report Type: ${viewMode} Target Report`;
        const finYear = `Financial Year: ${filterFinancialYear}`;
        const currentMonth = viewMode === "Monthly" ? `Month: ${filterMonth}` : "";
        const dateRange = viewMode === "Custom" ? `Date Range: ${startDate} to ${endDate}` : "";
        const selectedCentreCount = `Selected Centres: ${selectedCentres.length}`;
        const generatedOn = `Generated on: ${new Date().toLocaleDateString()}`;
        const yearVal = `Year: ${filterYear}`;

        const dataRows = data.map(item => {
            const achievementPct = item.target > 0
                ? ((item.achieved / item.target) * 100).toFixed(2) + "%"
                : "0%";

            return [
                item.centreName,
                filterFinancialYear,
                filterYear,
                item.target,
                item.achieved,
                achievementPct,
                filterMonth
            ];
        });

        const sheetData = [
            [reportType, finYear, yearVal, currentMonth, dateRange, selectedCentreCount, generatedOn],
            [],
            ["Center Name", "Financial Year", "Year", "Target", "Achieved", "Achievement %", "Month"],
            ...dataRows
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        const wscols = [
            { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Target Report");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `Target_Report_${viewMode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const toggleCentre = (id) => {
        if (selectedCentres.includes(id)) {
            setSelectedCentres(selectedCentres.filter(c => c !== id));
        } else {
            setSelectedCentres([...selectedCentres, id]);
        }
    };

    const selectAllCentres = () => {
        if (selectedCentres.length === centres.length) {
            setSelectedCentres([]);
        } else {
            setSelectedCentres(centres.map(c => c._id));
        }
    };

    return (
        <Layout activePage="Sales">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-[2rem] border shadow-2xl transition-all duration-500 ${isDarkMode ? 'bg-blue-600/10 border-blue-500/20 text-blue-400' : 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'}`}>
                            <FaChartBar size={32} />
                        </div>
                        <div>
                            <h1 className={`text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Target <span className="text-blue-600">Achievement</span>
                            </h1>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3 italic flex items-center gap-2">
                                <span className="w-8 h-[1px] bg-blue-600"></span>
                                Comparative performance analytics & tracking
                            </p>
                        </div>
                    </div>

                    <div className={`p-1.5 rounded-2xl border flex gap-1.5 transition-all duration-300 shadow-2xl ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                        {[
                            { id: "chart", icon: <FaChartBar />, label: "Matrix" },
                            { id: "table", icon: <FaTable />, label: "Ledger" },
                            { id: "card", icon: <FaTh />, label: "Grid" }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setDisplayMode(mode.id)}
                                className={`px-6 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 active:scale-95 ${displayMode === mode.id
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                    : `text-gray-500 hover:bg-white/5 ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`
                                    }`}
                            >
                                {mode.icon}
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{mode.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters Section */}
                <div className={`p-8 rounded-[2.5rem] border shadow-2xl transition-all duration-500 mb-10 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* View Mode Tabs */}
                            <div className={`rounded-2xl p-1.5 flex gap-1 transition-all duration-300 ${isDarkMode ? 'bg-[#0a0c0e] border border-gray-800 shadow-inner' : 'bg-gray-100 border border-gray-200'}`}>
                                {["Monthly", "Quarterly", "Yearly", "Custom"].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${viewMode === mode
                                            ? "bg-blue-600 text-white shadow-lg"
                                            : `text-gray-500 hover:bg-white/5 ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'}`
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <select
                                    value={filterFinancialYear}
                                    onChange={(e) => setFilterFinancialYear(e.target.value)}
                                    className={`px-5 py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                >
                                    {sessions.map(s => <option key={s._id} value={s.sessionName} className={isDarkMode ? 'bg-[#0f1215]' : ''}>{s.sessionName}</option>)}
                                </select>

                                {viewMode === "Monthly" && (
                                    <>
                                        <select
                                            value={filterYear}
                                            onChange={(e) => setFilterYear(e.target.value)}
                                            className={`px-5 py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        >
                                            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className={isDarkMode ? 'bg-[#0f1215]' : ''}>{y}</option>)}
                                        </select>
                                        <select
                                            value={filterMonth}
                                            onChange={(e) => setFilterMonth(e.target.value)}
                                            className={`px-5 py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        >
                                            {months.map(m => <option key={m} value={m} className={isDarkMode ? 'bg-[#0f1215]' : ''}>{m}</option>)}
                                        </select>
                                    </>
                                )}

                                {viewMode === "Quarterly" && (
                                    <select
                                        value={filterQuarter}
                                        onChange={(e) => setFilterQuarter(e.target.value)}
                                        className={`px-5 py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] outline-none focus:border-blue-500 transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                    >
                                        {quarters.map(q => <option key={q} value={q} className={isDarkMode ? 'bg-[#0f1215]' : ''}>{q}</option>)}
                                    </select>
                                )}

                                {viewMode === "Custom" && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className={`px-4 py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] outline-none focus:border-blue-500 transition-all [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        />
                                        <span className="text-gray-500 font-black text-[10px]">TO</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className={`px-4 py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] outline-none focus:border-blue-500 transition-all [color-scheme:dark] ${isDarkMode ? 'bg-white/5 border-gray-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900 shadow-inner'}`}
                                        />
                                    </div>
                                )}

                                {/* Centre Selector */}
                                <div className="relative group">
                                    <button className={`px-5 py-3 rounded-xl border font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all ${isDarkMode ? 'bg-white/5 border-gray-800 text-white hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100 shadow-inner'}`}>
                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                        {selectedCentres.length} NODES SELECTED
                                    </button>
                                    <div className={`absolute top-full left-0 mt-3 w-72 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] p-4 hidden group-hover:block z-[100] max-h-80 overflow-y-auto border backdrop-blur-xl transition-all duration-500 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-[#1a1f24]/95 border-gray-700' : 'bg-white/95 border-gray-200'}`}>
                                        <div
                                            onClick={selectAllCentres}
                                            className={`p-3 cursor-pointer text-[10px] font-black uppercase tracking-widest border-b mb-2 transition-all text-center rounded-xl ${isDarkMode ? 'hover:bg-blue-500/10 border-gray-800 text-blue-400' : 'hover:bg-blue-50 border-gray-100 text-blue-600'}`}
                                        >
                                            {selectedCentres.length === centres.length ? "De-sync All Nodes" : "Sync All Active Nodes"}
                                        </div>
                                        {centres.map(c => (
                                            <div
                                                key={c._id}
                                                onClick={() => toggleCentre(c._id)}
                                                className={`flex items-center gap-3 p-3 cursor-pointer transition-all rounded-xl ${isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCentres.includes(c._id)}
                                                    readOnly
                                                    className="accent-blue-600 w-4 h-4"
                                                />
                                                <span className="text-[11px] font-bold uppercase tracking-tight truncate">{c.centreName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 flex items-center gap-3 shadow-[0_15px_30px_-10px_rgba(16,185,129,0.3)] active:scale-95 group"
                            onClick={handleExport}
                        >
                            <FaDownload className="group-hover:translate-y-0.5 transition-transform" /> 
                            Secure Data Export
                        </button>
                    </div>
                </div>

                {/* View Content */}
                <div className={`p-10 rounded-[3rem] border shadow-2xl transition-all duration-500 min-h-[600px] relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-10 bg-blue-600 rounded-full"></div>
                            <h3 className={`font-black italic uppercase tracking-tighter text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Target vs <span className="text-blue-600">Achieved</span> Analysis
                            </h3>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                            {viewMode} NODE SYNC
                        </div>
                    </div>

                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent backdrop-blur-sm z-10">
                            <div className="relative w-20 h-20">
                                <div className="absolute inset-0 border-4 border-blue-600/10 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                            <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-[10px] mt-8 animate-pulse italic">Interrogating Ledger Matrices...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex h-[400px] items-center justify-center flex-col gap-8 opacity-40">
                            <FaChartBar size={80} className={isDarkMode ? 'text-gray-700' : 'text-gray-200'} />
                            <p className="uppercase tracking-[0.4em] text-[10px] font-black italic">No operational data detected for this sector</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-700">
                            {displayMode === "chart" && (
                                <div className="h-[600px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            layout="vertical"
                                            data={data}
                                            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDarkMode ? '#ffffff' : '#000000'} opacity={0.05} />
                                            <XAxis 
                                                type="number" 
                                                tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                                                axisLine={{ stroke: isDarkMode ? '#334155' : '#e2e8f0' }} 
                                                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} 
                                            />
                                            <YAxis
                                                dataKey="centreName"
                                                type="category"
                                                width={150}
                                                tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#94a3b8' : '#475569', textAnchor: 'end' }}
                                                axisLine={{ stroke: isDarkMode ? '#334155' : '#e2e8f0' }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                                    border: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                                                    borderRadius: '20px',
                                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                                    padding: '20px',
                                                    fontFamily: 'inherit'
                                                }}
                                                itemStyle={{ fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                                labelStyle={{ fontWeight: 900, color: isDarkMode ? '#f1f5f9' : '#0f172a', marginBottom: '10px', fontSize: '13px', fontStyle: 'italic', textTransform: 'uppercase' }}
                                                formatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
                                                cursor={{ fill: isDarkMode ? '#ffffff' : '#000000', opacity: 0.03 }}
                                            />
                                            <Legend 
                                                verticalAlign="top" 
                                                align="right" 
                                                height={50} 
                                                iconType="circle" 
                                                wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }} 
                                            />
                                            <Bar dataKey="target" name="Projected Target" fill="#6366f1" barSize={12} radius={[0, 10, 10, 0]} />
                                            <Bar dataKey="achieved" name="Actual Achievement" fill="#10b981" barSize={12} radius={[0, 10, 10, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {displayMode === "table" && (
                                <div className={`overflow-x-auto rounded-[2rem] border shadow-inner ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100'}`}>
                                                <th className="p-8">Operational Node</th>
                                                <th className="p-8 text-right">Target Quota</th>
                                                <th className="p-8 text-right">Actual Realized</th>
                                                <th className="p-8 text-center">Efficiency %</th>
                                                <th className="p-8 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                            {data.map((item, idx) => {
                                                const pct = item.target > 0 ? (item.achieved / item.target) * 100 : 0;
                                                return (
                                                    <tr key={idx} className={`transition-all duration-300 group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-white'}`}>
                                                        <td className="p-8">
                                                            <div>
                                                                <span className={`font-black text-base italic uppercase tracking-tighter block ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.centreName}</span>
                                                                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1 block">NODE ID: {item.centreId?.slice(-6).toUpperCase() || 'SYS-NODE'}</span>
                                                            </div>
                                                        </td>
                                                        <td className={`p-8 text-right font-black tabular-nums text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>₹{item.target.toLocaleString('en-IN')}</td>
                                                        <td className={`p-8 text-right font-black tabular-nums text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{item.achieved.toLocaleString('en-IN')}</td>
                                                        <td className="p-8 text-center">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <span className={`text-[11px] font-black tabular-nums ${pct >= 100 ? 'text-emerald-500' : pct >= 50 ? 'text-blue-500' : 'text-rose-500'}`}>
                                                                    {pct.toFixed(2)}%
                                                                </span>
                                                                <div className={`w-32 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200 shadow-inner'}`}>
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-600' : 'bg-rose-600'}`}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-8 text-center">
                                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${pct >= 100 
                                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                            }`}>
                                                                {pct >= 100 ? 'Target Achieved' : 'In Progress'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {displayMode === "card" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {data.map((item, idx) => {
                                        const pct = item.target > 0 ? (item.achieved / item.target) * 100 : 0;
                                        return (
                                            <div key={idx} className={`rounded-[2rem] border p-8 transition-all duration-500 group hover:-translate-y-2 shadow-xl ${isDarkMode ? 'bg-white/5 border-gray-800 hover:bg-white/10 hover:border-blue-500/30' : 'bg-white border-gray-200 hover:shadow-blue-500/10 hover:border-blue-500/30 shadow-sm'}`}>
                                                <div className="flex justify-between items-start mb-8">
                                                    <h4 className={`font-black italic uppercase tracking-tighter text-sm flex-1 leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.centreName}</h4>
                                                    <div className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest tabular-nums ${pct >= 100 ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'}`}>
                                                        {pct.toFixed(0)}%
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Target Quota</div>
                                                        <div className={`text-sm font-black tabular-nums ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>₹{item.target.toLocaleString('en-IN')}</div>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Realized</div>
                                                        <div className={`text-xl font-black tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{item.achieved.toLocaleString('en-IN')}</div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-[#0a0c0e] shadow-inner' : 'bg-gray-100 shadow-inner'}`}>
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-gradient-to-r from-emerald-600 to-teal-400' : 'bg-gradient-to-r from-blue-600 to-indigo-500'}`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default TargetAchievementReport;

