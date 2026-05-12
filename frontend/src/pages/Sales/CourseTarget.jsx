import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../../components/Layout";
import { FaPlus, FaFilter, FaSync, FaEdit, FaTrash, FaDownload, FaChevronDown, FaSun, FaMoon, FaTable, FaBullseye, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import axios from "axios";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import { useNavigate } from "react-router-dom";
import AddCourseTargetModal from "../../components/Sales/AddCourseTargetModal";
import { hasPermission } from "../../config/permissions";

const CourseTarget = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [data, setData] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState("MONTHLY");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [selectedQuarter, setSelectedQuarter] = useState("Q1");
    const [selectedWeek, setSelectedWeek] = useState(1);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'sales', 'centreTarget', 'create'); // Reusing centreTarget permission for now

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

    useEffect(() => {
        fetchCentres();
        fetchDepartments();
    }, []);

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            let centerList = res.data;
            
            if (user.role !== 'superAdmin' && user.centres) {
                const allowed = user.centres.map(id => typeof id === 'object' ? id._id : id);
                centerList = centerList.filter(c => allowed.includes(c._id));
            }

            centerList = centerList.sort((a, b) => a.centreName.localeCompare(b.centreName));
            setCentres(centerList);
            if (centerList.length > 0) {
                const allIds = centerList.map(c => c._id);
                setSelectedCentres(allIds);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/department`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter by showInAdmission if the API doesn't already
            const visibleDepts = res.data
                .filter(d => d.showInAdmission !== false)
                .map(d => d.departmentName)
                .sort();
            setDepartments(visibleDepts);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchData = useCallback(async () => {
        if (selectedCentres.length === 0) {
            setData([]);
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = {
                centre: selectedCentres.includes('all') || (selectedCentres.length === centres.length && centres.length > 0) ? 'all' : selectedCentres.join(','),
                year: selectedYear,
                targetType: viewMode,
                month: selectedMonth,
                quarter: selectedQuarter,
                week: selectedWeek
            };

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/sales/course-target/analysis`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Analysis Data Received:", res.data.data);
            setData(res.data.data || []);

        } catch (e) {
            console.error(e);
            toast.error("Failed to load course target analysis");
        } finally {
            setLoading(false);
        }
    }, [selectedCentres, selectedYear, viewMode, selectedMonth, selectedQuarter, selectedWeek, centres.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getDeptStats = (centreData, deptName) => {
        if (!centreData || !centreData.departments) return { target: 0, achieved: 0, pct: 0 };
        
        // Find department by name (case-insensitive and trimmed)
        const dept = centreData.departments.find(d => 
            d.name?.trim().toLowerCase() === deptName?.trim().toLowerCase()
        );
        
        if (!dept) return { target: 0, achieved: 0, pct: 0 };
        return {
            target: dept.target || 0,
            achieved: dept.achieved || 0,
            pct: dept.pct || 0
        };
    };

    const getCentreTotal = (centreData) => {
        if (!centreData || !centreData.departments) return { target: 0, achieved: 0, pct: 0 };
        let target = 0;
        let achieved = 0;
        centreData.departments.forEach(d => {
            target += d.target || 0;
            achieved += d.achieved || 0;
        });
        const pct = target > 0 ? (achieved / target) * 100 : 0;
        return { target, achieved, pct: parseFloat(pct.toFixed(1)) };
    };

    const getTotalStats = (centreData) => {
        let totalTarget = 0;
        let totalAchieved = 0;
        centreData.departments.forEach(dept => {
            totalTarget += dept.courses.reduce((sum, c) => sum + (c.target || 0), 0);
            totalAchieved += dept.courses.reduce((sum, c) => sum + (c.achieved || 0), 0);
        });
        const pct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;
        return { totalTarget, totalAchieved, totalPct: pct.toFixed(1) };
    };

    return (
        <Layout activePage="Sales">
            <div className={`space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'} p-4 md:p-8`}>
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Course Target</h1>
                        <p className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} font-semibold uppercase text-xs tracking-widest`}>Department-wise Admission Matrix</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isDarkMode
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black'
                                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'
                                }`}
                        >
                            {isDarkMode ? <><FaSun /> Gold Mode</> : <><FaMoon /> Night Mode</>}
                        </button>
                        <button
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${isDarkMode
                                ? 'bg-green-600/90 text-white hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/20'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                                }`}
                        >
                            <FaDownload size={14} /> Export Matrix
                        </button>
                    </div>
                </div>

                {/* Filter Section - Matching CentreTarget UI */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'} p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4`}>
                    <div className="flex items-center gap-4">
                        <h3 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold flex items-center gap-2`}>
                            <FaFilter className="text-cyan-400" /> Filters
                        </h3>
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-1 flex`}>
                            {["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === mode
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-[200px] z-20 w-full sm:w-64">
                            <CustomMultiSelect
                                options={[{ value: 'all', label: 'All Centres' }, ...centres.map(c => ({ value: c._id, label: c.centreName }))]}
                                value={
                                    selectedCentres.length === centres.length && centres.length > 0
                                        ? [{ value: 'all', label: 'All Centres' }]
                                        : centres.map(c => ({ value: c._id, label: c.centreName })).filter(opt => selectedCentres.includes(opt.value))
                                }
                                onChange={(selected) => {
                                    if (selected && selected.some(o => o.value === 'all')) {
                                        setSelectedCentres(centres.map(c => c._id));
                                    } else {
                                        setSelectedCentres(selected ? selected.map(o => o.value) : []);
                                    }
                                }}
                                placeholder="Select Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {viewMode === "MONTHLY" && (
                            <div className="min-w-[120px] z-20">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                >
                                    {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        )}

                        {viewMode === "QUARTERLY" && (
                            <div className="min-w-[100px] z-20">
                                <select
                                    value={selectedQuarter}
                                    onChange={(e) => setSelectedQuarter(e.target.value)}
                                    className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                >
                                    {quarters.map(q => <option key={q} value={q}>{q}</option>)}
                                </select>
                            </div>
                        )}

                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all w-28 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>

                        <button
                            className="p-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase"
                            onClick={fetchData}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} /> Sync
                        </button>

                        {canCreate && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 text-xs font-bold uppercase"
                            >
                                <FaPlus /> Add Target
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Table - Matrix Layout */}
                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-xl border overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`uppercase font-black text-xs border-b transition-colors ${isDarkMode ? 'bg-black/20 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                    <th className="px-6 py-4 sticky left-0 z-10 bg-inherit border-r border-inherit">Centre Name</th>
                                    {departments.map(dept => (
                                        <th key={dept} className="px-6 py-4 text-center border-r border-inherit min-w-[160px]">
                                            <div className="flex flex-col items-center">
                                                <span className="text-cyan-500 mb-1">{dept}</span>
                                                <div className="flex gap-4 text-[9px] opacity-60">
                                                    <span>TARGET</span>
                                                    <span>ACHIEVED</span>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-center border-r border-inherit bg-amber-500/5">
                                        <div className="flex flex-col items-center">
                                            <span className="text-amber-500">TOTAL MATRIX</span>
                                            <div className="flex gap-4 text-[9px] opacity-60">
                                                <span>T</span>
                                                <span>A</span>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center">SCORE (%)</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={departments.length + 3} className="px-6 py-12 text-center text-cyan-400 font-bold animate-pulse">
                                            Aggregating Course Intelligence Data...
                                        </td>
                                    </tr>
                                ) : data.length === 0 ? (
                                    <tr>
                                        <td colSpan={departments.length + 3} className="px-6 py-12 text-center text-gray-500 font-medium">
                                            No admission data found for the selected period.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((centre) => {
                                        const { totalTarget, totalAchieved, totalPct } = getTotalStats(centre);
                                        return (
                                            <tr key={centre.centreId} className={`${isDarkMode ? 'hover:bg-[#131619] text-gray-400' : 'hover:bg-gray-50 text-gray-700'} transition-all duration-300 group`}>
                                                <td className={`px-6 py-5 text-sm font-black sticky left-0 z-10 border-r border-inherit shadow-sm ${isDarkMode ? 'bg-[#1a1f24] text-white' : 'bg-white text-gray-900'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${parseFloat(totalPct) >= 50 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                                                        {centre.centreName}
                                                    </div>
                                                </td>
                                                
                                                {departments.map(deptName => {
                                                    const { target, achieved, pct } = getDeptStats(centre, deptName);
                                                    return (
                                                        <td key={deptName} className="px-6 py-5 text-center border-r border-inherit">
                                                            <div className="flex justify-center items-baseline gap-2">
                                                                <span className={`text-sm font-bold ${target > 0 ? (isDarkMode ? 'text-gray-300' : 'text-gray-800') : 'opacity-20'}`}>
                                                                    {target}
                                                                </span>
                                                                <span className="text-xs opacity-30">/</span>
                                                                <span className={`text-base font-black ${achieved > 0 ? 'text-emerald-500' : 'opacity-20'}`}>
                                                                    {achieved}
                                                                </span>
                                                            </div>
                                                            {target > 0 && (
                                                                <div className="mt-1.5 w-full h-1.5 bg-gray-500/10 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full transition-all duration-700 ${parseFloat(pct) >= 100 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                <td className="px-6 py-5 text-center border-r border-inherit bg-amber-500/5">
                                                    <div className="flex justify-center items-baseline gap-2">
                                                        <span className="text-base font-black text-amber-500">{totalTarget}</span>
                                                        <span className="text-xs opacity-30">/</span>
                                                        <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalAchieved}</span>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`text-base font-black ${parseFloat(totalPct) >= 80 ? 'text-emerald-500' : parseFloat(totalPct) >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                            {totalPct}%
                                                        </span>
                                                        <div className="flex gap-1">
                                                            {parseFloat(totalPct) >= 100 ? <FaArrowUp className="text-emerald-500" size={10} /> : <FaArrowDown className="text-red-500 opacity-30" size={10} />}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showAddModal && (
                    <AddCourseTargetModal 
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => { setShowAddModal(false); fetchData(); }}
                        centres={centres}
                        isDarkMode={isDarkMode}
                    />
                )}
            </div>
        </Layout>
    );
};

export default CourseTarget;
