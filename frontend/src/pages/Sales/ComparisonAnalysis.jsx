import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaSync, FaDownload, FaSun, FaMoon, FaChartLine, FaPlus, FaEdit, FaCalendarAlt, FaChartBar, FaRegClock } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import AddComparisonTargetModal from "../../components/Sales/AddComparisonTargetModal";

const monthNames = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March"
];

const ComparisonAnalysis = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [centres, setCentres] = useState([]);
    const [zones, setZones] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);

    // Default to the current month name (dynamically shifts month-to-month)
    const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
    const matchedMonth = monthNames.find(m => m.toLowerCase() === currentMonthName.toLowerCase()) || "April";
    const [selectedMonths, setSelectedMonths] = useState([matchedMonth]);
    
    const [comparisonData, setComparisonData] = useState([]);
    const [loading, setLoading] = useState(true);

    // View mode: 'month' | 'year' | 'day'
    const [viewMode, setViewMode] = useState('month');

    // Year-wise: full 12-month aggregated data
    const [yearData, setYearData] = useState([]);

    // Day-wise: current month data for day-level comparison
    const [dayData, setDayData] = useState([]);
    const [selectedDayDate, setSelectedDayDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));

    // Selected date info for day-wise calculations
    const todayRef = React.useMemo(() => {
        const parts = (selectedDayDate || '').split('-');
        let t;
        if (parts.length === 3) {
            t = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        } else {
            t = new Date();
        }
        const day = t.getDate();
        const daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
        const monthName = t.toLocaleString('en-US', { month: 'long' });
        const todayStr = t.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        // Previous year same date string
        const prevT = new Date(t);
        prevT.setFullYear(prevT.getFullYear() - 1);
        const prevDayStr = prevT.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        return { day, daysInMonth, monthName, todayStr, prevDayStr, rawDate: selectedDayDate };
    }, [selectedDayDate]);

    // Track request versions to avoid async race conditions
    const requestVersionRef = useRef(0);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState(null);

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        fetchComparisonData();
    }, [selectedCentres, selectedZones, selectedMonths]);

    // Re-fetch year data when filters change (if in year mode) or when year mode is first activated
    useEffect(() => {
        if (viewMode === 'year') {
            fetchComparisonDataAllMonths();
        }
    }, [viewMode, selectedCentres, selectedZones]);

    // Re-fetch day data when filters change, date changes, or day mode activated
    useEffect(() => {
        if (viewMode === 'day') {
            fetchComparisonDataDayWise();
        }
    }, [viewMode, selectedCentres, selectedZones, selectedDayDate]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            
            const [centreRes, sessionRes, zoneRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/zone`, { headers })
            ]);

            if (centreRes.ok) {
                const resData = await centreRes.json();
                let centerList = Array.isArray(resData) ? resData : resData.centres || [];

                // Filter by allocated centers if not superAdmin
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
            }

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                setSessions(sessionData || []);
            }

            if (zoneRes.ok) {
                const zData = await zoneRes.json();
                const zoneList = Array.isArray(zData) ? zData : (zData.data || []);
                const activeZones = zoneList.filter(z => z.isActive !== false);
                setZones(activeZones.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
            }
        } catch (error) {
            console.error("Error fetching master data:", error);
            toast.error("Failed to load master data");
        }
    };

    const fetchComparisonData = async () => {
        const currentVersion = ++requestVersionRef.current;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            
            if (selectedCentres.length > 0) {
                params.append("centreIds", selectedCentres.join(","));
            }
            if (selectedZones.length > 0) {
                params.append("zoneIds", selectedZones.join(","));
            }
            if (selectedMonths.length > 0) {
                params.append("months", selectedMonths.join(","));
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/comparison-analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const resData = await response.json();
            
            if (currentVersion !== requestVersionRef.current) {
                return; // Discard stale response
            }

            if (response.ok) {
                setComparisonData(resData.data || []);
            } else {
                toast.error(resData.message || "Failed to load comparison data");
            }
        } catch (error) {
            if (currentVersion !== requestVersionRef.current) {
                return;
            }
            console.error("Error fetching comparison data:", error);
            toast.error("Failed to load comparison data");
        } finally {
            if (currentVersion === requestVersionRef.current) {
                setLoading(false);
            }
        }
    };

    // Fetch ALL months for year-wise view (no month filter)
    const fetchComparisonDataAllMonths = async () => {
        const currentVersion = ++requestVersionRef.current;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedZones.length > 0) params.append("zoneIds", selectedZones.join(","));
            // No months param → backend returns all months

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/comparison-analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const resData = await response.json();
            if (currentVersion !== requestVersionRef.current) return;
            if (response.ok) {
                setYearData(resData.data || []);
            } else {
                toast.error(resData.message || "Failed to load year comparison data");
            }
        } catch (error) {
            if (currentVersion !== requestVersionRef.current) return;
            console.error("Error fetching year comparison data:", error);
            toast.error("Failed to load year comparison data");
        } finally {
            if (currentVersion === requestVersionRef.current) setLoading(false);
        }
    };

    // Fetch day-wise data: actual daily target (from DailyTarget) + today's live achievement
    const fetchComparisonDataDayWise = async () => {
        const currentVersion = ++requestVersionRef.current;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedZones.length > 0) params.append("zoneIds", selectedZones.join(","));
            if (selectedDayDate) params.append("date", selectedDayDate);

            // Hit the dedicated day-wise endpoint
            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/comparison-analysis/day-data?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const resData = await response.json();
            if (currentVersion !== requestVersionRef.current) return;
            if (response.ok) {
                setDayData(resData.data || []);
            } else {
                toast.error(resData.message || "Failed to load day comparison data");
            }
        } catch (error) {
            if (currentVersion !== requestVersionRef.current) return;
            console.error("Error fetching day comparison data:", error);
            toast.error("Failed to load day comparison data");
        } finally {
            if (currentVersion === requestVersionRef.current) setLoading(false);
        }
    };

    // Aggregate year-wise data: sum all months per centre
    const yearWiseData = React.useMemo(() => {
        const sourceData = yearData.length > 0 ? yearData : comparisonData;
        const centreMap = {};
        sourceData.forEach(row => {
            const id = row.centre._id;
            if (!centreMap[id]) {
                centreMap[id] = { centre: row.centre, target2526: 0, achieved2526: 0, target2627: 0, achieved2627: 0 };
            }
            centreMap[id].target2526   += row.target2526   || 0;
            centreMap[id].achieved2526 += row.achieved2526 || 0;
            centreMap[id].target2627   += row.target2627   || 0;
            centreMap[id].achieved2627 += row.achieved2627 || 0;
        });
        return Object.values(centreMap).sort((a, b) =>
            (a.centre.centreName || "").localeCompare(b.centre.centreName || "")
        );
    }, [yearData, comparisonData]);

    // Day-wise data: uses actual DailyTarget (set in tracking system) for current year
    // and pro-rates previous year's monthly achievement to today's day
    const dayWiseData = React.useMemo(() => {
        const { day, daysInMonth } = todayRef;

        // Map month-wise comparison data for current day's month
        const monthMap = {};
        comparisonData.forEach(r => {
            if (r.month?.toLowerCase() === todayRef.monthName?.toLowerCase()) {
                monthMap[r.centre._id?.toString()] = r;
            }
        });

        if (dayData.length > 0 && dayData[0].currDayTarget !== undefined) {
            // New API shape: direct data from /day-data endpoint
            return dayData.map(row => {
                const days = row.daysInMonth || daysInMonth || 30;
                const cid = row.centre._id?.toString();
                const mData = monthMap[cid];

                let prevTarget = row.prevYearMonthTarget || 0;
                let prevAchieved = row.prevYearMonthAchieved || 0;
                let currTarget = row.currDayTarget || 0;
                let currActual = row.currDayActual || 0;

                // When centre target and achievement is 0 in month-wise tab section,
                // the achieved and target amount should not be shown in day-wise
                if (mData) {
                    if ((mData.target2526 || 0) === 0 && (mData.achieved2526 || 0) === 0) {
                        prevTarget = 0;
                        prevAchieved = 0;
                    }
                    if ((mData.target2627 || 0) === 0 && (mData.achieved2627 || 0) === 0) {
                        currTarget = 0;
                        currActual = 0;
                    }
                }

                return {
                    centre: row.centre,
                    // Previous year: both monthly target and monthly achieved divided by days in month (÷ 30)
                    prevYearDayTarget: prevTarget / days,
                    prevYearDayAmt: prevAchieved / days,
                    prevYearMonthTotal: prevAchieved,
                    prevYearTarget: prevTarget,
                    daysInMonth: days,
                    // Current year: actual daily target + actual today's achievement
                    currYearDayAmt: currActual,
                    currYearTarget: currTarget,
                    hasDailyTarget: currTarget > 0,
                };
            }).sort((a, b) => (a.centre.centreName || "").localeCompare(b.centre.centreName || ""));
        }

        // Fallback to old comparisonData pro-rating if dedicated API hasn't returned yet
        const sourceData = comparisonData.filter(r => r.month === todayRef.monthName);
        const centreMap = {};
        sourceData.forEach(row => {
            const id = row.centre._id;
            if (!centreMap[id]) {
                const days = daysInMonth || 30;
                const prevTarget = (row.target2526 || 0) === 0 && (row.achieved2526 || 0) === 0 ? 0 : (row.target2526 || 0);
                const prevAchieved = (row.target2526 || 0) === 0 && (row.achieved2526 || 0) === 0 ? 0 : (row.achievedExclGST2526 || row.achieved2526 || 0);
                const currTarget = (row.target2627 || 0) === 0 && (row.achieved2627 || 0) === 0 ? 0 : (row.target2627 || 0);
                const currAchieved = (row.target2627 || 0) === 0 && (row.achieved2627 || 0) === 0 ? 0 : (row.achieved2627 || 0);

                centreMap[id] = {
                    centre: row.centre,
                    prevYearDayTarget: prevTarget / days,
                    prevYearDayAmt: prevAchieved / days,
                    prevYearMonthTotal: prevAchieved,
                    prevYearTarget: prevTarget,
                    daysInMonth: days,
                    currYearDayAmt: currAchieved,
                    currYearTarget: currTarget / days,
                    hasDailyTarget: false,
                };
            }
        });
        return Object.values(centreMap).sort((a, b) =>
            (a.centre.centreName || "").localeCompare(b.centre.centreName || "")
        );
    }, [dayData, comparisonData, todayRef]);

    // Filter centres for dropdown by selected zones
    const zoneCentreIds = selectedZones.length > 0
        ? new Set(
            zones
                .filter(z => selectedZones.includes(z._id))
                .flatMap(z => (z.centres || []).map(c => (c._id || c).toString()))
          )
        : null;

    const availableCentres = zoneCentreIds
        ? centres.filter(c => zoneCentreIds.has(c._id.toString()))
        : centres;

    const calculateGrowth = (prev, curr) => {
        if (!prev || prev === 0) {
            if (curr && curr > 0) return "+100.0";
            return "0.0";
        }
        const pct = ((curr - prev) / prev) * 100;
        return (pct >= 0 ? "+" : "") + pct.toFixed(1);
    };

    const handleExport = () => {
        if (viewMode === 'month') {
            if (comparisonData.length === 0) { toast.warn("No data to export"); return; }
            const exportRows = comparisonData.map(row => ({
                "Centre Name": row.centre.centreName,
                "Month": row.month,
                "2025-2026 Target (Excl GST)": row.target2526,
                "2025-2026 Target (With GST)": row.target2526 * 1.18,
                "2025-2026 Achievement": row.achieved2526,
                "2026-2027 Target (Excl GST)": row.target2627,
                "2026-2027 Target (With GST)": row.target2627 * 1.18,
                "2026-2027 Achievement (With GST)": row.achieved2627,
                "Target Growth %": calculateGrowth(row.target2526, row.target2627) + "%",
                "Achievement Growth %": calculateGrowth(row.achieved2526, row.achieved2627) + "%"
            }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "Month-wise Comparison");
            saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), `Comparison_Month_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else if (viewMode === 'year') {
            if (yearWiseData.length === 0) { toast.warn("No data to export"); return; }
            const exportRows = yearWiseData.map(row => ({
                "Centre Name": row.centre.centreName,
                "FY 2025-2026 Total Target": row.target2526,
                "FY 2025-2026 Total Achievement": row.achieved2526,
                "FY 2026-2027 Total Target": row.target2627,
                "FY 2026-2027 Total Achievement": row.achieved2627,
                "Target Growth %": calculateGrowth(row.target2526, row.target2627) + "%",
                "Achievement Growth %": calculateGrowth(row.achieved2526, row.achieved2627) + "%"
            }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "Year-wise Comparison");
            saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), `Comparison_Year_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            if (dayWiseData.length === 0) { toast.warn("No data to export"); return; }
            const exportRows = dayWiseData.map(row => ({
                "Centre Name": row.centre.centreName,
                [`${todayRef.prevDayStr} (FY 25-26 Pro-rated)`]: Math.round(row.prevYearDayAmt),
                [`${todayRef.todayStr} (FY 26-27 Actual)`]: Math.round(row.currYearDayAmt),
                "YoY Day Growth %": calculateGrowth(row.prevYearDayAmt, row.currYearDayAmt) + "%",
                "FY 25-26 Full Month Achievement": Math.round(row.prevYearMonthTotal),
                "FY 26-27 Day Target (Pro-rated)": row.currYearTarget > 0 ? Math.round((row.currYearTarget / todayRef.daysInMonth) * todayRef.day) : 0
            }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows), "Day-wise Comparison");
            saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), `Comparison_Day_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    };

    // Aggregate summary stats (reflect active view)
    const aggregatedStats = React.useMemo(() => {
        if (viewMode === 'day') {
            return dayWiseData.reduce((acc, row) => {
                acc.totalTarget2526 += row.prevYearDayTarget || 0;
                acc.totalAchieved2526 += row.prevYearDayAmt || 0;
                acc.totalTarget2627 += row.currYearTarget || 0;
                acc.totalAchieved2627 += row.currYearDayAmt || 0;
                return acc;
            }, { totalTarget2526: 0, totalAchieved2526: 0, totalTarget2627: 0, totalAchieved2627: 0 });
        }
        const activeRows = viewMode === 'month' ? comparisonData : yearWiseData;
        return activeRows.reduce((acc, row) => {
            acc.totalTarget2526 += row.target2526 || 0;
            acc.totalAchieved2526 += row.achieved2526 || 0;
            acc.totalTarget2627 += row.target2627 || 0;
            acc.totalAchieved2627 += row.achieved2627 || 0;
            return acc;
        }, { totalTarget2526: 0, totalAchieved2526: 0, totalTarget2627: 0, totalAchieved2627: 0 });
    }, [viewMode, comparisonData, yearWiseData, dayWiseData]);

    return (
        <Layout activePage="Sales">
            <div className={`space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'} p-4 md:p-8`}>
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
                            <FaChartLine className="text-cyan-400" /> Revenue Comparison Analysis
                        </h1>
                        <p className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} font-semibold`}>
                            Compare Target & Achievement between FY 2025-26 & FY 2026-27
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isDarkMode
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black'
                                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-50 hover:text-white'
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
                            <FaDownload size={14} /> Export Excel
                        </button>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className={`flex items-center gap-1 p-1 rounded-xl w-fit ${isDarkMode ? 'bg-[#1a1f24] border border-gray-800' : 'bg-gray-100 border border-gray-200'}`}>
                    <button
                        onClick={() => setViewMode('month')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
                            viewMode === 'month'
                                ? isDarkMode
                                    ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/10 border border-cyan-500/30'
                                    : 'bg-white text-cyan-600 shadow-md border border-cyan-200'
                                : isDarkMode
                                    ? 'text-gray-500 hover:text-gray-300'
                                    : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <FaCalendarAlt size={13} />
                        Month-wise
                    </button>
                    <button
                        onClick={() => {
                            setViewMode('year');
                            if (yearData.length === 0) fetchComparisonDataAllMonths();
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
                            viewMode === 'year'
                                ? isDarkMode
                                    ? 'bg-purple-500/20 text-purple-400 shadow-lg shadow-purple-500/10 border border-purple-500/30'
                                    : 'bg-white text-purple-600 shadow-md border border-purple-200'
                                : isDarkMode
                                    ? 'text-gray-500 hover:text-gray-300'
                                    : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <FaChartBar size={13} />
                        Year-wise
                    </button>
                    <button
                        onClick={() => {
                            setViewMode('day');
                            if (dayData.length === 0) fetchComparisonDataDayWise();
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
                            viewMode === 'day'
                                ? isDarkMode
                                    ? 'bg-orange-500/20 text-orange-400 shadow-lg shadow-orange-500/10 border border-orange-500/30'
                                    : 'bg-white text-orange-600 shadow-md border border-orange-200'
                                : isDarkMode
                                    ? 'text-gray-500 hover:text-gray-300'
                                    : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <FaRegClock size={13} />
                        Day-wise
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all duration-300`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {viewMode === 'day' ? 'FY 2025-2026 Day Target' : 'FY 2025-2026 Total Target'}
                        </span>
                        <div className="text-2xl font-black text-blue-500 mt-1">
                            ₹{Math.round(aggregatedStats.totalTarget2526).toLocaleString()}
                        </div>
                    </div>
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all duration-300`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {viewMode === 'day' ? 'FY 2025-2026 Day Achieved' : 'FY 2025-2026 Total Achieved'}
                        </span>
                        <div className="text-2xl font-black text-emerald-500 mt-1">
                            ₹{Math.round(aggregatedStats.totalAchieved2526).toLocaleString()}
                        </div>
                    </div>
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all duration-300`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {viewMode === 'day' ? "FY 2026-2027 Today's Target" : 'FY 2026-2027 Total Target'}
                        </span>
                        <div className="text-2xl font-black text-yellow-500 mt-1">
                            ₹{Math.round(aggregatedStats.totalTarget2627).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1">
                            Growth: {calculateGrowth(aggregatedStats.totalTarget2526, aggregatedStats.totalTarget2627)}%
                        </div>
                    </div>
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all duration-300`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {viewMode === 'day' ? "FY 2026-2027 Today's Achieved" : 'FY 2026-2027 Total Achieved'}
                        </span>
                        <div className="text-2xl font-black text-purple-500 mt-1">
                            ₹{Math.round(aggregatedStats.totalAchieved2627).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1">
                            Growth: {calculateGrowth(aggregatedStats.totalAchieved2526, aggregatedStats.totalAchieved2627)}%
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'} p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4`}>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <span className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <FaFilter className="text-cyan-400" /> Filters:
                        </span>
                        <div className="w-64">
                            <CustomMultiSelect
                                options={zones.map(z => ({ value: z._id, label: z.name }))}
                                value={zones.map(z => ({ value: z._id, label: z.name })).filter(opt => selectedZones.includes(opt.value))}
                                onChange={(selected) => {
                                    const nextZoneIds = selected ? selected.map(o => o.value) : [];
                                    setSelectedZones(nextZoneIds);
                                    if (nextZoneIds.length > 0) {
                                        const newZoneCentreIds = new Set(
                                            zones
                                                .filter(z => nextZoneIds.includes(z._id))
                                                .flatMap(z => (z.centres || []).map(c => (c._id || c).toString()))
                                        );
                                        setSelectedCentres(sc => sc.filter(cid => newZoneCentreIds.has(cid.toString())));
                                    }
                                }}
                                placeholder="All Zones"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div className="w-64">
                            <CustomMultiSelect
                                options={availableCentres.map(c => ({ value: c._id, label: c.centreName }))}
                                value={availableCentres.map(c => ({ value: c._id, label: c.centreName })).filter(opt => selectedCentres.includes(opt.value))}
                                onChange={(selected) => setSelectedCentres(selected ? selected.map(o => o.value) : [])}
                                placeholder="All Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        {viewMode === 'month' && (
                            <div className="w-64">
                                <CustomMultiSelect
                                    options={monthNames.map(m => ({ value: m, label: m }))}
                                    value={monthNames.map(m => ({ value: m, label: m })).filter(opt => selectedMonths.includes(opt.value))}
                                    onChange={(selected) => setSelectedMonths(selected ? selected.map(o => o.value) : [])}
                                    placeholder="All Months"
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        )}
                        {viewMode === 'year' && (
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${isDarkMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                                All Months (Full FY)
                            </span>
                        )}
                        {viewMode === 'day' && (
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm transition-all ${
                                    isDarkMode ? 'bg-[#131619] border-gray-700' : 'bg-white border-gray-300'
                                }`}>
                                    <span className="text-sm">📅</span>
                                    <input
                                        type="date"
                                        value={selectedDayDate}
                                        onChange={(e) => setSelectedDayDate(e.target.value)}
                                        className={`text-xs font-bold bg-transparent outline-none cursor-pointer ${
                                            isDarkMode ? 'text-orange-400 [color-scheme:dark]' : 'text-orange-600'
                                        }`}
                                    />
                                </div>
                                <span className={`text-xs font-bold px-3 py-2 rounded-lg ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
                                    Day {todayRef.day} of {todayRef.daysInMonth}
                                </span>
                                {selectedDayDate !== new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDayDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))}
                                        className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                                            isDarkMode 
                                                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300' 
                                                : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
                                        }`}
                                        title="Reset to today's date"
                                    >
                                        Today
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="p-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2 font-semibold"
                            onClick={() => viewMode === 'month' ? fetchComparisonData() : viewMode === 'year' ? fetchComparisonDataAllMonths() : fetchComparisonDataDayWise()}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} /> Sync Data
                        </button>
                        
                        <button
                            onClick={() => { setSelectedTarget(null); setShowAddModal(true); }}
                            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 font-semibold animate-in fade-in zoom-in-95 duration-200"
                        >
                            <FaPlus /> Add Target
                        </button>
                    </div>
                </div>

                {/* ─── MONTH-WISE TABLE ─── */}
                {viewMode === 'month' && (
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-xl border overflow-hidden`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr className={`uppercase font-black text-[10px] tracking-wider border-b transition-colors ${isDarkMode ? 'bg-black/20 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                        <th className={`px-6 py-4 sticky left-0 z-20 ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-gray-50'} border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.3)' }}>Centre Name</th>
                                        <th className="px-6 py-4">Month</th>
                                        <th className="px-6 py-4 text-center border-l border-gray-800/40 bg-blue-500/5">25-26 Target</th>
                                        <th className="px-6 py-4 text-center bg-blue-500/5">25-26 Achievement</th>
                                        <th className="px-6 py-4 text-center border-l border-gray-800/40 bg-yellow-500/5">26-27 Target</th>
                                        <th className="px-6 py-4 text-center bg-yellow-500/5">26-27 Achievement</th>
                                        <th className="px-6 py-4 text-center border-l border-gray-800/40">Target Growth %</th>
                                        <th className="px-6 py-4 text-center">Ach. Growth %</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'} text-xs font-semibold`}>
                                    {loading ? (
                                        <tr><td colSpan="9" className="px-6 py-12 text-center text-cyan-400 font-bold">Loading comparative data...</td></tr>
                                    ) : comparisonData.length === 0 ? (
                                        <tr><td colSpan="9" className="px-6 py-12 text-center text-gray-500 font-medium">No comparison data found. Please adjust filters.</td></tr>
                                    ) : (
                                        comparisonData.map((row, idx) => {
                                            const targetDiff = calculateGrowth(row.target2526, row.target2627);
                                            const achievedDiff = calculateGrowth(row.achieved2526, row.achieved2627);
                                            return (
                                                <tr key={`${row.centre._id}-${row.month}-${idx}`} className={`${isDarkMode ? 'hover:bg-[#131619] text-gray-400' : 'hover:bg-gray-50 text-gray-700'} transition-all duration-200`}>
                                                    <td className={`px-6 py-4 font-bold sticky left-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] text-white border-r border-gray-800' : 'bg-white text-gray-900 border-r border-gray-100'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.15)' }}>{row.centre.centreName}</td>
                                                    <td className={`px-6 py-4 ${isDarkMode ? 'text-cyan-100' : 'text-cyan-700'} font-bold`}>{row.month}</td>
                                                    <td className="px-6 py-4 font-bold text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400">{(row.target2526 || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 font-bold text-center bg-blue-500/5 text-emerald-500">{(row.achieved2526 || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 font-bold text-center border-l border-gray-800/40 bg-yellow-500/5 text-yellow-500">{(row.target2627 || 0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 font-bold text-center bg-yellow-500/5 text-purple-500">{row.achieved2627.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                    <td className={`px-6 py-4 font-black text-center border-l border-gray-800/40 ${targetDiff.startsWith('+') ? 'text-green-500' : targetDiff.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>{targetDiff}%</td>
                                                    <td className={`px-6 py-4 font-black text-center ${achievedDiff.startsWith('+') ? 'text-green-500' : achievedDiff.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>{achievedDiff}%</td>
                                                    <td className="px-6 py-4 text-right">
                                                        {row.targetId2526 ? (
                                                            <button onClick={() => { setSelectedTarget(row); setShowAddModal(true); }} className="text-cyan-500 hover:text-cyan-400 transition-colors p-1" title="Edit FY 2025-2026 data"><FaEdit size={16} /></button>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-600 font-bold uppercase select-none">No Record</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── YEAR-WISE TABLE ─── */}
                {viewMode === 'year' && (
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-xl border overflow-hidden`}>
                        {/* Banner */}
                        <div className={`px-6 py-3 flex items-center gap-3 border-b ${isDarkMode ? 'bg-purple-500/5 border-gray-800' : 'bg-purple-50 border-purple-100'}`}>
                            <FaChartBar className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                            <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                                Year-wise Comparison — Full FY 2025-26 vs FY 2026-27 (All Months Aggregated)
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    {/* Grouped year headers */}
                                    <tr className={`uppercase font-black text-[10px] tracking-wider border-b ${isDarkMode ? 'bg-black/20 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                        <th className={`px-6 py-4 sticky left-0 z-20 ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-gray-50'} border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.3)' }} rowSpan="2">Centre Name</th>
                                        <th className="px-6 py-3 text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400" colSpan="2">FY 2025-2026</th>
                                        <th className="px-6 py-3 text-center border-l border-gray-800/40 bg-yellow-500/5 text-yellow-400" colSpan="2">FY 2026-2027</th>
                                        <th className="px-6 py-3 text-center border-l border-gray-800/40" rowSpan="2">Target Growth %</th>
                                        <th className="px-6 py-3 text-center" rowSpan="2">Ach. Growth %</th>
                                    </tr>
                                    <tr className={`uppercase font-black text-[10px] tracking-wider border-b ${isDarkMode ? 'bg-black/10 text-gray-500 border-gray-800' : 'bg-gray-50/60 text-gray-400 border-gray-200'}`}>
                                        <th className="px-6 py-2 text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400/80">Total Target</th>
                                        <th className="px-6 py-2 text-center bg-blue-500/5 text-emerald-500/80">Total Achievement</th>
                                        <th className="px-6 py-2 text-center border-l border-gray-800/40 bg-yellow-500/5 text-yellow-500/80">Total Target</th>
                                        <th className="px-6 py-2 text-center bg-yellow-500/5 text-purple-500/80">Total Achievement</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'} text-xs font-semibold`}>
                                    {loading ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-purple-400 font-bold">Loading year-wise data...</td></tr>
                                    ) : yearWiseData.length === 0 ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-medium">No year comparison data found. Please adjust filters.</td></tr>
                                    ) : (
                                        yearWiseData.map((row, idx) => {
                                            const targetDiff   = calculateGrowth(row.target2526,   row.target2627);
                                            const achievedDiff = calculateGrowth(row.achieved2526, row.achieved2627);
                                            const pct2526 = row.target2526 > 0 ? ((row.achieved2526 / row.target2526) * 100).toFixed(1) : '0.0';
                                            const pct2627 = row.target2627 > 0 ? ((row.achieved2627 / row.target2627) * 100).toFixed(1) : '0.0';
                                            return (
                                                <tr key={`year-${row.centre._id}-${idx}`} className={`${isDarkMode ? 'hover:bg-[#131619] text-gray-400' : 'hover:bg-gray-50 text-gray-700'} transition-all duration-200`}>
                                                    <td className={`px-6 py-4 font-bold sticky left-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] text-white border-r border-gray-800' : 'bg-white text-gray-900 border-r border-gray-100'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.15)' }}>{row.centre.centreName}</td>
                                                    <td className="px-6 py-4 text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400 font-bold">₹{Math.round(row.target2526).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-center bg-blue-500/5">
                                                        <div className="text-emerald-500 font-bold">₹{Math.round(row.achieved2526).toLocaleString()}</div>
                                                        <div className={`text-[10px] font-bold mt-0.5 ${parseFloat(pct2526) >= 100 ? 'text-green-500' : parseFloat(pct2526) >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{pct2526}% of target</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center border-l border-gray-800/40 bg-yellow-500/5 text-yellow-500 font-bold">₹{Math.round(row.target2627).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-center bg-yellow-500/5">
                                                        <div className="text-purple-500 font-bold">₹{Math.round(row.achieved2627).toLocaleString()}</div>
                                                        <div className={`text-[10px] font-bold mt-0.5 ${parseFloat(pct2627) >= 100 ? 'text-green-500' : parseFloat(pct2627) >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{pct2627}% of target</div>
                                                    </td>
                                                    <td className={`px-6 py-4 font-black text-center border-l border-gray-800/40 ${targetDiff.startsWith('+') ? 'text-green-500' : targetDiff.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>{targetDiff}%</td>
                                                    <td className={`px-6 py-4 font-black text-center ${achievedDiff.startsWith('+') ? 'text-green-500' : achievedDiff.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>{achievedDiff}%</td>
                                                </tr>
                                            );
                                        })
                                    )}

                                    {/* Grand Total Row */}
                                    {!loading && yearWiseData.length > 0 && (() => {
                                        const tt2526  = yearWiseData.reduce((s, r) => s + (r.target2526   || 0), 0);
                                        const ta2526  = yearWiseData.reduce((s, r) => s + (r.achieved2526 || 0), 0);
                                        const tt2627  = yearWiseData.reduce((s, r) => s + (r.target2627   || 0), 0);
                                        const ta2627  = yearWiseData.reduce((s, r) => s + (r.achieved2627 || 0), 0);
                                        const tgGrowth = calculateGrowth(tt2526, tt2627);
                                        const taGrowth = calculateGrowth(ta2526, ta2627);
                                        const tPct2526 = tt2526 > 0 ? ((ta2526 / tt2526) * 100).toFixed(1) : '0.0';
                                        const tPct2627 = tt2627 > 0 ? ((ta2627 / tt2627) * 100).toFixed(1) : '0.0';
                                        return (
                                            <tr className={`font-black text-xs border-t-2 ${isDarkMode ? 'border-gray-600 bg-black/30 text-white' : 'border-gray-300 bg-gray-100 text-gray-900'}`}>
                                                <td className={`px-6 py-4 sticky left-0 z-10 uppercase tracking-widest text-[10px] ${isDarkMode ? 'bg-black/30 border-r border-gray-700' : 'bg-gray-100 border-r border-gray-300'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.15)' }}>Grand Total</td>
                                                <td className="px-6 py-4 text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400">₹{Math.round(tt2526).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center bg-blue-500/5">
                                                    <div className="text-emerald-500">₹{Math.round(ta2526).toLocaleString()}</div>
                                                    <div className={`text-[10px] mt-0.5 ${parseFloat(tPct2526) >= 100 ? 'text-green-500' : parseFloat(tPct2526) >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{tPct2526}% of target</div>
                                                </td>
                                                <td className="px-6 py-4 text-center border-l border-gray-800/40 bg-yellow-500/5 text-yellow-500">₹{Math.round(tt2627).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center bg-yellow-500/5">
                                                    <div className="text-purple-500">₹{Math.round(ta2627).toLocaleString()}</div>
                                                    <div className={`text-[10px] mt-0.5 ${parseFloat(tPct2627) >= 100 ? 'text-green-500' : parseFloat(tPct2627) >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{tPct2627}% of target</div>
                                                </td>
                                                <td className={`px-6 py-4 text-center border-l border-gray-800/40 ${tgGrowth.startsWith('+') ? 'text-green-500' : tgGrowth.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>{tgGrowth}%</td>
                                                <td className={`px-6 py-4 text-center ${taGrowth.startsWith('+') ? 'text-green-500' : taGrowth.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>{taGrowth}%</td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── DAY-WISE TABLE ─── */}
                {viewMode === 'day' && (
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-xl border overflow-hidden`}>
                        {/* Banner */}
                        <div className={`px-6 py-3 flex flex-wrap items-center gap-3 border-b ${isDarkMode ? 'bg-orange-500/5 border-gray-800' : 'bg-orange-50 border-orange-100'}`}>
                            <FaRegClock className={isDarkMode ? 'text-orange-400' : 'text-orange-600'} />
                            <span className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                                Day-wise Comparison — {todayRef.monthName} Day {todayRef.day}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500 border border-gray-200'}`}>
                                Previous Year: {todayRef.prevDayStr} (Target & Achieved ÷ {todayRef.daysInMonth} days)
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${isDarkMode ? 'bg-orange-500/10 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                                Current Year: {todayRef.todayStr} (live actual)
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                                <thead>
                                    <tr className={`uppercase font-black text-[10px] tracking-wider border-b ${isDarkMode ? 'bg-black/20 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                        <th className={`px-6 py-4 sticky left-0 z-20 ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-gray-50'} border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.3)' }} rowSpan="2">Centre Name</th>
                                        <th className="px-6 py-3 text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400" colSpan="2">
                                            FY 2025-26 &nbsp;·&nbsp; {todayRef.prevDayStr}
                                        </th>
                                        <th className="px-6 py-3 text-center border-l border-gray-800/40 bg-orange-500/5 text-orange-400" colSpan="2">
                                            FY 2026-27 &nbsp;·&nbsp; {todayRef.todayStr}
                                        </th>
                                        <th className="px-6 py-3 text-center border-l border-gray-800/40" rowSpan="2">Target Growth %</th>
                                        <th className="px-6 py-3 text-center" rowSpan="2">Ach. Growth %</th>
                                    </tr>
                                    <tr className={`uppercase font-black text-[10px] tracking-wider border-b ${isDarkMode ? 'bg-black/10 text-gray-500 border-gray-800' : 'bg-gray-50/60 text-gray-400 border-gray-200'}`}>
                                        <th className="px-6 py-2 text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400/80">
                                            Day Target (÷{todayRef.daysInMonth})
                                        </th>
                                        <th className="px-6 py-2 text-center bg-blue-500/5 text-emerald-500/80">Day Achieved (÷{todayRef.daysInMonth})</th>
                                        <th className="px-6 py-2 text-center border-l border-gray-800/40 bg-orange-500/5 text-orange-400/80">Today's Target (Daily Collection)</th>
                                        <th className="px-6 py-2 text-center bg-orange-500/5 text-purple-500/80">Day Actual (Excl. GST)</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'} text-xs font-semibold`}>
                                    {loading ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-orange-400 font-bold">Loading day-wise data...</td></tr>
                                    ) : dayWiseData.length === 0 ? (
                                        <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-medium">No day comparison data found. Please adjust filters.</td></tr>
                                    ) : (
                                        dayWiseData.map((row, idx) => {
                                            const targetGrowth = calculateGrowth(row.prevYearDayTarget, row.currYearTarget);
                                            const achGrowth = calculateGrowth(row.prevYearDayAmt, row.currYearDayAmt);
                                            // Today's target for current year (from daily tracking)
                                            const currDayTarget = row.currYearTarget || 0;
                                            const pctOfDayTarget = currDayTarget > 0
                                                ? ((row.currYearDayAmt / currDayTarget) * 100).toFixed(1)
                                                : '0.0';
                                            return (
                                                <tr key={`day-${row.centre._id}-${idx}`} className={`${isDarkMode ? 'hover:bg-[#131619] text-gray-400' : 'hover:bg-gray-50 text-gray-700'} transition-all duration-200`}>
                                                    {/* Centre Name sticky */}
                                                    <td className={`px-6 py-4 font-bold sticky left-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] text-white border-r border-gray-800' : 'bg-white text-gray-900 border-r border-gray-100'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.15)' }}>
                                                        {row.centre.centreName}
                                                    </td>

                                                    {/* Prev year day target — divided by actual month days */}
                                                    <td className="px-6 py-4 text-center border-l border-gray-800/40 bg-blue-500/5">
                                                        <div className="text-blue-400 font-bold">
                                                            {Math.round(row.prevYearDayTarget) > 0 ? `₹${Math.round(row.prevYearDayTarget).toLocaleString()}` : '0'}
                                                        </div>
                                                        {Math.round(row.prevYearDayTarget) > 0 && (
                                                            <div className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                target ÷{row.daysInMonth || todayRef.daysInMonth} days
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Prev year day achieved — divided by actual month days */}
                                                    <td className="px-6 py-4 text-center bg-blue-500/5">
                                                        <div className="text-emerald-500 font-bold">
                                                            {Math.round(row.prevYearDayAmt) > 0 ? `₹${Math.round(row.prevYearDayAmt).toLocaleString()}` : '0'}
                                                        </div>
                                                        {Math.round(row.prevYearDayAmt) > 0 && (
                                                            <div className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                achieved ÷{row.daysInMonth || todayRef.daysInMonth} days
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Current year day target — from DailyTarget (daily tracking system) */}
                                                    <td className="px-6 py-4 text-center border-l border-gray-800/40 bg-orange-500/5">
                                                        <div className="text-orange-400 font-bold">
                                                            {Math.round(row.currYearTarget) > 0 ? `₹${Math.round(row.currYearTarget).toLocaleString()}` : '0'}
                                                        </div>
                                                        {row.currYearTarget > 0 ? (
                                                            row.hasDailyTarget ? (
                                                                <div className="text-[10px] font-bold mt-0.5 text-green-500">
                                                                    ✓ Daily Collection Target
                                                                </div>
                                                            ) : (
                                                                <div className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                    not set
                                                                </div>
                                                            )
                                                        ) : (
                                                            <div className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                not set
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Current year day actual — excl. GST */}
                                                    <td className="px-6 py-4 text-center bg-orange-500/5">
                                                        <div className="text-purple-500 font-bold">
                                                            {Math.round(row.currYearDayAmt) > 0 ? `₹${Math.round(row.currYearDayAmt).toLocaleString()}` : '0'}
                                                        </div>
                                                        {row.currYearDayAmt > 0 && currDayTarget > 0 ? (
                                                            <div className={`text-[10px] font-bold mt-0.5 ${parseFloat(pctOfDayTarget) >= 100 ? 'text-green-500' : parseFloat(pctOfDayTarget) >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                                {pctOfDayTarget}% · excl.GST
                                                            </div>
                                                        ) : row.currYearDayAmt > 0 ? (
                                                            <div className={`text-[10px] font-semibold mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                excl.GST
                                                            </div>
                                                        ) : null}
                                                    </td>

                                                    {/* Target Growth % */}
                                                    <td className={`px-6 py-4 font-black text-center border-l border-gray-800/40 ${targetGrowth.startsWith('+') ? 'text-green-500' : targetGrowth.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {targetGrowth}%
                                                    </td>

                                                    {/* Ach. Growth % */}
                                                    <td className={`px-6 py-4 font-black text-center ${achGrowth.startsWith('+') ? 'text-green-500' : achGrowth.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {achGrowth}%
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}

                                    {/* Grand Total Row */}
                                    {!loading && dayWiseData.length > 0 && (() => {
                                        const tPrevDayTgt = dayWiseData.reduce((s, r) => s + (r.prevYearDayTarget || 0), 0);
                                        const tPrevDayAch = dayWiseData.reduce((s, r) => s + (r.prevYearDayAmt    || 0), 0);
                                        const tCurrTgt    = dayWiseData.reduce((s, r) => s + (r.currYearTarget    || 0), 0);
                                        const tCurrAct    = dayWiseData.reduce((s, r) => s + (r.currYearDayAmt    || 0), 0);
                                        const tCurrDayTgt = tCurrTgt;
                                        const tTargetGrowth = calculateGrowth(tPrevDayTgt, tCurrTgt);
                                        const tAchGrowth    = calculateGrowth(tPrevDayAch, tCurrAct);
                                        const tPct        = tCurrDayTgt > 0 ? ((tCurrAct / tCurrDayTgt) * 100).toFixed(1) : '0.0';
                                        return (
                                            <tr className={`font-black text-xs border-t-2 ${isDarkMode ? 'border-gray-600 bg-black/30 text-white' : 'border-gray-300 bg-gray-100 text-gray-900'}`}>
                                                <td className={`px-6 py-4 sticky left-0 z-10 uppercase tracking-widest text-[10px] ${isDarkMode ? 'bg-black/30 border-r border-gray-700' : 'bg-gray-100 border-r border-gray-300'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.15)' }}>Grand Total</td>
                                                <td className="px-6 py-4 text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400">₹{Math.round(tPrevDayTgt).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center bg-blue-500/5 text-emerald-500">₹{Math.round(tPrevDayAch).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center border-l border-gray-800/40 bg-orange-500/5 text-orange-400">₹{Math.round(tCurrDayTgt).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center bg-orange-500/5">
                                                    <div className="text-purple-500">₹{Math.round(tCurrAct).toLocaleString()}</div>
                                                    <div className={`text-[10px] mt-0.5 ${parseFloat(tPct) >= 100 ? 'text-green-500' : parseFloat(tPct) >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>{tPct}% of day target</div>
                                                </td>
                                                <td className={`px-6 py-4 text-center border-l border-gray-800/40 ${tTargetGrowth.startsWith('+') ? 'text-green-500' : tTargetGrowth.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>{tTargetGrowth}%</td>
                                                <td className={`px-6 py-4 text-center ${tAchGrowth.startsWith('+') ? 'text-green-500' : tAchGrowth.startsWith('-') ? 'text-red-500' : 'text-gray-400'}`}>{tAchGrowth}%</td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showAddModal && (
                    <AddComparisonTargetModal
                        target={selectedTarget}
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            setShowAddModal(false);
                            fetchComparisonData();
                        }}
                        centres={centres}
                        sessions={sessions}
                    />
                )}

            </div>
        </Layout>
    );
};

export default ComparisonAnalysis;
