import React, { useState, useEffect, useRef, useMemo } from "react";
import Layout from "../../components/Layout";
import {
    FaFilter,
    FaSync,
    FaDownload,
    FaUserSlash,
    FaCalendarAlt,
    FaSearch,
    FaTimes,
    FaBuilding,
    FaLayerGroup,
    FaClock,
    FaCalendarCheck,
    FaExclamationTriangle,
    FaArrowRight,
    FaFileExcel,
    FaFileCsv,
    FaUserCheck,
    FaPercent,
    FaChartPie
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";

const monthOptions = [
    { value: "April", label: "April" },
    { value: "May", label: "May" },
    { value: "June", label: "June" },
    { value: "July", label: "July" },
    { value: "August", label: "August" },
    { value: "September", label: "September" },
    { value: "October", label: "October" },
    { value: "November", label: "November" },
    { value: "December", label: "December" },
    { value: "January", label: "January" },
    { value: "February", label: "February" },
    { value: "March", label: "March" }
];

const DeactivatedAnalysis = () => {
    const { theme } = useTheme();
    const isDark = theme === "dark";

    // Master Filters & Options
    const [centres, setCentres] = useState([]);
    const [zones, setZones] = useState([]);

    // Selections
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Date Presets & Modes
    // 'thisMonth' | 'previousMonth' | 'thisYear' | 'previousYear' | 'dateWise' | 'monthWise' | 'custom' | 'all'
    const [preset, setPreset] = useState("thisMonth");
    const [dateBasis, setDateBasis] = useState("deactivationDate"); // 'deactivationDate' | 'admissionDate'

    // Specific Date Inputs
    const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toLocaleString("en-US", { month: "long" }));
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Data State
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        summary: {
            totalAdmitted: 0,
            totalDeactivated: 0,
            rate: 0,
            thisMonthAdmitted: 0,
            thisMonthDeactivated: 0,
            thisMonthRate: 0,
            prevMonthAdmitted: 0,
            prevMonthDeactivated: 0,
            prevMonthRate: 0,
            thisYearAdmitted: 0,
            thisYearDeactivated: 0,
            thisYearRate: 0,
            prevYearAdmitted: 0,
            prevYearDeactivated: 0,
            prevYearRate: 0,
            topCentre: { name: "N/A", deactivated: 0, admitted: 0, rate: 0 },
            topDepartment: { name: "N/A", deactivated: 0, admitted: 0, rate: 0 }
        },
        departments: [],
        rows: [],
        columnTotals: {},
        grandTotalAdmitted: 0,
        grandTotalDeactivated: 0,
        grandTotalRate: 0,
        filterMeta: { label: "This Month" }
    });

    // Drill-Down Modal State
    const [drillDownModal, setDrillDownModal] = useState({
        isOpen: false,
        centre: "",
        department: "",
        loading: false,
        students: []
    });
    const [modalSearch, setModalSearch] = useState("");

    const reqVersionRef = useRef(0);

    // Initial Load
    useEffect(() => {
        fetchMasterData();
    }, []);

    // Main Data Fetch Trigger
    useEffect(() => {
        fetchAnalysisData();
    }, [
        preset,
        dateBasis,
        selectedDate,
        selectedMonth,
        selectedYear,
        customStartDate,
        customEndDate,
        selectedCentres,
        selectedZones,
        selectedDepartments
    ]);

    // Fetch Centres, Zones
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

    // Main Matrix Fetch
    const fetchAnalysisData = async () => {
        setLoading(true);
        const version = ++reqVersionRef.current;

        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            params.append("preset", preset);
            params.append("dateBasis", dateBasis);

            if (preset === "dateWise" && selectedDate) {
                params.append("selectedDate", selectedDate);
            } else if (preset === "monthWise") {
                if (selectedMonth) params.append("month", selectedMonth);
                if (selectedYear) params.append("year", selectedYear);
            } else if (preset === "custom") {
                if (customStartDate) params.append("startDate", customStartDate);
                if (customEndDate) params.append("endDate", customEndDate);
            }

            if (selectedCentres.length > 0) {
                params.append("centres", selectedCentres.join(","));
            }
            if (selectedZones.length > 0) {
                params.append("zones", selectedZones.join(","));
            }
            if (selectedDepartments.length > 0) {
                params.append("departments", selectedDepartments.join(","));
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/deactivated-analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (version !== reqVersionRef.current) return;

            if (response.ok) {
                const data = await response.json();
                setReportData(data);
            } else {
                toast.error("Failed to load deactivated analysis data");
            }
        } catch (error) {
            if (version === reqVersionRef.current) {
                console.error("Error fetching deactivated analysis:", error);
                toast.error("Network error while fetching analysis");
            }
        } finally {
            if (version === reqVersionRef.current) {
                setLoading(false);
            }
        }
    };

    // Open Drill-Down Student List
    const handleCellClick = async (centre, department = "All") => {
        setDrillDownModal({
            isOpen: true,
            centre,
            department,
            loading: true,
            students: []
        });
        setModalSearch("");

        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (centre && centre !== "Total") params.append("centre", centre);
            if (department && department !== "All" && department !== "Total") params.append("department", department);

            params.append("preset", preset);
            params.append("dateBasis", dateBasis);

            if (preset === "dateWise" && selectedDate) {
                params.append("selectedDate", selectedDate);
            } else if (preset === "monthWise") {
                if (selectedMonth) params.append("month", selectedMonth);
                if (selectedYear) params.append("year", selectedYear);
            } else if (preset === "custom") {
                if (customStartDate) params.append("startDate", customStartDate);
                if (customEndDate) params.append("endDate", customEndDate);
            }

            const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/deactivated-analysis/students?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setDrillDownModal(prev => ({
                    ...prev,
                    loading: false,
                    students: data.students || []
                }));
            } else {
                setDrillDownModal(prev => ({ ...prev, loading: false }));
                toast.error("Could not fetch student details");
            }
        } catch (err) {
            console.error("Error loading drilldown:", err);
            setDrillDownModal(prev => ({ ...prev, loading: false }));
        }
    };

    // Filtered Table Rows by Search Query
    const displayedRows = useMemo(() => {
        if (!reportData.rows) return [];
        if (!searchQuery.trim()) return reportData.rows;
        const q = searchQuery.toLowerCase().trim();
        return reportData.rows.filter(r =>
            (r.centre || "").toLowerCase().includes(q) ||
            (r.zone || "").toLowerCase().includes(q)
        );
    }, [reportData.rows, searchQuery]);

    // Export Matrix to Excel
    const handleExportExcel = () => {
        if (!reportData.rows || reportData.rows.length === 0) {
            toast.warn("No data available to export");
            return;
        }

        const depts = reportData.departments || [];
        const headers = ["Centre", "Zone", "Total Admitted", "Total Deactivated", "Deactivation Rate (%)", ...depts, "Total Deactivated"];

        const rowsData = displayedRows.map(r => {
            const rowArr = [
                r.centre,
                r.zone,
                r.admitted || 0,
                r.deactivated || 0,
                `${r.percentage || 0}%`
            ];
            depts.forEach(d => {
                rowArr.push(r.counts[d] || 0);
            });
            rowArr.push(r.total || 0);
            return rowArr;
        });

        // Totals Row
        const totalRow = [
            "TOTAL",
            "All Zones",
            reportData.grandTotalAdmitted || 0,
            reportData.grandTotalDeactivated || 0,
            `${reportData.grandTotalRate || 0}%`
        ];
        depts.forEach(d => {
            totalRow.push(reportData.columnTotals[d] || 0);
        });
        totalRow.push(reportData.grandTotalDeactivated || 0);
        rowsData.push(totalRow);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rowsData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Deactivated Analysis");

        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, `Deactivated_Analysis_${preset}_${new Date().toISOString().split("T")[0]}.xlsx`);
        toast.success("Excel exported successfully!");
    };

    // Export Drilldown Students
    const handleExportDrillDown = () => {
        if (!drillDownModal.students || drillDownModal.students.length === 0) return;

        const headers = ["#", "Student Name", "Enroll / Roll No", "Centre", "Department", "Course", "Contact", "Deactivated By", "Deactivation Date"];
        const rows = drillDownModal.students.map((s, idx) => [
            idx + 1,
            s.studentName,
            s.admissionNumber || s.rollNo,
            s.centre,
            s.department,
            s.courseName,
            s.contactNumber,
            s.deactivatedBy,
            s.deactivationDate ? new Date(s.deactivationDate).toLocaleDateString("en-GB") : "-"
        ]);

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");

        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        saveAs(new Blob([buffer]), `Deactivated_Students_${drillDownModal.centre}_${drillDownModal.department}.xlsx`);
    };

    // Filtered Modal Students
    const modalFilteredStudents = useMemo(() => {
        if (!modalSearch.trim()) return drillDownModal.students;
        const q = modalSearch.toLowerCase().trim();
        return drillDownModal.students.filter(s =>
            (s.studentName || "").toLowerCase().includes(q) ||
            (s.admissionNumber || "").toLowerCase().includes(q) ||
            (s.courseName || "").toLowerCase().includes(q) ||
            (s.contactNumber || "").toLowerCase().includes(q)
        );
    }, [drillDownModal.students, modalSearch]);

    // Badge color helper for Deactivation Rate
    const getRateBadge = (rate) => {
        const val = Number(rate) || 0;
        if (val === 0) {
            return isDark
                ? "bg-gray-800 text-gray-400 border-gray-700"
                : "bg-gray-100 text-gray-500 border-gray-200";
        }
        if (val < 10) {
            return isDark
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-emerald-50 text-emerald-700 border-emerald-200";
        }
        if (val <= 25) {
            return isDark
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-amber-50 text-amber-700 border-amber-200";
        }
        return isDark
            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
            : "bg-rose-50 text-rose-700 border-rose-200";
    };

    // Theme Styles
    const cardBg = isDark ? "bg-[#111C2F]/90 border-gray-800" : "bg-white border-gray-200";
    const headerBg = isDark ? "bg-[#0B1528] text-gray-200" : "bg-gray-50 text-gray-700";
    const cellHover = isDark ? "hover:bg-cyan-500/10" : "hover:bg-cyan-50/60";

    const summary = reportData.summary || {};

    return (
        <Layout>
            <div className={`p-4 sm:p-6 min-h-screen ${isDark ? "bg-[#060D1A] text-gray-100" : "bg-gray-50 text-gray-900"}`}>
                
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-500 uppercase tracking-widest mb-1">
                            <span>Sales & Analytics</span>
                            <span>•</span>
                            <span>Admissions & Attrition</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30">
                                <FaUserSlash size={20} />
                            </span>
                            Deactivated Analysis
                        </h1>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                            Comparative Attrition Matrix • Unique Students Admitted vs Deactivated & Percentage Breakdown (Normal & Board Admissions)
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={fetchAnalysisData}
                            disabled={loading}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
                                isDark ? "bg-[#111C2F] hover:bg-gray-800 text-gray-200 border-gray-800" : "bg-white hover:bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                            title="Refresh data"
                        >
                            <FaSync className={loading ? "animate-spin text-cyan-400" : ""} />
                            <span>Refresh</span>
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/20"
                        >
                            <FaFileExcel />
                            <span>Export Excel</span>
                        </button>
                    </div>
                </div>

                {/* Primary Filter Presets Bar */}
                <div className={`p-4 rounded-xl border mb-5 ${cardBg} shadow-sm space-y-4`}>
                    
                    {/* Top Row: Quick Presets & Date Basis Toggle */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Presets Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                            {[
                                { id: "thisMonth", label: "This Month" },
                                { id: "previousMonth", label: "Previous Month" },
                                { id: "thisYear", label: "This Year" },
                                { id: "previousYear", label: "Previous Year" },
                                { id: "dateWise", label: "Date-Wise" },
                                { id: "monthWise", label: "Month-Wise" },
                                { id: "custom", label: "Custom Range" },
                                { id: "all", label: "All Time" }
                            ].map(item => {
                                const isActive = preset === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setPreset(item.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 uppercase tracking-wider ${
                                            isActive
                                                ? "bg-cyan-500 text-black font-black shadow-md shadow-cyan-500/20 scale-[1.02]"
                                                : isDark
                                                    ? "bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border border-gray-700/50"
                                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Date Basis Toggle */}
                        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                            <span className={isDark ? "text-gray-400" : "text-gray-500"}>Filter Basis:</span>
                            <div className={`p-0.5 rounded-lg border flex ${isDark ? "bg-[#0B1528] border-gray-800" : "bg-gray-100 border-gray-200"}`}>
                                <button
                                    onClick={() => setDateBasis("deactivationDate")}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase transition-all ${
                                        dateBasis === "deactivationDate"
                                            ? "bg-red-500/90 text-white shadow-sm"
                                            : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"
                                    }`}
                                >
                                    Deactivation Date
                                </button>
                                <button
                                    onClick={() => setDateBasis("admissionDate")}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase transition-all ${
                                        dateBasis === "admissionDate"
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"
                                    }`}
                                >
                                    Admission Date
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Date Inputs (Active when preset requires input) */}
                    {(preset === "dateWise" || preset === "monthWise" || preset === "custom") && (
                        <div className={`pt-3 border-t flex flex-wrap items-center gap-3 ${isDark ? "border-gray-800" : "border-gray-100"}`}>
                            {preset === "dateWise" && (
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                                        <FaCalendarAlt /> Select Date:
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                                            isDark ? "bg-[#0B1528] text-white border-gray-700" : "bg-white text-gray-800 border-gray-300"
                                        }`}
                                    />
                                    <button
                                        onClick={() => setSelectedDate(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }))}
                                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                                            isDark ? "bg-gray-800 text-cyan-400 border-gray-700" : "bg-gray-100 text-cyan-700 border-gray-200"
                                        }`}
                                    >
                                        Today
                                    </button>
                                </div>
                            )}

                            {preset === "monthWise" && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-cyan-400">Month:</label>
                                        <select
                                            value={selectedMonth}
                                            onChange={e => setSelectedMonth(e.target.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                                                isDark ? "bg-[#0B1528] text-white border-gray-700" : "bg-white text-gray-800 border-gray-300"
                                            }`}
                                        >
                                            {monthOptions.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-cyan-400">Year:</label>
                                        <select
                                            value={selectedYear}
                                            onChange={e => setSelectedYear(e.target.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                                                isDark ? "bg-[#0B1528] text-white border-gray-700" : "bg-white text-gray-800 border-gray-300"
                                            }`}
                                        >
                                            {["2024", "2025", "2026", "2027"].map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {preset === "custom" && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <label className="text-xs font-bold text-cyan-400">From:</label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={e => setCustomStartDate(e.target.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                                            isDark ? "bg-[#0B1528] text-white border-gray-700" : "bg-white text-gray-800 border-gray-300"
                                        }`}
                                    />
                                    <label className="text-xs font-bold text-cyan-400">To:</label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={e => setCustomEndDate(e.target.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none ${
                                            isDark ? "bg-[#0B1528] text-white border-gray-700" : "bg-white text-gray-800 border-gray-300"
                                        }`}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Entity Filters: Zone, Centre, Department MultiSelects */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">Zone Filter</label>
                            <CustomMultiSelect
                                placeholder="Select Zones..."
                                options={zones.map(z => ({ value: z._id, label: z.name }))}
                                selectedValues={selectedZones}
                                onChange={setSelectedZones}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">Centre Filter</label>
                            <CustomMultiSelect
                                placeholder="Select Centres..."
                                options={centres.map(c => ({ value: c.centreName, label: c.centreName }))}
                                selectedValues={selectedCentres}
                                onChange={setSelectedCentres}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">Department Columns</label>
                            <CustomMultiSelect
                                placeholder="All Departments"
                                options={(reportData.allAvailableDepartments || []).map(d => ({ value: d, label: d }))}
                                selectedValues={selectedDepartments}
                                onChange={setSelectedDepartments}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">Quick Search</label>
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search Centre or Zone..."
                                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs font-bold border outline-none transition-all ${
                                        isDark
                                            ? "bg-[#0B1528] text-white border-gray-700 focus:border-cyan-500"
                                            : "bg-white text-gray-800 border-gray-300 focus:border-cyan-500"
                                    }`}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs"
                                    >
                                        <FaTimes />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics Cards - Updated with Admitted vs Deactivated comparison & percentage */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-5">
                    
                    {/* Card 1: Selected Period Total Comparison */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden ${cardBg} shadow-sm`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Attrition Overview
                            </span>
                            <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                                <FaPercent size={13} />
                            </span>
                        </div>
                        
                        {/* Comparison Numbers */}
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                            <div>
                                <span className="text-2xl sm:text-3xl font-black text-red-400 tracking-tight">
                                    {summary.totalDeactivated ?? reportData.grandTotalDeactivated ?? 0}
                                </span>
                                <span className="text-xs font-bold text-gray-500 ml-1">
                                    / {summary.totalAdmitted ?? reportData.grandTotalAdmitted ?? 0}
                                </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${getRateBadge(summary.rate ?? reportData.grandTotalRate)}`}>
                                {summary.rate ?? reportData.grandTotalRate ?? 0}%
                            </span>
                        </div>

                        {/* Ratio Progress Bar */}
                        <div className="w-full bg-gray-700/30 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-red-500 to-rose-400 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(summary.rate ?? reportData.grandTotalRate ?? 0, 100)}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mt-2">
                            <span>Unique Students (Deact / Adm)</span>
                            <span className="truncate max-w-[120px]">{reportData.filterMeta?.label || preset}</span>
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-red-500/10 blur-xl pointer-events-none" />
                    </div>

                    {/* Card 2: Current Month Comparison */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden ${cardBg} shadow-sm`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Current Month
                            </span>
                            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                                <FaCalendarCheck size={13} />
                            </span>
                        </div>
                        
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                            <div>
                                <span className="text-2xl sm:text-3xl font-black text-cyan-400 tracking-tight">
                                    {summary.thisMonthDeactivated || 0}
                                </span>
                                <span className="text-xs font-bold text-gray-500 ml-1">
                                    / {summary.thisMonthAdmitted || 0}
                                </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${getRateBadge(summary.thisMonthRate)}`}>
                                {summary.thisMonthRate || 0}%
                            </span>
                        </div>

                        {/* Ratio Progress Bar */}
                        <div className="w-full bg-gray-700/30 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-cyan-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(summary.thisMonthRate || 0, 100)}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mt-2">
                            <span>Unique Students (Deact / Adm)</span>
                            <span>Current Month IST</span>
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />
                    </div>

                    {/* Card 3: Previous Month Comparison */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden ${cardBg} shadow-sm`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Previous Month
                            </span>
                            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                                <FaClock size={13} />
                            </span>
                        </div>
                        
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                            <div>
                                <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                                    {summary.prevMonthDeactivated || 0}
                                </span>
                                <span className="text-xs font-bold text-gray-500 ml-1">
                                    / {summary.prevMonthAdmitted || 0}
                                </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${getRateBadge(summary.prevMonthRate)}`}>
                                {summary.prevMonthRate || 0}%
                            </span>
                        </div>

                        {/* Ratio Progress Bar */}
                        <div className="w-full bg-gray-700/30 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-amber-500 to-orange-400 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(summary.prevMonthRate || 0, 100)}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mt-2">
                            <span>Deactivated / Admitted</span>
                            <span>Prior Month Bench</span>
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
                    </div>

                    {/* Card 4: Top Affected Centre with Ratio */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden ${cardBg} shadow-sm`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Top Centre
                            </span>
                            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                                <FaBuilding size={13} />
                            </span>
                        </div>
                        <div className="text-lg sm:text-xl font-black text-purple-400 tracking-tight truncate" title={summary.topCentre?.name}>
                            {summary.topCentre?.name || "N/A"}
                        </div>
                        
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                            <div className="text-xs font-bold text-gray-300">
                                <span className="text-purple-300 font-black">{summary.topCentre?.deactivated || 0}</span>
                                <span className="text-gray-500"> / {summary.topCentre?.admitted || 0}</span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${getRateBadge(summary.topCentre?.rate)}`}>
                                {summary.topCentre?.rate || 0}%
                            </span>
                        </div>
                        
                        <div className="text-[10px] text-gray-500 font-bold mt-2">
                            Highest deactivation count
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
                    </div>

                    {/* Card 5: Top Affected Department with Ratio */}
                    <div className={`p-4 rounded-xl border relative overflow-hidden ${cardBg} shadow-sm col-span-1 sm:col-span-2 lg:col-span-1`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Top Department
                            </span>
                            <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400">
                                <FaLayerGroup size={13} />
                            </span>
                        </div>
                        <div className="text-lg sm:text-xl font-black text-pink-400 tracking-tight truncate" title={summary.topDepartment?.name}>
                            {summary.topDepartment?.name || "N/A"}
                        </div>
                        
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                            <div className="text-xs font-bold text-gray-300">
                                <span className="text-pink-300 font-black">{summary.topDepartment?.deactivated || 0}</span>
                                <span className="text-gray-500"> / {summary.topDepartment?.admitted || summary.totalAdmitted || 0}</span>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${getRateBadge(summary.topDepartment?.rate)}`}>
                                {summary.topDepartment?.rate || 0}%
                            </span>
                        </div>

                        <div className="text-[10px] text-gray-500 font-bold mt-2">
                            Highest attrition volume
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-pink-500/10 blur-xl pointer-events-none" />
                    </div>
                </div>

                {/* Main Matrix Table - Updated with Initial Columns for Admitted, Deactivated, and Deact % */}
                <div className={`rounded-xl border shadow-sm overflow-hidden ${cardBg}`}>
                    <div className="overflow-x-auto max-h-[70vh] scrollbar-thin">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className={`sticky top-0 z-20 shadow-sm ${headerBg}`}>
                                <tr>
                                    {/* 1. Index */}
                                    <th className="p-3.5 font-black uppercase tracking-wider text-[11px] min-w-[45px] border-b border-gray-700/50 text-center">
                                        #
                                    </th>

                                    {/* 2. Centre / Location (Sticky) */}
                                    <th className={`p-3.5 font-black uppercase tracking-wider text-[11px] min-w-[190px] border-b border-gray-700/50 sticky left-0 z-30 shadow-md ${
                                        isDark ? "bg-[#0B1528] text-gray-200" : "bg-gray-50 text-gray-700"
                                    }`}>
                                        Centre / Location
                                    </th>

                                    {/* 3. Zone */}
                                    <th className="p-3.5 font-black uppercase tracking-wider text-[11px] min-w-[130px] border-b border-gray-700/50 text-gray-400">
                                        Zone
                                    </th>

                                    {/* 4. Total Admitted (New) */}
                                    <th className="p-3.5 font-black uppercase tracking-wider text-[11px] text-center min-w-[100px] border-b border-gray-700/50 text-blue-400 bg-blue-500/5">
                                        Admitted
                                    </th>

                                    {/* 5. Total Deactivated (New) */}
                                    <th className="p-3.5 font-black uppercase tracking-wider text-[11px] text-center min-w-[105px] border-b border-gray-700/50 text-rose-400 bg-rose-500/5">
                                        Deactivated
                                    </th>

                                    {/* 6. Comparison Rate (%) (New) */}
                                    <th className="p-3.5 font-black uppercase tracking-wider text-[11px] text-center min-w-[95px] border-b border-gray-700/50 text-amber-400 bg-amber-500/5">
                                        Deact %
                                    </th>

                                    {/* 7. Department Columns */}
                                    {(reportData.departments || []).map(dept => (
                                        <th
                                            key={dept}
                                            className="p-3.5 font-black uppercase tracking-wider text-[11px] text-center min-w-[120px] border-b border-gray-700/50 text-gray-300"
                                        >
                                            {dept}
                                        </th>
                                    ))}

                                    {/* 8. Centre Total Column (Sticky Right) */}
                                    <th className={`p-3.5 font-black uppercase tracking-wider text-[11px] text-center min-w-[130px] border-b border-gray-700/50 sticky right-0 z-30 shadow-[-6px_0_12px_rgba(0,0,0,0.5)] border-l ${
                                        isDark ? "bg-[#1E1124] text-rose-400 border-rose-900/50" : "bg-rose-100 text-rose-700 border-rose-200"
                                    }`}>
                                        Total Deactivated
                                    </th>
                                </tr>
                            </thead>

                            <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-200"}`}>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={(reportData.departments?.length || 0) + 7}
                                            className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <FaSync className="animate-spin text-cyan-400 text-xl" />
                                                <span>Calculating admitted vs deactivated comparison matrix...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : displayedRows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={(reportData.departments?.length || 0) + 7}
                                            className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs"
                                        >
                                            No student records found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    displayedRows.map((row, idx) => {
                                        return (
                                            <tr
                                                key={row.centre || idx}
                                                className={`transition-colors group ${
                                                    isDark ? "hover:bg-gray-800/40" : "hover:bg-gray-50/80"
                                                }`}
                                            >
                                                {/* 1. Index */}
                                                <td className="p-3 text-gray-400 font-mono font-bold text-center">
                                                    {idx + 1}
                                                </td>

                                                {/* 2. Centre Name (Sticky Left) */}
                                                <td className={`p-3 font-bold sticky left-0 z-10 transition-colors shadow-sm ${
                                                    isDark ? "bg-[#111C2F] group-hover:bg-[#16233B] text-gray-100" : "bg-white group-hover:bg-gray-50 text-gray-800"
                                                }`}>
                                                    <span className="font-mono uppercase tracking-wide">{row.centre}</span>
                                                </td>

                                                {/* 3. Zone Pill */}
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                                                    }`}>
                                                        {row.zone || "General"}
                                                    </span>
                                                </td>

                                                {/* 4. Total Admitted in Period */}
                                                <td className="p-3 text-center font-mono font-bold text-blue-400 bg-blue-500/5">
                                                    {row.admitted || 0}
                                                </td>

                                                {/* 5. Total Deactivated in Period */}
                                                <td
                                                    className={`p-3 text-center font-mono font-black text-rose-400 bg-rose-500/5 ${
                                                        row.deactivated > 0 ? "cursor-pointer hover:bg-rose-500/10" : ""
                                                    }`}
                                                    onClick={() => row.deactivated > 0 && handleCellClick(row.centre, "All")}
                                                    title={row.deactivated > 0 ? `Click to view all ${row.deactivated} deactivated students in ${row.centre}` : ""}
                                                >
                                                    {row.deactivated > 0 ? (
                                                        <span className="inline-block px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25">
                                                            {row.deactivated}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500">0</span>
                                                    )}
                                                </td>

                                                {/* 6. Comparison Percentage Rate */}
                                                <td className="p-3 text-center font-mono font-black bg-amber-500/5">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border ${getRateBadge(row.percentage)}`}>
                                                        {row.percentage}%
                                                    </span>
                                                </td>

                                                {/* 7. Department Counts */}
                                                {(reportData.departments || []).map(dept => {
                                                    const count = row.counts[dept] || 0;
                                                    return (
                                                        <td
                                                            key={dept}
                                                            className={`p-3 text-center font-mono ${cellHover} ${
                                                                count > 0 ? "cursor-pointer font-black" : "text-gray-500 font-normal"
                                                            }`}
                                                            onClick={() => count > 0 && handleCellClick(row.centre, dept)}
                                                            title={count > 0 ? `Click to view ${count} deactivated students in ${dept}` : ""}
                                                        >
                                                            {count > 0 ? (
                                                                <span className="inline-block px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:scale-110 transition-transform">
                                                                    {count}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-600 text-opacity-50">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                {/* 8. Centre Total Deactivated (Sticky Right) */}
                                                <td
                                                    className={`p-3 text-center font-mono font-black sticky right-0 z-10 transition-colors shadow-[-6px_0_12px_rgba(0,0,0,0.4)] border-l ${
                                                        isDark
                                                            ? "bg-[#180F20] text-rose-300 border-rose-900/40 group-hover:bg-[#261433]"
                                                            : "bg-rose-50 text-rose-700 border-rose-200 group-hover:bg-rose-100"
                                                    } ${
                                                        row.total > 0 ? "cursor-pointer" : ""
                                                    }`}
                                                    onClick={() => row.total > 0 && handleCellClick(row.centre, "All")}
                                                    title={row.total > 0 ? `Click to view all ${row.total} deactivated students in ${row.centre}` : ""}
                                                >
                                                    <span className={`inline-block px-2.5 py-1 rounded font-black border shadow-sm ${
                                                        row.total > 0
                                                            ? isDark
                                                                ? "bg-rose-600/30 text-rose-200 border-rose-500/40"
                                                                : "bg-rose-600 text-white border-rose-600"
                                                            : isDark
                                                                ? "bg-gray-800 text-gray-500 border-gray-700"
                                                                : "bg-gray-200 text-gray-400 border-gray-300"
                                                    }`}>
                                                        {row.total}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>

                            {/* Summary Bottom Row */}
                            {!loading && displayedRows.length > 0 && (
                                <tfoot className={`sticky bottom-0 z-20 shadow-lg font-black ${
                                    isDark ? "bg-[#0B1528] text-gray-100 border-t-2 border-cyan-500/40" : "bg-gray-100 text-gray-900 border-t-2 border-cyan-600"
                                }`}>
                                    <tr>
                                        {/* 1 & 2. Centre Label */}
                                        <td className="p-3.5 text-center font-mono" colSpan={2}>
                                            <span className="uppercase tracking-widest text-[11px] text-cyan-400 font-black">
                                                TOTAL ({displayedRows.length} Centres)
                                            </span>
                                        </td>

                                        {/* 3. Zone */}
                                        <td className="p-3.5 text-[10px] text-gray-400">
                                            All Zones
                                        </td>

                                        {/* 4. Grand Total Admitted */}
                                        <td className="p-3.5 text-center font-mono text-xs text-blue-400 bg-blue-500/10">
                                            {reportData.grandTotalAdmitted || 0}
                                        </td>

                                        {/* 5. Grand Total Deactivated */}
                                        <td
                                            className="p-3.5 text-center font-mono text-xs text-rose-400 bg-rose-500/10 cursor-pointer hover:bg-rose-500/20"
                                            onClick={() => handleCellClick("Total", "All")}
                                            title="Click to view all deactivated students"
                                        >
                                            {reportData.grandTotalDeactivated || 0}
                                        </td>

                                        {/* 6. Grand Total Rate % */}
                                        <td className="p-3.5 text-center font-mono text-xs bg-amber-500/10">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border ${getRateBadge(reportData.grandTotalRate)}`}>
                                                {reportData.grandTotalRate || 0}%
                                            </span>
                                        </td>

                                        {/* 7. Column Department Totals */}
                                        {(reportData.departments || []).map(dept => {
                                            const total = reportData.columnTotals[dept] || 0;
                                            return (
                                                <td
                                                    key={dept}
                                                    className="p-3.5 text-center font-mono text-xs cursor-pointer hover:bg-cyan-500/20 text-cyan-300"
                                                    onClick={() => total > 0 && handleCellClick("Total", dept)}
                                                    title={`Click to view all ${total} deactivated in ${dept}`}
                                                >
                                                    {total}
                                                </td>
                                            );
                                        })}

                                        {/* 8. Grand Total Deactivated */}
                                        <td className={`p-3.5 text-center font-mono text-sm sticky right-0 z-30 shadow-[-6px_0_12px_rgba(0,0,0,0.6)] border-l ${
                                            isDark ? "bg-[#201026] text-rose-200 border-rose-900/60" : "bg-rose-100 text-rose-800 border-rose-300"
                                        }`}>
                                            <span className="inline-block px-3 py-1 rounded bg-rose-600 text-white font-black shadow-md">
                                                {reportData.grandTotalDeactivated || 0}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Drilldown Students Modal */}
                {drillDownModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
                        <div className={`w-full max-w-5xl rounded-2xl border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden ${cardBg}`}>
                            
                            {/* Modal Header */}
                            <div className={`p-4 border-b flex items-center justify-between ${headerBg}`}>
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
                                        <span>Student Drill-Down</span>
                                        <span>•</span>
                                        <span>{drillDownModal.centre}</span>
                                        <span>•</span>
                                        <span>{drillDownModal.department}</span>
                                    </div>
                                    <h3 className="text-lg font-black tracking-tight mt-0.5">
                                        Deactivated Students List
                                    </h3>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExportDrillDown}
                                        disabled={drillDownModal.students.length === 0}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                                    >
                                        <FaFileCsv />
                                        <span>Export</span>
                                    </button>
                                    <button
                                        onClick={() => setDrillDownModal(prev => ({ ...prev, isOpen: false }))}
                                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                    >
                                        <FaTimes size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Search Bar */}
                            <div className="p-3 border-b border-gray-800 flex items-center gap-3">
                                <div className="relative flex-1">
                                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                    <input
                                        type="text"
                                        value={modalSearch}
                                        onChange={e => setModalSearch(e.target.value)}
                                        placeholder="Search by student name, roll number, course, mobile..."
                                        className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs font-bold border outline-none ${
                                            isDark ? "bg-[#0B1528] text-white border-gray-700" : "bg-white text-gray-800 border-gray-300"
                                        }`}
                                    />
                                </div>
                                <div className="text-xs font-bold text-gray-400 shrink-0">
                                    Found: <span className="text-cyan-400">{modalFilteredStudents.length}</span> students
                                </div>
                            </div>

                            {/* Modal Content / Table */}
                            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                                {drillDownModal.loading ? (
                                    <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3">
                                        <FaSync className="animate-spin text-cyan-400 text-xl" />
                                        <span>Loading student records...</span>
                                    </div>
                                ) : modalFilteredStudents.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        No student records found.
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className={`sticky top-0 z-10 ${headerBg}`}>
                                            <tr>
                                                <th className="p-2.5 font-black uppercase text-[10px]">#</th>
                                                <th className="p-2.5 font-black uppercase text-[10px]">Student Name</th>
                                                <th className="p-2.5 font-black uppercase text-[10px]">Admission No.</th>
                                                <th className="p-2.5 font-black uppercase text-[10px]">Centre</th>
                                                <th className="p-2.5 font-black uppercase text-[10px]">Department</th>
                                                <th className="p-2.5 font-black uppercase text-[10px]">Course</th>
                                                <th className="p-2.5 font-black uppercase text-[10px]">Deactivation Date</th>
                                                <th className="p-2.5 font-black uppercase text-[10px]">Deactivated By</th>
                                                <th className="p-2.5 font-black uppercase text-[10px]">Contact</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-200"}`}>
                                            {modalFilteredStudents.map((s, idx) => (
                                                <tr key={idx} className={isDark ? "hover:bg-gray-800/40" : "hover:bg-gray-50"}>
                                                    <td className="p-2.5 font-mono text-gray-400">{idx + 1}</td>
                                                    <td className="p-2.5 font-bold text-gray-200">{s.studentName}</td>
                                                    <td className="p-2.5 font-mono text-cyan-400 font-bold">{s.admissionNumber || s.rollNo}</td>
                                                    <td className="p-2.5 uppercase font-medium">{s.centre}</td>
                                                    <td className="p-2.5 font-bold text-orange-400">{s.department}</td>
                                                    <td className="p-2.5 text-gray-400 truncate max-w-[180px]" title={s.courseName}>{s.courseName}</td>
                                                    <td className="p-2.5 font-mono text-red-400 font-bold">
                                                        {s.deactivationDate ? new Date(s.deactivationDate).toLocaleDateString("en-GB") : "-"}
                                                    </td>
                                                    <td className="p-2.5 text-gray-400 text-[11px]">{s.deactivatedBy}</td>
                                                    <td className="p-2.5 font-mono text-gray-300">{s.contactNumber}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className={`p-3 border-t flex justify-end ${headerBg}`}>
                                <button
                                    onClick={() => setDrillDownModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
};

export default DeactivatedAnalysis;
