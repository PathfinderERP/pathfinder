import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSync, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const TargetAchievementReport = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs

    // Filters
    const [viewMode, setViewMode] = useState("Monthly"); // Monthly, Quarterly, Yearly
    const [filterFinancialYear, setFilterFinancialYear] = useState("2025-2026");
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterMonth, setFilterMonth] = useState("December"); // Default to current month
    const [filterQuarter, setFilterQuarter] = useState("Q3");

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const quarters = ["Q1", "Q2", "Q3", "Q4"];

    useEffect(() => {
        fetchCentres();
        // Set default month
        const currentMonthIndex = new Date().getMonth();
        setFilterMonth(months[currentMonthIndex]);
    }, []);

    useEffect(() => {
        fetchAnalysis();
    }, [viewMode, filterFinancialYear, filterYear, filterMonth, filterQuarter, selectedCentres]);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const resData = await response.json();
                // Assuming resData is array or resData.centres
                const centerList = Array.isArray(resData) ? resData : resData.centres || [];
                setCentres(centerList);
                // Select all by default or none? Let's select all initially logic if needed, or user selects.
                // For report, maybe top 10? let's start empty or all.
                // Let's default to ALL for better UX if list isn't huge.
                if (centerList.length > 0) {
                    setSelectedCentres(centerList.map(c => c._id));
                }
            }
        } catch (error) {
            console.error("Error fetching centres", error);
        }
    };

    const fetchAnalysis = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                viewMode,
                financialYear: filterFinancialYear,
                year: filterYear,
                month: filterMonth,
                quarter: filterQuarter,
                centreIds: selectedCentres.join(',')
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/target-analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const result = await response.json();
                setData(result.data || []);
            } else {
                toast.error("Failed to load report");
            }
        } catch (error) {
            console.error("Error fetching analysis", error);
            toast.error("Failed to load chart data");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data || data.length === 0) {
            toast.warn("No data to export");
            return;
        }
        const exportData = data.map(item => ({
            "Centre": item.centreName,
            "Target": item.target,
            "Achieved": item.achieved,
            "Achieved %": item.target > 0 ? ((item.achieved / item.target) * 100).toFixed(2) + "%" : "0%"
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "TargetAchievement");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `Target_Achievement_${viewMode}_${new Date().getTime()}.xlsx`);
    };

    const toggleCentre = (id) => {
        if (selectedCentres.includes(id)) {
            setSelectedCentres(selectedCentres.filter(c => c !== id));
        } else {
            setSelectedCentres([...selectedCentres, id]);
        }
    };

    const selectAllCentres = () => {
        if (selectedCentres.length === centres.length) {
            setSelectedCentres([]);
        } else {
            setSelectedCentres(centres.map(c => c._id));
        }
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Target Achievement Report</h1>
                        <p className="text-gray-600 dark:text-gray-400">Target vs Achieved Analysis</p>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* View Mode Tabs */}
                            <div className="bg-gray-800 rounded-lg p-1 flex">
                                {["Monthly", "Quarterly", "Yearly"].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === mode ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>

                            {/* Helper Filters */}
                            <select
                                value={filterFinancialYear}
                                onChange={(e) => setFilterFinancialYear(e.target.value)}
                                className="bg-white text-gray-800 text-sm rounded-md block px-3 py-2 outline-none font-medium w-32"
                            >
                                <option value="2024-2025">2024-2025</option>
                                <option value="2025-2026">2025-2026</option>
                            </select>

                            {viewMode === "Monthly" && (
                                <>
                                    <select
                                        value={filterYear}
                                        onChange={(e) => setFilterYear(e.target.value)}
                                        className="bg-white text-gray-800 text-sm rounded-md block px-3 py-2 outline-none font-medium w-24"
                                    >
                                        <option value="2024">2024</option>
                                        <option value="2025">2025</option>
                                    </select>
                                    <select
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(e.target.value)}
                                        className="bg-white text-gray-800 text-sm rounded-md block px-3 py-2 outline-none font-medium w-32"
                                    >
                                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </>
                            )}

                            {viewMode === "Quarterly" && (
                                <select
                                    value={filterQuarter}
                                    onChange={(e) => setFilterQuarter(e.target.value)}
                                    className="bg-white text-gray-800 text-sm rounded-md block px-3 py-2 outline-none font-medium w-24"
                                >
                                    {quarters.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            )}

                            {/* Centre Selector Dropdown (Simple Simulation) */}
                            <div className="relative group">
                                <button className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm flex items-center gap-2">
                                    {selectedCentres.length} Centres Selected ▼
                                </button>
                                {/* Dropdown Content */}
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-md shadow-xl p-2 hidden group-hover:block z-50 max-h-60 overflow-y-auto">
                                    <div
                                        onClick={selectAllCentres}
                                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm font-bold border-b text-gray-800"
                                    >
                                        {selectedCentres.length === centres.length ? "Unselect All" : "Select All"}
                                    </div>
                                    {centres.map(c => (
                                        <div
                                            key={c._id}
                                            onClick={() => toggleCentre(c._id)}
                                            className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer text-gray-800"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCentres.includes(c._id)}
                                                readOnly
                                            />
                                            <span className="text-sm truncate">{c.centreName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold transition-colors flex items-center gap-2 shadow-lg hover:shadow-green-500/20"
                            onClick={handleExport}
                        >
                            <FaDownload /> Download Excel
                        </button>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-md min-h-[500px]">
                    <h3 className="text-gray-800 font-bold text-lg mb-6 text-center">
                        Target vs Achieved ({viewMode.toLowerCase()})
                    </h3>

                    {loading ? (
                        <div className="flex h-64 items-center justify-center text-gray-400">Loading chart...</div>
                    ) : data.length === 0 ? (
                        <div className="flex h-64 items-center justify-center text-gray-400">No data available for selected criteria.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={Math.max(500, data.length * 50)}>
                            <BarChart
                                layout="vertical"
                                data={data}
                                margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                                <XAxis type="number" tick={{ fill: '#6b7280' }} axisLine={{ stroke: '#d1d5db' }} />
                                <YAxis
                                    dataKey="centreName"
                                    type="category"
                                    width={120}
                                    tick={{ fontSize: 12, fontWeight: 'bold', fill: '#374151' }}
                                    axisLine={{ stroke: '#d1d5db' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#374151', borderRadius: '8px' }}
                                    formatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
                                    cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#6b7280' }} />
                                <Bar dataKey="target" name="Target" fill="#FF8BA7" barSize={20} radius={[0, 5, 5, 0]} />
                                <Bar dataKey="achieved" name="Achieved" fill="#4ECDC4" barSize={20} radius={[0, 5, 5, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default TargetAchievementReport;
