import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaDownload, FaChevronDown, FaFilter, FaCalendarAlt, FaChartBar, FaTable, FaTh, FaUserGraduate } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const CourseReport = () => {
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [centreData, setCentreData] = useState([]);
    const [detailedReport, setDetailedReport] = useState([]);
    const [totalEnrollments, setTotalEnrollments] = useState(0);

    // Debug Log
    useEffect(() => {
        console.log("Report Data Updated:", reportData);
    }, [reportData]);

    // Master Data
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [examTags, setExamTags] = useState([]);

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedExamTag, setSelectedExamTag] = useState("");
    const [selectedSession, setSelectedSession] = useState("2025-2026"); // Default? Or fetch?
    const [timePeriod, setTimePeriod] = useState("This Year");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [displayMode, setDisplayMode] = useState("chart"); // chart, table, card

    // Dropdowns
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

    const centreDropdownRef = useRef(null);
    const courseDropdownRef = useRef(null);

    // Hardcoded Sessions for now (ideally fetch from config)
    const sessions = ["2023-2024", "2024-2025", "2025-2026", "2025-2027"];

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
    }, [selectedCentres, selectedCourses, selectedExamTag, selectedSession, timePeriod, startDate, endDate]);


    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const centreRes = await fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers });
            if (centreRes.ok) setCentres(await centreRes.json());

            const courseRes = await fetch(`${import.meta.env.VITE_API_URL}/course`, { headers });
            if (courseRes.ok) setCourses(await courseRes.json());

            const examTagRes = await fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers });
            if (examTagRes.ok) setExamTags(await examTagRes.json());

        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (timePeriod === "Custom") {
                if (!startDate || !endDate) return;
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else {
                const currentYear = new Date().getFullYear();
                const year = timePeriod === "This Year" ? currentYear : currentYear - 1;
                params.append("year", year);
            }
            if (selectedSession) params.append("session", selectedSession);
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length > 0) params.append("courseIds", selectedCourses.join(","));
            if (selectedExamTag) params.append("examTagId", selectedExamTag);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/course-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setReportData(result.data || []);
                setCentreData(result.centreData || []);
                setDetailedReport(result.detailedReport || []);
                setTotalEnrollments(result.total || 0);
            } else {
                setReportData([]);
                setCentreData([]);
                setDetailedReport([]);
                setTotalEnrollments(0);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedExamTag("");
        setSelectedSession("2025-2026");
        setTimePeriod("This Year");
        setStartDate("");
        setEndDate("");
    };

    const handleDownloadExcel = () => {
        if (!detailedReport.length && !reportData.length) {
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
        }

        const metadata = [
            ["Generated on:", dateStr],
            ["Date Range:", dateRangeStr],
            ["Session:", selectedSession || "All"],
            ["Exam Tag:", selectedExamTag ? (examTags.find(e => e._id === selectedExamTag)?.name || "Selected") : "All"],
            ["Centers:", selectedCentres.length ? "Selected" : "All Centers"],
            [], // Empty row
        ];

        // --- Sheet 1: Course Enrollments (Detailed) ---
        const sheet1Headers = ["Course Name", "Center Name", "Total Students", "Percentage of Total"];
        const sheet1Data = detailedReport.map(r => [
            r.courseName,
            r.centreName,
            r.count,
            r.percent + "%"
        ]);
        const ws1 = XLSX.utils.aoa_to_sheet([...metadata, ["Course Enrollment Analytics Report"], [], sheet1Headers, ...sheet1Data]);

        // Col Widths
        ws1['!cols'] = [{ wch: 40 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws1, "Course Enrollments");

        // --- Sheet 2: Revenue Per Course ---
        const totalRev = reportData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        const sheet2Headers = ["Course Name", "Total Revenue (₹)", "Percentage of Total", "Average Revenue"];
        const sheet2Data = reportData.map(r => [
            r.name,
            r.revenue,
            (totalRev > 0 ? ((r.revenue / totalRev) * 100).toFixed(2) : "0") + "%",
            (r.value > 0 ? (r.revenue / r.value).toFixed(2) : "0")
        ]);
        const ws2 = XLSX.utils.aoa_to_sheet([...metadata, ["Revenue Per Course Report"], [], sheet2Headers, ...sheet2Data]);
        ws2['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws2, "Revenue Per Course");

        // --- Sheet 3: Revenue Per Center ---
        // Calc total revenue from centreData just to be safe or use state
        const totalCentreRev = centreData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        const sheet3Headers = ["Center Name", "Total Revenue (₹)", "Total Enrollments", "Average Revenue per Student", "Percentage of Total Revenue"];
        const sheet3Data = centreData.map(r => [
            r.name,
            r.revenue,
            r.enrollment,
            (r.enrollment > 0 ? (r.revenue / r.enrollment).toFixed(2) : "0"),
            (totalCentreRev > 0 ? ((r.revenue / totalCentreRev) * 100).toFixed(2) : "0") + "%"
        ]);
        const ws3 = XLSX.utils.aoa_to_sheet([...metadata, ["Revenue Per Center Report"], [], sheet3Headers, ...sheet3Data]);
        ws3['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 25 }];
        XLSX.utils.book_append_sheet(wb, ws3, "Revenue Per Center");

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `Course_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // Colors for Pie Chart
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#FF6384', '#36A2EB', '#4BC0C0'];

    return (
        <Layout activePage="Sales">
            <div className="space-y-6 animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Course Report</h1>
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

                {/* Subheader */}
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Student Course Analytics</h2>

                {/* Filters */}
                <div className="bg-white dark:bg-[#1a1f24] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <div className="flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Centre */}
                            <div className="relative" ref={centreDropdownRef}>
                                <button
                                    onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                    className="min-w-[170px] h-10 px-3 bg-white border border-gray-300 rounded-md flex justify-between items-center text-sm text-gray-500"
                                >
                                    <span className="truncate">{selectedCentres.length ? `${selectedCentres.length} Selected` : "------Set Centre------"}</span>
                                    <FaChevronDown size={10} />
                                </button>
                                {isCentreDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                        {centres.map(c => (
                                            <div key={c._id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => {
                                                setSelectedCentres(prev => prev.includes(c._id) ? prev.filter(x => x !== c._id) : [...prev, c._id]);
                                            }}>
                                                <input type="checkbox" checked={selectedCentres.includes(c._id)} readOnly className="rounded text-blue-600" />
                                                <span className="text-sm text-gray-700 truncate">{c.centreName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Course */}
                            <div className="relative" ref={courseDropdownRef}>
                                <button
                                    onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                                    className="min-w-[170px] h-10 px-3 bg-white border border-gray-300 rounded-md flex justify-between items-center text-sm text-gray-500"
                                >
                                    <span className="truncate">{selectedCourses.length ? `${selectedCourses.length} Selected` : "------Set Course------"}</span>
                                    <FaChevronDown size={10} />
                                </button>
                                {isCourseDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                        {courses.map(c => (
                                            <div key={c._id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => {
                                                setSelectedCourses(prev => prev.includes(c._id) ? prev.filter(x => x !== c._id) : [...prev, c._id]);
                                            }}>
                                                <input type="checkbox" checked={selectedCourses.includes(c._id)} readOnly className="rounded text-blue-600" />
                                                <span className="text-sm text-gray-700 truncate">{c.courseName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Exam Tag */}
                            <select
                                value={selectedExamTag}
                                onChange={(e) => setSelectedExamTag(e.target.value)}
                                className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[150px] outline-none"
                            >
                                <option value="">Exam Tag</option>
                                {examTags.map(tag => (
                                    <option key={tag._id} value={tag._id}>{tag.name}</option>
                                ))}
                            </select>

                            {/* Session */}
                            <select
                                value={selectedSession}
                                onChange={(e) => setSelectedSession(e.target.value)}
                                className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm text-gray-700 min-w-[150px] outline-none"
                            >
                                <option value="">Select Session</option>
                                {sessions.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>

                            <button onClick={handleResetFilters} className="text-red-500 text-sm font-semibold hover:underline">
                                Reset
                            </button>
                        </div>

                        <button
                            onClick={handleDownloadExcel}
                            className="bg-[#22c55e] hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 shadow-sm"
                        >
                            <FaDownload size={14} /> Download Excel
                        </button>
                    </div>

                    <div className="flex justify-center mt-4 items-center gap-4">
                        <select
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value)}
                            className="h-9 px-3 bg-white border border-gray-300 rounded-md text-sm font-semibold text-gray-700 outline-none shadow-sm"
                        >
                            <option value="This Year">This Year</option>
                            <option value="Last Year">Last Year</option>
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

                {/* Content Area */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 min-h-[500px]">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                        <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                        Course-Wise Student Enrollments
                    </h3>

                    {loading ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse tracking-widest text-xs">ANALYZING COURSES...</p>
                            </div>
                        </div>
                    ) : reportData.length === 0 ? (
                        <div className="flex h-96 items-center justify-center text-gray-400 flex-col gap-4 bg-gray-50 dark:bg-[#131619] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <FaUserGraduate size={48} className="opacity-20" />
                            <p className="uppercase tracking-[0.2em] text-sm font-bold opacity-50">No enrollment data found</p>
                        </div>
                    ) : (
                        <>
                            {displayMode === "chart" && (
                                <div className="animate-fade-in">
                                    <div className="flex flex-col lg:flex-row items-center w-full gap-8">
                                        <div className="w-full lg:w-1/2 h-[400px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={reportData}
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={150}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                        label={({ payload }) => `${payload.percent}%`}
                                                    >
                                                        {reportData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="w-full lg:w-1/2">
                                            <h4 className="text-center font-bold text-gray-700 dark:text-gray-300 mb-6 uppercase tracking-widest text-xs">Top Value Distribution</h4>
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200">
                                                {reportData.map((item, index) => (
                                                    <div key={index} className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-3 group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                            <span className="font-bold group-hover:text-gray-900 dark:group-hover:text-white transition-colors uppercase text-[11px]">{item.name}</span>
                                                        </div>
                                                        <span className="font-black text-gray-900 dark:text-white">{item.percent}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-12 flex flex-wrap justify-center gap-6">
                                        {reportData.map((item, index) => (
                                            <div key={index} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                <span>{item.name} {selectedSession}</span>
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
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Course Name</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Enrollments</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Revenue</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Market Share</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Revenue %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {reportData.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                    <td className="p-5 text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight group-hover:text-purple-600 transition-colors">{item.name}</td>
                                                    <td className="p-5 text-center font-black text-lg text-gray-900 dark:text-white">{item.value}</td>
                                                    <td className="p-5 text-right font-bold text-gray-600 dark:text-gray-400">₹{item.revenue.toLocaleString('en-IN')}</td>
                                                    <td className="p-5 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-xs font-black text-purple-600">{item.percent}%</span>
                                                            <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-purple-500" style={{ width: `${item.percent}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-right font-black text-sm text-gray-900 dark:text-white">{item.revenuePercent || 0}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {displayMode === "card" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                                    {reportData.map((item, idx) => (
                                        <div key={idx} className="bg-white dark:bg-[#131619] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 -mr-12 -mt-12 rounded-full transform rotate-45 group-hover:scale-150 transition-transform duration-700"></div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="font-black text-gray-800 dark:text-white uppercase text-xs tracking-tight line-clamp-1 flex-1">{item.name}</h4>
                                                    <span className="bg-purple-500/10 text-purple-500 text-[10px] font-black px-2 py-0.5 rounded ml-2">{item.percent}%</span>
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Students</div>
                                                            <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{item.value}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Revenue</div>
                                                            <div className="text-sm font-bold text-green-600">₹{(item.revenue / 1000).toFixed(1)}K</div>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-1000"
                                                            style={{ width: `${item.percent}%` }}
                                                        ></div>
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

                {/* Second Chart: Total Revenue Per Course */}
                <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center min-h-[500px] mt-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Total Revenue Per Course</h3>

                    <div className="flex flex-col lg:flex-row items-center w-full gap-8">
                        {/* Chart */}
                        <div className="w-full lg:w-1/2 h-[400px]">
                            {reportData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={reportData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={150}
                                            fill="#8884d8"
                                            dataKey="revenue"
                                            label={({ payload }) => `${payload.revenuePercent || 0}%`}
                                        >
                                            {reportData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No Data Available</div>
                            )}
                        </div>

                        {/* Top Values List */}
                        <div className="w-full lg:w-1/2">
                            <h4 className="text-center font-bold text-gray-700 mb-4">Top Value</h4>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {[...reportData].sort((a, b) => b.revenue - a.revenue).map((item, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm text-gray-600 border-b border-gray-100 pb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                        <span className="font-bold">{item.revenuePercent || 0}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Legend at Bottom */}
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        {reportData.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span>{item.name} {selectedSession}</span>
                            </div>
                        ))}
                    </div>
                </div>


                {/* Additional Sections: Center-wise Analysis */}
                <div className="mt-8 grid grid-cols-1 gap-8 pb-10">

                    {/* Center-wise Revenue */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Center-wise Revenue</h3>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={[...centreData].sort((a, b) => b.revenue - a.revenue)} // Sort desc
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={150}
                                        tick={{ fontSize: 12, fill: '#374151' }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Center-wise Enrollment */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Center-wise Enrollment</h3>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={[...centreData].sort((a, b) => b.enrollment - a.enrollment)}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={150}
                                        tick={{ fontSize: 12, fill: '#374151' }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="enrollment" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </Layout >
    );
};

export default CourseReport;
