import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaEraser, FaChartBar, FaTable, FaTh, FaCreditCard, FaStore } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a05195', '#d45087', '#f95d6a', '#ff7c43'];

const TransactionReport = () => {
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [monthlyData, setMonthlyData] = useState([]);
    const [centreRevenueData, setCentreRevenueData] = useState([]);
    const [courseRevenueData, setCourseRevenueData] = useState([]);
    const [paymentMethodData, setPaymentMethodData] = useState([]);
    const [detailedReport, setDetailedReport] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);

    // Master Data
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sessions, setSessions] = useState([]); // Dynamic sessions from master data

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [selectedExamTag, setSelectedExamTag] = useState("");
    const [displayMode, setDisplayMode] = useState("chart"); // chart, table, card
    const [selectedSession, setSelectedSession] = useState("");
    const [timePeriod, setTimePeriod] = useState("All Time"); // Default to All Time for broader view
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Dropdown Refs
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);

    const centreDropdownRef = useRef(null);
    const courseDropdownRef = useRef(null);
    const departmentDropdownRef = useRef(null);

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
            if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
                setIsDepartmentDropdownOpen(false);
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
    }, [selectedCentres, selectedCourses, selectedDepartments, selectedExamTag, selectedSession, timePeriod, startDate, endDate]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, coRes, eRes, sRes, dRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers })
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
                const sessionData = await sRes.ok ? await sRes.json() : [];
                setSessions(Array.isArray(sessionData) ? sessionData : []);
            }
            if (dRes.ok) setDepartments(await dRes.json());
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            const now = new Date();
            let start, end;

            // Financial Year Calculation
            // FY starts April 1.
            // If Month is Jan-Mar (0-2), we are in FY (Year-1)-Year.
            // If Month is Apr-Dec (3-11), we are in FY Year-(Year+1).
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

            if (timePeriod === "Custom") {
                if (!startDate || !endDate) return;
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else if (timePeriod === "This Financial Year") {
                start = new Date(fyStartYear, 3, 1); // April 1st
                end = now; // Until Today
                params.append("startDate", start.toISOString().split('T')[0]);
                params.append("endDate", end.toISOString().split('T')[0]);
            } else if (timePeriod === "Last Financial Year") {
                start = new Date(fyStartYear - 1, 3, 1); // April 1st Previous FY
                end = new Date(fyStartYear, 2, 31); // March 31st Current FY Start Year
                params.append("startDate", start.toISOString().split('T')[0]);
                params.append("endDate", end.toISOString().split('T')[0]);
            } else if (timePeriod === "All Time") {
                // No Date Filter
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
            }

            if (selectedSession) params.append("session", selectedSession);
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length > 0) params.append("courseIds", selectedCourses.join(","));
            if (selectedDepartments.length > 0) params.append("departmentIds", selectedDepartments.join(","));
            if (selectedExamTag) params.append("examTagId", selectedExamTag);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/transaction-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setMonthlyData(result.monthlyRevenue || []);
                setCentreRevenueData(result.centreRevenue || []);
                setCourseRevenueData(result.courseRevenue || []);
                setPaymentMethodData(result.paymentMethods || []);
                setDetailedReport(result.detailedReport || []);
                setTotalRevenue(result.totalRevenue || 0);
            } else {
                setMonthlyData([]);
                setCentreRevenueData([]);
                setCourseRevenueData([]);
                setPaymentMethodData([]);
                setDetailedReport([]);
                setTotalRevenue(0);
            }
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    };

    // ---- Handlers ----
    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedExamTag("");
        setSelectedSession("");
        setTimePeriod("All Time");
        setStartDate("");
        setEndDate("");
        toast.info("Filters reset");
    };

    const handleDownloadExcel = () => {
        if (!monthlyData.length && !paymentMethodData.length) {
            toast.warn("No data to download");
            return;
        }

        const wb = XLSX.utils.book_new();
        const dateStr = new Date().toLocaleString();

        let dateRangeStr = timePeriod;
        if (timePeriod === "Custom" && startDate && endDate) {
            dateRangeStr = `${startDate} to ${endDate}`;
        } else if (timePeriod === "All Time") {
            dateRangeStr = "All Time";
        } else if (timePeriod === "This Financial Year") {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
            dateRangeStr = `This Financial Year (01/04/${fyStartYear} - ${now.toLocaleDateString()})`;
        } else if (timePeriod === "Last Financial Year") {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
            dateRangeStr = `Last Financial Year (01/04/${fyStartYear - 1} - 31/03/${fyStartYear})`;
        } else if (timePeriod === "This Month") {
            dateRangeStr = `This Month (${new Date().toLocaleString('default', { month: 'long' })})`;
        } else if (timePeriod === "Last Month") {
            const d = new Date();
            d.setMonth(d.getMonth() - 1);
            dateRangeStr = `Last Month (${d.toLocaleString('default', { month: 'long' })})`;
        }

        const metadata = [
            ["Monthly Revenue Report"], // Title
            ["Generated on:", dateStr],
            ["Date Range:", dateRangeStr],
            ["Session:", selectedSession || "All Sessions", "Exam Tag:", selectedExamTag ? (examTags.find(e => e._id === selectedExamTag)?.name || "Selected") : "All"],
            ["Centers:", selectedCentres.length ? "Selected" : "All Centers", "Courses:", selectedCourses.length ? "Selected" : "All Courses"],
            [], // Empty row
        ];

        // --- Sheet 1: Monthly Revenue Report ---
        // Sort Monthly Data by Financial Year (Apr -> Mar)
        const fyOrder = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

        const sortedMonthlyData = [...monthlyData].sort((a, b) => {
            const indexA = fyOrder.indexOf(a.month);
            const indexB = fyOrder.indexOf(b.month);
            return (indexA === -1 ? 100 : indexA) - (indexB === -1 ? 100 : indexB);
        });

        const ws1Headers = ["Month", "Year", "Total Revenue (₹)", "Transaction Count"];

        // Helper to guess year for display in excel (Apr-Dec = FY Start, Jan-Mar = FY End)
        const getDisplayYear = (month) => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

            // If we are looking at "Last FY", subtract 1
            if (timePeriod === "All Time") return "-";
            const baseStartYear = timePeriod === "Last Financial Year" ? fyStartYear - 1 : fyStartYear;

            if (["Jan", "Feb", "Mar"].includes(month)) return baseStartYear + 1;
            return baseStartYear;
        };

        const ws1Data = sortedMonthlyData.map(m => [
            m.month,
            getDisplayYear(m.month),
            m.revenue,
            m.count || 0
        ]);
        // Add Total Row
        const totalRev = monthlyData.reduce((acc, c) => acc + c.revenue, 0);
        const totalCount = monthlyData.reduce((acc, c) => acc + (c.count || 0), 0);
        ws1Data.push(["TOTAL", "", totalRev, totalCount]);

        const ws1 = XLSX.utils.aoa_to_sheet([...metadata, [], ws1Headers, ...ws1Data]);
        ws1['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws1, "Monthly Revenue");

        // --- Sheet 2: Payment Type Distribution Report ---
        const ws2Headers = ["Payment Type", "Total Amount (₹)", "Transaction Count", "Average Amount (₹)"];
        const ws2Data = paymentMethodData.map(p => [
            p.name,
            p.value,
            p.count,
            p.count > 0 ? (p.value / p.count).toFixed(2) : "0"
        ]);
        // Add Total
        const totalPayRev = paymentMethodData.reduce((acc, p) => acc + p.value, 0);
        const totalPayCount = paymentMethodData.reduce((acc, p) => acc + p.count, 0);
        ws2Data.push(["TOTAL", totalPayRev, totalPayCount, ""]);

        const ws2 = XLSX.utils.aoa_to_sheet([...metadata, ["Payment Type Distribution Report"], [], ws2Headers, ...ws2Data]);
        ws2['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws2, "Payment Distribution");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `Transaction_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

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

    // ---- Custom Tooltips ----
    const CustomBarTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-bold text-gray-700 mb-1">{label}</p>
                    <p className="text-sm text-blue-600">
                        Revenue: ₹{payload[0].value.toLocaleString()}
                    </p>
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
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            Transaction Report
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a1f24] p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
                        <button
                            onClick={() => setDisplayMode("chart")}
                            className={`p-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${displayMode === "chart" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"}`}
                            title="Chart View"
                        >
                            <FaChartBar size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Chart</span>
                        </button>
                        <button
                            onClick={() => setDisplayMode("table")}
                            className={`p-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${displayMode === "table" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"}`}
                            title="Table View"
                        >
                            <FaTable size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Table</span>
                        </button>
                        <button
                            onClick={() => setDisplayMode("card")}
                            className={`p-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${displayMode === "card" ? "bg-blue-600 text-white shadow-lg scale-105" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"}`}
                            title="Card View"
                        >
                            <FaTh size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Cards</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-800">Transaction Report Analysis</h2>
                        <button
                            onClick={handleDownloadExcel}
                            className="bg-[#22c55e] hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium transition-colors shadow-sm flex items-center gap-2"
                        >
                            <FaDownload /> Download Excel
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Centre Multi-Select */}
                        <div className="relative" ref={centreDropdownRef}>
                            <div
                                onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                className="min-w-[180px] h-10 px-3 py-2 bg-white border border-gray-300 rounded-md cursor-pointer flex justify-between items-center text-sm text-gray-700 hover:border-blue-500 transition-colors"
                            >
                                <span className="truncate">
                                    {selectedCentres.length === 0 ? "Select Centres" : `${selectedCentres.length} Selected`}
                                </span>
                                <FaChevronDown size={10} className={`transform transition-transform ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isCentreDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-60 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {centres.map(c => (
                                        <div
                                            key={c._id}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                            onClick={() => toggleCentreSelection(c._id)}
                                        >
                                            <input type="checkbox" checked={selectedCentres.includes(c._id)} readOnly className="rounded" />
                                            <span className="text-sm text-gray-700 truncate">{c.centreName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Course Multi-Select */}
                        <div className="relative" ref={courseDropdownRef}>
                            <div
                                onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                                className="min-w-[180px] h-10 px-3 py-2 bg-white border border-gray-300 rounded-md cursor-pointer flex justify-between items-center text-sm text-gray-700 hover:border-blue-500 transition-colors"
                            >
                                <span className="truncate">
                                    {selectedCourses.length === 0 ? "-----Set Course-----" : `${selectedCourses.length} Selected`}
                                </span>
                                <FaChevronDown size={10} className={`transform transition-transform ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isCourseDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-64 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {courses.map(c => (
                                        <div
                                            key={c._id}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                            onClick={() => toggleCourseSelection(c._id)}
                                        >
                                            <input type="checkbox" checked={selectedCourses.includes(c._id)} readOnly className="rounded" />
                                            <span className="text-sm text-gray-700 truncate">{c.courseName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Department Multi-Select */}
                        <div className="relative" ref={departmentDropdownRef}>
                            <div
                                onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                                className="min-w-[180px] h-10 px-3 py-2 bg-white border border-gray-300 rounded-md cursor-pointer flex justify-between items-center text-sm text-gray-700 hover:border-blue-500 transition-colors"
                            >
                                <span className="truncate">
                                    {selectedDepartments.length === 0 ? "-----Set Dept-----" : `${selectedDepartments.length} Selected`}
                                </span>
                                <FaChevronDown size={10} className={`transform transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {isDepartmentDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-64 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                    {departments.map(d => (
                                        <div
                                            key={d._id}
                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                            onClick={() => {
                                                setSelectedDepartments(prev => prev.includes(d._id) ? prev.filter(x => x !== d._id) : [...prev, d._id]);
                                            }}
                                        >
                                            <input type="checkbox" checked={selectedDepartments.includes(d._id)} readOnly className="rounded" />
                                            <span className="text-sm text-gray-700 truncate">{d.departmentName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Session */}
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="h-10 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-blue-500 min-w-[150px]"
                        >
                            <option value="">Select Session</option>
                            {sessions.length === 0 ? (
                                <option value="">Loading...</option>
                            ) : (
                                sessions.map(s => <option key={s._id} value={s.sessionName}>{s.sessionName}</option>)
                            )}
                        </select>

                        {/* Exam Tag */}
                        <select
                            value={selectedExamTag}
                            onChange={(e) => setSelectedExamTag(e.target.value)}
                            className="h-10 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-blue-500 min-w-[150px]"
                        >
                            <option value="">Exam Tag</option>
                            {examTags.map(tag => (
                                <option key={tag._id} value={tag._id}>{tag.name}</option>
                            ))}
                        </select>

                        <button onClick={handleResetFilters} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Reset Filters">
                            <FaEraser size={18} />
                        </button>
                    </div>
                    <div className="flex justify-center mt-2 gap-2 items-center">
                        <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} className="h-9 px-4 bg-white border border-gray-300 rounded-md text-sm font-semibold text-gray-700 outline-none shadow-sm cursor-pointer">
                            <option value="All Time">All Time</option>
                            <option value="This Financial Year">This Financial Year</option>
                            <option value="Last Financial Year">Last Financial Year</option>
                            <option value="This Month">This Month</option>
                            <option value="Last Month">Last Month</option>
                            <option value="Custom">Custom</option>
                        </select>
                        {timePeriod === "Custom" && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-9 px-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 outline-none shadow-sm"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-9 px-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 outline-none shadow-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Charts */}

                {/* Content Area */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 min-h-[500px]">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                        <div className="w-2 h-8 bg-green-600 rounded-full"></div>
                        Monthly Revenue Trend ({timePeriod})
                    </h3>

                    {loading ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse tracking-widest text-xs">COLLECTING FINANCIAL DATA...</p>
                            </div>
                        </div>
                    ) : monthlyData.length === 0 ? (
                        <div className="flex h-96 items-center justify-center text-gray-400 flex-col gap-4 bg-gray-50 dark:bg-[#131619] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <FaCreditCard size={48} className="opacity-20" />
                            <p className="uppercase tracking-[0.2em] text-sm font-bold opacity-50">No transactions recorded</p>
                        </div>
                    ) : (
                        <>
                            {displayMode === "chart" && (
                                <div className="h-[400px] w-full animate-fade-in">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                                            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                                            <Tooltip
                                                cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
                                            />
                                            <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40}>
                                                {monthlyData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#34d399'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {displayMode === "table" && (
                                <div className="overflow-x-auto animate-fade-in rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-[#131619] border-b border-gray-200 dark:border-gray-700">
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Month</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Transactions</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right text-green-600">Total Revenue</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Avg/Transaction</th>
                                                {/* <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Trend</th> */}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {monthlyData.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                    <td className="p-5 font-bold text-gray-800 dark:text-white uppercase text-sm group-hover:text-green-600 transition-colors">{item.month}</td>
                                                    <td className="p-5 text-right font-medium text-gray-500 dark:text-gray-400 text-lg">{item.count}</td>
                                                    <td className="p-5 text-right font-black text-gray-900 dark:text-white">₹{item.revenue.toLocaleString('en-IN')}</td>
                                                    <td className="p-5 text-center text-sm font-bold text-gray-500">
                                                        ₹{(item.revenue / (item.count || 1)).toFixed(0)}
                                                    </td>
                                                    {/* <td className="p-5">
                                                        <div className="flex justify-center">
                                                            <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-green-500 rounded-full transition-all duration-1000"
                                                                    style={{ width: `${Math.min((item.revenue / Math.max(...monthlyData.map(m => m.revenue))) * 100, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td> */}
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-50 dark:bg-[#131619] font-black">
                                                <td className="p-5 uppercase text-xs">Total Performance</td>
                                                <td className="p-5 text-right">{monthlyData.reduce((acc, curr) => acc + (curr.count || 0), 0)}</td>
                                                <td className="p-5 text-right text-green-600">₹{totalRevenue.toLocaleString('en-IN')}</td>
                                                <td colSpan="2"></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {displayMode === "card" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                                    {monthlyData.map((item, idx) => {
                                        const maxRev = Math.max(...monthlyData.map(m => m.revenue));
                                        const pct = (item.revenue / maxRev) * 100;
                                        return (
                                            <div key={idx} className="bg-white dark:bg-[#131619] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group border-l-4 border-l-green-500">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-widest">{item.month}</h4>
                                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                                        <FaStore size={12} />
                                                    </div>
                                                </div>
                                                <div className="space-y-6">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-right">Revenue</div>
                                                        <div className="text-3xl font-black text-gray-900 dark:text-white text-right tracking-tighter">₹{item.revenue.toLocaleString('en-IN')}</div>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-[#1a1f24] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Transactions</div>
                                                        <div className="font-black text-green-600">{item.count}</div>
                                                    </div>
                                                    <div>
                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 rounded-full transition-all duration-1000"
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 2. Payment Methods */}
                {/* 2. Centre & Course Revenue (New) */}
                <div className="space-y-8">
                    {/* Centre Revenue Section */}
                    <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                            Revenue by Centre
                        </h3>

                        {displayMode === "chart" && (
                            <div className="h-[400px] animate-fade-in">
                                {centreRevenueData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[...centreRevenueData].sort((a, b) => b.revenue - a.revenue).slice(0, 15)}
                                            margin={{ top: 5, right: 30, left: 40, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" opacity={0.5} />
                                            <XAxis type="category" dataKey="_id" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} />
                                            <YAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                formatter={(val) => [`₹${val.toLocaleString()}`, "Revenue"]}
                                            />
                                            <Bar dataKey="revenue" fill="#3b82f6" barSize={40} radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No Data</div>
                                )}
                            </div>
                        )}

                        {displayMode === "table" && (
                            <div className="overflow-x-auto animate-fade-in rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-[#131619] border-b border-gray-200 dark:border-gray-700">
                                            <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Centre Name</th>
                                            <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Total Revenue Generated</th>
                                            <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Revenue Contribution</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[...centreRevenueData].sort((a, b) => b.revenue - a.revenue).map((item, idx) => {
                                            const total = centreRevenueData.reduce((acc, c) => acc + c.revenue, 0);
                                            const pct = total > 0 ? ((item.revenue / total) * 100).toFixed(1) : 0;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="p-5 text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{item._id}</td>
                                                    <td className="p-5 text-right font-black text-blue-600 text-lg">₹{item.revenue.toLocaleString()}</td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-xs font-black text-gray-400">{pct}%</span>
                                                            <div className="w-32 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500" style={{ width: `${pct}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {displayMode === "card" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 animate-fade-in">
                                {[...centreRevenueData].sort((a, b) => b.revenue - a.revenue).map((item, idx) => {
                                    const total = centreRevenueData.reduce((acc, c) => acc + c.revenue, 0);
                                    const pct = total > 0 ? ((item.revenue / total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={idx} className="bg-gray-50 dark:bg-[#131619] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all group">
                                            <div className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest truncate">{item._id}</div>
                                            <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">₹{(item.revenue / 1000).toFixed(1)}K</div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-blue-500">
                                                <span>SHARE</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 mt-2 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Course Revenue Section */}
                    <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                            <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                            Revenue by Course
                        </h3>

                        {displayMode === "chart" && (
                            <div className="h-[400px] animate-fade-in">
                                {courseRevenueData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[...courseRevenueData].sort((a, b) => b.revenue - a.revenue).slice(0, 15)}
                                            margin={{ top: 5, right: 30, left: 40, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" opacity={0.5} />
                                            <XAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 600 }} />
                                            <YAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                formatter={(val) => [`₹${val.toLocaleString()}`, "Revenue"]}
                                            />
                                            <Bar dataKey="revenue" fill="#fbbf24" barSize={40} radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No Data</div>
                                )}
                            </div>
                        )}

                        {displayMode === "table" && (
                            <div className="overflow-x-auto animate-fade-in rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-[#131619] border-b border-gray-200 dark:border-gray-700">
                                            <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Course Name</th>
                                            <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Total Collection</th>
                                            <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Revenue Share</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[...courseRevenueData].sort((a, b) => b.revenue - a.revenue).map((item, idx) => {
                                            const total = courseRevenueData.reduce((acc, c) => acc + c.revenue, 0);
                                            const pct = total > 0 ? ((item.revenue / total) * 100).toFixed(1) : 0;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="p-5 text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{item.name}</td>
                                                    <td className="p-5 text-right font-black text-amber-500 text-lg">₹{item.revenue.toLocaleString()}</td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-xs font-black text-gray-400">{pct}%</span>
                                                            <div className="w-32 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-amber-500" style={{ width: `${pct}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {displayMode === "card" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 animate-fade-in">
                                {[...courseRevenueData].sort((a, b) => b.revenue - a.revenue).map((item, idx) => {
                                    const total = courseRevenueData.reduce((acc, c) => acc + c.revenue, 0);
                                    const pct = total > 0 ? ((item.revenue / total) * 100).toFixed(1) : 0;
                                    return (
                                        <div key={idx} className="bg-gray-50 dark:bg-[#131619] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all group">
                                            <div className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest line-clamp-1">{item.name}</div>
                                            <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-4">₹{(item.revenue / 1000).toFixed(1)}K</div>
                                            <div className="flex justify-between items-center text-[10px] font-bold text-amber-500">
                                                <span>SHARE</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 mt-2 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Payment Methods Section */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                        <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                        Payment Methods Distribution
                    </h3>

                    {displayMode === "chart" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-fade-in">
                            {/* Pie Chart */}
                            <div className="h-[400px]">
                                {paymentMethodData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentMethodData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={140}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {paymentMethodData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(val) => `₹${val.toLocaleString()}`} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No Payment Data</div>
                                )}
                            </div>

                            {/* Custom Legend/List */}
                            <div className="space-y-4 pr-6">
                                {paymentMethodData.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-[#131619] rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border border-gray-100 dark:border-gray-800 group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] tracking-widest">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-gray-900 dark:text-white">₹{item.value.toLocaleString()}</div>
                                            <div className="text-[10px] font-bold text-blue-500">{item.percent}% Pool</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {displayMode === "table" && (
                        <div className="overflow-x-auto animate-fade-in rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-[#131619] border-b border-gray-200 dark:border-gray-700">
                                        <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Method</th>
                                        <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Transactions</th>
                                        <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Total Collection</th>
                                        <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Market Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {paymentMethodData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="p-5 text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{item.name}</td>
                                            <td className="p-5 text-right font-bold text-gray-500">{item.count}</td>
                                            <td className="p-5 text-right font-black text-purple-600">₹{item.value.toLocaleString('en-IN')}</td>
                                            <td className="p-5">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-black text-blue-500">{item.percent}%</span>
                                                    <div className="w-24 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${item.percent}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {displayMode === "card" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                            {paymentMethodData.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-[#131619] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-2xl transition-all duration-300 group">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                            <FaCreditCard size={18} />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.name}</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Collection</div>
                                            <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">₹{(item.value / 1000).toFixed(1)}K</div>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-black">
                                            <span className="text-gray-400 uppercase">{item.count} Txns</span>
                                            <span className="text-purple-600">{item.percent}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-center text-gray-400 text-sm mt-8">
                    ©ADS.All Rights Reserved.
                </div>
            </div>
        </Layout>
    );
};

export default TransactionReport;
