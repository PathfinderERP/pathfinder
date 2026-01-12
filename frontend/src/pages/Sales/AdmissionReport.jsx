import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaCalendarAlt, FaChartLine, FaChartPie, FaPlus, FaChartBar, FaTable, FaTh } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Label
} from 'recharts';

// Generic Searchable Dropdown
const SearchableDropdown = ({ placeholder, options, selectedValues, onToggle, labelKey = "name", valueKey = "_id" }) => {
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
                className="min-w-[180px] max-w-[200px] h-10 px-3 py-2 bg-gray-50 dark:bg-white border border-gray-300 rounded-md cursor-pointer flex justify-between items-center text-sm text-gray-700 hover:border-blue-500 transition-colors"
            >
                <span className="truncate">
                    {selectedValues.length === 0 ? placeholder : `${selectedValues.length} Selected`}
                </span>
                <FaChevronDown size={10} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 z-50 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 flex flex-col">
                    <div className="p-2 border-b border-gray-100">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded-md outline-none focus:border-blue-400"
                            autoFocus
                        />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <div
                                key={opt[valueKey]}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                onClick={() => onToggle(opt[valueKey])}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(opt[valueKey])}
                                    readOnly
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 truncate" title={opt[labelKey]}>{opt[labelKey]}</span>
                            </div>
                        )) : (
                            <div className="p-3 text-sm text-gray-400 text-center">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const AdmissionReport = () => {
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState({ trend: [], status: { admitted: 0, inCounselling: 0 } });

    // Master Data
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs
    const [selectedCourses, setSelectedCourses] = useState([]); // Array of IDs
    const [selectedClasses, setSelectedClasses] = useState([]); // Array of IDs
    const [selectedDepartments, setSelectedDepartments] = useState([]); // Array of IDs
    const [selectedExamTag, setSelectedExamTag] = useState(""); // Single ID
    const [timePeriod, setTimePeriod] = useState("This Year"); // "This Year", "Last Year", "Custom"
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [displayMode, setDisplayMode] = useState("chart"); // chart, table, card
    const [reportType, setReportType] = useState("monthly"); // monthly, daily

    // Dropdown Visibility - Managed by SearchableDropdown component now

    // Comparison Mode (UI Only for now as per plan)
    const [comparisonEnabled, setComparisonEnabled] = useState(false);

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
    }, [selectedCentres, selectedCourses, selectedClasses, selectedDepartments, selectedExamTag, timePeriod, startDate, endDate, reportType]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Centres, Courses, Classes, Exam Tags, and Departments in parallel
            const [centreRes, courseRes, classRes, examTagRes, deptRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/class`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers }),
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
            if (classRes.ok) setClasses(await classRes.json());
            if (examTagRes.ok) setExamTags(await examTagRes.json());
            if (deptRes.ok) setDepartments(await deptRes.json());

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

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedClasses([]);
        setSelectedDepartments([]);
        setSelectedExamTag("");
        setTimePeriod("This Year");
        setStartDate("");
        setEndDate("");
    };

    const handleDownloadExcel = () => {
        if (!reportData || !reportData.trend || reportData.trend.length === 0) {
            toast.warn("No data to download");
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

        const centersStr = getCentreNames();
        const coursesStr = getCourseNames();
        const classesStr = getClassNames();
        const departmentsStr = getDepartmentNames();
        const examTagStr = getExamTagName();

        // Map trend data into requested Excel format
        // If detailedTrend is available (from updated backend), use it for granular rows
        let exportData;

        if (reportData.detailedTrend && reportData.detailedTrend.length > 0) {
            exportData = reportData.detailedTrend.map(item => ({
                "Year": year,
                "Month": item.monthName,
                "No. of Admission": item.count,
                "Centers": item.centre || "Unknown Centre",
                "Courses": item.courseName || "Unknown Course",
                "Classes": item.className || "Unknown Class",
                "Departments": item.departmentName || "Unknown Department",
                "ExamTag": examTagStr
            }));
        } else {
            // Fallback to aggregated trend if detailed data missing
            exportData = reportData.trend.map(item => ({
                "Year": year,
                "Month": item.month,
                "No. of Admission": item.count,
                "Centers": centersStr,
                "Courses": coursesStr,
                "Classes": classesStr,
                "Departments": departmentsStr,
                "ExamTag": examTagStr
            }));
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Adjust column widths
        const wscols = [
            { wch: 10 }, // Year
            { wch: 15 }, // Month
            { wch: 20 }, // No. of Admission
            { wch: 50 }, // Centers
            { wch: 50 }, // Courses
            { wch: 30 }, // Classes
            { wch: 30 }, // Departments
            { wch: 20 }, // ExamTag
        ];
        ws['!cols'] = wscols;

        // Attempt to set wrapText (Note: This may require Pro version or standard file-saver might strip, but best effort)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.s.c + wscols.length - 1; ++C) { // Iterate through relevant columns
                const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cell_address]) continue;
                if (!ws[cell_address].s) ws[cell_address].s = {};
                ws[cell_address].s.alignment = { wrapText: true, vertical: 'top' };
            }
        }

        XLSX.utils.book_append_sheet(wb, ws, "Monthly Admission Report");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `Monthly_Admission_Report_${year}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            Admission Report
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

                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a1f24] p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
                        <button
                            onClick={() => setReportType("monthly")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${reportType === "monthly" ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setReportType("daily")}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${reportType === "daily" ? "bg-purple-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}
                        >
                            Day Wise
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white dark:bg-[#1a1f24] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <span className="text-gray-900 dark:text-white font-bold whitespace-nowrap">Student Admission Report</span>

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

                        {/* Exam Tag Dropdown */}
                        <select
                            value={selectedExamTag}
                            onChange={(e) => setSelectedExamTag(e.target.value)}
                            className="h-10 px-3 py-2 bg-gray-50 dark:bg-white border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-blue-500 min-w-[150px]"
                        >
                            <option value="">Exam Tag</option>
                            {examTags.map(tag => (
                                <option key={tag._id} value={tag._id}>{tag.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 bg-[#22c55e] hover:bg-green-600 text-white px-6 py-2 rounded-md font-medium transition-colors shadow-lg shadow-green-500/20"
                    >
                        <FaDownload size={14} /> Download Excel
                    </button>
                </div>

                {/* Time Period Filter Row */}
                <div className="flex items-center gap-4">
                    <span className="text-gray-900 dark:text-white font-bold">Time Period :</span>
                    <select
                        value={timePeriod}
                        onChange={(e) => setTimePeriod(e.target.value)}
                        className="h-9 px-4 bg-white dark:bg-white border border-gray-300 rounded-md text-sm font-semibold text-gray-700 outline-none shadow-sm"
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

                {/* Charts Section */}
                {/* Charts/Views Section */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 min-h-[500px]">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                        {reportType === 'monthly' ? 'Monthly' : 'Daily'} Admissions Trend ({timePeriod})
                    </h3>

                    {loading ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse tracking-[0.2em] text-xs">LOADING REPORT...</p>
                            </div>
                        </div>
                    ) : reportData.trend.length === 0 ? (
                        <div className="flex h-96 items-center justify-center text-gray-400 flex-col gap-4 bg-gray-50 dark:bg-[#131619] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <FaChartLine size={48} className="opacity-20" />
                            <p className="uppercase tracking-[0.2em] text-sm font-bold opacity-50">No admission data found</p>
                        </div>
                    ) : (
                        <>
                            {displayMode === "chart" && (
                                <div className="h-[400px] w-full animate-fade-in">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={reportData.trend} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#E5E7EB" />
                                            <XAxis dataKey={reportType === 'monthly' ? "month" : "date"} stroke="#6B7280" fontSize={12} tickLine={false} />
                                            <YAxis stroke="#6B7280" fontSize={12} tickLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#1F2937', borderRadius: '12px' }} />
                                            <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} dot={reportType === 'monthly'} activeDot={{ r: 6, fill: '#8b5cf6' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {displayMode === "table" && (
                                <div className="overflow-x-auto animate-fade-in rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-[#131619] border-b border-gray-200 dark:border-gray-700">
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">{reportType === 'monthly' ? 'Month' : 'Date'}</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Admitted</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Counselling</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Status Breakdown</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center flex-1">Trend Bar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {reportData.trend.map((item, idx) => {
                                                const maxCount = Math.max(...reportData.trend.map(d => d.count), 1);
                                                const pct = (item.count / maxCount) * 100;
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                        <td className="p-5 font-bold text-gray-800 dark:text-white uppercase text-sm">{reportType === 'monthly' ? item.month : item.date}</td>
                                                        <td className="p-5 text-center font-black text-green-600 dark:text-green-400 text-lg">{item.admitted || 0}</td>
                                                        <td className="p-5 text-center font-black text-amber-500 dark:text-amber-400 text-lg">{item.counselling || 0}</td>
                                                        <td className="p-5">
                                                            <div className="flex justify-center">
                                                                <MiniStatusPie admitted={item.admitted || 0} counselling={item.counselling || 0} size={50} />
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000"
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

                            {displayMode === "card" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                                    {reportData.trend.map((item, idx) => {
                                        const maxCount = Math.max(...reportData.trend.map(d => d.count), 1);
                                        const pct = (item.count / maxCount) * 100;
                                        return (
                                            <div key={idx} className="bg-white dark:bg-[#131619] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="font-black text-gray-400 uppercase text-[10px] tracking-widest">{reportType === 'monthly' ? item.month : item.date}</h4>
                                                    <MiniStatusPie admitted={item.admitted || 0} counselling={item.counselling || 0} size={40} />
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <div className="text-2xl font-black text-green-600 dark:text-green-400">{item.admitted || 0}</div>
                                                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">Admitted</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-2xl font-black text-amber-500 dark:text-amber-400">{item.counselling || 0}</div>
                                                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">In Counselling</div>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2">
                                                        <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                                                            <span className="text-gray-400 font-bold">Volume</span>
                                                            <span className="text-blue-500">{pct.toFixed(0)}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-600 rounded-full"
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

                {/* Admission Status Section */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-3">
                        <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                        Overall Admission Status
                    </h3>

                    {displayMode === "chart" && (
                        <div className="flex flex-col md:flex-row items-center justify-around gap-8 animate-fade-in">
                            <div className="w-[300px] h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={0}
                                            outerRadius={120}
                                            paddingAngle={0}
                                            dataKey="value"
                                            stroke="none"
                                            label={resultLabel}
                                            labelLine={false}
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 group">
                                        <div className="w-4 h-4 rounded-full bg-[#10B981] shadow-lg shadow-emerald-500/20"></div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 dark:text-white text-2xl">{reportData.status.admitted}</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admitted Students</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 group">
                                        <div className="w-4 h-4 rounded-full bg-[#F59E0B] shadow-lg shadow-amber-500/20"></div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-gray-900 dark:text-white text-2xl">{reportData.status.inCounselling}</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">In Counselling</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Total Potential Pool: </span>
                                    <span className="text-sm font-black text-blue-600 ml-1">{totalStatus}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {displayMode === "table" && (
                        <div className="overflow-x-auto animate-fade-in rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-[#131619] border-b border-gray-200 dark:border-gray-700">
                                        <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Status Category</th>
                                        <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Total Count</th>
                                        <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Percentage Share</th>
                                        <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Trend Visualization</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {statusData.map((item, idx) => {
                                        const pct = totalStatus > 0 ? ((item.value / totalStatus) * 100).toFixed(1) : 0;
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="p-5 text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">{item.name}</td>
                                                <td className="p-5 text-center font-black text-xl text-gray-900 dark:text-white">{item.value}</td>
                                                <td className="p-5 text-center font-bold text-gray-600 dark:text-gray-400">{pct}%</td>
                                                <td className="p-5">
                                                    <div className="flex justify-end gap-2 items-center">
                                                        <div className="w-32 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div className={`h-full ${idx === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }}></div>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                            {statusData.map((item, idx) => {
                                const pct = totalStatus > 0 ? ((item.value / totalStatus) * 100).toFixed(1) : 0;
                                const isAdmitted = idx === 0;
                                return (
                                    <div key={idx} className="bg-white dark:bg-[#131619] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 w-32 h-32 ${isAdmitted ? 'bg-emerald-500/5' : 'bg-amber-500/5'} -mr-16 -mt-16 rounded-full transform rotate-45 group-hover:scale-150 transition-transform duration-700`}></div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center mb-8">
                                                <h4 className="font-black text-gray-400 uppercase text-xs tracking-widest">{item.name} Status</h4>
                                                <div className={`w-10 h-10 rounded-xl ${isAdmitted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'} flex items-center justify-center`}>
                                                    <FaChartPie size={16} />
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <div className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{item.value}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{isAdmitted ? 'Successful Conversions' : 'Active Opportunities'}</div>
                                                </div>
                                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                                    <div className="flex justify-between text-[10px] font-black uppercase mb-3">
                                                        <span className="text-gray-400">Database Share</span>
                                                        <span className={isAdmitted ? 'text-emerald-500' : 'text-amber-500'}>{pct}%</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                        <div className={`h-full ${isAdmitted ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Comparison Section */}
                <div className="bg-white dark:bg-white p-6 rounded-xl shadow-md border border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Custom Comparison</h3>
                        <p className="text-sm text-gray-500">Compare admissions between different time periods</p>
                    </div>
                    <button
                        onClick={() => setComparisonEnabled(!comparisonEnabled)}
                        className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-300 shadow-sm"
                    >
                        <FaPlus size={12} /> {comparisonEnabled ? "Disable Comparison" : "Enable Comparison"}
                    </button>
                </div>
            </div>
        </Layout>
    );
};

export default AdmissionReport;
