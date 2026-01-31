import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaPlus, FaFilter, FaSync, FaEdit, FaTrash, FaDownload, FaChevronDown } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AddTargetModal from "../../components/Sales/AddTargetModal";
import { hasPermission } from "../../config/permissions";

const CentreTarget = () => {
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
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Centre Target</h1>
                        <p className="text-cyan-400">Manage monthly and yearly targets for centres</p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-green-600/90 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300"
                    >
                        <FaDownload size={14} /> Export Excel
                    </button>
                </div>

                <div className="bg-[#1a1f24] p-4 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            <FaFilter className="text-cyan-400" /> Filters
                        </h3>
                        <div className="bg-gray-800 rounded-lg p-1 flex">
                            {["Monthly", "Quarterly", "Yearly", "Custom"].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === mode
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : "text-gray-400 hover:text-white"
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                        {viewMode === "Custom" && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg px-2 py-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">From</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-transparent text-gray-200 text-xs focus:outline-none w-28"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg px-2 py-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">To</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-transparent text-gray-200 text-xs focus:outline-none w-28"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                className="bg-[#131619] border border-gray-700 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-cyan-500 min-w-[200px] flex justify-between items-center hover:bg-gray-800 transition-colors"
                            >
                                <span>
                                    {selectedCentres.length === 0
                                        ? "All Centres"
                                        : `${selectedCentres.length} Selected`}
                                </span>
                                <FaChevronDown size={12} className={`transition-transform duration-200 ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isCentreDropdownOpen && (
                                <div className="absolute top-full mt-2 left-0 w-60 z-20 bg-[#1a1f24] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                        {centres.map(c => (
                                            <div
                                                key={c._id}
                                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer"
                                                onClick={() => toggleCentreSelection(c._id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCentres.includes(c._id)}
                                                    readOnly
                                                    className="rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-offset-0 focus:ring-0"
                                                />
                                                <span className="text-gray-300 text-sm truncate">{c.centreName}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t border-gray-700 bg-[#131619]">
                                        <button
                                            onClick={() => setSelectedCentres([])}
                                            className="text-xs text-cyan-400 hover:text-cyan-300 w-full text-center"
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
                                className="bg-[#131619] border border-gray-700 text-gray-300 text-sm rounded-lg block p-2.5 outline-none focus:border-cyan-500 w-28"
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

                <div className="bg-[#1a1f24] rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-[#131619] text-gray-200 uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Centre Name</th>
                                    <th className="px-6 py-4">Financial Year</th>
                                    <th className="px-6 py-4">Year</th>
                                    <th className="px-6 py-4">Month</th>
                                    <th className="px-6 py-4">Target</th>
                                    <th className="px-6 py-4">Target Achieved</th>
                                    <th className="px-6 py-4">Achievement (%)</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-8 text-center text-cyan-400">Loading targets...</td>
                                    </tr>
                                ) : targets.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500">No targets found. Add one to get started.</td>
                                    </tr>
                                ) : (
                                    targets.map(target => (
                                        <tr key={target._id} className="hover:bg-[#131619] transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5 hover:scale-[1.002] border-l-4 border-transparent hover:border-cyan-500">
                                            <td className="px-6 py-4 font-medium text-white">{target.centre?.centreName || "Unknown"}</td>
                                            <td className="px-6 py-4">{target.financialYear}</td>
                                            <td className="px-6 py-4">{target.year}</td>
                                            <td className="px-6 py-4 text-cyan-100">{target.month}</td>
                                            <td className="px-6 py-4 text-white font-bold tracking-wide">{target.targetAmount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-blue-400 font-semibold">{target.achievedAmount.toLocaleString()}</td>
                                            <td className={`px-6 py-4 font-bold ${parseFloat(target.achievementPercentage) > 50 ? "text-green-500" :
                                                parseFloat(target.achievementPercentage) === 50 ? "text-yellow-400" : "text-red-500"
                                                }`}>
                                                {target.achievementPercentage}%
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-3">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => { setSelectedTarget(target); setShowAddModal(true); }}
                                                        className="text-gray-400 hover:text-blue-400 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(target._id)}
                                                        className="text-gray-400 hover:text-red-400 transition-colors"
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
