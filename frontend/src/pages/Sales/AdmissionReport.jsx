import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaCalendarAlt, FaChartLine, FaChartPie, FaPlus } from "react-icons/fa";
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

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs
    const [selectedCourses, setSelectedCourses] = useState([]); // Array of IDs
    const [selectedClasses, setSelectedClasses] = useState([]); // Array of IDs
    const [selectedExamTag, setSelectedExamTag] = useState(""); // Single ID
    const [timePeriod, setTimePeriod] = useState("This Year"); // "This Year", "Last Year", "Custom"
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

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
    }, [selectedCentres, selectedCourses, selectedClasses, selectedExamTag, timePeriod, startDate, endDate]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Centres
            const centreRes = await fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers });
            if (centreRes.ok) setCentres(await centreRes.json());

            // Fetch Courses
            const courseRes = await fetch(`${import.meta.env.VITE_API_URL}/course`, { headers });
            if (courseRes.ok) setCourses(await courseRes.json());

            // Fetch Classes
            const classRes = await fetch(`${import.meta.env.VITE_API_URL}/class`, { headers });
            if (classRes.ok) setClasses(await classRes.json());

            // Fetch Exam Tags
            // Corrected endpoint from /exam-tag to /examTag matching server.js
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
                if (!startDate || !endDate) return; // Should be handled by useEffect but safe check
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else {
                const currentYear = new Date().getFullYear();
                const year = timePeriod === "This Year" ? currentYear : currentYear - 1;
                params.append("year", year);
            }

            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length > 0) params.append("courseIds", selectedCourses.join(","));
            if (selectedClasses.length > 0) params.append("classIds", selectedClasses.join(","));
            if (selectedExamTag) params.append("examTagId", selectedExamTag);

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
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleCourseSelection = (id) => {
        setSelectedCourses(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleClassSelection = (id) => {
        setSelectedClasses(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedClasses([]);
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

        const getExamTagName = () => {
            if (!selectedExamTag) return "All Exam Tags";
            const tag = examTags.find(t => t._id === selectedExamTag);
            return tag ? tag.name : "Unknown";
        };

        const centersStr = getCentreNames();
        const coursesStr = getCourseNames();
        const classesStr = getClassNames();
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
            { wch: 20 }, // ExamTag
        ];
        ws['!cols'] = wscols;

        // Attempt to set wrapText (Note: This may require Pro version or standard file-saver might strip, but best effort)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
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
                    {/* User Profile/Notification Icons (Usually in Layout, but screenshot has them) */}
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
                            placeholder="Select Course(s)"
                            options={courses}
                            selectedValues={selectedCourses}
                            onToggle={toggleCourseSelection}
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
                {/* Monthly Trend */}
                <div className="bg-white dark:bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Monthly Admissions Trend -</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={reportData.trend} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="month"
                                    stroke="#6B7280"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    fontSize={12}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#1F2937' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#8b5cf6"
                                    strokeWidth={3}
                                    dot={{ r: 4, stroke: '#8b5cf6', fill: '#fff', strokeWidth: 2 }}
                                    activeDot={{ r: 6, fill: '#8b5cf6' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Admission Status */}
                <div className="bg-white dark:bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Admission Status</h3>

                    <div className="flex items-center justify-between">
                        <div className="w-1/2 flex justify-center">
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
                        </div>

                        <div className="w-1/2 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                                <span className="font-medium text-gray-700">Admitted</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
                                <span className="font-medium text-gray-700">In Counselling</span>
                            </div>
                        </div>
                    </div>
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
