import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaDownload, FaChevronDown, FaChevronLeft, FaChevronRight, FaFilter, FaCalendarAlt, FaChartBar, FaTable, FaTh, FaUserGraduate } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const CourseReport = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [centreData, setCentreData] = useState([]);
    const [detailedReport, setDetailedReport] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [totalEnrollments, setTotalEnrollments] = useState(0);
    const [reportType, setReportType] = useState("monthly"); // monthly, daily
    const [trendIndex, setTrendIndex] = useState(0);
    const trendLimit = 15;

    // Debug Log
    useEffect(() => {
        console.log("Report Data Updated:", reportData);
    }, [reportData]);

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
    const [selectedSession, setSelectedSession] = useState("");
    const [timePeriod, setTimePeriod] = useState("This Year");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [displayMode, setDisplayMode] = useState("chart"); // chart, table, card

    // Dropdowns
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);

    const centreDropdownRef = useRef(null);
    const courseDropdownRef = useRef(null);
    const departmentDropdownRef = useRef(null);


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
    }, [selectedCentres, selectedCourses, selectedDepartments, selectedExamTag, selectedSession, timePeriod, startDate, endDate, reportType]);


    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [centreRes, courseRes, examTagRes, sessionRes, deptRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers })
            ]);

            if (centreRes.ok) {
                const resData = await centreRes.json();
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
            if (courseRes.ok) setCourses(await courseRes.json());
            if (examTagRes.ok) setExamTags(await examTagRes.json());
            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                const sessionList = Array.isArray(sessionData) ? sessionData : [];
                setSessions(sessionList);
                if (sessionList.length > 0 && !selectedSession) {
                    setSelectedSession(sessionList[0].sessionName);
                }
            }
            if (deptRes.ok) setDepartments(await deptRes.json());
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
            if (selectedDepartments.length > 0) params.append("departmentIds", selectedDepartments.join(","));
            if (selectedExamTag) params.append("examTagId", selectedExamTag);
            params.append("reportType", reportType);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/course-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setReportData(result.data || []);
                setCentreData(result.centreData || []);
                setDetailedReport(result.detailedReport || []);
                setTrendData(result.trend || []);
                setTotalEnrollments(result.total || 0);
            } else {
                setReportData([]);
                setCentreData([]);
                setDetailedReport([]);
                setTotalEnrollments(0);
            }
            setTrendIndex(0);
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
        setSelectedSession(sessions.length > 0 ? sessions[0].sessionName : "");
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
    const STATUS_COLORS = ['#10B981', '#F59E0B']; // Green (Admitted), Yellow (In Counselling)

    // Mini Pie Chart Component for Rows/Cards
    const MiniStatusPie = ({ admitted, counselling, size = 60 }) => {
        const { theme } = useTheme();
        const isDarkMode = theme === 'dark';
        const data = [
            { name: 'Admitted', value: admitted },
            { name: 'In Counselling', value: counselling }
        ];
        const total = admitted + counselling;

        if (total === 0) {
            return (
                <div style={{ width: size, height: size }} className={`rounded-full flex items-center justify-center border border-dashed ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
                    <span className="text-[8px] text-gray-400 font-bold uppercase">Empty</span>
                </div>
            );
        }

        return (
            <div style={{ width: size, height: size }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={size / 4}
                            outerRadius={size / 2}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`mini-cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                fontSize: '10px',
                                padding: '4px',
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: isDarkMode ? '#1a1f24' : '#fff',
                                color: isDarkMode ? '#fff' : '#1f2937'
                            }}
                            itemStyle={{ padding: '0px', color: isDarkMode ? '#fff' : '#1f2937' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6 animate-fade-in pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Course Report</h1>
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
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${reportType === "monthly" ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setReportType("daily")}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${reportType === "daily" ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                        >
                            Day Wise
                        </button>
                    </div>
                </div>

                {/* Subheader */}
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Student Course Analytics</h2>

                {/* Filters */}
                <div className={`p-4 rounded-xl shadow-sm border transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Centre */}
                            <div className="relative" ref={centreDropdownRef}>
                                <button
                                    onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                    className={`min-w-[170px] h-10 px-3 border rounded-md flex justify-between items-center text-sm font-bold uppercase tracking-tighter transition-colors ${isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-gray-400 hover:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-600 hover:border-blue-500 shadow-sm'
                                        }`}
                                >
                                    <span className="truncate">{selectedCentres.length ? `${selectedCentres.length} Selected` : "Set Centre"}</span>
                                    <FaChevronDown size={10} className={`transition-transform duration-200 ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isCentreDropdownOpen && (
                                    <div className={`absolute top-full left-0 mt-1 w-64 border rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'
                                        }`}>
                                        {centres.map(c => (
                                            <div key={c._id} className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                                                }`} onClick={() => {
                                                    setSelectedCentres(prev => prev.includes(c._id) ? prev.filter(x => x !== c._id) : [...prev, c._id]);
                                                }}>
                                                <input type="checkbox" checked={selectedCentres.includes(c._id)} readOnly className={`rounded transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'bg-white border-gray-300 text-blue-600'}`} />
                                                <span className={`text-sm font-bold uppercase tracking-tight truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{c.centreName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Course */}
                            <div className="relative" ref={courseDropdownRef}>
                                <button
                                    onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                                    className={`min-w-[170px] h-10 px-3 border rounded-md flex justify-between items-center text-sm font-bold uppercase tracking-tighter transition-colors ${isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-gray-400 hover:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-600 hover:border-blue-500 shadow-sm'
                                        }`}
                                >
                                    <span className="truncate">{selectedCourses.length ? `${selectedCourses.length} Selected` : "Set Course"}</span>
                                    <FaChevronDown size={10} className={`transition-transform duration-200 ${isCourseDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isCourseDropdownOpen && (
                                    <div className={`absolute top-full left-0 mt-1 w-72 border rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'
                                        }`}>
                                        {courses.map(c => (
                                            <div key={c._id} className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                                                }`} onClick={() => {
                                                    setSelectedCourses(prev => prev.includes(c._id) ? prev.filter(x => x !== c._id) : [...prev, c._id]);
                                                }}>
                                                <input type="checkbox" checked={selectedCourses.includes(c._id)} readOnly className={`rounded transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'bg-white border-gray-300 text-blue-600'}`} />
                                                <span className={`text-sm font-bold uppercase tracking-tight truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{c.courseName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Department */}
                            <div className="relative" ref={departmentDropdownRef}>
                                <button
                                    onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                                    className={`min-w-[170px] h-10 px-3 border rounded-md flex justify-between items-center text-sm font-bold uppercase tracking-tighter transition-colors ${isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-gray-400 hover:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-600 hover:border-blue-500 shadow-sm'
                                        }`}
                                >
                                    <span className="truncate">{selectedDepartments.length ? `${selectedDepartments.length} Selected` : "Set Dept"}</span>
                                    <FaChevronDown size={10} className={`transition-transform duration-200 ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isDepartmentDropdownOpen && (
                                    <div className={`absolute top-full left-0 mt-1 w-64 border rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'
                                        }`}>
                                        {departments.map(d => (
                                            <div key={d._id} className={`px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                                                }`} onClick={() => {
                                                    setSelectedDepartments(prev => prev.includes(d._id) ? prev.filter(x => x !== d._id) : [...prev, d._id]);
                                                }}>
                                                <input type="checkbox" checked={selectedDepartments.includes(d._id)} readOnly className={`rounded transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-blue-500' : 'bg-white border-gray-300 text-blue-600'}`} />
                                                <span className={`text-sm font-bold uppercase tracking-tight truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{d.departmentName}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Exam Tag */}
                            <select
                                value={selectedExamTag}
                                onChange={(e) => setSelectedExamTag(e.target.value)}
                                className={`h-10 px-3 border rounded-md text-sm font-bold uppercase tracking-tighter outline-none transition-colors ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-400 focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-600 shadow-sm focus:border-blue-500'
                                    }`}
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
                                className={`h-10 px-3 border rounded-md text-sm font-bold uppercase tracking-tighter outline-none transition-colors ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-400 focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-600 shadow-sm focus:border-blue-500'
                                    }`}
                            >
                                <option value="">Select Session</option>
                                {sessions.length === 0 ? (
                                    <option value="">Loading...</option>
                                ) : (
                                    sessions.map(s => (
                                        <option key={s._id} value={s.sessionName}>{s.sessionName}</option>
                                    ))
                                )}
                            </select>

                            <button onClick={handleResetFilters} className="text-red-500 text-sm font-semibold hover:underline">
                                Reset
                            </button>
                        </div>

                        <button
                            onClick={() => navigate("/sales/board-report")}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 shadow-sm uppercase text-[11px] tracking-widest"
                        >
                            <FaChartBar size={14} /> Board analysis
                        </button>

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
                            className={`h-9 px-3 border rounded-md text-sm font-black uppercase tracking-widest outline-none transition-colors border ${isDarkMode ? 'bg-black/20 border-gray-700 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-700 shadow-sm'
                                }`}
                        >
                            <option value="This Year">This Year</option>
                            <option value="Last Year">Last Year</option>
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

                {/* Content Area */}
                <div className={`p-6 rounded-2xl shadow-xl border min-h-[500px] transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-xl font-bold mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        <div className="w-2 h-8 bg-purple-600 rounded-full"></div>
                        Course-Wise Student Enrollments ({reportType === 'monthly' ? 'Monthly' : 'Daily'} Trend)
                    </h3>

                    {displayMode === "chart" && trendData.length > 0 && (
                        <div className={`mb-12 animate-fade-in p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Timeline Range</span>
                                    <span className={`text-sm font-black ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
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
                                            className={`p-2 border rounded-lg transition-all shadow-sm disabled:opacity-30 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <FaChevronLeft size={12} />
                                        </button>
                                        <button
                                            onClick={() => setTrendIndex(Math.min(trendData.length - trendLimit, trendIndex + trendLimit))}
                                            disabled={trendIndex + trendLimit >= trendData.length}
                                            className={`p-2 border rounded-lg transition-all shadow-sm disabled:opacity-30 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
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
                                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                                        <XAxis dataKey={reportType === 'monthly' ? "month" : "date"} stroke={isDarkMode ? '#9CA3AF' : "#6B7280"} fontSize={10} tickLine={false} />
                                        <YAxis stroke={isDarkMode ? '#9CA3AF' : "#6B7280"} fontSize={10} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                                backgroundColor: isDarkMode ? '#1a1f24' : '#fff',
                                                color: isDarkMode ? '#fff' : '#1f2937'
                                            }}
                                        />
                                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={reportType === 'monthly' ? 40 : 25} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

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
                                        <div className="w-full lg:w-1/2 h-[400px] min-w-[300px]">
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
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
                                                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                                            borderRadius: '12px',
                                                            color: isDarkMode ? '#ffffff' : '#374151',
                                                            border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb'
                                                        }}
                                                        itemStyle={{ color: isDarkMode ? '#ffffff' : '#374151' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="w-full lg:w-1/2">
                                            <h4 className={`text-center font-bold mb-6 uppercase tracking-widest text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Top Value Distribution</h4>
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200">
                                                {reportData.map((item, index) => (
                                                    <div key={index} className={`flex items-center justify-between text-sm border-b pb-3 group transition-colors ${isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-100'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                            <span className={`font-black uppercase text-[11px] transition-colors ${isDarkMode ? 'group-hover:text-white' : 'group-hover:text-gray-900'}`}>{item.name}</span>
                                                        </div>
                                                        <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.percent}%</span>
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
                                <div className={`overflow-x-auto animate-fade-in rounded-xl border shadow-sm transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b transition-colors ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                                <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider">Course Name</th>
                                                <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-center">Admitted</th>
                                                <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-center">Counselling</th>
                                                <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-center">Conversion Status</th>
                                                <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Revenue</th>
                                                <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-center">Market Share</th>
                                                <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Revenue %</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                            {reportData.map((item, idx) => (
                                                <tr key={idx} className={`transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                                    <td className={`p-5 text-sm font-black uppercase tracking-tight transition-colors group-hover:text-purple-600 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</td>
                                                    <td className={`p-5 text-center font-black text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{item.admitted || 0}</td>
                                                    <td className={`p-5 text-center font-black text-lg ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`}>{item.counselling || 0}</td>
                                                    <td className="p-5">
                                                        <div className="flex justify-center">
                                                            <MiniStatusPie admitted={item.admitted || 0} counselling={item.counselling || 0} size={50} />
                                                        </div>
                                                    </td>
                                                    <td className={`p-5 text-right font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>₹{item.revenue.toLocaleString('en-IN')}</td>
                                                    <td className="p-5 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="text-xs font-black text-purple-600">{item.percent}%</span>
                                                            <div className={`w-24 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                                <div className="h-full bg-purple-500" style={{ width: `${item.percent}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`p-5 text-right font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.revenuePercent || 0}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {displayMode === "card" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                                    {reportData.map((item, idx) => (
                                        <div key={idx} className={`rounded-2xl border p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
                                            }`}>
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 -mr-12 -mt-12 rounded-full transform rotate-45 group-hover:scale-150 transition-transform duration-700"></div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className={`font-black uppercase text-xs tracking-tight line-clamp-1 flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</h4>
                                                    <MiniStatusPie admitted={item.admitted || 0} counselling={item.counselling || 0} size={40} />
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Admitted</div>
                                                            <div className={`text-2xl font-black tracking-tighter ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{item.admitted || 0}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Counselling</div>
                                                            <div className={`text-2xl font-black tracking-tighter ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`}>{item.counselling || 0}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Revenue</div>
                                                            <div className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>₹{(item.revenue / 1000).toFixed(1)}K</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Share</div>
                                                            <div className="text-xs font-black text-purple-600">{item.percent}%</div>
                                                        </div>
                                                    </div>
                                                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
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

                {/* Second Section: Total Revenue Per Course */}
                <div className={`p-6 rounded-2xl shadow-xl border min-h-[500px] mt-8 transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-xl font-bold mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        <div className="w-2 h-8 bg-green-600 rounded-full"></div>
                        Total Revenue Per Course
                    </h3>

                    {displayMode === "chart" && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col lg:flex-row items-center w-full gap-8">
                                <div className="w-full lg:w-1/2 h-[400px] min-w-[300px]">
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
                                            <Tooltip
                                                formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: 'none',
                                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                                    backgroundColor: isDarkMode ? '#1a1f24' : '#fff',
                                                    color: isDarkMode ? '#fff' : '#1f2937'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full lg:w-1/2">
                                    <h4 className={`text-center font-bold mb-6 uppercase tracking-widest text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Revenue Distribution</h4>
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200">
                                        {[...reportData].sort((a, b) => b.revenue - a.revenue).map((item, index) => (
                                            <div key={index} className={`flex items-center justify-between text-sm border-b pb-3 group transition-colors ${isDarkMode ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                    <span className={`font-black uppercase text-[11px] transition-colors ${isDarkMode ? 'group-hover:text-white' : 'group-hover:text-gray-900'}`}>{item.name}</span>
                                                </div>
                                                <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.revenuePercent || 0}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-12 flex flex-wrap justify-center gap-6">
                                {reportData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span>{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {displayMode === "table" && (
                        <div className={`overflow-x-auto animate-fade-in rounded-xl border shadow-sm transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`border-b transition-colors ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider">Course Name</th>
                                        <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Total Revenue</th>
                                        <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-center">Avg. Fee / Student</th>
                                        <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Revenue Share</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                    {[...reportData].sort((a, b) => b.revenue - a.revenue).map((item, idx) => (
                                        <tr key={idx} className={`transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                            <td className={`p-5 text-sm font-black uppercase tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</td>
                                            <td className={`p-5 text-right font-black text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>₹{item.revenue.toLocaleString('en-IN')}</td>
                                            <td className={`p-5 text-center font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>₹{item.value > 0 ? (item.revenue / item.value).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}</td>
                                            <td className={`p-5 text-right font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.revenuePercent || 0}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {displayMode === "card" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                            {[...reportData].sort((a, b) => b.revenue - a.revenue).map((item, idx) => (
                                <div key={idx} className={`rounded-2xl border p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 shadow-sm text-gray-800'
                                    }`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className={`font-black uppercase text-xs tracking-tight line-clamp-1 flex-1 transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</h4>
                                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">₹</div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</div>
                                            <div className={`text-2xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{(item.revenue / 100000).toFixed(2)}L</div>
                                        </div>
                                        <div className={`pt-2 border-t transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                                                <span className="text-gray-400">Contribution</span>
                                                <span className="text-green-500">{item.revenuePercent || 0}%</span>
                                            </div>
                                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                <div className="h-full bg-gradient-to-r from-green-600 to-emerald-500 rounded-full ml-auto"
                                                    style={{ width: `${item.revenuePercent || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* Third Section: Center-wise Analysis */}
                <div className={`p-6 rounded-2xl shadow-xl border min-h-[500px] mt-8 mb-10 transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h3 className={`text-xl font-bold mb-8 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                        Center-wise Analysis
                    </h3>

                    {displayMode === "chart" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                            {/* Center-wise Revenue Chart */}
                            <div className={`p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6 px-2">Center-wise Revenue</h4>
                                <div className="h-[400px] w-full min-w-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            layout="vertical"
                                            data={[...centreData].sort((a, b) => b.revenue - a.revenue)}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={150}
                                                tick={{ fontSize: 11, fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 600 }}
                                                interval={0}
                                            />
                                            <Tooltip
                                                formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                                    backgroundColor: isDarkMode ? '#1a1f24' : '#fff',
                                                    color: isDarkMode ? '#fff' : '#1f2937'
                                                }}
                                                itemStyle={{ color: isDarkMode ? '#ffffff' : '#374151' }}
                                            />
                                            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Center-wise Enrollment Chart */}
                            <div className={`p-6 rounded-2xl border transition-colors ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6 px-2">Center-wise Enrollment</h4>
                                <div className="h-[400px] w-full min-w-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            layout="vertical"
                                            data={[...centreData].sort((a, b) => b.enrollment - a.enrollment)}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={150}
                                                tick={{ fontSize: 11, fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 600 }}
                                                interval={0}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                                    backgroundColor: isDarkMode ? '#1a1f24' : '#fff',
                                                    color: isDarkMode ? '#fff' : '#1f2937'
                                                }}
                                                itemStyle={{ color: isDarkMode ? '#ffffff' : '#374151' }}
                                            />
                                            <Bar dataKey="enrollment" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {displayMode === "table" && (
                        <div className={`overflow-x-auto animate-fade-in rounded-xl border shadow-sm transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`border-b transition-colors ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                                        <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider">Center Name</th>
                                        <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-center">Total Enrollment</th>
                                        <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Total Revenue</th>
                                        <th className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider text-right">Avg Revenue/Student</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                    {[...centreData].sort((a, b) => b.revenue - a.revenue).map((item, idx) => (
                                        <tr key={idx} className={`transition-colors group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                            <td className={`p-5 text-sm font-black uppercase tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</td>
                                            <td className={`p-5 text-center font-black text-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{item.enrollment || 0}</td>
                                            <td className={`p-5 text-right font-black text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>₹{item.revenue.toLocaleString('en-IN')}</td>
                                            <td className={`p-5 text-right font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>₹{item.enrollment > 0 ? (item.revenue / item.enrollment).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {displayMode === "card" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                            {[...centreData].sort((a, b) => b.revenue - a.revenue).map((item, idx) => (
                                <div key={idx} className={`rounded-2xl border p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'
                                    }`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className={`font-black uppercase text-xs tracking-tight line-clamp-1 flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</h4>
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <FaTh size={12} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Enrollment</div>
                                                <div className={`text-xl font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{item.enrollment || 0}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Revenue</div>
                                                <div className={`text-xl font-black ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>₹{(item.revenue / 1000).toFixed(0)}K</div>
                                            </div>
                                        </div>
                                        <div className={`pt-2 border-t transition-colors ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Avg Yield</span>
                                                <span className={`text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{item.enrollment > 0 ? (item.revenue / (item.enrollment * 1000)).toFixed(1) : 0}K</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout >
    );
};

export default CourseReport;
