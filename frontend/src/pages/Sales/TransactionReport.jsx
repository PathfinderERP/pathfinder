import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaDownload, FaChevronDown, FaEraser } from "react-icons/fa";
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
    const [paymentMethodData, setPaymentMethodData] = useState([]);
    const [totalRevenue, setTotalRevenue] = useState(0);

    // Master Data
    const [centres, setCentres] = useState([]);
    const [courses, setCourses] = useState([]);
    const [examTags, setExamTags] = useState([]);
    const sessions = ["2023-2024", "2024-2025", "2025-2026", "2025-2027"];

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedExamTag, setSelectedExamTag] = useState("");
    const [selectedSession, setSelectedSession] = useState("2025-2026"); // Default to match other reports
    const [timePeriod, setTimePeriod] = useState("This Year");

    // Dropdown Refs
    const centreDropdownRef = useRef(null);
    const courseDropdownRef = useRef(null);
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);

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
        fetchReportData();
    }, [selectedCentres, selectedCourses, selectedExamTag, selectedSession, timePeriod]);

    // ---- API Calls ----
    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [cRes, coRes, eRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/course`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/examTag`, { headers })
            ]);

            if (cRes.ok) setCentres(await cRes.json());
            if (coRes.ok) setCourses(await coRes.json());
            if (eRes.ok) setExamTags(await eRes.json());
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            const currentYear = new Date().getFullYear();
            const year = timePeriod === "This Year" ? currentYear : currentYear - 1;
            params.append("year", year);

            if (selectedSession) params.append("session", selectedSession);
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedCourses.length > 0) params.append("courseIds", selectedCourses.join(","));
            if (selectedExamTag) params.append("examTagId", selectedExamTag);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/transaction-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setMonthlyData(result.monthlyRevenue || []);
                setPaymentMethodData(result.paymentMethods || []);
                setTotalRevenue(result.totalRevenue || 0);
            } else {
                setMonthlyData([]);
                setPaymentMethodData([]);
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
        setSelectedSession("2025-2026");
        setTimePeriod("This Year");
        toast.info("Filters reset");
    };

    const handleDownloadExcel = () => {
        if (!monthlyData.length && !paymentMethodData.length) {
            toast.warn("No data to download");
            return;
        }

        const wb = XLSX.utils.book_new();

        // Sheet 1: Monthly Revenue
        const ws1 = XLSX.utils.json_to_sheet(monthlyData.map(m => ({
            "Month": m.month,
            "Revenue": m.revenue
        })));
        XLSX.utils.book_append_sheet(wb, ws1, "Monthly Revenue");

        // Sheet 2: Payment Methods
        const ws2 = XLSX.utils.json_to_sheet(paymentMethodData.map(p => ({
            "Method": p.name,
            "Amount": p.value,
            "Count": p.count,
            "Percentage": p.percent + "%"
        })));
        XLSX.utils.book_append_sheet(wb, ws2, "Payment Methods");

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

                        {/* Session */}
                        <select
                            value={selectedSession}
                            onChange={(e) => setSelectedSession(e.target.value)}
                            className="h-10 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-blue-500 min-w-[150px]"
                        >
                            <option value="">Select Session</option>
                            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
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
                    <div className="flex justify-center mt-2">
                        <select value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)} className="h-9 px-4 bg-white border border-gray-300 rounded-md text-sm font-semibold text-gray-700 outline-none shadow-sm cursor-pointer">
                            <option value="This Year">This Year</option>
                            <option value="Last Year">Last Year</option>
                        </select>
                    </div>
                </div>

                {/* Charts */}

                {/* 1. Monthly Revenue */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Monthly Revenue</h3>
                    <div className="h-[400px]">
                        {monthlyData.some(d => d.revenue > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} tickFormatter={(value) => `₹${value.toLocaleString()}`} />
                                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="revenue" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                        {monthlyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill="#7c73e6" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">No Revenue Data</div>
                        )}
                    </div>
                </div>

                {/* 2. Payment Methods */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Payment Methods</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
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
                        <div className="space-y-4">
                            {paymentMethodData.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="font-medium text-gray-700">{item.name} {item.percent}%</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-800">₹{item.value.toLocaleString()}</div>
                                        {item.percent < 10 && <div className="text-xs text-gray-500">({item.percent}%)</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-center text-gray-400 text-sm mt-8">
                    ©ADS.All Rights Reserved.
                </div>
            </div>
        </Layout>
    );
};

export default TransactionReport;
