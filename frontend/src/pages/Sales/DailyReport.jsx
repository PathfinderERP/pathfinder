import React, { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import {
    FaPhoneAlt,
    FaHandsHelping,
    FaGraduationCap,
    FaRupeeSign,
    FaCalendarAlt,
    FaDownload,
    FaSearch,
    FaSyncAlt,
    FaBuilding,
    FaWalking,
    FaChevronLeft,
    FaChevronRight,
    FaTimes,
    FaExternalLinkAlt,
    FaInfoCircle,
    FaPercentage
} from "react-icons/fa";
import { GiSchoolBag } from "react-icons/gi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
        style: "currency",
        currency: "INR"
    });
};

const getTodayIST = () => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    return formatter.format(new Date());
};

const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    try {
        const [y, m, d] = dateStr.split("-").map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    } catch {
        return dateStr;
    }
};


const getDateRangeLimits = (range, customStart, customEnd) => {
    const today = new Date();
    const formatDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    let start, end;
    switch (range) {
        case "Today":
            start = formatDate(today);
            end = formatDate(today);
            break;
        case "Yesterday": {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            start = formatDate(yesterday);
            end = formatDate(yesterday);
            break;
        }
        case "Last 7 Days": {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 6);
            start = formatDate(sevenDaysAgo);
            end = formatDate(today);
            break;
        }
        case "This Month": {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            start = formatDate(startOfMonth);
            end = formatDate(today);
            break;
        }
        case "Last Month": {
            const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            start = formatDate(startOfLastMonth);
            end = formatDate(endOfLastMonth);
            break;
        }
        case "This Year": {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            start = formatDate(startOfYear);
            end = formatDate(today);
            break;
        }
        case "Custom Range":
            start = customStart || formatDate(today);
            end = customEnd || formatDate(today);
            break;
        default:
            start = formatDate(today);
            end = formatDate(today);
            break;
    }
    return { start, end };
};

