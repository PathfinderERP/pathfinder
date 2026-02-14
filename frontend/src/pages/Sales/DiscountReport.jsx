import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaChevronLeft, FaChevronRight, FaEraser, FaChartBar, FaTable, FaTh, FaPercentage } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Pagination from "../../components/common/Pagination";
import { useTheme } from "../../context/ThemeContext";

const DiscountReport = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [detailedReport, setDetailedReport] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [reportType, setReportType] = useState("monthly"); // monthly, daily
    const [trendIndex, setTrendIndex] = useState(0);
    const trendLimit = 15;

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const itemsPerPageOptions = [
        { value: 10, label: "10 per page" },
        { value: 25, label: "25 per page" },
        { value: 50, label: "50 per page" },
        { value: 100, label: "100 per page" },
        { value: 500, label: "500 per page" },
    ];

    // Master Data
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [sessions, setSessions] = useState([]); // Dynamic sessions from master data

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs
    const [selectedCourses, setSelectedCourses] = useState([]); // Array of IDs
    const [selectedExamTag, setSelectedExamTag] = useState(""); // Single ID
    const [selectedSession, setSelectedSession] = useState("");
    const [timePeriod, setTimePeriod] = useState("This Year"); // "This Year", "Last Year", "This Month", "Last Month", "Custom"
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [displayMode, setDisplayMode] = useState("chart"); // chart, table, card

    // Dropdown Visibility
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

    // Refs for outside click
    const centreDropdownRef = useRef(null);
    const courseDropdownRef = useRef(null);

    // ---- Effects ----
    useEffect(() => {
        fetchMasterData();

        const handleClickOutside = (event) => {
            if (centreDropdownRef.current && !centreDropdownRef.current.contains(event.target)) {
                setIsCentreDropdownOpen(false);
            }
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target)) {
                setIsCourseDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (timePeriod === "Custom" && (!startDate || !endDate)) {
            return;
        }
        fetchReportData();
    }, [selectedCentres, selectedCourses, selectedExamTag, selectedSession, timePeriod, startDate, endDate, reportType]);

    // Debug Log
    useEffect(() => {
        console.log("Discount Report Data:", reportData);
    }, [reportData]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, coRes, eRes, sRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers })
            ]);

            if (cRes.ok) {
                const resData = await cRes.json();
                let centerList = Array.isArray(resData) ? resData : resData.centres || [];

                // Filter by allocated centers
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    if (user.role !== 'superAdmin' && user.centres) {
                        const allowedIds = user.centres.map(id => typeof id === 'object' ? id._id : id);
                        centerList = centerList.filter(c => allowedIds.includes(c._id));
                    }
                }
                setCentres(centerList);
            }
            if (coRes.ok) setCourses(await coRes.json());
            if (eRes.ok) setExamTags(await eRes.json());
            if (sRes.ok) {
                const sessionData = await sRes.json();
                const sessionList = Array.isArray(sessionData) ? sessionData : [];
                setSessions(sessionList);
                if (sessionList.length > 0 && !selectedSession) {
                    setSelectedSession(sessionList[0].sessionName);
                }
            }
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchReportData = async () => {
        if (!selectedSession) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            // Calculate Date Range or Year based on Time Period
            const now = new Date();
            let start, end;
            let yearParam = "";

            if (timePeriod === "Custom") {
                if (!startDate || !endDate) return;
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else if (timePeriod === "This Month") {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                params.append("startDate", start.toISOString().split('T')[0]);
                params.append("endDate", end.toISOString().split('T')[0]);
            } else if (timePeriod === "Last Month") {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                params.append("startDate", start.toISOString().split('T')[0]);
                params.append("endDate", end.toISOString().split('T')[0]);
            } else {
                // Year based
                const currentYear = now.getFullYear();
                yearParam = timePeriod === "This Year" ? currentYear : currentYear - 1;
                params.append("year", yearParam);
            }

            params.append("reportType", reportType);

            if (selectedSession) params.append("session", selectedSession);
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length > 0) params.append("courseIds", selectedCourses.join(","));
            if (selectedExamTag) params.append("examTagId", selectedExamTag);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/discount-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setReportData(result.data || []);
                setTrendData(result.trend || []);
                setDetailedReport(result.detailedReport || []);
                setTotalDiscount(result.totalDiscount || 0);
            } else {
                setReportData([]);
                setTrendData([]);
                setTotalDiscount(0);
            }
            setTrendIndex(0);
        } catch (error) {
            console.error("Error fetching report", error);
            setReportData([]);
        } finally {
            setLoading(false);
            setCurrentPage(1); // Reset to first page when data is fetched
        }
    };

    // ---- Handlers ----
    const toggleCentreSelection = (id) => {
        setSelectedCentres(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleCourseSelection = (id) => {
        setSelectedCourses(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedExamTag("");
        setSelectedSession(sessions.length > 0 ? sessions[0].sessionName : "");
        setTimePeriod("This Year");
        setStartDate("");
        setEndDate("");
        toast.info("Filters reset");
    };

    const handleDownloadExcel = () => {
        if (!reportData.length) {
            toast.warn("No data to download");
            return;
        }

        const wb = XLSX.utils.book_new();
        const dateStr = new Date().toLocaleString();

        let dateRangeStr = timePeriod;
        if (timePeriod === "Custom" && startDate && endDate) {
            dateRangeStr = `${startDate} to ${endDate}`;
        } else if (timePeriod === "This Year") {
            dateRangeStr = `This Financial Year (${new Date().getFullYear()})`;
        } else if (timePeriod === "Last Year") {
            dateRangeStr = `Last Financial Year (${new Date().getFullYear() - 1})`;
        } else if (timePeriod === "This Month") {
            dateRangeStr = `This Month (${new Date().toLocaleString('default', { month: 'long' })})`;
        } else if (timePeriod === "Last Month") {
            const d = new Date();
            d.setMonth(d.getMonth() - 1);
            dateRangeStr = `Last Month (${d.toLocaleString('default', { month: 'long' })})`;
        }


        const metadata = [
            ["Fee Discount Analytics Report"],
            ["Generated on:", dateStr],
            ["Date Range:", dateRangeStr, "Session:", selectedSession || "All", "Exam Tag:", selectedExamTag ? (examTags.find(e => e._id === selectedExamTag)?.name || "Selected") : "All"],
            ["Centers:", selectedCentres.length ? "Selected" : "All Centers", "Courses:", selectedCourses.length ? "Selected" : "All Courses"],
            [], // Empty row
        ];

        // Headers matching the image
        const headers = [
            "Center Name",
            "Total Students",
            "Total Original Fees (₹)",
            "Total Discounted Fees (₹)",
            "Total Discount Given (₹)",
            "Average Discount %",
            "Discount Efficiency %",
            "Discount per Student (₹)"
        ];

        // Summary Data Mapping
        const summaryData = reportData.map(item => {
            const original = item.originalFees || 0;
            const discount = item.discountGiven || 0;
            const committed = item.committedFees || 0; // "Discounted Fees" usually means fees after discount (committed)
            const count = item.count || 0;

            const avgDiscountPercent = original > 0 ? (discount / original) * 100 : 0;
            const discountPerStudent = count > 0 ? (discount / count) : 0;

            // Discount Efficiency % (re-using item.efficiency or calculating logic)
            // Image shows "Discount Efficiency %" - likely Discount / Original * 100 OR committed / original * 100?
            // Usually Efficiency = Collected / Target. Here maybe Discount / Original?
            // Re-using item.efficiency which is (discount/original)*100 based on backend logic

            return [
                item.name,
                count,
                original.toFixed(2),
                committed.toFixed(2),
                discount.toFixed(2),
                avgDiscountPercent.toFixed(2) + "%",
                item.efficiency + "%", // Based on backend
                discountPerStudent.toFixed(2)
            ];
        });

        const ws = XLSX.utils.aoa_to_sheet([...metadata, headers, ...summaryData]);

        // Widths
        ws['!cols'] = [
            { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 25 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Discount Report");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `Discount_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // ---- Charts Config ----
    const CustomTooltip = ({ active, payload, label, formatter }) => {
        const { theme } = useTheme();
        const isDarkMode = theme === 'dark';
        if (active && payload && payload.length) {
            return (
                <div className={`p-3 border rounded-lg shadow-lg ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <p className={`font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Discount Analysis</h1>
                    </div>
                    <div className={`flex items-center gap-2 p-1.5 rounded-xl border shadow-inner transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                        <button
                            onClick={() => setDisplayMode("chart")}
                            className={`p-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${displayMode === "chart" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-gray-500 hover:bg-white/10 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300"}`}
                            title="Chart View"
                        >
                            <FaChartBar size={18} />
                            <span className="text-xs font-black uppercase tracking-widest hidden sm:block">Chart</span>
                        </button>
                        <button
                            onClick={() => setDisplayMode("table")}
                            className={`p-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${displayMode === "table" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-gray-500 hover:bg-white/10 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300"}`}
                            title="Table View"
                        >
                            <FaTable size={18} />
                            <span className="text-xs font-black uppercase tracking-widest hidden sm:block">Table</span>
                        </button>
                        <button
                            onClick={() => setDisplayMode("card")}
                            className={`p-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${displayMode === "card" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-gray-500 hover:bg-white/10 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300"}`}
                            title="Card View"
                        >
                            <FaTh size={18} />
                            <span className="text-xs font-black uppercase tracking-widest hidden sm:block">Cards</span>
                        </button>
                    </div>

                    <div className={`flex items-center gap-2 p-1.5 rounded-xl border shadow-inner transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                        <button
                            onClick={() => setReportType("monthly")}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${reportType === "monthly" ? "bg-orange-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setReportType("daily")}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${reportType === "daily" ? "bg-orange-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                        >
                            Day Wise
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className={`p-4 rounded-xl shadow-sm border transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Fee Discount Analytics</h2>
                        <button
                            onClick={handleDownloadExcel}
                            className="bg-[#22c55e] hover:bg-green-600 text-white px-4 py-2 rounded-md font-bold uppercase text-xs tracking-widest transition-all shadow-lg flex items-center gap-2 active:scale-95"
                        >
                            <FaDownload /> Download
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Centre Multi-Select */}
                        <div className="relative" ref={centreDropdownRef}>
                            <div
                                onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                className={`min-w-[180px] h-10 px-3 py-2 border rounded-md cursor-pointer flex justify-between items-center text-sm font-bold uppercase tracking-tighter transition-colors ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-400 hover:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-600 hover:border-blue-500 shadow-sm'
                                    }`}
                            >
                                <span className="truncate">
                                    {selectedCentres.length === 0 ? "Select Centres" : `${selectedCentres.length} Selected`}
                                </span>
                                <FaChevronDown size={10} className={`transform transition-transform ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isCentreDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-1 w-64 z-50 border rounded-lg shadow-xl max-h-60 overflow-y-auto ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'
                                    }`}>
                                    {centres.map(c => (
                                        <div
                                            key={c._id}
                                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => toggleCentreSelection(c._id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCentres.includes(c._id)}
                                                readOnly
                                                className={`rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'text-blue-600 border-gray-300'}`}
                                            />
                                            <span className={`text-sm font-bold uppercase tracking-tight truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{c.centreName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Course Multi-Select */}
                        <div className="relative" ref={courseDropdownRef}>
                            <div
                                onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                                className={`min-w-[180px] h-10 px-3 py-2 border rounded-md cursor-pointer flex justify-between items-center text-sm font-bold uppercase tracking-tighter transition-colors ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-400 hover:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-600 hover:border-blue-500 shadow-sm'
                                    }`}
                            >
                                <span className="truncate">
                                    {selectedCourses.length === 0 ? "Set Course" : `${selectedCourses.length} Selected`}
                                </span>
                                <FaChevronDown size={10} className={`transform transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isCourseDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-1 w-72 z-50 border rounded-lg shadow-xl max-h-60 overflow-y-auto ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'
                                    }`}>
                                    {courses.map(c => (
                                        <div
                                            key={c._id}
                                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                                                }`}
                                            onClick={() => toggleCourseSelection(c._id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCourses.includes(c._id)}
                                                readOnly
                                                className={`rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'text-blue-600 border-gray-300'}`}
                                            />
                                            <span className={`text-sm font-bold uppercase tracking-tight truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{c.courseName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Session Dropdown */}
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className={`h-10 px-3 py-2 border rounded-md text-sm font-bold uppercase tracking-tighter outline-none transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-400' : 'bg-white border-gray-300 text-gray-600 shadow-sm'
                                }`}
                        >
                            <option value="">Select Session</option>
                            {sessions.length === 0 ? (
                                <option value="">Loading...</option>
                            ) : (
                                sessions.map(s => <option key={s._id} value={s.sessionName}>{s.sessionName}</option>)
                            )}
                        </select>

                        {/* Exam Tag Dropdown */}
                        <select
                            value={selectedExamTag}
                            onChange={(e) => setSelectedExamTag(e.target.value)}
                            className={`h-10 px-3 py-2 border rounded-md text-sm font-bold uppercase tracking-tighter outline-none transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-400' : 'bg-white border-gray-300 text-gray-600 shadow-sm'
                                }`}
                        >
                            <option value="">Exam Tag</option>
                            {examTags.map(tag => (
                                <option key={tag._id} value={tag._id}>{tag.name}</option>
                            ))}
                        </select>

                        {/* Reset Button */}
                        <button
                            onClick={handleResetFilters}
                            className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                            title="Reset Filters"
                        >
                            <FaEraser size={18} />
                        </button>
                    </div>

                    {/* Time Period Filter Center */}
                    <div className="flex justify-center items-center gap-4">
                        <select
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value)}
                            className={`h-9 px-4 border rounded-md text-sm font-black uppercase tracking-widest outline-none transition-colors ${isDarkMode ? 'bg-black/20 border-gray-700 text-orange-400' : 'bg-orange-50 border-orange-100 text-orange-700 shadow-sm'
                                }`}
                        >
                            <option value="This Year">This Year</option>
                            <option value="Last Year">Last Year</option>
                            <option value="This Month">This Month</option>
                            <option value="Last Month">Last Month</option>
                            <option value="Custom">Custom</option>
                        </select>
                        {timePeriod === "Custom" && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`h-9 px-2 border rounded-md text-xs font-bold outline-none shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'
                                        }`}
                                />
                                <span className="text-gray-500 font-black text-[10px] uppercase">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`h-9 px-2 border rounded-md text-xs font-bold outline-none shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-700'
                                        }`}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* View Content Area */}
                <div className={`p-6 rounded-2xl shadow-xl border min-h-[500px] transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-xl font-bold mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                        Fee Discount Analysis ({reportType === 'monthly' ? 'Monthly' : 'Daily'} Trend)
                    </h3>

                    {displayMode === "chart" && trendData.length > 0 && (
                        <div className={`mb-12 animate-fade-in p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Discount Timeline</span>
                                    <span className={`text-sm font-black transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {reportType === 'daily'
                                            ? `${trendData[trendIndex]?.date} — ${trendData[Math.min(trendIndex + trendLimit - 1, trendData.length - 1)]?.date}`
                                            : `Fiscal Year Breakdown`
                                        }
                                    </span>
                                </div>
                                {reportType === 'daily' && trendData.length > trendLimit && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setTrendIndex(Math.max(0, trendIndex - trendLimit))}
                                            disabled={trendIndex === 0}
                                            className={`p-2 border rounded-lg disabled:opacity-30 transition-all shadow-sm ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-400 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <FaChevronLeft size={12} />
                                        </button>
                                        <button
                                            onClick={() => setTrendIndex(Math.min(trendData.length - trendLimit, trendIndex + trendLimit))}
                                            disabled={trendIndex + trendLimit >= trendData.length}
                                            className={`p-2 border rounded-lg disabled:opacity-30 transition-all shadow-sm ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-400 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <FaChevronRight size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={reportType === 'daily' ? trendData.slice(trendIndex, trendIndex + trendLimit) : trendData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                                        <XAxis dataKey={reportType === 'monthly' ? "month" : "date"} stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} fontSize={10} tickLine={false} />
                                        <YAxis stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} fontSize={10} tickLine={false} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                                backgroundColor: isDarkMode ? '#1a1f24' : '#fff',
                                                color: isDarkMode ? '#fff' : '#1f2937'
                                            }}
                                            formatter={(val) => `₹${val.toLocaleString()}`}
                                        />
                                        <Bar dataKey="discountGiven" fill="#f97316" radius={[4, 4, 0, 0]} barSize={reportType === 'monthly' ? 40 : 25} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 font-black animate-pulse tracking-[0.2em] text-xs">CALCULATING DISCOUNTS...</p>
                            </div>
                        </div>
                    ) : reportData.length === 0 ? (
                        <div className={`flex h-96 items-center justify-center flex-col gap-4 rounded-2xl border border-dashed transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>
                            <FaPercentage size={48} className="opacity-20" />
                            <p className="uppercase tracking-[0.2em] text-sm font-black opacity-50">No discount data available</p>
                        </div>
                    ) : (
                        <>
                            {displayMode === "chart" && (
                                <div className="space-y-12 animate-fade-in">
                                    {/* 1. Original vs Discounted Fees */}
                                    <div className={`p-6 rounded-xl border shadow-sm transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="text-center mb-6">
                                            <h3 className={`text-lg font-black uppercase tracking-wider transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Original vs Discounted Fees (₹)</h3>
                                            <div className="flex justify-center gap-6 mt-4">
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#ff4d4f] rounded-full shadow-sm"></div><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Original</span></div>
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#00e396] rounded-full shadow-sm"></div><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Discounted</span></div>
                                            </div>
                                        </div>
                                        <div className="h-[400px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={reportData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#E5E7EB'} opacity={0.5} />
                                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10, fill: isDarkMode ? '#9CA3AF' : '#6b7280', fontWeight: 'bold' }} />
                                                    <YAxis tick={{ fontSize: 10, fill: isDarkMode ? '#9CA3AF' : '#6b7280' }} />
                                                    <Tooltip cursor={{ fill: isDarkMode ? 'white' : 'black', opacity: 0.05 }} content={<CustomTooltip formatter={(val) => `₹${val.toLocaleString()}`} />} />
                                                    <Bar dataKey="originalFees" name="Original" fill="#ff4d4f" barSize={15} radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="committedFees" name="Discounted" fill="#00e396" barSize={15} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* 2. Total Discount Given */}
                                    <div className={`p-6 rounded-xl border shadow-sm transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="text-center mb-6">
                                            <h3 className={`text-lg font-black uppercase tracking-wider transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Total Discount Given (₹)</h3>
                                            <div className="flex justify-center gap-4 mt-2">
                                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#feb019] rounded-full shadow-sm"></div><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Discount Amount</span></div>
                                            </div>
                                        </div>
                                        <div className="h-[400px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={reportData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#E5E7EB'} opacity={0.5} />
                                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10, fill: isDarkMode ? '#9CA3AF' : '#6b7280', fontWeight: 'bold' }} />
                                                    <YAxis tick={{ fontSize: 10, fill: isDarkMode ? '#9CA3AF' : '#6b7280' }} />
                                                    <Tooltip cursor={{ fill: isDarkMode ? 'white' : 'black', opacity: 0.05 }} content={<CustomTooltip formatter={(val) => `₹${val.toLocaleString()}`} />} />
                                                    <Bar dataKey="discountGiven" name="Discount" fill="#feb019" barSize={20} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {displayMode === "table" && (
                                <>
                                    <div className={`overflow-x-auto animate-fade-in rounded-xl border transition-colors ${isDarkMode ? 'border-gray-800 shadow-xl' : 'border-gray-200 shadow-sm'}`}>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b transition-colors ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                    <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider">Centre Name</th>
                                                    <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Original Fees</th>
                                                    <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Discounted</th>
                                                    <th className="p-5 text-orange-500 font-bold text-xs uppercase tracking-wider text-right">Discount Given</th>
                                                    <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-center">Efficiency %</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                                {reportData.map((item, idx) => (
                                                    <tr key={idx} className={`transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                                        <td className={`p-5 font-black uppercase text-sm transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800 group-hover:text-orange-500'}`}>{item.name}</td>
                                                        <td className={`p-5 text-right font-medium text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>₹{item.originalFees.toLocaleString('en-IN')}</td>
                                                        <td className={`p-5 text-right font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{item.committedFees.toLocaleString('en-IN')}</td>
                                                        <td className="p-5 text-right font-black text-orange-600">₹{item.discountGiven.toLocaleString('en-IN')}</td>
                                                        <td className="p-5 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="text-xs font-black text-blue-600">{item.efficiency}%</span>
                                                                <div className={`w-24 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-1000 ${item.efficiency > 20 ? 'bg-red-500' : item.efficiency > 10 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                                        style={{ width: `${Math.min(item.efficiency, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className={`font-black italic border-t-2 transition-colors ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                <tr className={isDarkMode ? 'text-gray-300' : 'text-gray-800'}>
                                                    <td className="p-5 uppercase text-xs">Grand Total</td>
                                                    <td className="p-5 text-right text-xs">₹{reportData.reduce((a, b) => a + b.originalFees, 0).toLocaleString('en-IN')}</td>
                                                    <td className="p-5 text-right text-sm">₹{reportData.reduce((a, b) => a + b.committedFees, 0).toLocaleString('en-IN')}</td>
                                                    <td className="p-5 text-right text-sm text-orange-600">₹{totalDiscount.toLocaleString('en-IN')}</td>
                                                    <td className="p-5 text-center text-xs">
                                                        {(reportData.reduce((a, b) => a + b.discountGiven, 0) / (reportData.reduce((a, b) => a + b.originalFees, 0) || 1) * 100).toFixed(2)}% AVG
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {detailedReport.length > 0 && (
                                        <div className="mt-12 animate-fade-in">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                    <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                                                    Detailed Student Breakdown
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Items per page:</span>
                                                    <select
                                                        value={itemsPerPage}
                                                        onChange={(e) => {
                                                            setItemsPerPage(Number(e.target.value));
                                                            setCurrentPage(1);
                                                        }}
                                                        className={`h-8 px-2 border rounded text-xs font-bold transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700 shadow-sm'
                                                            }`}
                                                    >
                                                        {itemsPerPageOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className={`overflow-x-auto rounded-xl border transition-colors ${isDarkMode ? 'border-gray-800 shadow-xl' : 'border-gray-200 shadow-sm'}`}>
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className={`transition-colors ${isDarkMode ? 'bg-black/20 border-b border-gray-800' : 'bg-gray-100 border-b border-gray-200'}`}>
                                                            <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Student Name</th>
                                                            <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Adm No.</th>
                                                            <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Course</th>
                                                            <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Orig. Fees</th>
                                                            <th className="p-4 text-[10px] font-black text-orange-500 uppercase tracking-widest text-right">Discount</th>
                                                            <th className="p-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Payable</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                                        {detailedReport.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((stu, sIdx) => (
                                                            <tr key={sIdx} className={`transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-blue-50/30'}`}>
                                                                <td className={`p-4 text-xs font-black transition-colors ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{stu.studentName}</td>
                                                                <td className="p-4 text-xs text-center text-gray-500 italic">{stu.admissionNumber}</td>
                                                                <td className="p-4 text-[10px] text-gray-500 uppercase font-bold">{stu.course}</td>
                                                                <td className={`p-4 text-right text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>₹{stu.originalFees.toLocaleString()}</td>
                                                                <td className="p-4 text-right text-xs font-black text-orange-600">₹{stu.discountGiven.toLocaleString()}</td>
                                                                <td className={`p-4 text-right text-xs font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{stu.committedFees.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-4">
                                                <Pagination
                                                    currentPage={currentPage}
                                                    totalItems={detailedReport.length}
                                                    itemsPerPage={itemsPerPage}
                                                    onPageChange={setCurrentPage}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {displayMode === "card" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                                    {reportData.map((item, idx) => (
                                        <div key={idx} className={`rounded-2xl border p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
                                            }`}>
                                            <div className="flex justify-between items-start mb-6">
                                                <h4 className={`font-black uppercase text-xs tracking-tight line-clamp-1 flex-1 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</h4>
                                                <div className={`text-[10px] font-black px-2 py-0.5 rounded uppercase shadow-sm ${item.efficiency > 20 ? 'bg-red-500 text-white' : item.efficiency > 10 ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`}>
                                                    {item.efficiency}% AVG
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discount Given</div>
                                                    <div className="text-lg font-black text-orange-600">₹{item.discountGiven.toLocaleString('en-IN')}</div>
                                                </div>

                                                <div className="pt-2">
                                                    <div className="flex justify-between text-[9px] font-black uppercase mb-1.5 opacity-50">
                                                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Revenue Retained</span>
                                                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{(100 - item.efficiency).toFixed(1)}%</span>
                                                    </div>
                                                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                        <div
                                                            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-1000"
                                                            style={{ width: `${item.efficiency}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                <div className={`grid grid-cols-2 gap-4 mt-4 pt-4 border-t transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                    <div>
                                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Students</div>
                                                        <div className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.count}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Avg/Student</div>
                                                        <div className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{(item.discountGiven / (item.count || 1)).toFixed(0)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* <div className="text-center text-gray-400 text-sm mt-8">
                    ©IT TEAM(MALAY).All Rights Reserved.
                </div> */}
            </div>
        </Layout>
    );
};

export default DiscountReport;
