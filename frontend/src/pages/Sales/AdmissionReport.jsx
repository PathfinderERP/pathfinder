import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaCalendarAlt, FaChartLine, FaChartPie, FaPlus, FaChartBar, FaTable, FaTh } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Label,
    BarChart, Bar, AreaChart, Area, ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from "framer-motion";

// Generic Searchable Dropdown
const SearchableDropdown = ({ placeholder, options, selectedValues, onToggle, labelKey = "name", valueKey = "_id" }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        (opt[labelKey] || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`min-w-[180px] max-w-[200px] h-10 px-3 py-2 border rounded-md cursor-pointer flex justify-between items-center text-sm transition-colors ${isDarkMode
                    ? 'bg-[#1a1f24] border-gray-800 text-gray-300 hover:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-500 shadow-sm'
                    }`}
            >
                <span className="truncate">
                    {selectedValues.length === 0 ? placeholder : `${selectedValues.length} Selected`}
                </span>
                <FaChevronDown size={10} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className={`absolute top-full left-0 mt-1 w-64 z-50 border rounded-lg shadow-xl max-h-60 flex flex-col ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'
                    }`}>
                    <div className={`p-2 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`w-full px-2 py-1 text-sm border rounded-md outline-none focus:border-blue-400 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <div
                                key={opt[valueKey]}
                                className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                onClick={() => onToggle(opt[valueKey])}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(opt[valueKey])}
                                    readOnly
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm truncate" title={opt[labelKey]}>{opt[labelKey]}</span>
                            </div>
                        )) : (
                            <div className="p-3 text-sm text-gray-400 text-center uppercase tracking-widest text-[10px] font-bold">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdmissionReport = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("Overview"); // Overview, Board, Subject
    const [drillMonth, setDrillMonth] = useState(null);
    const [reportData, setReportData] = useState({ 
        trend: [], 
        status: { admitted: 0, inCounselling: 0 },
        boardAnalysis: { data: [], classes: [], dailyTrend: {} },
        subjectAnalysis: []
    });

    // Master Data
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [boards, setBoards] = useState([]);

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs
    const [selectedCourses, setSelectedCourses] = useState([]); // Array of IDs
    const [selectedClasses, setSelectedClasses] = useState([]); // Array of IDs
    const [selectedDepartments, setSelectedDepartments] = useState([]); // Array of IDs
    const [selectedSubjects, setSelectedSubjects] = useState([]); // Array of IDs
    const [selectedBoards, setSelectedBoards] = useState([]); // Array of IDs
    const [selectedExamTag, setSelectedExamTag] = useState(""); // Single ID
    const [timePeriod, setTimePeriod] = useState("This Year"); // "This Year", "Last Year", "Custom"
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reportType, setReportType] = useState("monthly"); // monthly vs daily
    const [displayMode, setDisplayMode] = useState("chart"); // chart vs table
    // Comparison Mode
    const [comparisonEnabled, setComparisonEnabled] = useState(false);
    const [chartMode, setChartMode] = useState("stacked"); // stacked vs grouped

    // ---- Effects ----
    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        // Prevent fetch if Custom is selected but dates are missing
        if (timePeriod === "Custom" && (!startDate || !endDate)) {
            return;
        }
        fetchReportData();
    }, [selectedCentres, selectedCourses, selectedClasses, selectedDepartments, selectedSubjects, selectedBoards, selectedExamTag, timePeriod, startDate, endDate, reportType]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Centres, Courses, Classes, Exam Tags, and Departments in parallel
            const [centreRes, courseRes, classRes, examTagRes, deptRes, subjectRes, boardRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/department`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/subject`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/board`, { headers })
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
                const sortedCentres = centerList.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setCentres(sortedCentres);
            }
            if (courseRes.ok) setCourses(await courseRes.json());
            if (classRes.ok) setClasses(await classRes.json());
            if (examTagRes.ok) setExamTags(await examTagRes.json());
            if (deptRes.ok) {
                const allDepts = await deptRes.json();
                const visibleDepts = allDepts.filter(dept => dept.showInAdmission !== false);
                setDepartments(visibleDepts);
            }
            if (subjectRes.ok) setSubjects(await subjectRes.json());
            if (boardRes.ok) setBoards(await boardRes.json());

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
                if (!startDate || !endDate) return; // Should be handled by useEffect but safe check
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else {
                const currentYear = new Date().getFullYear();
                const year = timePeriod === "This Year" ? currentYear : currentYear - 1;
                params.append("year", year);
            }

            params.append("reportType", reportType);

            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length > 0) params.append("courseIds", selectedCourses.join(","));
            if (selectedClasses.length > 0) params.append("classes", selectedClasses.join(","));
            if (selectedDepartments.length > 0) params.append("departments", selectedDepartments.join(","));
            if (selectedSubjects.length > 0) params.append("subjectIds", selectedSubjects.join(","));
            if (selectedBoards.length > 0) params.append("boardIds", selectedBoards.join(","));
            if (selectedExamTag) params.append("examTag", selectedExamTag);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/admission-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setReportData(data);
            } else {
                setReportData({ trend: [], status: { admitted: 0, inCounselling: 0 } });
            }
        } catch (error) {
            console.error("Error fetching report", error);
        } finally {
            setLoading(false);
        }
    };

    // ---- Handlers ----
    const toggleCentreSelection = (id) => {
        setSelectedCentres(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleCourse = (id) => {
        setSelectedCourses(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleClassSelection = (id) => {
        setSelectedClasses(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDepartment = (id) =>
        setSelectedDepartments(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );

    const toggleSubject = (id) =>
        setSelectedSubjects(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );

    const toggleBoard = (id) =>
        setSelectedBoards(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedClasses([]);
        setSelectedDepartments([]);
        setSelectedSubjects([]);
        setSelectedBoards([]);
        setSelectedExamTag("");
        setTimePeriod("This Year");
        setStartDate("");
        setEndDate("");
    };

    const handleDownloadExcel = () => {
        if (!reportData) {
            toast.warn("No data available");
            return;
        }

        const currentYear = new Date().getFullYear();
        // If Custom, just use current year reference or from date for filename if needed
        const year = timePeriod === "This Year" ? currentYear : (timePeriod === "Last Year" ? currentYear - 1 : "Custom");

        // Helper to resolve names from filtered IDs
        const getCentreNames = () => {
            if (selectedCentres.length === 0) return "All Centers";
            return centres
                .filter(c => selectedCentres.includes(c._id))
                .map(c => c.centreName)
                .join("\r\n");
        };

        const getCourseNames = () => {
            if (selectedCourses.length === 0) return "All Courses";
            return courses
                .filter(c => selectedCourses.includes(c._id))
                .map(c => c.courseName)
                .join("\r\n");
        };

        const getClassNames = () => {
            if (selectedClasses.length === 0) return "All Classes";
            return classes
                .filter(c => selectedClasses.includes(c._id))
                .map(c => c.name)
                .join("\r\n");
        };

        const getDepartmentNames = () => {
            if (selectedDepartments.length === 0) return "All Departments";
            return departments
                .filter(d => selectedDepartments.includes(d._id))
                .map(d => d.departmentName)
                .join("\r\n");
        };

        const getExamTagName = () => {
            if (!selectedExamTag) return "All Exam Tags";
            const tag = examTags.find(t => t._id === selectedExamTag);
            return tag ? tag.name : "Unknown";
        };


        const getSubjectNames = () => {
            if (selectedSubjects.length === 0) return "All Subjects";
            return subjects
                .filter(s => selectedSubjects.includes(s._id))
                .map(s => s.subName)
                .join("\r\n");
        };

        const centersStr = getCentreNames();
        const coursesStr = getCourseNames();
        const classesStr = getClassNames();
        const departmentsStr = getDepartmentNames();
        const subjectsStr = getSubjectNames();
        const examTagStr = getExamTagName();

        let exportData = [];
        let sheetName = "";
        let finalCols = [];

        if (activeTab === "Board") {
            if (!reportData.boardAnalysis?.data || reportData.boardAnalysis.data.length === 0) {
                toast.warn("No Board data to download");
                return;
            }
            exportData = reportData.boardAnalysis.data.map(item => {
                const row = { 
                    "Centre Context": centersStr,
                    "Subject Name": item.subjectName, 
                    "Total Admissions": item.total,
                    "Course Context": coursesStr,
                    "Department Context": departmentsStr,
                    "Exam Tag": examTagStr
                };
                reportData.boardAnalysis.classes.forEach(cls => {
                    row[cls] = item[cls] || 0;
                });
                return row;
            });
            sheetName = "Board_Analysis";
        } else if (activeTab === "Subject") {
            if (!reportData.subjectAnalysis || reportData.subjectAnalysis.length === 0) {
                toast.warn("No Subject data to download");
                return;
            }
            exportData = reportData.subjectAnalysis.map(item => ({
                "Centre": item.centre,
                "Subject": item.subjectName,
                "Admissions": item.count,
                "Filters": `Courses: ${coursesStr} | Depts: ${departmentsStr} | Tags: ${examTagStr}`
            }));
            sheetName = "Subject_Analysis";
        } else {
            if (!reportData.trend || reportData.trend.length === 0) {
                toast.warn("No Overview data to download");
                return;
            }
            if (reportData.detailedTrend && reportData.detailedTrend.length > 0) {
                exportData = reportData.detailedTrend.map(item => ({
                    "Year": year,
                    "Month": item.monthName,
                    "Admission Count": item.count,
                    "Centre": item.centre || "All Selected",
                    "Course": item.courseName || "All Selected",
                    "Class": item.className || "All Selected",
                    "Department": item.departmentName || "All Selected",
                    "Exam Tag": examTagStr
                }));
            } else {
                exportData = reportData.trend.map(item => ({
                    "Year": year,
                    "Timeline": item.month || item.date || "Unknown",
                    "Admission Count": item.admitted || item.count || 0,
                    "Counselling Count": item.counselling || 0,
                    "Centres": centersStr,
                    "Courses": coursesStr,
                    "Subjects": subjectsStr,
                    "Classes": classesStr,
                    "Departments": departmentsStr,
                    "Exam Tag": examTagStr
                }));
            }
            sheetName = "General_Analysis_Report";
            
            finalCols = [
                { wch: 8 },  // Year
                { wch: 15 }, // Timeline / Month
                { wch: 15 }, // Admission Count
                { wch: 15 }, // Counselling Count (if present)
                { wch: 40 }, // Centres
                { wch: 40 }, // Courses
                { wch: 40 }, // Subjects
                { wch: 30 }, // Classes
                { wch: 30 }, // Departments
                { wch: 20 }  // Exam Tag
            ];
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        if (finalCols.length > 0) {
            ws['!cols'] = finalCols;
        }

        // Attempt to set wrapText (Note: This may require Pro version or standard file-saver might strip, but best effort)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.s.c + finalCols.length - 1; ++C) { // Iterate through relevant columns
                const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cell_address]) continue;
                if (!ws[cell_address].s) ws[cell_address].s = {};
                ws[cell_address].s.alignment = { wrapText: true, vertical: 'top' };
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `${sheetName}_${year}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // ---- Render Helpers ----
    const COLORS = ['#10B981', '#F59E0B']; // Green (Admitted), Yellow (In Counselling)
    const statusData = [
        { name: 'Admitted', value: reportData.status.admitted },
        { name: 'In Counselling', value: reportData.status.inCounselling }
    ];
    const totalStatus = reportData.status.admitted + reportData.status.inCounselling;

    // Custom Label for Pie Chart
    const resultLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${(percent * 100).toFixed(1)}%`}
            </text>
        );
    };

    // Mini Pie Chart Component for Rows/Cards
    const MiniStatusPie = ({ admitted, counselling, size = 60 }) => {
        const data = [
            { name: 'Admitted', value: admitted },
            { name: 'In Counselling', value: counselling }
        ];
        const total = admitted + counselling;

        if (total === 0) {
            return (
                <div style={{ width: size, height: size }} className="rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700">
                    <span className="text-[8px] text-gray-400 font-bold">EMPTY</span>
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
                                <Cell key={`mini-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ fontSize: '10px', padding: '4px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ padding: '0px' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            Admission Analysis Hub
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">Multi-dimensional admission metrics</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 p-1 rounded-2xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                            {["Overview", "Board", "Subject"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? (tab === 'Board' ? "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-indigo-500/30 text-white scale-105" : "bg-blue-600 text-white shadow-lg scale-105") : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                >
                                    {tab === 'Board' ? 'Board Analysis' : (tab === 'Subject' ? 'Subject-wise' : 'Overview')}
                                </button>
                            ))}
                        </div>

                        <div className={`flex items-center gap-1 p-1 rounded-2xl border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                            <button
                                onClick={() => setDisplayMode("chart")}
                                className={`p-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 ${displayMode === "chart" ? "bg-indigo-600 shadow-lg shadow-indigo-500/30 text-white scale-105" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                title="Chart View"
                            >
                                <FaChartBar size={18} />
                                <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Chart</span>
                            </button>
                            <button
                                onClick={() => setDisplayMode("table")}
                                className={`p-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 ${displayMode === "table" ? "bg-indigo-600 shadow-lg shadow-indigo-500/30 text-white scale-105" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                title="Table View"
                            >
                                <FaTable size={18} />
                                <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Table</span>
                            </button>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 p-1.5 rounded-2xl border shadow-inner transition-all ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                        <button
                            onClick={() => setReportType("monthly")}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${reportType === "monthly" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/5"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setReportType("daily")}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${reportType === "daily" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/5"}`}
                        >
                            Day Wise
                        </button>
                    </div>
                </div>

                {/* Dynamic Intelligence Filters */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-8 rounded-[2.5rem] border transition-all mb-8 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                        <h4 className={`text-xs font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Intelligence Parameters</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Centre Multi-Select */}
                            <SearchableDropdown
                                placeholder="Select Centre(s)"
                                options={centres}
                                selectedValues={selectedCentres}
                                onToggle={toggleCentreSelection}
                                labelKey="centreName"
                            />

                            {/* Course Multi-Select */}
                            <SearchableDropdown
                                placeholder="All Courses"
                                options={courses}
                                selectedValues={selectedCourses}
                                onToggle={toggleCourse}
                                labelKey="courseName"
                            />

                            {/* Class Multi-Select */}
                            <SearchableDropdown
                                placeholder="Select Class(es)"
                                options={classes}
                                selectedValues={selectedClasses}
                                onToggle={toggleClassSelection}
                                labelKey="name"
                            />

                            {/* Department Multi-Select */}
                            <SearchableDropdown
                                placeholder="All Departments"
                                options={departments}
                                selectedValues={selectedDepartments}
                                onToggle={toggleDepartment}
                                labelKey="departmentName"
                            />

                            {/* Board Multi-Select */}
                            <SearchableDropdown
                                placeholder="All Boards"
                                options={boards}
                                selectedValues={selectedBoards}
                                onToggle={toggleBoard}
                                labelKey="boardCourse"
                            />

                            {/* Subject Multi-Select */}
                            <SearchableDropdown
                                placeholder="All Subjects"
                                options={subjects}
                                selectedValues={selectedSubjects}
                                onToggle={toggleSubject}
                                labelKey="subName"
                            />

                            {/* Exam Tag Dropdown */}
                            <select
                                value={selectedExamTag}
                                onChange={(e) => setSelectedExamTag(e.target.value)}
                                className={`h-10 px-3 py-2 border rounded-md text-sm outline-none focus:border-blue-500 min-w-[150px] transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                                    }`}
                            >
                                <option value="">Exam Tag</option>
                                {examTags.map(tag => (
                                    <option key={tag._id} value={tag._id}>{tag.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleDownloadExcel}
                            className="flex items-center gap-3 bg-[#22c55e] hover:bg-green-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-green-500/20 active:scale-95"
                        >
                            <FaDownload size={14} /> Export Dataset
                        </button>
                    </div>
                </motion.div>

                {/* Time Period Filter Row */}
                <div className="flex items-center gap-4">
                    <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Time Period :</span>
                    <select
                        value={timePeriod}
                        onChange={(e) => setTimePeriod(e.target.value)}
                        className={`h-9 px-4 border rounded-md text-sm font-semibold outline-none shadow-sm transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                            }`}
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
                                className={`h-9 px-2 border rounded-md text-sm outline-none shadow-sm transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                                    }`}
                            />
                            <span className="text-gray-500 font-bold">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`h-9 px-2 border rounded-md text-sm outline-none shadow-sm transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                                    }`}
                            />
                        </div>
                    )}
                </div>

                {/* Content Sections */}
                {activeTab === "Overview" ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-10 rounded-[2.5rem] shadow-2xl border min-h-[500px] transition-colors relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'}`}
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-10 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                                <div>
                                    <h3 className={`text-2xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                        {reportType === 'monthly' ? 'Monthly' : 'Daily'} <span className="text-blue-600">Growth Index</span>
                                    </h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Global enrollment velocity vs pipeline volume</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`px-4 py-2 rounded-2xl border transition-all flex items-center gap-2 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{timePeriod}</span>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex h-96 items-center justify-center">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="w-16 h-16 border-[5px] border-blue-600 border-t-white/20 rounded-full animate-spin"></div>
                                    <p className="text-gray-400 font-black tracking-[0.3em] text-[10px] uppercase animate-pulse">Synchronizing Intelligence...</p>
                                </div>
                            </div>
                        ) : reportData.trend.length === 0 ? (
                            <div className="flex h-96 items-center justify-center text-gray-400 flex-col gap-6 bg-black/5 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800">
                                <FaChartLine size={64} className="opacity-10" />
                                <p className="uppercase tracking-[0.3em] text-xs font-black opacity-40">Zero Trend Data Points</p>
                            </div>
                        ) : (
                            <>
                                {displayMode === "chart" && (
                                    <div className="h-[400px] w-full animate-fade-in">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={reportData.trend} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                                <defs>
                                                    <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#2d3748" : "#E2E8F0"} />
                                                <XAxis dataKey={reportType === 'monthly' ? "month" : "date"} stroke="#94a3b8" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
                                                        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                                                        borderRadius: '16px', color: isDarkMode ? '#fff' : '#1f2937',
                                                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)', padding: '16px', fontWeight: 900
                                                    }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                                                <Area type="monotone" dataKey="counselling" fill="url(#areaColor)" stroke="#8b5cf644" strokeWidth={1} strokeDasharray="5 5" />
                                                <Bar dataKey="counselling" barSize={35} fill={isDarkMode ? "#ffffff08" : "#00000005"} radius={[10, 10, 0, 0]} />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="admitted" 
                                                    stroke="#2563eb" 
                                                    strokeWidth={5} 
                                                    dot={{ fill: '#2563eb', r: 5, strokeWidth: 2, stroke: '#fff' }} 
                                                    activeDot={{ r: 8, strokeWidth: 3, stroke: '#fff' }}
                                                    animationDuration={2000}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {displayMode === "table" && (
                                    <div className={`overflow-x-auto rounded-[2rem] border ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} shadow-inner bg-black/5`}>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b ${isDarkMode ? 'bg-[#131619] border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'} uppercase text-[9px] font-black tracking-widest`}>
                                                    <th className="p-6">Timeline Segment</th>
                                                    <th className="p-6 text-center">Admissions</th>
                                                    <th className="p-6 text-center">Pipeline</th>
                                                    <th className="p-6 text-center">Conversion</th>
                                                    <th className="p-6 text-center">Saturation</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                {reportData.trend.map((item, idx) => {
                                                    const maxCount = Math.max(...reportData.trend.map(d => d.count), 1);
                                                    const pct = (item.count / maxCount) * 100;
                                                    const conv = item.counselling > 0 ? ((item.admitted / item.counselling) * 100).toFixed(1) : 0;
                                                    return (
                                                        <tr key={idx} className={`transition-all duration-300 group ${isDarkMode ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-50 text-gray-800'}`}>
                                                            <td className="p-6 font-black uppercase text-xs">{reportType === 'monthly' ? item.month : item.date}</td>
                                                            <td className={`p-6 text-center font-black text-lg ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{item.admitted || 0}</td>
                                                            <td className={`p-6 text-center font-black text-lg ${isDarkMode ? 'text-violet-400' : 'text-violet-500'}`}>{item.counselling || 0}</td>
                                                            <td className="p-6">
                                                                <div className="flex justify-center items-center gap-3">
                                                                    <div className="text-[10px] font-black bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">{conv}%</div>
                                                                    <MiniStatusPie admitted={item.admitted || 0} counselling={item.counselling || 0} size={30} />
                                                                </div>
                                                            </td>
                                                            <td className="p-6">
                                                                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000"
                                                                        style={{ width: `${pct}%` }}
                                                                    ></div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                ) : activeTab === "Board" ? (
                    <div className="space-y-6">

                        {/* --- KPI Stats Row --- */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Admissions', value: (reportData.boardAnalysis?.data || []).reduce((s,i) => s + i.total, 0), color: '#8b5cf6', grad: 'from-violet-500 to-fuchsia-500', icon: <FaChartLine /> },
                                { label: 'Unique Subjects', value: (reportData.boardAnalysis?.data || []).length, color: '#10B981', grad: 'from-emerald-500 to-teal-500', icon: <FaTable /> },
                                { label: 'Classes Covered', value: (reportData.boardAnalysis?.classes || []).length, color: '#F59E0B', grad: 'from-amber-400 to-orange-500', icon: <FaPlus /> },
                                { label: 'Active Boards', value: (reportData.boardAnalysis?.boards || []).length, color: '#3B82F6', grad: 'from-sky-500 to-blue-600', icon: <FaChartBar /> },
                            ].map((stat, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    key={idx} 
                                    className={`p-6 rounded-3xl border shadow-2xl transition-all duration-300 hover:scale-[1.02] relative overflow-hidden group ${
                                    isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'
                                }`}>
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.grad} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity -mr-16 -mt-16 rounded-full blur-2xl`}></div>
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${stat.grad} text-white shadow-lg`}>
                                            {stat.icon}
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900 group-hover:text-indigo-600'}`}>{stat.value}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Live Index</span>
                                        </div>
                                    </div>
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* --- Board Trend Area Chart (Monthly Overview) --- */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-8 rounded-[2.5rem] border shadow-2xl transition-colors ${
                            isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'
                        }`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-10 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                                    <div>
                                        <h3 className={`text-xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                            {drillMonth
                                                ? `Deep Drill: ${drillMonth} Admissions`
                                                : 'Monthly Enrollment Flux'}
                                        </h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                            {drillMonth ? 'Daily board intake dynamics' : 'Comparative performance across semesters'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {drillMonth ? (
                                        <button
                                            onClick={() => setDrillMonth(null)}
                                            className="px-6 py-2 text-xs font-black uppercase tracking-[0.2em] rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                                        >
                                            Return to Overview
                                        </button>
                                    ) : (
                                        <div className="px-4 py-1.5 rounded-full bg-blue-500/5 border border-blue-500/20 text-[10px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                                            Interactive Drill Active
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!drillMonth && (
                                <div className="flex flex-wrap gap-2 mb-8 border-b pb-6 border-gray-50 dark:border-gray-800">
                                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => {
                                        const hasDailyData = !!(reportData.boardAnalysis?.dailyTrend?.[m]?.length);
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => hasDailyData && setDrillMonth(m)}
                                                className={`px-4 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all border ${
                                                    hasDailyData
                                                        ? isDarkMode
                                                            ? 'border-blue-500/40 text-blue-400 hover:bg-blue-500/20 cursor-pointer shadow-lg shadow-blue-500/10'
                                                            : 'border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer shadow-sm'
                                                        : isDarkMode
                                                            ? 'border-gray-800 text-gray-700 cursor-not-allowed opacity-50'
                                                            : 'border-gray-100 text-gray-300 cursor-not-allowed'
                                                }`}
                                            >{m}</button>
                                        );
                                    })}
                                </div>
                            )}

                            {(reportData.boardAnalysis?.boards || []).length === 0 ? (
                                <div className={`flex h-64 items-center justify-center flex-col gap-4 rounded-3xl border border-dashed ${
                                    isDarkMode ? 'border-gray-800 text-gray-700' : 'border-gray-200 text-gray-300'
                                }`}>
                                    <FaChartLine size={48} className="opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Zero Intake Detected</p>
                                </div>
                            ) : drillMonth ? (
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={reportData.boardAnalysis?.dailyTrend?.[drillMonth] || []}
                                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                        >
                                            <defs>
                                                {(reportData.boardAnalysis.boards || []).map((board, idx) => {
                                                    const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];
                                                    const c = colors[idx % colors.length];
                                                    return (
                                                        <linearGradient key={board} id={`dgrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={c} stopOpacity={0.4} />
                                                            <stop offset="95%" stopColor={c} stopOpacity={0} />
                                                        </linearGradient>
                                                    );
                                                })}
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#2d3748' : '#F1F5F9'} />
                                            <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
                                                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                                                    borderRadius: '16px', color: isDarkMode ? '#fff' : '#1f2937',
                                                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)', fontWeight: 800, padding: '12px'
                                                }}
                                                labelFormatter={(val, pay) => pay?.[0]?.payload?.date || val}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }} iconType="circle" />
                                            {(reportData.boardAnalysis.boards || []).map((board, idx) => {
                                                const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];
                                                const c = colors[idx % colors.length];
                                                return (
                                                    <Area key={board} type="monotone" dataKey={board}
                                                        stroke={c} strokeWidth={4}
                                                        fill={`url(#dgrad-${idx})`}
                                                        dot={{ fill: c, r: 4, strokeWidth: 2, stroke: isDarkMode ? '#11161a' : '#fff' }}
                                                        activeDot={{ r: 8, strokeWidth: 3, stroke: '#fff' }}
                                                        animationDuration={1500}
                                                    />
                                                );
                                            })}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={reportData.boardAnalysis.trend}
                                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                            onClick={(e) => {
                                                if (e?.activePayload?.[0]) {
                                                    const m = e.activePayload[0].payload?.monthName;
                                                    if (m && reportData.boardAnalysis?.dailyTrend?.[m]?.length) {
                                                        setDrillMonth(m);
                                                    }
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <defs>
                                                {(reportData.boardAnalysis.boards || []).map((board, idx) => {
                                                    const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];
                                                    const c = colors[idx % colors.length];
                                                    return (
                                                        <linearGradient key={board} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={c} stopOpacity={0.02} />
                                                        </linearGradient>
                                                    );
                                                })}
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#2d3748' : '#F1F5F9'} />
                                            <XAxis dataKey="monthName" stroke="#94a3b8" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
                                                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                                                    borderRadius: '16px', color: isDarkMode ? '#fff' : '#1f2937',
                                                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)', padding: '12px'
                                                }}
                                                cursor={{ stroke: isDarkMode ? '#4a5568' : '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }} iconType="circle" />
                                            {(reportData.boardAnalysis.boards || []).map((board, idx) => {
                                                const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];
                                                const c = colors[idx % colors.length];
                                                return (
                                                    <Area key={board} type="monotone" dataKey={board}
                                                        stroke={c} strokeWidth={4}
                                                        fill={`url(#grad-${idx})`}
                                                        dot={{ fill: c, r: 5, strokeWidth: 2, stroke: isDarkMode ? '#11161a' : '#fff' }}
                                                        activeDot={{ r: 9, strokeWidth: 3, stroke: '#fff' }}
                                                        animationDuration={2000}
                                                    />
                                                );
                                            })}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </motion.div>

                        {/* --- Subject × Class Matrix BREAKDOWN --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Grouped Bar Chart (2/3 width) */}
                            <motion.div 
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`lg:col-span-2 p-8 rounded-[2.5rem] border shadow-2xl transition-all ${
                                isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'
                            }`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-2 h-10 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></div>
                                        <div>
                                            <h3 className={`text-xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                Subject × Class <span className="text-orange-500">Breakdown</span>
                                            </h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Cross-sectional enrollment distribution</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        <button 
                                            onClick={() => setChartMode("grouped")}
                                            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${chartMode === 'grouped' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-500'}`}
                                        >Grouped</button>
                                        <button 
                                            onClick={() => setChartMode("stacked")}
                                            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${chartMode === 'stacked' ? 'bg-amber-500 text-white shadow-lg' : 'text-gray-500'}`}
                                        >Stacked</button>
                                    </div>
                                </div>

                                {(reportData.boardAnalysis?.data || []).length === 0 ? (
                                    <div className="flex h-80 items-center justify-center text-gray-400 flex-col gap-4">
                                        <FaChartBar size={64} className="opacity-10" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Matrix Underpopulated</p>
                                    </div>
                                ) : displayMode === "table" ? (
                                    <div className={`overflow-x-auto rounded-3xl border ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} shadow-inner bg-black/5`}>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`${isDarkMode ? 'bg-[#131619] text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-100'} border-b uppercase text-[9px] font-black tracking-widest`}>
                                                    <th className="p-5">Subject Identity</th>
                                                    <th className="p-5 text-center">Net Index</th>
                                                    {(reportData.boardAnalysis.classes || []).map(cls => (
                                                        <th key={cls} className="p-5 text-center">Cl-{cls}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                {(reportData.boardAnalysis.data || []).map((item, idx) => (
                                                    <tr key={idx} className={`transition-colors group ${isDarkMode ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}>
                                                        <td className="p-5 font-black text-xs uppercase group-hover:text-amber-500 transition-colors">{item.subjectName}</td>
                                                        <td className="p-5 text-center font-black">
                                                            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">{item.total}</span>
                                                        </td>
                                                        {(reportData.boardAnalysis.classes || []).map(cls => (
                                                            <td key={cls} className="p-5 text-center text-xs font-bold text-gray-400">{item[cls] || '—'}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={reportData.boardAnalysis.data}
                                                margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
                                                barGap={chartMode === 'grouped' ? 2 : 0}
                                                barCategoryGap={chartMode === 'grouped' ? "20%" : "30%"}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#2d3748' : '#F1F5F9'} />
                                                <XAxis
                                                    dataKey="subjectName" stroke="#94a3b8"
                                                    fontSize={9} fontWeight="black" tickLine={false} axisLine={false}
                                                    angle={-45} textAnchor="end" interval={0} 
                                                    dy={10}
                                                />
                                                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
                                                        border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                                                        borderRadius: '16px', color: isDarkMode ? '#fff' : '#1f2937',
                                                        boxShadow: '0 20px 50px rgba(0,0,0,0.4)', fontWeight: 800, padding: '14px'
                                                    }}
                                                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                                                />
                                                <Legend 
                                                    iconType="circle"
                                                    wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} 
                                                />
                                                {(reportData.boardAnalysis.classes || []).map((cls, idx) => {
                                                    const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];
                                                    return (
                                                        <Bar 
                                                            key={cls} 
                                                            dataKey={cls} 
                                                            name={`Class ${cls}`}
                                                            stackId={chartMode === 'stacked' ? 'a' : undefined}
                                                            fill={colors[idx % colors.length]}
                                                            radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                                                            maxBarSize={chartMode === 'stacked' ? 40 : 25}
                                                        />
                                                    );
                                                })}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </motion.div>

                            {/* Subject Distribution Pie (1/3 width) */}
                            <motion.div 
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-8 rounded-[2.5rem] border shadow-2xl transition-all overflow-hidden relative ${
                                isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'
                            }`}>
                                <h3 className={`text-xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                    <div className="w-2 h-10 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-full"></div>
                                    Subject <span className="text-emerald-500">Market Share</span>
                                </h3>
                                <div className="h-[250px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={reportData.boardAnalysis?.data || []}
                                                dataKey="total" nameKey="subjectName"
                                                cx="50%" cy="50%"
                                                innerRadius={65} outerRadius={95}
                                                paddingAngle={4} stroke="none"
                                                animationDuration={1500}
                                            >
                                                {(reportData.boardAnalysis?.data || []).map((entry, index) => {
                                                    const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];
                                                    return <Cell key={`c-${index}`} fill={colors[index % colors.length]} />
                                                })}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: isDarkMode ? '#1a1f24' : '#fff',
                                                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                                                    borderRadius: '16px', color: isDarkMode ? '#fff' : '#1f2937',
                                                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)', fontWeight: 800
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20%] text-center pointer-events-none">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Top Volume</p>
                                        <h4 className="text-2xl font-black text-emerald-500 leading-none">{(reportData.boardAnalysis?.data?.[0]?.total || 0)}</h4>
                                        <p className="text-[8px] font-black text-gray-500 uppercase mt-2">{reportData.boardAnalysis?.data?.[0]?.subjectName || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="mt-8 space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {(reportData.boardAnalysis?.data || []).slice(0, 10).map((item, idx) => {
                                        const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];
                                        const total = (reportData.boardAnalysis?.data || []).reduce((s,i) => s + i.total, 0);
                                        const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : 0;
                                        return (
                                            <div key={idx} className="flex items-center gap-3 text-[10px] font-black group transition-all">
                                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                                                <span className={`flex-1 truncate uppercase tracking-tighter ${isDarkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'}`}>{item.subjectName}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 group-hover:text-indigo-500 transition-colors">{item.total}</span>
                                                    <span className="w-10 text-right opacity-60 group-hover:opacity-100" style={{ color: colors[idx % colors.length] }}>{pct}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </div>

                        {/* --- TOP RANKED SUBJECT PERFORMANCE --- */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-10 rounded-[3rem] border shadow-2xl transition-all ${
                            isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-indigo-500/5' : 'bg-white border-gray-100 shadow-xl'
                        }`}>
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-10 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
                                    <div>
                                        <h3 className={`text-2xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                            Strategic <span className="text-pink-500">Subject Ranking</span>
                                        </h3>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Enrollment velocity index by core domain</p>
                                    </div>
                                </div>
                                <div className="hidden md:flex items-center gap-3">
                                    <div className="px-5 py-2 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-[10px] font-black text-pink-500 uppercase tracking-widest">
                                        Performance Audit Ready
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                {(reportData.boardAnalysis?.data || []).slice(0, 10).map((item, idx) => {
                                    const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6','#f97316','#a855f7'];
                                    const maxTotal = Math.max(...(reportData.boardAnalysis?.data || []).map(d => d.total), 1);
                                    const pct = (item.total / maxTotal) * 100;
                                    const c = colors[idx % colors.length];
                                    return (
                                        <div key={idx} className={`group flex items-center gap-6 p-4 rounded-3xl transition-all duration-300 hover:bg-black/5 cursor-default relative overflow-hidden ${
                                            isDarkMode ? 'bg-white/[0.02]' : 'bg-gray-50/50 shadow-sm border border-gray-100'
                                        }`}>
                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b transition-colors" style={{  background: `linear-gradient(to bottom, ${c}, transparent)` }}></div>
                                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-inner bg-black/10 transition-colors group-hover:bg-indigo-500 group-hover:text-white" style={{ color: c }}>
                                                {idx+1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-xs font-black uppercase tracking-tight group-hover:text-indigo-400 transition-colors truncate pr-2" style={{ color: isDarkMode ? '#e5e7eb' : '#374151' }}>{item.subjectName}</span>
                                                    <span className="text-xs font-black italic" style={{ color: c }}>{item.total} Units</span>
                                                </div>
                                                <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 dark:bg-gray-800 shadow-inner">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                                        className="h-full rounded-full shadow-lg"
                                                        style={{ background: `linear-gradient(90deg, ${c}cc, ${c})` }}
                                                    ></motion.div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>

                    </div>
                ) : (
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-10 rounded-[2.5rem] shadow-2xl border min-h-[500px] transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-emerald-500/5' : 'bg-white border-gray-200'}`}
                    >
                        <h3 className={`text-2xl font-black mb-10 flex items-center gap-4 uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            <div className="w-2 h-10 bg-emerald-600 rounded-full"></div>
                            Subject-wise <span className="text-emerald-600">Distribution Audit</span>
                        </h3>

                        {reportData.subjectAnalysis?.length === 0 ? (
                            <div className="flex h-96 items-center justify-center text-gray-400 flex-col gap-6 bg-black/5 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800">
                                <FaChartLine size={64} className="opacity-10" />
                                <p className="uppercase tracking-[0.3em] text-xs font-black opacity-40">Zero Subject Metrics Detected</p>
                            </div>
                        ) : (() => {
                            // Grouping logic for "Centers will be single"
                            const groupedAnalysis = reportData.subjectAnalysis.reduce((acc, curr) => {
                                if (!acc[curr.centre]) acc[curr.centre] = [];
                                acc[curr.centre].push({ name: curr.subjectName, count: curr.count });
                                return acc;
                            }, {});

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className={`overflow-x-auto rounded-[2rem] border shadow-2xl ${isDarkMode ? 'border-gray-800 bg-black/5' : 'border-gray-100 bg-gray-50/50'}`}>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`${isDarkMode ? 'bg-[#131619] text-gray-500 border-gray-800' : 'bg-gray-100 text-gray-400 border-gray-200'} border-b uppercase text-[10px] font-black tracking-widest`}>
                                                    <th className="p-6">Control Centre</th>
                                                    <th className="p-6">Subject Inventory & Velocity</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                {Object.entries(groupedAnalysis).map(([centre, subjects], idx) => (
                                                    <tr key={idx} className={`group ${isDarkMode ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-white text-gray-700 transition-all duration-300'}`}>
                                                        <td className="p-6 font-black text-xs text-blue-500 uppercase align-top">{centre}</td>
                                                        <td className="p-6">
                                                            <div className="flex flex-wrap gap-2">
                                                                {subjects.map((sub, sIdx) => (
                                                                    <div key={sIdx} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all hover:scale-105 ${
                                                                        isDarkMode ? 'bg-white/5 border-white/5 hover:border-emerald-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-500'
                                                                    }`}>
                                                                        <span className="text-[10px] font-black uppercase tracking-tight">{sub.name}</span>
                                                                        <div className="bg-emerald-500 text-white px-2 py-0.5 rounded-md text-[9px] font-black shadow-lg shadow-emerald-500/20">
                                                                            {sub.count}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="space-y-8">
                                        <h4 className={`text-xs font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Global Subject Popularity</h4>
                                        <div className="space-y-6">
                                            {/* Show overall subject popularity, not just per centre */}
                                            {(() => {
                                                const overallSubjectStats = {};
                                                reportData.subjectAnalysis.forEach(item => {
                                                    overallSubjectStats[item.subjectName] = (overallSubjectStats[item.subjectName] || 0) + item.count;
                                                });
                                                const sortedOverall = Object.entries(overallSubjectStats).sort((a,b) => b[1] - a[1]).slice(0, 8);
                                                const maxVal = Math.max(...sortedOverall.map(s => s[1]), 1);

                                                return sortedOverall.map(([name, count], idx) => {
                                                    const colors = ['#10b981','#3b82f6','#6366f1','#f59e0b','#ec4899'];
                                                    const c = colors[idx % colors.length];
                                                    return (
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: '100%' }}
                                                            key={idx} 
                                                            className="space-y-3 group"
                                                        >
                                                            <div className="flex justify-between text-xs font-black uppercase tracking-tighter">
                                                                <span className={isDarkMode ? 'text-gray-400 group-hover:text-white transition-colors' : 'text-gray-600 group-hover:text-gray-900 transition-colors'}>{name}</span>
                                                                <span className="text-emerald-500 text-sm italic font-black">{count}</span>
                                                            </div>
                                                            <div className="w-full h-2.5 bg-gray-100 dark:bg-black/20 rounded-full overflow-hidden shadow-inner relative">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${(count/maxVal)*100}%` }}
                                                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                                                    className="h-full rounded-full shadow-lg transition-all" 
                                                                    style={{ backgroundColor: c }}
                                                                ></motion.div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </motion.div>
                )}

                {/* Admission Status — only show for non-Board tabs */}
                {activeTab !== "Board" ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className={`p-10 rounded-[2.5rem] shadow-2xl border mt-8 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'}`}
                    >
                        <h3 className={`text-2xl font-black mb-10 flex items-center gap-4 uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                            <div className="w-2 h-10 bg-amber-500 rounded-full"></div>
                             Pipeline <span className="text-amber-500">Status Matrix</span>
                        </h3>

                    <div className="flex flex-col lg:flex-row items-center justify-around gap-12">
                        <div className="w-[320px] h-[320px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        label={resultLabel}
                                        labelLine={false}
                                        animationDuration={1500}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDarkMode ? '#1a1f24' : '#ffffff',
                                            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                            borderRadius: '16px',
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                            fontWeight: 900
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aggregate</p>
                                <h4 className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalStatus}</h4>
                            </div>
                        </div>

                        <div className="flex flex-col gap-8 w-full max-w-md">
                            <div className="space-y-6">
                                <div className="flex items-center gap-6 p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 group hover:bg-emerald-500/10 transition-all duration-300">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                        <FaPlus size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-black text-3xl tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{reportData.status.admitted}</span>
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Successfully Admitted</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 group hover:bg-amber-500/10 transition-all duration-300">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                                        <FaChartLine size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`font-black text-3xl tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{reportData.status.inCounselling}</span>
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">In Active Counselling</span>
                                    </div>
                                </div>
                            </div>
                            <div className={`pt-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} flex justify-between items-center px-4`}>
                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Conversion Potential: </span>
                                <span className="text-sm font-black text-indigo-500 italic">Global Pool Analysis Active</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
                ) : null}

                {/* Comparison Section */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className={`p-10 rounded-[2.5rem] shadow-2xl border transition-all mt-8 flex flex-col md:flex-row items-center justify-between gap-6 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-100'
                    }`}>
                    <div>
                        <h3 className={`text-2xl font-black uppercase italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Analytical <span className="text-indigo-500">Cross-Comparison</span></h3>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-2`}>Temporal horizon auditing & peer benchmarking</p>
                    </div>
                    <button
                        onClick={() => {
                            setComparisonEnabled(!comparisonEnabled);
                            toast.info("Comparison engine state toggled. Visual diffing active.");
                        }}
                        className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all border shadow-lg active:scale-95 ${comparisonEnabled 
                            ? (isDarkMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-indigo-600 border-indigo-700 text-white')
                            : (isDarkMode ? 'bg-blue-500/5 border-blue-500/20 text-blue-400 hover:bg-blue-500/10' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50')
                        }`}
                    >
                        {comparisonEnabled ? <FaChartLine size={14} className="animate-pulse" /> : <FaPlus size={14} />} 
                        {comparisonEnabled ? "Comparison Active" : "Enable Multi-Horizon Comparison"}
                    </button>
                </motion.div>
            </div>
        </Layout>
    );
};

export default AdmissionReport;
