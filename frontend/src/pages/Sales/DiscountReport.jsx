import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaEraser } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const DiscountReport = () => {
    // ---- State ----
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [detailedReport, setDetailedReport] = useState([]);
    const [totalDiscount, setTotalDiscount] = useState(0);

    // Master Data
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    // Hardcoded Sessions for now, similar to CourseReport
    const sessions = ["2023-2024", "2024-2025", "2025-2026", "2025-2027"];

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs
    const [selectedCourses, setSelectedCourses] = useState([]); // Array of IDs
    const [selectedExamTag, setSelectedExamTag] = useState(""); // Single ID
    const [selectedSession, setSelectedSession] = useState("2025-2026");
    const [timePeriod, setTimePeriod] = useState("This Year"); // "This Year", "Last Year", "This Month", "Last Month", "Custom"
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

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
    }, [selectedCentres, selectedCourses, selectedExamTag, selectedSession, timePeriod, startDate, endDate]);

    // Debug Log
    useEffect(() => {
        console.log("Discount Report Data:", reportData);
    }, [reportData]);

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

            // Fetch Exam Tags (Correct endpoint)
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
                setDetailedReport(result.detailedReport || []);
                setTotalDiscount(result.totalDiscount || 0);
            } else {
                setReportData([]);
                setTotalDiscount(0);
            }
        } catch (error) {
            console.error("Error fetching report", error);
            setReportData([]);
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

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedCourses([]);
        setSelectedExamTag("");
        setSelectedSession("2025-2026");
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
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-bold text-gray-700 mb-1">{label}</p>
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
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            Discount Report Analysis
                        </h1>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-lg font-bold text-gray-800">Fee Discount Analytics</h2>
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
                                            <input
                                                type="checkbox"
                                                checked={selectedCentres.includes(c._id)}
                                                readOnly
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
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
                                            <input
                                                type="checkbox"
                                                checked={selectedCourses.includes(c._id)}
                                                readOnly
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700 truncate">{c.courseName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Session Dropdown */}
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="h-10 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-blue-500 min-w-[150px]"
                        >
                            <option value="">Select Session</option>
                            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        {/* Exam Tag Dropdown */}
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
                    <div className="flex justify-center mt-2 items-center gap-4">
                        <select
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value)}
                            className="h-9 px-4 bg-white border border-gray-300 rounded-md text-sm font-semibold text-gray-700 outline-none shadow-sm cursor-pointer"
                        >
                            <option value="This Year">This Year</option>
                            <option value="Last Year">Last Year</option>
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

                {/* Charts Area */}
                <div className="space-y-8">

                    {/* 1. Original vs Discounted Fees */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Original vs Discounted Fees (₹)</h3>
                            <div className="flex justify-center gap-4 mt-2">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#ff4d4f]"></div><span className="text-sm text-gray-600">Original Fees</span></div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#00e396]"></div><span className="text-sm text-gray-600">Committed Fees</span></div>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            {reportData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
                                        <XAxis
                                            dataKey="name"
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                            interval={0}
                                            tick={{ fontSize: 12, fill: '#666' }}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip formatter={(val) => `₹${val.toLocaleString()}`} />} />
                                        <Bar dataKey="originalFees" name="Original Fees" fill="#ff4d4f" barSize={15} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="committedFees" name="Committed Fees" fill="#00e396" barSize={15} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No Data Available</div>
                            )}
                        </div>
                    </div>

                    {/* 2. Total Discount Given */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Total Discount Given (₹)</h3>
                            <div className="flex justify-center gap-4 mt-2">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#feb019]"></div><span className="text-sm text-gray-600">Discount Amount</span></div>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            {reportData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
                                        <XAxis
                                            dataKey="name"
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                            interval={0}
                                            tick={{ fontSize: 12, fill: '#666' }}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip content={<CustomTooltip formatter={(val) => `₹${val.toLocaleString()}`} />} />
                                        <Bar dataKey="discountGiven" name="Discount Amount" fill="#feb019" barSize={20} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No Data Available</div>
                            )}
                        </div>
                    </div>

                    {/* 3. Discount Efficiency */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800">Discount Efficiency (%)</h3>
                            <div className="flex justify-center gap-4 mt-2">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#008ffb]"></div><span className="text-sm text-gray-600">Discount %</span></div>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            {reportData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} />
                                        <XAxis
                                            dataKey="name"
                                            angle={-45}
                                            textAnchor="end"
                                            height={80}
                                            interval={0}
                                            tick={{ fontSize: 12, fill: '#666' }}
                                        />
                                        <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                                        <Tooltip content={<CustomTooltip formatter={(val) => `${val}%`} />} />
                                        <Bar dataKey="efficiency" name="Discount %" fill="#008ffb" barSize={20} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">No Data Available</div>
                            )}
                        </div>
                    </div>

                    <div className="text-center text-gray-400 text-sm mt-8">
                        ©ADS.All Rights Reserved.
                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default DiscountReport;
