import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaSync, FaDownload, FaSun, FaMoon, FaChartLine, FaPlus, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import AddComparisonTargetModal from "../../components/Sales/AddComparisonTargetModal";

const monthNames = [
    "April", "May", "June", "July", "August", "September",
    "October", "November", "December", "January", "February", "March"
];

const ComparisonAnalysis = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [centres, setCentres] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    
    // Default to the current month name (dynamically shifts month-to-month)
    const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
    const matchedMonth = monthNames.find(m => m.toLowerCase() === currentMonthName.toLowerCase()) || "April";
    const [selectedMonths, setSelectedMonths] = useState([matchedMonth]);
    
    const [comparisonData, setComparisonData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Track request versions to avoid async race conditions
    const requestVersionRef = useRef(0);

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState(null);

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        fetchComparisonData();
    }, [selectedCentres, selectedMonths]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };
            
            const [centreRes, sessionRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers })
            ]);

            if (centreRes.ok) {
                const resData = await centreRes.json();
                let centerList = Array.isArray(resData) ? resData : resData.centres || [];

                // Filter by allocated centers if not superAdmin
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

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                setSessions(sessionData || []);
            }
        } catch (error) {
            console.error("Error fetching master data:", error);
            toast.error("Failed to load master data");
        }
    };

    const fetchComparisonData = async () => {
        const currentVersion = ++requestVersionRef.current;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            
            if (selectedCentres.length > 0) {
                params.append("centreIds", selectedCentres.join(","));
            }
            if (selectedMonths.length > 0) {
                params.append("months", selectedMonths.join(","));
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/comparison-analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const resData = await response.json();
            
            if (currentVersion !== requestVersionRef.current) {
                return; // Discard stale response
            }

            if (response.ok) {
                setComparisonData(resData.data || []);
            } else {
                toast.error(resData.message || "Failed to load comparison data");
            }
        } catch (error) {
            if (currentVersion !== requestVersionRef.current) {
                return;
            }
            console.error("Error fetching comparison data:", error);
            toast.error("Failed to load comparison data");
        } finally {
            if (currentVersion === requestVersionRef.current) {
                setLoading(false);
            }
        }
    };

    const calculateGrowth = (prev, curr) => {
        if (!prev || prev === 0) {
            if (curr && curr > 0) return "+100.0";
            return "0.0";
        }
        const pct = ((curr - prev) / prev) * 100;
        return (pct >= 0 ? "+" : "") + pct.toFixed(1);
    };

    const handleExport = () => {
        if (comparisonData.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const exportRows = comparisonData.map(row => {
            const targetGrowth = calculateGrowth(row.target2526, row.target2627);
            const achievedGrowth = calculateGrowth(row.achieved2526, row.achieved2627);

            return {
                "Centre Name": row.centre.centreName,
                "Month": row.month,
                "2025-2026 Target (Excl GST)": row.target2526,
                "2025-2026 Target (With GST)": row.target2526 * 1.18,
                "2025-2026 Achievement": row.achieved2526,
                "2026-2027 Target (Excl GST)": row.target2627,
                "2026-2027 Target (With GST)": row.target2627 * 1.18,
                "2026-2027 Achievement (With GST)": row.achieved2627,
                "Target Growth %": targetGrowth + "%",
                "Achievement Growth %": achievedGrowth + "%"
            };
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Comparison Analysis");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blobData = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blobData, `Comparison_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Aggregate summary stats
    const aggregatedStats = comparisonData.reduce((acc, row) => {
        acc.totalTarget2526 += row.target2526 || 0;
        acc.totalAchieved2526 += row.achieved2526 || 0;
        acc.totalTarget2627 += row.target2627 || 0;
        acc.totalAchieved2627 += row.achieved2627 || 0;
        return acc;
    }, {
        totalTarget2526: 0,
        totalAchieved2526: 0,
        totalTarget2627: 0,
        totalAchieved2627: 0
    });

    return (
        <Layout activePage="Sales">
            <div className={`space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'} p-4 md:p-8`}>
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
                            <FaChartLine className="text-cyan-400" /> Comparison Analysis
                        </h1>
                        <p className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} font-semibold`}>
                            Compare Target & Achievement between FY 2025-26 & FY 2026-27
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isDarkMode
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black'
                                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-50 hover:text-white'
                                }`}
                        >
                            {isDarkMode ? <><FaSun /> Day Mode</> : <><FaMoon /> Night Mode</>}
                        </button>
                        <button
                            onClick={handleExport}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${isDarkMode
                                ? 'bg-green-600/90 text-white hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/20'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                                }`}
                        >
                            <FaDownload size={14} /> Export Excel
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all duration-300`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            FY 2025-2026 Total Target
                        </span>
                        <div className="text-2xl font-black text-blue-500 mt-1">
                            ₹{Math.round(aggregatedStats.totalTarget2526).toLocaleString()}
                        </div>
                    </div>
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all duration-300`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            FY 2025-2026 Total Achieved
                        </span>
                        <div className="text-2xl font-black text-emerald-500 mt-1">
                            ₹{Math.round(aggregatedStats.totalAchieved2526).toLocaleString()}
                        </div>
                    </div>
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all duration-300`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            FY 2026-2027 Total Target
                        </span>
                        <div className="text-2xl font-black text-yellow-500 mt-1">
                            ₹{Math.round(aggregatedStats.totalTarget2627).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1">
                            Growth: {calculateGrowth(aggregatedStats.totalTarget2526, aggregatedStats.totalTarget2627)}%
                        </div>
                    </div>
                    <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} p-5 rounded-2xl border transition-all duration-300`}>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            FY 2026-2027 Total Achieved
                        </span>
                        <div className="text-2xl font-black text-purple-500 mt-1">
                            ₹{Math.round(aggregatedStats.totalAchieved2627).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 mt-1">
                            Growth: {calculateGrowth(aggregatedStats.totalAchieved2526, aggregatedStats.totalAchieved2627)}%
                        </div>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'} p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4`}>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <span className={`text-sm font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <FaFilter className="text-cyan-400" /> Filters:
                        </span>
                        <div className="w-64">
                            <CustomMultiSelect
                                options={centres.map(c => ({ value: c._id, label: c.centreName }))}
                                value={centres.map(c => ({ value: c._id, label: c.centreName })).filter(opt => selectedCentres.includes(opt.value))}
                                onChange={(selected) => setSelectedCentres(selected ? selected.map(o => o.value) : [])}
                                placeholder="All Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                        <div className="w-64">
                            <CustomMultiSelect
                                options={monthNames.map(m => ({ value: m, label: m }))}
                                value={monthNames.map(m => ({ value: m, label: m })).filter(opt => selectedMonths.includes(opt.value))}
                                onChange={(selected) => setSelectedMonths(selected ? selected.map(o => o.value) : [])}
                                placeholder="All Months"
                                isDarkMode={isDarkMode}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="p-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2 font-semibold"
                            onClick={fetchComparisonData}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} /> Sync Data
                        </button>
                        
                        <button
                            onClick={() => { setSelectedTarget(null); setShowAddModal(true); }}
                            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 font-semibold animate-in fade-in zoom-in-95 duration-200"
                        >
                            <FaPlus /> Add Target
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-xl border overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead>
                                <tr className={`uppercase font-black text-[10px] tracking-wider border-b transition-colors ${isDarkMode ? 'bg-black/20 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                    <th className={`px-6 py-4 sticky left-0 z-20 ${isDarkMode ? 'bg-[#1a1f24]' : 'bg-gray-50'} border-r ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.3)' }}>Centre Name</th>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4 text-center border-l border-gray-800/40 bg-blue-500/5">25-26 Target</th>
                                    <th className="px-6 py-4 text-center bg-blue-500/5">25-26 Achievement</th>
                                    <th className="px-6 py-4 text-center border-l border-gray-800/40 bg-yellow-500/5">26-27 Target</th>
                                    <th className="px-6 py-4 text-center bg-yellow-500/5">26-27 Achievement</th>
                                    <th className="px-6 py-4 text-center border-l border-gray-800/40">Target Growth %</th>
                                    <th className="px-6 py-4 text-center">Ach. Growth %</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'} text-xs font-semibold`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-cyan-400 font-bold">
                                            Loading comparative data...
                                        </td>
                                    </tr>
                                ) : comparisonData.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-12 text-center text-gray-500 font-medium">
                                            No comparison data found. Please adjust filters.
                                        </td>
                                    </tr>
                                ) : (
                                    comparisonData.map((row, idx) => {
                                        const targetDiff = calculateGrowth(row.target2526, row.target2627);
                                        const achievedDiff = calculateGrowth(row.achieved2526, row.achieved2627);

                                        return (
                                            <tr key={`${row.centre._id}-${row.month}-${idx}`} className={`${isDarkMode ? 'hover:bg-[#131619] text-gray-400' : 'hover:bg-gray-50 text-gray-700'} transition-all duration-200`}>
                                                
                                                {/* Centre Name (Sticky) */}
                                                <td className={`px-6 py-4 font-bold sticky left-0 z-10 ${isDarkMode ? 'bg-[#1a1f24] text-white border-r border-gray-800' : 'bg-white text-gray-900 border-r border-gray-100'}`} style={{ boxShadow: '2px 0 6px -1px rgba(0,0,0,0.15)' }}>
                                                    {row.centre.centreName}
                                                </td>
                                                
                                                {/* Month */}
                                                <td className={`px-6 py-4 ${isDarkMode ? 'text-cyan-100' : 'text-cyan-700'} font-bold`}>
                                                    {row.month}
                                                </td>

                                                {/* 2025-2026 Target */}
                                                <td className="px-6 py-4 font-bold text-center border-l border-gray-800/40 bg-blue-500/5 text-blue-400">
                                                    {(row.target2526 || 0).toLocaleString()}
                                                </td>

                                                {/* 2025-2026 Achievement */}
                                                <td className="px-6 py-4 font-bold text-center bg-blue-500/5 text-emerald-500">
                                                    {(row.achieved2526 || 0).toLocaleString()}
                                                </td>

                                                {/* 2026-2027 Target */}
                                                <td className="px-6 py-4 font-bold text-center border-l border-gray-800/40 bg-yellow-500/5 text-yellow-500">
                                                    {(row.target2627 || 0).toLocaleString()}
                                                </td>

                                                {/* 2026-2027 Achievement */}
                                                <td className="px-6 py-4 font-bold text-center bg-yellow-500/5 text-purple-500">
                                                    {row.achieved2627.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </td>

                                                {/* Target Growth */}
                                                <td className={`px-6 py-4 font-black text-center border-l border-gray-800/40 ${
                                                    targetDiff.startsWith('+') ? 'text-green-500' : targetDiff.startsWith('-') ? 'text-red-500' : 'text-gray-400'
                                                }`}>
                                                    {targetDiff}%
                                                </td>

                                                {/* Achievement Growth */}
                                                <td className={`px-6 py-4 font-black text-center ${
                                                    achievedDiff.startsWith('+') ? 'text-green-500' : achievedDiff.startsWith('-') ? 'text-red-500' : 'text-gray-400'
                                                }`}>
                                                    {achievedDiff}%
                                                </td>

                                                {/* Edit Action */}
                                                <td className="px-6 py-4 text-right">
                                                    {row.targetId2526 ? (
                                                        <button
                                                            onClick={() => { setSelectedTarget(row); setShowAddModal(true); }}
                                                            className="text-cyan-500 hover:text-cyan-400 transition-colors p-1"
                                                            title="Edit FY 2025-2026 data"
                                                        >
                                                            <FaEdit size={16} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-600 font-bold uppercase select-none">No Record</span>
                                                    )}
                                                </td>

                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add/Edit Modal */}
                {showAddModal && (
                    <AddComparisonTargetModal
                        target={selectedTarget}
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            setShowAddModal(false);
                            fetchComparisonData();
                        }}
                        centres={centres}
                        sessions={sessions}
                    />
                )}

            </div>
        </Layout>
    );
};

export default ComparisonAnalysis;