const DailyReport = () => {
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const apiUrl = import.meta.env.VITE_API_URL || "";

    // State
    // Date & Range State (Default: Today)
    const [dateRangeOption, setDateRangeOption] = useState("Today");
    const [customStartDate, setCustomStartDate] = useState(getTodayIST());
    const [customEndDate, setCustomEndDate] = useState(getTodayIST());
    const [selectedCentreFilter, setSelectedCentreFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);

    // Hover State for Admissions
    const [hoveredAdmission, setHoveredAdmission] = useState(null); // { centre, rect }

    // Modals
    const [marketingModalCentre, setMarketingModalCentre] = useState(null);
    const [coursesModalCentre, setCoursesModalCentre] = useState(null);

    // Active Range computation
    const activeRange = useMemo(() => {
        if (dateRangeOption === "Custom Range") {
            return {
                start: customStartDate || getTodayIST(),
                end: customEndDate || customStartDate || getTodayIST()
            };
        }
        return getDateRangeLimits(dateRangeOption, customStartDate, customEndDate);
    }, [dateRangeOption, customStartDate, customEndDate]);

    // Human-friendly date display label
    const dateDisplayLabel = useMemo(() => {
        const { start, end } = activeRange;
        if (start === end) {
            if (start === getTodayIST()) return `Today (${formatDateDisplay(start)})`;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().split("T")[0];
            if (start === yStr) return `Yesterday (${formatDateDisplay(start)})`;
            return formatDateDisplay(start);
        }
        return `${formatDateDisplay(start)} — ${formatDateDisplay(end)}`;
    }, [activeRange]);

    // Fetch Report Data
    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const { start, end } = activeRange;
            const params = new URLSearchParams({
                startDate: start,
                endDate: end
            });
            if (start === end) {
                params.append("date", start);
            }
            if (selectedCentreFilter && selectedCentreFilter !== "all") {
                params.append("centreId", selectedCentreFilter);
            }

            const res = await fetch(`${apiUrl}/sales/daily-report?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setReportData(data);
            } else {
                toast.error(data.message || "Failed to fetch daily report");
                setReportData(null);
            }
        } catch (error) {
            console.error("fetchReport error:", error);
            toast.error("Network error while fetching report");
            setReportData(null);
        } finally {
            setLoading(false);
        }
    }, [apiUrl, activeRange, selectedCentreFilter]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // Date Range Dropdown Change
    const handleDateRangeChange = (val) => {
        setDateRangeOption(val);
        if (val !== "Custom Range") {
            const { start, end } = getDateRangeLimits(val);
            setCustomStartDate(start);
            setCustomEndDate(end);
        }
    };

    // Date Navigation helpers
    const handlePrevDay = () => {
        const currentBase = activeRange.start;
        const [y, m, d] = currentBase.split("-").map(Number);
        const dt = new Date(y, m - 1, d - 1);
        const newDateStr = dt.toISOString().split("T")[0];
        const todayStr = getTodayIST();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (newDateStr === todayStr) {
            setDateRangeOption("Today");
            setCustomStartDate(todayStr);
            setCustomEndDate(todayStr);
        } else if (newDateStr === yesterdayStr) {
            setDateRangeOption("Yesterday");
            setCustomStartDate(yesterdayStr);
            setCustomEndDate(yesterdayStr);
        } else {
            setDateRangeOption("Custom Range");
            setCustomStartDate(newDateStr);
            setCustomEndDate(newDateStr);
        }
    };

    const handleNextDay = () => {
        const currentBase = activeRange.end;
        const [y, m, d] = currentBase.split("-").map(Number);
        const dt = new Date(y, m - 1, d + 1);
        const newDateStr = dt.toISOString().split("T")[0];
        const todayStr = getTodayIST();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (newDateStr === todayStr) {
            setDateRangeOption("Today");
            setCustomStartDate(todayStr);
            setCustomEndDate(todayStr);
        } else if (newDateStr === yesterdayStr) {
            setDateRangeOption("Yesterday");
            setCustomStartDate(yesterdayStr);
            setCustomEndDate(yesterdayStr);
        } else {
            setDateRangeOption("Custom Range");
            setCustomStartDate(newDateStr);
            setCustomEndDate(newDateStr);
        }
    };

    const handleResetToday = () => {
        setDateRangeOption("Today");
        const todayStr = getTodayIST();
        setCustomStartDate(todayStr);
        setCustomEndDate(todayStr);
    };

    // Filtered Centres list
    const filteredCentres = useMemo(() => {
        if (!reportData?.centres) return [];
        let list = reportData.centres;
        if (searchTerm.trim()) {
            const cleanSearch = searchTerm.trim().toLowerCase();
            list = list.filter(c =>
                c.centreName.toLowerCase().includes(cleanSearch) ||
                (c.code && c.code.toLowerCase().includes(cleanSearch))
            );
        }
        return list;
    }, [reportData, searchTerm]);

    // Computed Totals for filtered list (Without GST as primary, plus With GST)
    const filteredSummary = useMemo(() => {
        const defaultSum = {
            totalCentres: 0,
            totalCalls: 0,
            totalFollowUps: 0,
            totalWalkIns: 0,
            totalCounselling: 0,
            totalMarketingActivities: 0,
            totalSchoolsVisited: 0,
            totalAdmissions: 0,
            totalFreshCollection: 0,
            totalEmiCollection: 0,
            totalCollection: 0,
            totalFreshCollectionWithGst: 0,
            totalEmiCollectionWithGst: 0,
            totalCollectionWithGst: 0
        };

        if (!filteredCentres || filteredCentres.length === 0) {
            return reportData?.summary || defaultSum;
        }

        return filteredCentres.reduce((acc, c) => {
            acc.totalCalls += c.callsCount || 0;
            acc.totalFollowUps += c.followUpsCount || 0;
            acc.totalWalkIns += c.walkInCount || 0;
            acc.totalCounselling += c.counsellingCount || 0;
            acc.totalMarketingActivities += c.marketingCount || 0;
            acc.totalSchoolsVisited += c.schoolsCount || 0;
            acc.totalAdmissions += c.admissionsCount || 0;
            acc.totalFreshCollection += c.freshCollection || 0;
            acc.totalEmiCollection += c.emiCollection || 0;
            acc.totalCollection += c.totalCollection || 0;
            acc.totalFreshCollectionWithGst += c.freshCollectionWithGst || 0;
            acc.totalEmiCollectionWithGst += c.emiCollectionWithGst || 0;
            acc.totalCollectionWithGst += c.totalCollectionWithGst || 0;
            return acc;
        }, {
            ...defaultSum,
            totalCentres: filteredCentres.length
        });
    }, [filteredCentres, reportData]);

    // Excel Export (includes both Excl. GST and Incl. GST)
    const handleExportExcel = () => {
        if (!reportData?.centres || reportData.centres.length === 0) {
            toast.warning("No data available to export");
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // Sheet 1: Centre Consolidated Summary
            const summaryHeaders = [
                "Centre Name",
                "Centre Code",
                "Total Calls",
                "Follow-Ups",
                "Walk-Ins",
                "Counselling",
                "Marketing Visits",
                "Schools Count",
                "Admissions Count",
                "Course Breakdown",
                "Fresh Coll. Excl. GST (₹)",
                "EMI Coll. Excl. GST (₹)",
                "Total Coll. Excl. GST (₹)",
                "Total Coll. Incl. GST (₹)"
            ];

            const summaryRows = reportData.centres.map(c => {
                const courseText = Object.entries(c.coursesBreakdown || {})
                    .map(([name, count]) => `${name}: ${count}`)
                    .join(", ") || "-";

                return [
                    c.centreName,
                    c.code || "-",
                    c.callsCount,
                    c.followUpsCount,
                    c.walkInCount,
                    c.counsellingCount,
                    c.marketingCount,
                    c.schoolsCount,
                    c.admissionsCount,
                    courseText,
                    c.freshCollection,
                    c.emiCollection,
                    c.totalCollection,
                    c.totalCollectionWithGst || c.totalCollection
                ];
            });

            // Add Total row
            const totalRow = [
                "TOTAL / CONSOLIDATED",
                "-",
                reportData.summary.totalCalls,
                reportData.summary.totalFollowUps,
                reportData.summary.totalWalkIns,
                reportData.summary.totalCounselling,
                reportData.summary.totalMarketingActivities,
                reportData.summary.totalSchoolsVisited,
                reportData.summary.totalAdmissions,
                "-",
                reportData.summary.totalFreshCollection,
                reportData.summary.totalEmiCollection,
                reportData.summary.totalCollection,
                reportData.summary.totalCollectionWithGst || reportData.summary.totalCollection
            ];

            const { start, end } = activeRange;
            const isRange = start !== end;
            const dateLabel = isRange ? `${start} to ${end}` : start;
            const fileSuffix = isRange ? `${start}_to_${end}` : start;

            const wsSummary = XLSX.utils.aoa_to_sheet([
                [`Daily Centre Consolidated Report (Excl. GST Base) - ${dateLabel}`],
                [`Generated on: ${new Date().toLocaleString("en-IN")}`],
                [],
                summaryHeaders,
                ...summaryRows,
                [],
                totalRow
            ]);

            // Set column widths
            wsSummary["!cols"] = [
                { wch: 22 }, // Centre Name
                { wch: 12 }, // Code
                { wch: 12 }, // Total Calls
                { wch: 12 }, // Follow-Ups
                { wch: 12 }, // Walk-Ins
                { wch: 14 }, // Counselling
                { wch: 16 }, // Marketing Visits
                { wch: 14 }, // Schools Count
                { wch: 16 }, // Admissions
                { wch: 35 }, // Course Breakdown
                { wch: 24 }, // Fresh Excl. GST
                { wch: 22 }, // EMI Excl. GST
                { wch: 24 }, // Total Excl. GST
                { wch: 24 }  // Total Incl. GST
            ];

            XLSX.utils.book_append_sheet(wb, wsSummary, "Daily Summary");

            // Sheet 2: Marketing Activity Details
            const marketingHeaders = [
                "Centre Name",
                "Institution / School",
                "Activity Type",
                "Purpose",
                "Marketer / Executive",
                "Remarks",
                "Outcome / Results",
                "Leads Collected",
                "Next Visit Date",
                "Status"
            ];

            const marketingRows = [];
            reportData.centres.forEach(c => {
                (c.marketingActivities || []).forEach(act => {
                    marketingRows.push([
                        c.centreName,
                        act.institution || "-",
                        act.activityType || "-",
                        act.activityPurpose || "-",
                        act.marketerName || "-",
                        act.remarks || "-",
                        act.outcome || "-",
                        act.leads || 0,
                        act.nextActivityDate || "-",
                        act.status || "-"
                    ]);
                });
            });

            if (marketingRows.length > 0) {
                const wsMarketing = XLSX.utils.aoa_to_sheet([
                    [`Marketing Activities Breakdown - ${dateLabel}`],
                    [],
                    marketingHeaders,
                    ...marketingRows
                ]);

                wsMarketing["!cols"] = [
                    { wch: 20 },
                    { wch: 30 },
                    { wch: 18 },
                    { wch: 24 },
                    { wch: 22 },
                    { wch: 35 },
                    { wch: 25 },
                    { wch: 15 },
                    { wch: 15 },
                    { wch: 12 }
                ];

                XLSX.utils.book_append_sheet(wb, wsMarketing, "Marketing Activities");
            }

            // Write File
            const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            saveAs(
                new Blob([buf], { type: "application/octet-stream" }),
                `Daily_Sales_Consolidated_Report_${fileSuffix}.xlsx`
            );
            toast.success("Excel report exported successfully!");
        } catch (error) {
            console.error("Export Excel error:", error);
            toast.error("Failed to export Excel report");
        }
    };

    return (
        <Layout>
            <div className={`p-4 md:p-6 space-y-6 min-h-screen transition-colors ${
                isDark ? "bg-[#0a0f1d] text-slate-100" : "bg-slate-50 text-slate-900"
            }`}>

                {/* 1. Header Banner */}
                <div className={`p-5 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl backdrop-blur-md ${
                    isDark
                        ? "bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-blue-950/40 border-slate-800"
                        : "bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/30 border-slate-200"
                }`}>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                                <FaBuilding className="text-lg" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl md:text-2xl font-black tracking-tight">
                                        Daily Consolidated Report
                                    </h1>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                        isDark ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-300"
                                    }`}>
                                        Collection Excl. GST
                                    </span>
                                </div>
                                <p className={`text-xs md:text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Everyday centre-wise compiled metrics: CRM, Marketing, Admissions &amp; Collections without GST
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Date Range Dropdown & Controls */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                        {/* Dropdown Date Range Filter */}
                        <div className={`relative flex items-center rounded-xl border px-3 py-1.5 shadow-sm ${
                            isDark ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-300"
                        }`}>
                            <FaCalendarAlt className="text-cyan-500 text-xs mr-2 flex-shrink-0" />
                            <div className="flex flex-col">
                                <label className="text-[8px] font-black uppercase tracking-wider text-cyan-500 leading-none mb-0.5">
                                    Date Range
                                </label>
                                <select
                                    value={dateRangeOption}
                                    onChange={(e) => handleDateRangeChange(e.target.value)}
                                    className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer pr-4 ${
                                        isDark ? "text-slate-100" : "text-slate-800"
                                    }`}
                                >
                                    <option value="Today" className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>Today</option>
                                    <option value="Yesterday" className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>Yesterday</option>
                                    <option value="Last 7 Days" className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>Last 7 Days</option>
                                    <option value="This Month" className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>This Month</option>
                                    <option value="Last Month" className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>Last Month</option>
                                    <option value="This Year" className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>This Year</option>
                                    <option value="Custom Range" className={isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}>Custom Range</option>
                                </select>
                            </div>
                        </div>

                        {/* Custom Range Date Pickers */}
                        {dateRangeOption === "Custom Range" && (
                            <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-sm ${
                                isDark ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-300"
                            }`}>
                                <div className="flex flex-col">
                                    <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                                        From
                                    </label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${
                                            isDark ? "text-slate-100" : "text-slate-800"
                                        }`}
                                    />
                                </div>
                                <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>to</span>
                                <div className="flex flex-col">
                                    <label className="text-[8px] font-black uppercase tracking-wider text-slate-400 leading-none mb-0.5">
                                        To
                                    </label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className={`bg-transparent text-xs font-semibold focus:outline-none cursor-pointer ${
                                            isDark ? "text-slate-100" : "text-slate-800"
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Day Stepper (Single Day Navigation) */}
                        {(dateRangeOption === "Today" || dateRangeOption === "Yesterday" || (dateRangeOption === "Custom Range" && customStartDate === customEndDate)) && (
                            <div className={`flex items-center rounded-xl border p-1 shadow-sm ${
                                isDark ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-300"
                            }`}>
                                <button
                                    onClick={handlePrevDay}
                                    title="Previous Day"
                                    className={`p-2 rounded-lg transition-colors ${
                                        isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                                    }`}
                                >
                                    <FaChevronLeft className="text-xs" />
                                </button>
                                <span className={`text-[11px] font-bold px-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                    {activeRange.start === getTodayIST() ? "Today" : activeRange.start}
                                </span>
                                <button
                                    onClick={handleNextDay}
                                    title="Next Day"
                                    className={`p-2 rounded-lg transition-colors ${
                                        isDark ? "hover:bg-slate-700 text-slate-300" : "hover:bg-slate-100 text-slate-600"
                                    }`}
                                >
                                    <FaChevronRight className="text-xs" />
                                </button>
                            </div>
                        )}

                        {/* Quick Today Button */}
                        <button
                            onClick={handleResetToday}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                dateRangeOption === "Today" && activeRange.start === getTodayIST()
                                    ? isDark
                                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                                        : "bg-cyan-50 border-cyan-200 text-cyan-700"
                                    : isDark
                                        ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            Today
                        </button>

                        {/* Export to Excel Button */}
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                        >
                            <FaDownload className="text-xs" />
                            <span>Export Excel</span>
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={fetchReport}
                            disabled={loading}
                            className={`p-2.5 rounded-xl border transition-all ${
                                isDark
                                    ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                                    : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                            }`}
                            title="Refresh Data"
                        >
                            <FaSyncAlt className={`text-xs ${loading ? "animate-spin text-cyan-500" : ""}`} />
                        </button>
                    </div>
                </div>

                {/* Date Highlight Badge & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-cyan-400" : "text-cyan-600"}`}>
                            Report Period:
                        </span>
                        <span className={`text-sm font-black px-3 py-1 rounded-full border shadow-sm ${
                            isDark ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-800"
                        }`}>
                            {dateDisplayLabel}
                        </span>
                        {dateRangeOption !== "Custom Range" && dateRangeOption !== "Today" && (
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                isDark ? "bg-slate-800 text-slate-400 border border-slate-700" : "bg-slate-200 text-slate-700 border border-slate-300"
                            }`}>
                                {dateRangeOption}
                            </span>
                        )}
                    </div>

                    {/* Centre filter & Search */}
                    <div className="flex items-center gap-3">
                        <div className={`relative flex items-center rounded-xl border px-3 py-1.5 shadow-sm ${
                            isDark ? "bg-slate-800/80 border-slate-700" : "bg-white border-slate-300"
                        }`}>
                            <FaSearch className={`text-xs mr-2 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                            <input
                                type="text"
                                placeholder="Filter centres..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`bg-transparent text-xs focus:outline-none w-36 md:w-48 ${
                                    isDark ? "text-slate-100 placeholder-slate-500" : "text-slate-800 placeholder-slate-400"
                                }`}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Top KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    {/* Total Calls */}
                    <div className={`p-4 rounded-xl border shadow-sm relative overflow-hidden ${
                        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Calls &amp; Follow-ups
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <FaPhoneAlt className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-emerald-500">
                            {filteredSummary.totalCalls}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Follow-ups: {filteredSummary.totalFollowUps}
                        </div>
                    </div>

                    {/* Walk-Ins */}
                    <div className={`p-4 rounded-xl border shadow-sm relative overflow-hidden ${
                        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Walk-Ins
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <FaWalking className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-amber-500">
                            {filteredSummary.totalWalkIns}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Direct centre visits
                        </div>
                    </div>

                    {/* Counselling */}
                    <div className={`p-4 rounded-xl border shadow-sm relative overflow-hidden ${
                        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Counselling
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                <FaHandsHelping className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-purple-500">
                            {filteredSummary.totalCounselling}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Completed sessions
                        </div>
                    </div>

                    {/* Marketing Visits */}
                    <div className={`p-4 rounded-xl border shadow-sm relative overflow-hidden ${
                        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Marketing Visits
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                                <GiSchoolBag className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-pink-500">
                            {filteredSummary.totalMarketingActivities}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Schools: {filteredSummary.totalSchoolsVisited}
                        </div>
                    </div>

                    {/* Admissions */}
                    <div className={`p-4 rounded-xl border shadow-sm relative overflow-hidden ${
                        isDark ? "bg-slate-900/70 border-slate-800" : "bg-white border-slate-200"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                Admissions
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                                <FaGraduationCap className="text-xs" />
                            </div>
                        </div>
                        <div className="text-xl md:text-2xl font-black text-cyan-500">
                            {filteredSummary.totalAdmissions}
                        </div>
                        <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Hover table cell for courses
                        </div>
                    </div>

                    {/* Total Collection (Without GST as primary!) */}
                    <div className={`p-4 rounded-xl border shadow-sm relative overflow-hidden ${
                        isDark
                            ? "bg-gradient-to-br from-blue-950/60 to-indigo-950/50 border-blue-800/50"
                            : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                    }`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                                    Total (Excl. GST)
                                </span>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                <FaRupeeSign className="text-xs" />
                            </div>
                        </div>
                        <div className={`text-xl md:text-2xl font-black ${isDark ? "text-white" : "text-blue-950"}`}>
                            {formatCurrency(filteredSummary.totalCollection)}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1 text-[10px]">
                            <div className="flex items-center justify-between">
                                <span className={isDark ? "text-emerald-400" : "text-emerald-700 font-semibold"}>
                                    Fresh: {formatCurrency(filteredSummary.totalFreshCollection)}
                                </span>
                                <span className={isDark ? "text-indigo-400" : "text-indigo-700 font-semibold"}>
                                    EMI: {formatCurrency(filteredSummary.totalEmiCollection)}
                                </span>
                            </div>
                            {filteredSummary.totalCollectionWithGst > 0 && (
                                <span className={`text-[9px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                    Incl. GST: {formatCurrency(filteredSummary.totalCollectionWithGst)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Centre-wise Consolidated Table */}
                <div className={`rounded-2xl border shadow-xl overflow-hidden ${
                    isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"
                }`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className={`border-b uppercase font-bold tracking-wider ${
                                    isDark
                                        ? "bg-slate-950/70 text-slate-400 border-slate-800"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}>
                                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                                    <th className="py-3.5 px-4">Centre</th>
                                    <th className="py-3.5 px-3 text-center">Calls</th>
                                    <th className="py-3.5 px-3 text-center">Walk-ins</th>
                                    <th className="py-3.5 px-3 text-center">Counselling</th>
                                    <th className="py-3.5 px-4">Marketing (Schools &amp; Purpose)</th>
                                    <th className="py-3.5 px-4">
                                        <div className="flex items-center gap-1.5">
                                            <span>Admissions (Course Breakdown)</span>
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-normal normal-case ${
                                                isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                                            }`}>
                                                Hover for details
                                            </span>
                                        </div>
                                    </th>
                                    <th className="py-3.5 px-3 text-right">Fresh (Excl. GST)</th>
                                    <th className="py-3.5 px-3 text-right">EMI (Excl. GST)</th>
                                    <th className="py-3.5 px-4 text-right">Total (Excl. GST)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                    Compiling centre data for {dateDisplayLabel}...
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCentres.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <FaBuilding className={`text-3xl ${isDark ? "text-slate-600" : "text-slate-300"}`} />
                                                <span className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                                    No centres found matching your filter
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCentres.map((c, idx) => {
                                        const hasMarketing = c.marketingActivities && c.marketingActivities.length > 0;
                                        const hasAdmissions = c.admissionsCount > 0;
                                        const coursesList = Object.entries(c.coursesBreakdown || {});

                                        return (
                                            <tr
                                                key={c.centreId}
                                                className={`transition-colors ${
                                                    isDark
                                                        ? "hover:bg-slate-800/40 border-slate-800/40"
                                                        : "hover:bg-slate-50 border-slate-100"
                                                }`}
                                            >
                                                {/* Index */}
                                                <td className={`py-3.5 px-4 text-center font-bold ${
                                                    isDark ? "text-slate-500" : "text-slate-400"
                                                }`}>
                                                    {idx + 1}
                                                </td>

                                                {/* Centre Name */}
                                                <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-100 dark:text-slate-100 text-[13px]">
                                                            {c.centreName}
                                                        </span>
                                                        {c.code && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                                                isDark ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600"
                                                            }`}>
                                                                {c.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Calls */}
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                                                        c.callsCount > 0
                                                            ? isDark
                                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : isDark ? "text-slate-600" : "text-slate-400"
                                                    }`}>
                                                        <FaPhoneAlt className="text-[10px]" />
                                                        {c.callsCount}
                                                    </span>
                                                </td>

                                                {/* Walk-ins */}
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                                                        c.walkInCount > 0
                                                            ? isDark
                                                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                                : "bg-amber-50 text-amber-700 border border-amber-200"
                                                            : isDark ? "text-slate-600" : "text-slate-400"
                                                    }`}>
                                                        <FaWalking className="text-[10px]" />
                                                        {c.walkInCount}
                                                    </span>
                                                </td>

                                                {/* Counselling */}
                                                <td className="py-3.5 px-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                                                        c.counsellingCount > 0
                                                            ? isDark
                                                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                                : "bg-purple-50 text-purple-700 border border-purple-200"
                                                            : isDark ? "text-slate-600" : "text-slate-400"
                                                    }`}>
                                                        <FaHandsHelping className="text-[10px]" />
                                                        {c.counsellingCount}
                                                    </span>
                                                </td>

                                                {/* Marketing (Schools & Purpose) */}
                                                <td className="py-3.5 px-4 max-w-xs">
                                                    {hasMarketing ? (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                                                    isDark ? "bg-pink-500/15 text-pink-400 border border-pink-500/30" : "bg-pink-50 text-pink-700 border border-pink-200"
                                                                }`}>
                                                                    <GiSchoolBag className="text-xs" />
                                                                    {c.marketingCount} {c.marketingCount === 1 ? "activity" : "activities"}
                                                                </span>

                                                                <button
                                                                    onClick={() => setMarketingModalCentre(c)}
                                                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 transition-colors cursor-pointer ${
                                                                        isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-800"
                                                                    }`}
                                                                >
                                                                    <span>Details</span>
                                                                    <FaExternalLinkAlt className="text-[9px]" />
                                                                </button>
                                                            </div>

                                                            {/* Quick preview of institutions */}
                                                            <div className="flex flex-wrap gap-1">
                                                                {c.marketingActivities.slice(0, 2).map((act, i) => (
                                                                    <span
                                                                        key={i}
                                                                        title={`${act.institution} - ${act.activityType} (${act.outcome})`}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-[140px] ${
                                                                            isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"
                                                                        }`}
                                                                    >
                                                                        {act.institution}
                                                                    </span>
                                                                ))}
                                                                {c.marketingActivities.length > 2 && (
                                                                    <span className={`text-[10px] px-1 rounded ${
                                                                        isDark ? "text-slate-500" : "text-slate-400"
                                                                    }`}>
                                                                        +{c.marketingActivities.length - 2} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-[11px] font-medium italic ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                                            No marketing
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Admissions & Course Breakdown with HOVER INTERACTIVITY */}
                                                <td
                                                    className="py-3.5 px-4 max-w-sm relative"
                                                    onMouseEnter={(e) => {
                                                        if (hasAdmissions) {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setHoveredAdmission({ centre: c, rect });
                                                        }
                                                    }}
                                                    onMouseLeave={() => setHoveredAdmission(null)}
                                                >
                                                    {hasAdmissions ? (
                                                        <div className="space-y-1.5 cursor-pointer">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold shadow-sm transition-all hover:scale-105 ${
                                                                    isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                                                }`}>
                                                                    <FaGraduationCap className="text-xs" />
                                                                    {c.admissionsCount} {c.admissionsCount === 1 ? "Admission" : "Admissions"}
                                                                </span>

                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setCoursesModalCentre(c);
                                                                    }}
                                                                    className={`inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 transition-colors cursor-pointer ${
                                                                        isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-800"
                                                                    }`}
                                                                >
                                                                    <span>All Courses</span>
                                                                </button>
                                                            </div>

                                                            {/* Course Chips with full hover titles */}
                                                            <div className="flex flex-wrap gap-1">
                                                                {coursesList.slice(0, 3).map(([cName, count], i) => (
                                                                    <span
                                                                        key={i}
                                                                        title={`${cName}: ${count} student(s)`}
                                                                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 transition-all hover:border-cyan-400 ${
                                                                            isDark
                                                                                ? "bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-750"
                                                                                : "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                                                                        }`}
                                                                    >
                                                                        <span className="truncate max-w-[120px]">{cName}</span>
                                                                        <span className={`px-1 py-0.2 rounded-full text-[9px] font-black ${
                                                                            isDark ? "bg-cyan-500/30 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                                                                        }`}>
                                                                            {count}
                                                                        </span>
                                                                    </span>
                                                                ))}
                                                                {coursesList.length > 3 && (
                                                                    <span
                                                                        title={`Click or hover to view all ${coursesList.length} courses`}
                                                                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                                                            isDark ? "bg-cyan-950/60 text-cyan-400 border border-cyan-800" : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                                                        }`}
                                                                    >
                                                                        +{coursesList.length - 3} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-[11px] font-medium italic ${isDark ? "text-slate-600" : "text-slate-400"}`}>
                                                            0 admissions
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Fresh Collection (Without GST) */}
                                                <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                                    <div>
                                                        <span className={`font-bold text-xs ${
                                                            c.freshCollection > 0
                                                                ? isDark ? "text-emerald-400" : "text-emerald-700"
                                                                : isDark ? "text-slate-600" : "text-slate-400"
                                                        }`}>
                                                            {formatCurrency(c.freshCollection)}
                                                        </span>
                                                        {c.freshCollectionWithGst > 0 && (
                                                            <span className={`block text-[9px] font-medium opacity-65 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                                Incl: {formatCurrency(c.freshCollectionWithGst)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* EMI Collection (Without GST) */}
                                                <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                                    <div>
                                                        <span className={`font-bold text-xs ${
                                                            c.emiCollection > 0
                                                                ? isDark ? "text-indigo-400" : "text-indigo-700"
                                                                : isDark ? "text-slate-600" : "text-slate-400"
                                                        }`}>
                                                            {formatCurrency(c.emiCollection)}
                                                        </span>
                                                        {c.emiCollectionWithGst > 0 && (
                                                            <span className={`block text-[9px] font-medium opacity-65 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                                                Incl: {formatCurrency(c.emiCollectionWithGst)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Total Collection (Without GST) */}
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div>
                                                        <span className={`text-[13px] font-black px-2.5 py-1 rounded-lg inline-block ${
                                                            c.totalCollection > 0
                                                                ? isDark
                                                                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                                                                    : "bg-blue-50 text-blue-800 border border-blue-200"
                                                                : isDark ? "text-slate-600" : "text-slate-400"
                                                        }`}>
                                                            {formatCurrency(c.totalCollection)}
                                                        </span>
                                                        {c.totalCollectionWithGst > 0 && (
                                                            <span className={`block text-[9px] font-bold mt-0.5 opacity-70 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                                                Incl. GST: {formatCurrency(c.totalCollectionWithGst)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>

                            {/* Consolidated Table Footer */}
                            {!loading && filteredCentres.length > 0 && (
                                <tfoot>
                                    <tr className={`border-t-2 font-black uppercase tracking-wider text-xs ${
                                        isDark
                                            ? "bg-slate-950/90 text-slate-200 border-slate-700"
                                            : "bg-slate-200 text-slate-900 border-slate-300"
                                    }`}>
                                        <td colSpan={2} className="py-4 px-4 text-left font-black">
                                            Total ({filteredSummary.totalCentres} Centres)
                                        </td>
                                        <td className="py-4 px-3 text-center text-emerald-500">
                                            {filteredSummary.totalCalls}
                                        </td>
                                        <td className="py-4 px-3 text-center text-amber-500">
                                            {filteredSummary.totalWalkIns}
                                        </td>
                                        <td className="py-4 px-3 text-center text-purple-500">
                                            {filteredSummary.totalCounselling}
                                        </td>
                                        <td className="py-4 px-4 text-pink-500">
                                            {filteredSummary.totalMarketingActivities} Visits ({filteredSummary.totalSchoolsVisited} Schools)
                                        </td>
                                        <td className="py-4 px-4 text-cyan-500">
                                            {filteredSummary.totalAdmissions} Admissions
                                        </td>
                                        <td className="py-4 px-3 text-right">
                                            <span className="text-emerald-500 block">
                                                {formatCurrency(filteredSummary.totalFreshCollection)}
                                            </span>
                                            {filteredSummary.totalFreshCollectionWithGst > 0 && (
                                                <span className={`text-[9px] block font-normal lowercase ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                                    incl: {formatCurrency(filteredSummary.totalFreshCollectionWithGst)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-3 text-right">
                                            <span className="text-indigo-500 block">
                                                {formatCurrency(filteredSummary.totalEmiCollection)}
                                            </span>
                                            {filteredSummary.totalEmiCollectionWithGst > 0 && (
                                                <span className={`text-[9px] block font-normal lowercase ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                                    incl: {formatCurrency(filteredSummary.totalEmiCollectionWithGst)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <span className="text-blue-400 text-sm block font-black">
                                                {formatCurrency(filteredSummary.totalCollection)}
                                            </span>
                                            {filteredSummary.totalCollectionWithGst > 0 && (
                                                <span className={`text-[9px] block font-normal lowercase ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                                    incl: {formatCurrency(filteredSummary.totalCollectionWithGst)}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* 4. Interactive Floating Hover Card for Admissions Course Breakdown */}
                {hoveredAdmission && hoveredAdmission.centre.admissionsCount > 0 && (
                    <div
                        className="fixed z-50 pointer-events-none transition-all duration-150 animate-fade-in"
                        style={{
                            left: Math.min(
                                Math.max(16, hoveredAdmission.rect.left + hoveredAdmission.rect.width / 2 - 160),
                                window.innerWidth - 340
                            ),
                            top: hoveredAdmission.rect.top > 260
                                ? hoveredAdmission.rect.top - 12
                                : hoveredAdmission.rect.bottom + 12,
                            transform: hoveredAdmission.rect.top > 260 ? "translateY(-100%)" : "translateY(0)"
                        }}
                    >
                        <div className={`w-80 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
                            isDark
                                ? "bg-slate-900/95 border-cyan-500/40 text-slate-100 shadow-cyan-950/50"
                                : "bg-white/95 border-cyan-300 text-slate-900 shadow-xl"
                        }`}>
                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b pb-2.5 mb-2.5 border-slate-700/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <FaGraduationCap className="text-xs" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-xs uppercase tracking-tight">
                                            {hoveredAdmission.centre.centreName}
                                        </h4>
                                        <span className={`text-[10px] block ${isDark ? "text-slate-400" : "text-slate-500"}`}>Enrolled Courses</span>
                                    </div>
                                </div>

                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                                    isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-cyan-100 text-cyan-800"
                                }`}>
                                    {hoveredAdmission.centre.admissionsCount} {hoveredAdmission.centre.admissionsCount === 1 ? "Admission" : "Admissions"}
                                </span>
                            </div>

                            {/* Course List: Simple Course Names Only */}
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {Object.keys(hoveredAdmission.centre.coursesBreakdown || {}).map((cName, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-start gap-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                                            isDark
                                                ? "bg-slate-800/60 hover:bg-slate-800/90 text-slate-200"
                                                : "bg-slate-100 hover:bg-slate-200/70 text-slate-800"
                                        }`}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                                        <span className="leading-snug break-words">
                                            {cName}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Card Footer hint */}
                            <div className={`mt-2.5 pt-2 border-t text-[10px] flex items-center justify-between ${
                                isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"
                            }`}>
                                <span className="flex items-center gap-1">
                                    <FaInfoCircle className="text-[9px] text-cyan-400" />
                                    <span>Period: {dateDisplayLabel}</span>
                                </span>
                                <span className="font-semibold text-cyan-400">Click to view modal</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Marketing Details Modal */}
                {marketingModalCentre && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                        }`}>
                            {/* Modal Header */}
                            <div className={`p-5 border-b flex items-center justify-between ${
                                isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                                        <GiSchoolBag className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">
                                            Marketing Activities - {marketingModalCentre.centreName}
                                        </h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Activities conducted for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMarketingModalCentre(null)}
                                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                        isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"
                                    }`}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto space-y-3.5">
                                {marketingModalCentre.marketingActivities.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 text-xs">
                                        No marketing activities recorded for this centre in this period.
                                    </div>
                                ) : (
                                    marketingModalCentre.marketingActivities.map((act, index) => (
                                        <div
                                            key={act._id || index}
                                            className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                                                isDark ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                                            }`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-cyan-400">
                                                        {act.institution}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                        isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
                                                    }`}>
                                                        {act.activityType}
                                                    </span>
                                                </div>

                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                    act.status === "Approved"
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : "bg-amber-500/20 text-amber-400"
                                                }`}>
                                                    {act.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Activity Purpose
                                                    </span>
                                                    <p className="font-medium mt-0.5">{act.activityPurpose || "-"}</p>
                                                </div>

                                                <div>
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Executive / Marketer
                                                    </span>
                                                    <p className="font-medium mt-0.5">{act.marketerName || "-"}</p>
                                                </div>

                                                <div className="md:col-span-2">
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Remarks
                                                    </span>
                                                    <p className={`p-2.5 rounded-lg border mt-1 ${
                                                        isDark ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                                                    }`}>
                                                        {act.remarks || "No remarks logged."}
                                                    </p>
                                                </div>

                                                <div>
                                                    <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                        Outcome / Results
                                                    </span>
                                                    <p className="font-bold text-emerald-400 mt-0.5">{act.outcome || "-"}</p>
                                                </div>

                                                {act.nextActivityDate && (
                                                    <div>
                                                        <span className={`text-[11px] font-bold uppercase block ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                                                            Next Scheduled Date
                                                        </span>
                                                        <p className="font-semibold text-cyan-400 mt-0.5">{act.nextActivityDate}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className={`p-4 border-t flex justify-end ${
                                isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}>
                                <button
                                    onClick={() => setMarketingModalCentre(null)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                                    }`}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Course Breakdown Modal */}
                {coursesModalCentre && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                        <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
                            isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                        }`}>
                            <div className={`p-5 border-b flex items-center justify-between ${
                                isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                        <FaGraduationCap className="text-lg" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black">
                                            Course Breakdown - {coursesModalCentre.centreName}
                                        </h3>
                                        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                            Total {coursesModalCentre.admissionsCount} admissions for {dateDisplayLabel}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCoursesModalCentre(null)}
                                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                                        isDark ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-600"
                                    }`}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
                                {Object.entries(coursesModalCentre.coursesBreakdown || {}).map(([cName, count], idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                            isDark ? "bg-slate-950/50 border-slate-800" : "bg-slate-50 border-slate-200"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                                            <span className="font-bold text-xs">{cName}</span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-black flex-shrink-0 ${
                                            isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                                        }`}>
                                            {count} {count === 1 ? "student" : "students"}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className={`p-4 border-t flex justify-end ${
                                isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}>
                                <button
                                    onClick={() => setCoursesModalCentre(null)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                                    }`}
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

export default DailyReport;
