import React, { useState, useEffect, useRef, useMemo } from "react";
import Layout from "../../components/Layout";
import {
    FaFilter,
    FaSync,
    FaDownload,
    FaSun,
    FaMoon,
    FaChartLine,
    FaCalendarAlt,
    FaBuilding,
    FaUserGraduate,
    FaRupeeSign,
    FaLayerGroup,
    FaArrowUp,
    FaArrowDown,
    FaSearch
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";

const standardMonths = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March"
];

const CentreComparisonAnalysis = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === "dark";

    // Master Filters State
    const [centres, setCentres] = useState([]);
    const [zones, setZones] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);

    // View Modes: "month" | "year" | "day"
    const [viewMode, setViewMode] = useState("month");

    // Metric Mode: "revenue" | "admissions" | "both"
    const [metricMode, setMetricMode] = useState("both");

    // Month Selector: Default to current month
    const currentMonthName = useMemo(() => {
        const d = new Date();
        const m = d.toLocaleString("en-US", { month: "long" });
        return standardMonths.includes(m) ? m : "September";
    }, []);
    const [selectedMonths, setSelectedMonths] = useState([currentMonthName]);

    // Day Mode Selector: Default to today in IST
    const [selectedDate, setSelectedDate] = useState(() => {
        return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    });

    // Search term
    const [searchTerm, setSearchTerm] = useState("");

    // Data State
    const [loading, setLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState(null);
    const reqVersionRef = useRef(0);

    // Initial Load: Master Data
    useEffect(() => {
        fetchMasterData();
    }, []);

    // Re-fetch Data whenever filter or view parameters change
    useEffect(() => {
        fetchCentreComparisonData();
    }, [
        viewMode,
        selectedMonths,
        selectedDate,
        selectedCentres,
        selectedZones
    ]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, zRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/zone`, { headers })
            ]);

            if (cRes.ok) {
                const cData = await cRes.json();
                const list = Array.isArray(cData) ? cData : (cData.data || []);
                setCentres(list.filter(c => c.status !== "deactive" && !c.centreName?.match(/phsps|franchise|rkm/i)));
            }

            if (zRes.ok) {
                const zData = await zRes.json();
                const zList = Array.isArray(zData) ? zData : (zData.data || zData.zones || []);
                setZones(zList.filter(z => z.isActive !== false));
            }
        } catch (error) {
            console.error("Error loading master data:", error);
        }
    };

    const fetchCentreComparisonData = async () => {
        setLoading(true);
        const version = ++reqVersionRef.current;
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const params = new URLSearchParams();
            params.set("viewMode", viewMode);

            if (viewMode === "month") {
                if (selectedMonths.length > 0) {
                    params.set("months", selectedMonths.join(","));
                }
            } else if (viewMode === "day") {
                params.set("selectedDate", selectedDate);
            }

            if (selectedCentres.length > 0) {
                params.set("centreIds", selectedCentres.join(","));
            }
            if (selectedZones.length > 0) {
                params.set("zoneIds", selectedZones.join(","));
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/sales/centre-comparison-analysis?${params.toString()}`,
                { headers }
            );

            if (response.ok) {
                const data = await response.json();
                if (version === reqVersionRef.current) {
                    setAnalysisData(data);
                }
            } else {
                toast.error("Failed to load centre comparison data");
            }
        } catch (error) {
            console.error("Error fetching centre comparison analysis:", error);
            toast.error("Network error loading comparison analysis");
        } finally {
            if (version === reqVersionRef.current) {
                setLoading(false);
            }
        }
    };

    // Filtered departments based on user multi-select
    const activeDepartments = useMemo(() => {
        if (!analysisData?.departments) return [];
        if (selectedDepartments.length === 0) return analysisData.departments;
        return analysisData.departments.filter(d => selectedDepartments.includes(d));
    }, [analysisData?.departments, selectedDepartments]);

    // Filtered Rows by search input
    const filteredRows = useMemo(() => {
        if (!analysisData?.rows) return [];
        if (!searchTerm.trim()) return analysisData.rows;
        const q = searchTerm.toLowerCase();
        return analysisData.rows.filter(
            r => r.centre.toLowerCase().includes(q) || (r.zone && r.zone.toLowerCase().includes(q))
        );
    }, [analysisData?.rows, searchTerm]);

    // Footer Totals Calculation
    const footerTotals = useMemo(() => {
        if (!filteredRows || filteredRows.length === 0) return null;

        const revCurr = filteredRows.reduce((s, r) => s + (r.revenueCurrent || 0), 0);
        const revPrev = filteredRows.reduce((s, r) => s + (r.revenuePrevious || 0), 0);
        const revGrowth = revPrev > 0 ? Number((((revCurr - revPrev) / revPrev) * 100).toFixed(1)) : (revCurr > 0 ? 100 : 0);

        const admCurr = filteredRows.reduce((s, r) => s + (r.admissionsCurrent || 0), 0);
        const admPrev = filteredRows.reduce((s, r) => s + (r.admissionsPrevious || 0), 0);
        const admGrowth = admPrev > 0 ? Number((((admCurr - admPrev) / admPrev) * 100).toFixed(1)) : (admCurr > 0 ? 100 : 0);

        const deptRev = {};
        const deptAdm = {};

        activeDepartments.forEach(d => {
            deptRev[d] = filteredRows.reduce((s, r) => s + (r.deptRevenueCurrent?.[d] || 0), 0);
            deptAdm[d] = filteredRows.reduce((s, r) => s + (r.deptAdmissionsCurrent?.[d] || 0), 0);
        });

        return {
            revCurr,
            revPrev,
            revGrowth,
            admCurr,
            admPrev,
            admGrowth,
            deptRev,
            deptAdm
        };
    }, [filteredRows, activeDepartments]);

    // Export Excel Handler
    const handleExportExcel = () => {
        if (!filteredRows || filteredRows.length === 0) {
            toast.warning("No data to export");
            return;
        }

        const excelRows = filteredRows.map(r => {
            const rowObj = {
                "Centre": r.centre,
                "Zone": r.zone || "General Zone",
                "Total Revenue (₹)": r.revenueCurrent,
                "Prev Revenue (₹)": r.revenuePrevious,
                "Revenue Growth %": `${r.revenueGrowth}%`,
                "Total Admissions": r.admissionsCurrent,
                "Prev Admissions": r.admissionsPrevious,
                "Admissions Growth %": `${r.admissionsGrowth}%`
            };

            activeDepartments.forEach(d => {
                rowObj[`${d} (Rev ₹)`] = r.deptRevenueCurrent?.[d] || 0;
                rowObj[`${d} (Adm)`] = r.deptAdmissionsCurrent?.[d] || 0;
            });

            return rowObj;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Centre Comparison");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(dataBlob, `Centre_Comparison_Analysis_${viewMode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success("Excel report exported successfully");
    };

    return (
        <Layout>
            <div className={`p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
                
                {/* 1. Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Sales & Analytics
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs font-semibold text-slate-400">Department-wise Matrix</span>
                        </div>
                        <h1 className={`text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                                <FaBuilding className="text-lg" />
                            </div>
                            Centre Comparison Analysis
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">
                            Multi-Dimensional Centre-Wise Comparison across Revenue (₹) & Admissions Broken Down by Department
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-2 ${
                                isDarkMode
                                    ? "bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
                            }`}
                            title="Toggle Light/Dark"
                        >
                            {isDarkMode ? <FaSun className="text-sm" /> : <FaMoon className="text-sm" />}
                        </button>

                        <button
                            onClick={fetchCentreComparisonData}
                            className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-2 ${
                                isDarkMode
                                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
                            }`}
                        >
                            <FaSync className={`text-sm ${loading ? "animate-spin text-cyan-400" : ""}`} />
                            <span>Refresh</span>
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                        >
                            <FaDownload />
                            <span>Export Excel</span>
                        </button>
                    </div>
                </div>

                {/* 2. Primary Navigation: Mode Tabs (Month / Year / Day) & Metric Toggle */}
                <div className={`p-4 rounded-2xl border mb-6 flex flex-wrap items-center justify-between gap-4 ${
                    isDarkMode ? "bg-slate-900/60 border-slate-800/80 shadow-inner" : "bg-white border-slate-200 shadow-sm"
                }`}>
                    {/* Time Intervals Segmented Control */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                            <FaCalendarAlt className="text-cyan-400" /> Mode:
                        </span>
                        {[
                            { key: "month", label: "Month Wise" },
                            { key: "year", label: "Year Wise" },
                            { key: "day", label: "Day Wise" }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setViewMode(tab.key)}
                                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all ${
                                    viewMode === tab.key
                                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25"
                                        : isDarkMode
                                            ? "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                                            : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Metric Toggle Segmented Control */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                            <FaLayerGroup className="text-emerald-400" /> View Metric:
                        </span>
                        {[
                            { key: "both", label: "Combined (Both)" },
                            { key: "revenue", label: "Revenue (₹)" },
                            { key: "admissions", label: "Admissions (Count)" }
                        ].map(m => (
                            <button
                                key={m.key}
                                onClick={() => setMetricMode(m.key)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    metricMode === m.key
                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                        : isDarkMode
                                            ? "bg-slate-800/40 text-slate-400 border border-transparent hover:bg-slate-800"
                                            : "bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200"
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Filter Controls Bar */}
                <div className={`p-4 rounded-2xl border mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 items-center ${
                    isDarkMode ? "bg-slate-900/40 border-slate-800/60" : "bg-white border-slate-200 shadow-sm"
                }`}>
                    {/* Time Selector based on Mode */}
                    {viewMode === "month" && (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                                Select Month(s)
                            </label>
                            <CustomMultiSelect
                                options={standardMonths.map(m => ({ value: m, label: m }))}
                                selectedValues={selectedMonths}
                                onChange={setSelectedMonths}
                                placeholder="Choose Months..."
                                isDarkMode={isDarkMode}
                            />
                        </div>
                    )}

                    {viewMode === "day" && (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                                Select Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors outline-none ${
                                    isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white focus:border-cyan-400"
                                        : "bg-slate-50 border-slate-300 text-slate-800 focus:border-cyan-600"
                                }`}
                            />
                        </div>
                    )}

                    {viewMode === "year" && (
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                                Financial Year
                            </label>
                            <div className={`px-3 py-2 rounded-xl text-xs font-black border ${
                                isDarkMode ? "bg-slate-800/80 border-slate-700 text-cyan-400" : "bg-slate-100 border-slate-300 text-cyan-700"
                            }`}>
                                FY 2026-27 vs FY 2025-26
                            </div>
                        </div>
                    )}

                    {/* Zone Filter */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                            Zone Filter
                        </label>
                        <CustomMultiSelect
                            options={zones.map(z => ({ value: z._id, label: z.name }))}
                            selectedValues={selectedZones}
                            onChange={setSelectedZones}
                            placeholder="All Zones..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* Centre Filter */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                            Centre Filter
                        </label>
                        <CustomMultiSelect
                            options={centres.map(c => ({ value: c.centreName.toUpperCase(), label: c.centreName }))}
                            selectedValues={selectedCentres}
                            onChange={setSelectedCentres}
                            placeholder="All Active Centres..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* Department Columns Filter */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                            Department Columns
                        </label>
                        <CustomMultiSelect
                            options={(analysisData?.departments || []).map(d => ({ value: d, label: d }))}
                            selectedValues={selectedDepartments}
                            onChange={setSelectedDepartments}
                            placeholder="All Departments..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* Quick Search */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                            Quick Search
                        </label>
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search centre / zone..."
                                className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs font-medium border transition-colors outline-none ${
                                    isDarkMode
                                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400"
                                        : "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-cyan-600"
                                }`}
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Top KPI Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Revenue Card */}
                    <div className={`p-4 rounded-2xl border relative overflow-hidden ${
                        isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                Total Revenue
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                                <FaRupeeSign className="text-sm" />
                            </div>
                        </div>
                        <div className="text-2xl font-black tracking-tight text-emerald-400">
                            ₹{Number(analysisData?.summary?.totalRevenueCurrent || 0).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className="text-slate-400">
                                Prev: ₹{Number(analysisData?.summary?.totalRevenuePrevious || 0).toLocaleString()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                (analysisData?.summary?.overallRevenueGrowth || 0) >= 0
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-rose-500/10 text-rose-400"
                            }`}>
                                {(analysisData?.summary?.overallRevenueGrowth || 0) >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                                {analysisData?.summary?.overallRevenueGrowth || 0}%
                            </span>
                        </div>
                    </div>

                    {/* Admissions Card */}
                    <div className={`p-4 rounded-2xl border relative overflow-hidden ${
                        isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                Total Admissions
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                                <FaUserGraduate className="text-sm" />
                            </div>
                        </div>
                        <div className="text-2xl font-black tracking-tight text-cyan-400">
                            {Number(analysisData?.summary?.totalAdmissionsCurrent || 0).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <span className="text-slate-400">
                                Prev: {Number(analysisData?.summary?.totalAdmissionsPrevious || 0).toLocaleString()}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                (analysisData?.summary?.overallAdmissionsGrowth || 0) >= 0
                                    ? "bg-cyan-500/10 text-cyan-400"
                                    : "bg-rose-500/10 text-rose-400"
                            }`}>
                                {(analysisData?.summary?.overallAdmissionsGrowth || 0) >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                                {analysisData?.summary?.overallAdmissionsGrowth || 0}%
                            </span>
                        </div>
                    </div>

                    {/* Top Centre by Revenue */}
                    <div className={`p-4 rounded-2xl border relative overflow-hidden ${
                        isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                Top Centre (Revenue)
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                                <FaBuilding className="text-sm" />
                            </div>
                        </div>
                        <div className="text-lg font-black tracking-tight truncate text-amber-400">
                            {analysisData?.summary?.topCentreRevenue?.name || "N/A"}
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                            ₹{Number(analysisData?.summary?.topCentreRevenue?.value || 0).toLocaleString()} generated
                        </div>
                    </div>

                    {/* Top Department */}
                    <div className={`p-4 rounded-2xl border relative overflow-hidden ${
                        isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                Top Department
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                                <FaLayerGroup className="text-sm" />
                            </div>
                        </div>
                        <div className="text-lg font-black tracking-tight truncate text-purple-400">
                            {analysisData?.summary?.topDeptRevenue?.name || "N/A"}
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                            ₹{Number(analysisData?.summary?.topDeptRevenue?.value || 0).toLocaleString()} generated
                        </div>
                    </div>
                </div>

                {/* 5. Matrix Comparison Table */}
                <div className={`rounded-2xl border overflow-hidden shadow-xl ${
                    isDarkMode ? "bg-slate-900/70 border-slate-800/80" : "bg-white border-slate-200"
                }`}>
                    <div className="overflow-x-auto max-h-[650px] scrollbar-thin scrollbar-thumb-slate-700">
                        <table className="w-full text-left text-xs border-collapse">
                            {/* Table Header */}
                            <thead className={`sticky top-0 z-20 font-black uppercase tracking-wider ${
                                isDarkMode ? "bg-slate-950/95 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}>
                                <tr className="border-b border-slate-800/50">
                                    <th className="p-3.5 min-w-[200px] sticky left-0 z-30 bg-inherit border-r border-slate-800/30">
                                        Centre / Location
                                    </th>
                                    <th className="p-3.5 min-w-[120px]">Zone</th>

                                    {/* Overall Totals Column(s) */}
                                    {(metricMode === "revenue" || metricMode === "both") && (
                                        <th className="p-3.5 text-right min-w-[150px] bg-emerald-500/5 text-emerald-400 border-l border-emerald-500/20">
                                            Total Revenue (₹)
                                        </th>
                                    )}
                                    {(metricMode === "admissions" || metricMode === "both") && (
                                        <th className="p-3.5 text-right min-w-[130px] bg-cyan-500/5 text-cyan-400 border-l border-cyan-500/20">
                                            Total Admissions
                                        </th>
                                    )}

                                    {/* Department Columns */}
                                    {activeDepartments.map(dept => (
                                        <th
                                            key={dept}
                                            className="p-3.5 text-center min-w-[120px] border-l border-slate-800/20"
                                        >
                                            <div className="font-extrabold truncate">{dept}</div>
                                            <div className="text-[10px] font-normal text-slate-400 capitalize">
                                                {metricMode === "revenue"
                                                    ? "Rev (₹)"
                                                    : metricMode === "admissions"
                                                        ? "Admissions"
                                                        : "Rev / Adm"}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Table Body */}
                            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/40 text-slate-300" : "divide-slate-200 text-slate-700"}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4 + activeDepartments.length} className="py-24 text-center">
                                            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                            <p className="text-xs font-bold text-slate-400">Loading Centre Comparison Data...</p>
                                        </td>
                                    </tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={4 + activeDepartments.length} className="py-24 text-center">
                                            <FaBuilding className="text-4xl text-slate-600 mx-auto mb-3" />
                                            <h3 className="text-sm font-bold text-slate-300">No Centre Records Found</h3>
                                            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map(row => (
                                        <tr
                                            key={row.centre}
                                            className={`transition-colors hover:bg-cyan-500/5 ${
                                                isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                                            }`}
                                        >
                                            {/* Centre Name (Sticky Left) */}
                                            <td className={`p-3.5 font-bold sticky left-0 z-10 border-r border-slate-800/20 ${
                                                isDarkMode ? "bg-slate-900/90 text-white" : "bg-white text-slate-900"
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                                    <span className="truncate">{row.centre}</span>
                                                </div>
                                            </td>

                                            {/* Zone */}
                                            <td className="p-3.5">
                                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800/60 text-slate-400 border border-slate-700/50">
                                                    {row.zone || "General Zone"}
                                                </span>
                                            </td>

                                            {/* Overall Revenue */}
                                            {(metricMode === "revenue" || metricMode === "both") && (
                                                <td className="p-3.5 text-right font-black border-l border-emerald-500/10">
                                                    <div className="text-emerald-400">
                                                        ₹{Number(row.revenueCurrent || 0).toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-end gap-1 mt-0.5">
                                                        <span>Prev: ₹{Number(row.revenuePrevious || 0).toLocaleString()}</span>
                                                        <span className={row.revenueGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                                            ({row.revenueGrowth >= 0 ? "+" : ""}{row.revenueGrowth}%)
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {/* Overall Admissions */}
                                            {(metricMode === "admissions" || metricMode === "both") && (
                                                <td className="p-3.5 text-right font-black border-l border-cyan-500/10">
                                                    <div className="text-cyan-400">
                                                        {Number(row.admissionsCurrent || 0).toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-semibold flex items-center justify-end gap-1 mt-0.5">
                                                        <span>Prev: {Number(row.admissionsPrevious || 0).toLocaleString()}</span>
                                                        <span className={row.admissionsGrowth >= 0 ? "text-cyan-400" : "text-rose-400"}>
                                                            ({row.admissionsGrowth >= 0 ? "+" : ""}{row.admissionsGrowth}%)
                                                        </span>
                                                    </div>
                                                </td>
                                            )}

                                            {/* Department Cells */}
                                            {activeDepartments.map(dept => {
                                                const revVal = row.deptRevenueCurrent?.[dept] || 0;
                                                const admVal = row.deptAdmissionsCurrent?.[dept] || 0;

                                                return (
                                                    <td
                                                        key={dept}
                                                        className="p-3.5 text-center border-l border-slate-800/10 font-bold"
                                                    >
                                                        {metricMode === "revenue" && (
                                                            <span className={revVal > 0 ? "text-emerald-400" : "text-slate-600"}>
                                                                {revVal > 0 ? `₹${revVal.toLocaleString()}` : "—"}
                                                            </span>
                                                        )}

                                                        {metricMode === "admissions" && (
                                                            <span className={admVal > 0 ? "text-cyan-400" : "text-slate-600"}>
                                                                {admVal > 0 ? admVal : "—"}
                                                            </span>
                                                        )}

                                                        {metricMode === "both" && (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className={revVal > 0 ? "text-emerald-400 text-xs font-black" : "text-slate-600 text-xs"}>
                                                                    {revVal > 0 ? `₹${revVal.toLocaleString()}` : "—"}
                                                                </span>
                                                                <span className={admVal > 0 ? "text-cyan-400 text-[10px] font-semibold" : "text-slate-600 text-[10px]"}>
                                                                    {admVal > 0 ? `${admVal} Adm` : ""}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>

                            {/* Table Footer: Column Totals */}
                            {footerTotals && !loading && (
                                <tfoot className={`sticky bottom-0 z-20 font-black border-t-2 border-slate-700 ${
                                    isDarkMode ? "bg-slate-950/95 text-white" : "bg-slate-100 text-slate-900"
                                }`}>
                                    <tr>
                                        <td className={`p-3.5 sticky left-0 z-30 uppercase tracking-wider border-r border-slate-800/20 ${
                                            isDarkMode ? "bg-slate-950 text-cyan-400" : "bg-slate-100 text-cyan-700"
                                        }`}>
                                            Grand Total ({filteredRows.length} Centres)
                                        </td>
                                        <td className="p-3.5 text-slate-500">—</td>

                                        {/* Total Revenue Footer */}
                                        {(metricMode === "revenue" || metricMode === "both") && (
                                            <td className="p-3.5 text-right font-black text-emerald-400 border-l border-emerald-500/20">
                                                <div>₹{footerTotals.revCurr.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    Prev: ₹{footerTotals.revPrev.toLocaleString()} ({footerTotals.revGrowth}%)
                                                </div>
                                            </td>
                                        )}

                                        {/* Total Admissions Footer */}
                                        {(metricMode === "admissions" || metricMode === "both") && (
                                            <td className="p-3.5 text-right font-black text-cyan-400 border-l border-cyan-500/20">
                                                <div>{footerTotals.admCurr.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    Prev: {footerTotals.admPrev.toLocaleString()} ({footerTotals.admGrowth}%)
                                                </div>
                                            </td>
                                        )}

                                        {/* Department Totals */}
                                        {activeDepartments.map(dept => {
                                            const totRev = footerTotals.deptRev[dept] || 0;
                                            const totAdm = footerTotals.deptAdm[dept] || 0;

                                            return (
                                                <td key={dept} className="p-3.5 text-center border-l border-slate-800/20 font-black">
                                                    {metricMode === "revenue" && (
                                                        <span className="text-emerald-400">
                                                            {totRev > 0 ? `₹${totRev.toLocaleString()}` : "0"}
                                                        </span>
                                                    )}
                                                    {metricMode === "admissions" && (
                                                        <span className="text-cyan-400">
                                                            {totAdm > 0 ? totAdm : "0"}
                                                        </span>
                                                    )}
                                                    {metricMode === "both" && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-emerald-400 text-xs">
                                                                {totRev > 0 ? `₹${totRev.toLocaleString()}` : "0"}
                                                            </span>
                                                            <span className="text-cyan-400 text-[10px]">
                                                                {totAdm > 0 ? `${totAdm} Adm` : "0"}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CentreComparisonAnalysis;
