import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSync, FaDownload, FaChartBar, FaTable, FaTh } from "react-icons/fa";
import { toast } from "react-toastify";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const TargetAchievementReport = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]); // Array of IDs
    const [displayMode, setDisplayMode] = useState("chart"); // chart, table, card

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

        const wb = XLSX.utils.book_new();

        // 1. Prepare Header Info
        const reportType = `Report Type: ${viewMode} Target Report`;
        const finYear = `Financial Year: ${filterFinancialYear}`;
        const currentMonth = `Month: ${filterMonth}`;
        const selectedCentreCount = `Selected Centres: ${selectedCentres.length}`;
        const generatedOn = `Generated on: ${new Date().toLocaleDateString()}`;
        const yearVal = `Year: ${filterYear}`;

        // 2. Prepare Data Rows
        const dataRows = data.map(item => {
            const achievementPct = item.target > 0
                ? ((item.achieved / item.target) * 100).toFixed(2) + "%"
                : "0%";

            return [
                item.centreName,        // Center Name
                filterFinancialYear,    // Financial Year
                filterYear,             // Year
                item.target,            // Target (Number)
                item.achieved,          // Achieved (Number)
                achievementPct,         // Achievement %
                filterMonth             // Month
            ];
        });

        // 3. Construct Sheet Data (Array of Arrays)
        const sheetData = [
            // Row 1: Meta Headers can be side-by-side or combined. 
            // Based on user request image, they seem to be in consecutive columns or merged.
            // Let's put them in separate cells for simplicity as per "excel like this" request.
            [reportType, finYear, yearVal, currentMonth, selectedCentreCount, generatedOn],
            [], // Empty Row 2
            // Row 3: Table Headers
            ["Center Name", "Financial Year", "Year", "Target", "Achieved", "Achievement %", "Month"],
            // Data Rows
            ...dataRows
        ];

        // 4. Create Sheet
        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        // Optional: Simple column width adjustments
        const wscols = [
            { wch: 20 }, // Center Name
            { wch: 15 }, // Fin Year
            { wch: 10 }, // Year
            { wch: 15 }, // Target
            { wch: 15 }, // Achieved
            { wch: 15 }, // %
            { wch: 15 }, // Month
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Target Report");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `Target_Report_${viewMode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

                {/* View Content */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl min-h-[500px] transition-all duration-500">
                    <h3 className="text-gray-800 dark:text-white font-bold text-xl mb-8 flex items-center gap-3">
                        <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                        Target vs Achieved ({viewMode})
                    </h3>

                    {loading ? (
                        <div className="flex h-96 items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse uppercase tracking-widest text-sm">Fetching Data...</p>
                            </div>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex h-96 items-center justify-center text-gray-400 flex-col gap-4 bg-gray-50 dark:bg-[#131619] rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                            <FaChartBar size={48} className="opacity-20" />
                            <p className="uppercase tracking-[0.2em] text-sm font-bold opacity-50">No data available for selected criteria</p>
                        </div>
                    ) : (
                        <>
                            {displayMode === "chart" && (
                                <div className="animate-fade-in">
                                    <ResponsiveContainer width="100%" height={Math.max(500, data.length * 50)}>
                                        <BarChart
                                            layout="vertical"
                                            data={data}
                                            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" opacity={0.5} />
                                            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={{ stroke: '#d1d5db' }} tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} />
                                            <YAxis
                                                dataKey="centreName"
                                                type="category"
                                                width={120}
                                                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#4b5563' }}
                                                axisLine={{ stroke: '#d1d5db' }}
                                            />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#374151', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                formatter={(value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)}
                                                cursor={{ fill: '#f3f4f6', opacity: 0.4 }}
                                            />
                                            <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                                            <Bar dataKey="target" name="Target" fill="#FF8BA7" barSize={20} radius={[0, 10, 10, 0]} />
                                            <Bar dataKey="achieved" name="Achieved" fill="#4ECDC4" barSize={20} radius={[0, 10, 10, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {displayMode === "table" && (
                                <div className="overflow-x-auto animate-fade-in rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-[#131619] border-b border-gray-200 dark:border-gray-700">
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider">Centre Name</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Target</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-right">Achieved</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Achievement %</th>
                                                <th className="p-5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {data.map((item, idx) => {
                                                const pct = item.target > 0 ? (item.achieved / item.target) * 100 : 0;
                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                        <td className="p-5 font-bold text-gray-800 dark:text-white uppercase text-sm group-hover:text-blue-600 transition-colors">{item.centreName}</td>
                                                        <td className="p-5 text-right font-medium text-gray-600 dark:text-gray-300">₹{item.target.toLocaleString('en-IN')}</td>
                                                        <td className="p-5 text-right font-bold text-gray-900 dark:text-white">₹{item.achieved.toLocaleString('en-IN')}</td>
                                                        <td className="p-5 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={`text-sm font-black ${pct >= 100 ? 'text-green-500' : pct >= 50 ? 'text-blue-500' : 'text-red-500'}`}>
                                                                    {pct.toFixed(1)}%
                                                                </span>
                                                                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            {pct >= 100 ? (
                                                                <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-green-500/30">Target Met</span>
                                                            ) : (
                                                                <span className="bg-gray-500/10 text-gray-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-gray-500/30">In Progress</span>
                                                            )}
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
                                    {data.map((item, idx) => {
                                        const pct = item.target > 0 ? (item.achieved / item.target) * 100 : 0;
                                        return (
                                            <div key={idx} className="bg-white dark:bg-[#131619] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group hover:-translate-y-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="font-black text-gray-800 dark:text-white uppercase text-xs tracking-widest flex-1">{item.centreName}</h4>
                                                    <div className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${pct >= 100 ? 'bg-green-500 text-white' : pct >= 50 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                                                        {pct.toFixed(0)}%
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Target</div>
                                                        <div className="text-sm font-bold text-gray-600 dark:text-gray-400">₹{item.target.toLocaleString('en-IN')}</div>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase">Achieved</div>
                                                        <div className="text-lg font-black text-gray-900 dark:text-white">₹{item.achieved.toLocaleString('en-IN')}</div>
                                                    </div>

                                                    <div className="pt-2">
                                                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : pct >= 50 ? 'bg-gradient-to-r from-blue-600 to-indigo-500' : 'bg-gradient-to-r from-red-600 to-orange-500'}`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
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
            </div>
        </Layout>
    );
};

export default TargetAchievementReport;
