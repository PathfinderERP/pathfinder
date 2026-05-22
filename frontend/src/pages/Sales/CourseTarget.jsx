import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../../components/Layout";
import { FaPlus, FaDownload, FaSun, FaMoon, FaFilter, FaSync, FaChevronDown, FaChevronUp, FaChartBar, FaTable, FaEdit } from "react-icons/fa";
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
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [targetModalData, setTargetModalData] = useState(null);

    const handleOpenTargetModal = (centre, deptName, deptId, currentTarget) => {
        setTargetModalData({
            centreId: centre.centreId,
            departmentId: deptId,
            targetCount: currentTarget || "",
            targetType: viewMode,
            year: selectedYear,
            month: selectedMonth,
            quarter: selectedQuarter,
            week: selectedWeek
        });
        setShowTargetModal(true);
    };

    const handleTargetSuccess = () => {
        setShowTargetModal(false);
        fetchData();
    };

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState("MONTHLY");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [selectedQuarter, setSelectedQuarter] = useState("Q1");
    const [selectedWeek, setSelectedWeek] = useState(1);
    const [customStartDate, setCustomStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

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
            // selectedCentres is an array of plain _id strings
            const centreParam = selectedCentres.join(',');
            const params = {
                centre: centreParam || 'all',
                year: selectedYear,
                targetType: viewMode,
                month: selectedMonth,
                quarter: selectedQuarter,
                week: selectedWeek,
                startDate: customStartDate,
                endDate: customEndDate
            };

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/sales/course-target/analysis`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log("Analysis Data Received:", res.data.data?.length, "centres");
            setData(res.data.data || []);

        } catch (e) {
            console.error(e);
            toast.error("Failed to load course target analysis");
        } finally {
            setLoading(false);
        }
    }, [selectedCentres, selectedYear, viewMode, selectedMonth, selectedQuarter, selectedWeek, customStartDate, customEndDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getDeptStats = (centreData, deptName) => {
        if (!centreData || !centreData.departments) return { target: 0, achieved: 0, pct: 0 };

        // Find department by name (case-insensitive and trimmed)
        const dept = centreData.departments.find(d =>
            d.name?.trim().toLowerCase() === deptName?.trim().toLowerCase()
        );

        if (!dept) return { target: 0, achieved: 0, pct: 0, id: null, examTags: [], examTagAchieved: [] };
        return {
            target: dept.target || 0,
            achieved: dept.achieved || 0,
            pct: dept.pct || 0,
            id: dept.id,
            examTags: dept.examTags || [],
            examTagAchieved: dept.examTagAchieved || []
        };
    };

    const getCentreTotalAchieved = (centreData) => {
        if (!centreData || !centreData.departments) return 0;
        return centreData.departments.reduce((sum, d) => sum + (d.achieved || 0), 0);
    };

    const getTotalAchieved = (centreData) => {
        return centreData.departments.reduce((sum, dept) => sum + (dept.achieved || 0), 0);
    };

    return (
        <Layout activePage="Sales">
            <div className={`space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'} p-4 md:p-8`}>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admission Matrix</h1>
                        <p className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} font-semibold uppercase text-xs tracking-widest`}>Department-wise Performance Report</p>
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
                        <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-black/20 border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                            {["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM"].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${viewMode === mode
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                        : `${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
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

                        {(viewMode === "MONTHLY" || viewMode === "WEEKLY") && (
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

                        {viewMode === "WEEKLY" && (
                            <div className="min-w-[150px] z-20">
                                <select
                                    value={selectedWeek}
                                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                                    className={`border text-xs rounded-lg block w-full px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                >
                                    {(() => {
                                        const mIdx = monthNames.indexOf(selectedMonth);
                                        const daysInMonth = new Date(selectedYear, mIdx + 1, 0).getDate();
                                        const weekOptions = [];
                                        for (let i = 0; i < Math.ceil(daysInMonth / 7); i++) {
                                            const weekNum = i + 1;
                                            const startDay = i * 7 + 1;
                                            const endDay = Math.min((i + 1) * 7, daysInMonth);
                                            weekOptions.push(
                                                <option key={weekNum} value={weekNum}>
                                                    Week {weekNum} ({startDay} {selectedMonth.substring(0, 3)} - {endDay} {selectedMonth.substring(0, 3)})
                                                </option>
                                            );
                                        }
                                        return weekOptions;
                                    })()}
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

                        {viewMode === "CUSTOM" && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                                />
                            </div>
                        )}

                        {viewMode !== "CUSTOM" && (
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className={`border text-xs rounded-lg block px-3 py-2 outline-none font-bold transition-all w-28 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500' : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'}`}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}

                        <button
                            className="p-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase"
                            onClick={fetchData}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} /> Sync
                        </button>

                        {canCreate && viewMode === "YEARLY" && (
                            <button
                                onClick={() => {
                                    setTargetModalData(null);
                                    setShowTargetModal(true);
                                }}
                                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase shadow-lg shadow-blue-600/20"
                            >
                                <FaPlus /> Set Target
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
                                                    <span>ADMISSIONS</span>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-center border-r border-inherit bg-amber-500/5">
                                        <div className="flex flex-col items-center">
                                            <span className="text-amber-500 uppercase tracking-widest">Grand Total</span>
                                        </div>
                                    </th>
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
                                        return (
                                            <tr key={centre.centreId} className={`transition-all ${isDarkMode ? 'hover:bg-cyan-500/5' : 'hover:bg-gray-50'}`}>
                                                <td className="px-6 py-5 sticky left-0 z-10 bg-inherit border-r border-inherit">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        <span className={`text-xs font-black uppercase tracking-tighter ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                            {centre.centreName}
                                                        </span>
                                                    </div>
                                                </td>

                                                {departments.map(deptName => {
                                                    const { target, achieved, examTagAchieved, id: deptId } = getDeptStats(centre, deptName);
                                                    return (
                                                        <td
                                                            key={deptName}
                                                            className="px-6 py-5 text-center border-r border-inherit relative group/cell cursor-pointer hover:bg-cyan-500/5 transition-colors"
                                                            onClick={() => {
                                                                if (achieved > 0) {
                                                                    setDetailData({
                                                                        centreName: centre.centreName,
                                                                        deptName: deptName,
                                                                        achieved: achieved,
                                                                        breakdown: examTagAchieved
                                                                    });
                                                                    setShowDetailModal(true);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className={`text-xl font-black ${achieved > 0 ? 'text-emerald-500' : 'opacity-20'}`}>
                                                                    {achieved}
                                                                    {viewMode === "YEARLY" && (
                                                                        <>
                                                                            <span className="text-gray-500 font-normal mx-1">/</span>
                                                                            <span className={target > 0 ? (isDarkMode ? 'text-cyan-400' : 'text-cyan-600') : 'text-gray-600 opacity-40 font-normal'}>
                                                                                {target > 0 ? target : "-"}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </span>

                                                                {/* Edit/Add Target Icon on cell hover */}
                                                                {canCreate && viewMode === "YEARLY" && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleOpenTargetModal(centre, deptName, deptId, target);
                                                                        }}
                                                                        className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover/cell:opacity-100 transition-opacity hover:bg-cyan-500/20 text-cyan-400"
                                                                        title={target > 0 ? "Update Target" : "Add Target"}
                                                                    >
                                                                        <FaEdit size={12} />
                                                                    </button>
                                                                )}

                                                                {/* Exam Tag Breakdown - Shown always if data exists */}
                                                                {examTagAchieved && examTagAchieved.length > 0 && (
                                                                    <div className="mt-2 w-full space-y-0.5">
                                                                        {examTagAchieved.map((tag, idx) => (
                                                                            <div key={idx} className="flex justify-between items-center text-[8px] font-bold px-1.5 py-1 rounded bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                                                                                <span className="opacity-60 truncate max-w-[70px]" title={tag.tagName}>{tag.tagName}</span>
                                                                                <span className="text-cyan-400">{tag.count}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                <td className="px-6 py-5 text-center border-r border-inherit bg-amber-500/5">
                                                    <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{getCentreTotalAchieved(centre)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showDetailModal && detailData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'} border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200`}>
                            <div className="p-6 border-b border-inherit flex justify-between items-center">
                                <div>
                                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-tighter`}>Breakdown Details</h3>
                                    <p className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">{detailData.centreName} • {detailData.deptName}</p>
                                </div>
                                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                                    <FaPlus className="rotate-45" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500 uppercase'}`}>Total Achieved</span>
                                    <span className="text-2xl font-black text-emerald-500">{detailData.achieved}</span>
                                </div>
                                <div className="space-y-2">
                                    <h4 className={`text-[10px] font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-[0.2em] mb-3`}>Exam Tag Wise Achieved</h4>
                                    {detailData.breakdown.length > 0 ? (
                                        <div className="grid gap-2">
                                            {detailData.breakdown.map((tag, idx) => (
                                                <div key={idx} className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-black/20 border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-100 hover:border-cyan-500/50'} transition-all group`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 group-hover:animate-ping" />
                                                        <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{tag.tagName}</span>
                                                    </div>
                                                    <span className="text-sm font-black text-cyan-500">{tag.count} Admissions</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 opacity-40 italic text-sm">No specific exam tags recorded.</div>
                                    )}
                                </div>
                            </div>
                            <div className={`p-4 ${isDarkMode ? 'bg-black/20' : 'bg-gray-50'} border-t border-inherit flex justify-end`}>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showTargetModal && (
                    <AddCourseTargetModal
                        onClose={() => setShowTargetModal(false)}
                        onSuccess={handleTargetSuccess}
                        centres={centres}
                        isDarkMode={isDarkMode}
                        initialData={targetModalData}
                    />
                )}
            </div>
        </Layout>
    );
};

export default CourseTarget;
