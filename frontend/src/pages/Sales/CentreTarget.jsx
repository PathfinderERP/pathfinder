import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaPlus, FaFilter, FaSync, FaEdit, FaTrash, FaDownload, FaChevronDown, FaSun, FaMoon } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AddTargetModal from "../../components/Sales/AddTargetModal";
import { hasPermission } from "../../config/permissions";

const CentreTarget = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [targets, setTargets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState(null); // For Edit
    const [centres, setCentres] = useState([]);
    const [sessions, setSessions] = useState([]);

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [filterFinancialYear, setFilterFinancialYear] = useState("");
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState("Monthly");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Permission Checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user, 'sales', 'centreTarget', 'create');
    const canEdit = hasPermission(user, 'sales', 'centreTarget', 'edit');
    const canDelete = hasPermission(user, 'sales', 'centreTarget', 'delete');

    useEffect(() => {
        fetchMasterData();
        fetchTargets();
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsCentreDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        fetchTargets();
    }, [selectedCentres, filterFinancialYear, filterYear, startDate, endDate, viewMode]);

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

            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                const sessionList = Array.isArray(sessionData) ? sessionData : [];
                setSessions(sessionList);
                if (sessionList.length > 0 && !filterFinancialYear) {
                    setFilterFinancialYear(sessionList[0].sessionName);
                }
            }
        } catch (error) {
            console.error("Error fetching master data", error);
        }
    };

    const fetchTargets = async () => {
        if (!filterFinancialYear && viewMode !== "Custom") return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (viewMode === "Custom" && startDate && endDate) {
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else {
                if (filterFinancialYear) params.append("financialYear", filterFinancialYear);
                if (filterYear) params.append("year", filterYear);
            }

            if (selectedCentres.length > 0) {
                params.append("centre", selectedCentres.join(","));
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/centre-target?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setTargets(data.targets || []);
            }
        } catch (error) {
            console.error("Error fetching targets", error);
            toast.error("Failed to load targets");
        } finally {
            setLoading(false);
        }
    };

    const toggleCentreSelection = (centreId) => {
        setSelectedCentres(prev =>
            prev.includes(centreId) ? prev.filter(id => id !== centreId) : [...prev, centreId]
        );
    };

    const handleExport = () => {
        if (!targets || targets.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const exportData = targets.map(t => ({
            "Centre Name": t.centre?.centreName || "Unknown",
            "Financial Year": t.financialYear,
            "Year": t.year,
            "Month": t.month,
            "Target Amount": t.targetAmount,
            "Achieved Amount": t.achievedAmount,
            "Achievement %": `${t.achievementPercentage}%`
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "CentreTargets");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `CentreTargets_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this target?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/centre-target/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                toast.success("Target deleted");
                fetchTargets();
            } else {
                toast.error("Failed to delete");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Layout activePage="Sales">
            <div className={`space-y-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'} p-4 md:p-8`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Centre Target</h1>
                        <p className={`${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'} font-semibold`}>Manage monthly and yearly targets for centres</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isDarkMode
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black'
                                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'
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

                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-md'} p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4`}>
                    <div className="flex items-center gap-4">
                        <h3 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold flex items-center gap-2`}>
                            <FaFilter className="text-cyan-400" /> Filters
                        </h3>
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg p-1 flex`}>
                            {["Monthly", "Quarterly", "Yearly", "Custom"].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold uppercase tracking-widest transition-all ${viewMode === mode
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                        {viewMode === "Custom" && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className={`flex items-center gap-2 border rounded-lg px-2 py-1 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>From</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`bg-transparent text-xs focus:outline-none w-28 font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
                                    />
                                </div>
                                <div className={`flex items-center gap-2 border rounded-lg px-2 py-1 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-tight ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>To</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`bg-transparent text-xs focus:outline-none w-28 font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                className={`border text-sm rounded-lg px-4 py-2 outline-none font-bold min-w-[200px] flex justify-between items-center transition-all ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-300 hover:border-cyan-500'
                                    : 'bg-white border-gray-300 text-gray-700 hover:border-cyan-500 shadow-sm'
                                    }`}
                            >
                                <span className="uppercase text-xs tracking-widest font-black">
                                    {selectedCentres.length === 0
                                        ? "All Centres"
                                        : `${selectedCentres.length} Selected`}
                                </span>
                                <FaChevronDown size={10} className={`transition-transform duration-200 ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isCentreDropdownOpen && (
                                <div className={`absolute top-full mt-2 left-0 w-60 z-20 border rounded-lg shadow-xl overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                        {centres.map(c => (
                                            <div
                                                key={c._id}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                                                onClick={() => toggleCentreSelection(c._id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCentres.includes(c._id)}
                                                    readOnly
                                                    className={`rounded transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-cyan-500' : 'bg-white border-gray-300 text-cyan-600'}`}
                                                />
                                                <span className={`text-sm font-bold uppercase tracking-tight truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{c.centreName}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`p-2 border-t transition-colors ${isDarkMode ? 'border-gray-700 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                                        <button
                                            onClick={() => setSelectedCentres([])}
                                            className="text-[10px] text-cyan-500 hover:text-cyan-400 w-full text-center font-black uppercase tracking-widest"
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewMode !== "Custom" && (
                            <select
                                value={filterFinancialYear}
                                onChange={(e) => setFilterFinancialYear(e.target.value)}
                                className={`border text-sm rounded-lg block px-3 py-2 outline-none font-bold transition-all w-32 ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-cyan-500'
                                    : 'bg-white border-gray-300 text-gray-700 focus:border-cyan-500 shadow-sm'
                                    }`}
                            >
                                {sessions.length === 0 ? (
                                    <option value="">Loading...</option>
                                ) : (
                                    sessions.map(s => (
                                        <option key={s._id} value={s.sessionName}>{s.sessionName}</option>
                                    ))
                                )}
                            </select>
                        )}

                        <button
                            className="p-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center gap-2"
                            onClick={fetchTargets}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} /> Sync
                        </button>

                        {canCreate && (
                            <button
                                onClick={() => { setSelectedTarget(null); setShowAddModal(true); }}
                                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                <FaPlus /> Add Target
                            </button>
                        )}
                    </div>
                </div>

                <div className={`${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-xl'} rounded-xl border overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className={`uppercase font-black text-xs border-b transition-colors ${isDarkMode ? 'bg-black/20 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                    <th className="px-6 py-4">Centre Name</th>
                                    <th className="px-6 py-4">Financial Year</th>
                                    <th className="px-6 py-4">Year</th>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4 text-center">Target</th>
                                    <th className="px-6 py-4 text-center">Target Achieved</th>
                                    <th className="px-6 py-4 text-center">Achievement (%)</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-8 text-center text-cyan-400 font-bold">Loading targets...</td>
                                    </tr>
                                ) : targets.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500 font-medium">No targets found. Add one to get started.</td>
                                    </tr>
                                ) : (
                                    targets.map(target => (
                                        <tr key={target._id} className={`${isDarkMode ? 'hover:bg-[#131619] text-gray-400' : 'hover:bg-gray-50 text-gray-700'} transition-all duration-300`}>
                                            <td className={`px-6 py-4 font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{target.centre?.centreName || "Unknown"}</td>
                                            <td className="px-6 py-4">{target.financialYear}</td>
                                            <td className="px-6 py-4">{target.year}</td>
                                            <td className={`px-6 py-4 font-semibold ${isDarkMode ? 'text-cyan-100' : 'text-cyan-700'}`}>{target.month}</td>
                                            <td className={`px-6 py-4 font-bold tracking-wide text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{target.targetAmount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-blue-500 font-bold text-center">{target.achievedAmount.toLocaleString()}</td>
                                            <td className={`px-6 py-4 font-black text-center ${parseFloat(target.achievementPercentage) > 50 ? "text-green-500" :
                                                parseFloat(target.achievementPercentage) === 50 ? "text-yellow-500" : "text-red-500"
                                                }`}>
                                                {target.achievementPercentage}%
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-3">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => { setSelectedTarget(target); setShowAddModal(true); }}
                                                        className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}
                                                        title="Edit"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(target._id)}
                                                        className={`transition-colors ${isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-600'}`}
                                                        title="Delete"
                                                    >
                                                        <FaTrash size={15} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showAddModal && (
                    <AddTargetModal
                        target={selectedTarget}
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => { setShowAddModal(false); fetchTargets(); }}
                        centres={centres}
                        sessions={sessions}
                    />
                )}
            </div>
        </Layout>
    );
};

export default CentreTarget;
