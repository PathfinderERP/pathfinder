import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { FaUsers, FaBuilding, FaChartBar, FaFilter, FaSync, FaDownload, FaBullseye, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";

const ROLES = [
    "Telecaller", "Centralised Telecaller", "Counsellor",
    "Marketing", "Centre Incharge", "Assistant Centre Incharge",
    "Zonal Manager", "Assistant Zonal Manager"
];

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const ManpowerTarget = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [centres, setCentres] = useState([]);
    const [zones, setZones] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState("MONTHLY");
    const [selectedMonth, setSelectedMonth] = useState(monthNames[new Date().getMonth()]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [targets, setTargets] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchZones = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/zone`, { headers: { Authorization: `Bearer ${token}` } });
            setZones(Array.isArray(res.data) ? res.data : (res.data.zones || []));
        } catch (e) { console.error("fetchZones error:", e); }
    }, []);

    const fetchCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, { headers: { Authorization: `Bearer ${token}` } });
            const data = Array.isArray(res.data) ? res.data : (res.data.centres || []);
            setCentres(data.filter(c => c.status !== "deactive"));
        } catch (e) { console.error("fetchCentres error:", e); }
    }, []);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, { headers: { Authorization: `Bearer ${token}` } });
            const allUsers = res.data.users || [];
            const operationalRoles = ["telecaller","centralizedtelecaller","counsellor","marketing","centerincharge","centreincharge","zonalmanager","assistantcenterincharge","assistantzonalmanager"];
            const filtered = allUsers.filter(u => {
                const roleClean = (u.role || "").toLowerCase().replace(/\s+/g, "");
                return u.isActive !== false && operationalRoles.includes(roleClean);
            });
            filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            setEmployees(filtered);
        } catch (e) {
            console.error("fetchEmployees error:", e);
            toast.error("Failed to load employees");
        } finally { setLoading(false); }
    }, []);

    const fetchTargets = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/sales/manpower-target`, {
                params: { month: selectedMonth, year: selectedYear, viewMode },
                headers: { Authorization: `Bearer ${token}` }
            });
            const map = {};
            (res.data.data || []).forEach(t => {
                map[t.userId] = { calls: t.calls || 0, counselling: t.counselling || 0, admissions: t.admissions || 0, collection: t.collection || 0 };
            });
            setTargets(map);
        } catch (e) { setTargets({}); }
    }, [selectedMonth, selectedYear, viewMode]);

    useEffect(() => { fetchZones(); fetchCentres(); fetchEmployees(); }, []);
    useEffect(() => { fetchTargets(); }, [selectedMonth, selectedYear, viewMode]);

    const filteredCentreOptions = selectedZones.length > 0
        ? centres.filter(c => {
            const activeZones = zones.filter(z => selectedZones.some(sz => sz.value === z._id));
            return activeZones.some(z => (z.centres || []).some(zc => {
                const id = typeof zc === "object" ? (zc._id || zc.id) : zc;
                return id && id.toString() === c._id.toString();
            }));
        })
        : centres;

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || (emp.displayName || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCentre = selectedCentres.length === 0 || selectedCentres.some(sc => {
            const empCentres = emp.centres || emp.centre || [];
            return Array.isArray(empCentres) && empCentres.some(ec => {
                const id = typeof ec === "object" ? (ec._id || ec.id) : ec;
                return id && id.toString() === sc.value;
            });
        });
        const matchesRole = selectedRoles.length === 0 || selectedRoles.some(sr => (emp.role || "").toLowerCase().replace(/\s+/g, "") === sr.value.toLowerCase().replace(/\s+/g, ""));
        return matchesSearch && matchesCentre && matchesRole;
    });

    const startEdit = (empId, metric) => { setEditingCell({ empId, metric }); setEditValue((targets[empId]?.[metric] || 0).toString()); };
    const cancelEdit = () => { setEditingCell(null); setEditValue(""); };

    const saveTarget = async (empId, metric) => {
        const newVal = parseInt(editValue, 10) || 0;
        setSaving(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${import.meta.env.VITE_API_URL}/sales/manpower-target`,
                { userId: empId, month: selectedMonth, year: selectedYear, viewMode, [metric]: newVal },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setTargets(prev => ({ ...prev, [empId]: { ...(prev[empId] || {}), [metric]: newVal } }));
            toast.success("Target updated!");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to save target");
        } finally { setSaving(false); setEditingCell(null); setEditValue(""); }
    };

    const exportToExcel = () => {
        if (filteredEmployees.length === 0) { toast.info("No data to export"); return; }
        const headers = ["Name", "Role", "Centre(s)", "Target Calls", "Target Counselling", "Target Admissions", "Target Collection (Rs)"];
        const rows = filteredEmployees.map(emp => [
            emp.displayName || emp.name, emp.role,
            (emp.centres || []).map(c => typeof c === "object" ? (c.centreName || c.name) : c).join(", "),
            targets[emp._id]?.calls || 0, targets[emp._id]?.counselling || 0,
            targets[emp._id]?.admissions || 0, targets[emp._id]?.collection || 0
        ]);
        const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `Manpower_Target_${selectedMonth}_${selectedYear}.csv`; a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported!");
    };

    const metrics = [
        { key: "calls", label: "Calls", color: "text-yellow-400" },
        { key: "counselling", label: "Counselling", color: "text-green-400" },
        { key: "admissions", label: "Admissions", color: "text-purple-400" },
        { key: "collection", label: "Collection (₹)", color: "text-cyan-400" },
    ];

    return (
        <Layout activePage="Sales">
            <div className={`min-h-screen p-4 md:p-8 ${isDarkMode ? "bg-[#131619]" : "bg-gray-50"}`}>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className={`text-3xl font-bold flex items-center gap-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            <span className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <FaUsers className="text-indigo-400 text-lg" />
                            </span>
                            Manpower Wise Target
                        </h1>
                        <p className={`text-xs font-semibold uppercase tracking-widest mt-1 ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                            Individual Performance Target Setting
                        </p>
                    </div>
                    <button onClick={exportToExcel}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-md">
                        <FaDownload size={13} /> Export CSV
                    </button>
                </div>

                {/* Filters */}
                <div className={`p-4 rounded-xl border mb-6 flex flex-wrap items-center gap-4 ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-md"}`}>
                    <span className={`font-semibold flex items-center gap-2 text-sm ${isDarkMode ? "text-white" : "text-gray-700"}`}><FaFilter className="text-cyan-400" /> Filters</span>

                    <div className={`flex p-1 rounded-lg border ${isDarkMode ? "bg-black/20 border-gray-800" : "bg-gray-100 border-gray-200"}`}>
                        {["MONTHLY","QUARTERLY","YEARLY"].map(mode => (
                            <button key={mode} onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest transition-all
                                    ${viewMode === mode ? "bg-blue-600 text-white shadow" : `${isDarkMode ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"}`}`}>
                                {mode}
                            </button>
                        ))}
                    </div>

                    <div className="min-w-[150px]">
                        <CustomMultiSelect options={zones.map(z => ({ value: z._id, label: z.name }))} value={selectedZones} onChange={setSelectedZones} placeholder="All Zones" isDarkMode={isDarkMode} />
                    </div>
                    <div className="min-w-[170px]">
                        <CustomMultiSelect options={filteredCentreOptions.map(c => ({ value: c._id, label: c.centreName }))} value={selectedCentres} onChange={setSelectedCentres} placeholder="All Centres" isDarkMode={isDarkMode} />
                    </div>
                    <div className="min-w-[170px]">
                        <CustomMultiSelect options={ROLES.map(r => ({ value: r, label: r }))} value={selectedRoles} onChange={setSelectedRoles} placeholder="All Roles" isDarkMode={isDarkMode} />
                    </div>

                    {viewMode === "MONTHLY" && (
                        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                            className={`border text-xs rounded-lg px-3 py-2 outline-none font-bold ${isDarkMode ? "bg-[#1a1f24] border-gray-700 text-gray-300" : "bg-white border-gray-300 text-gray-700 shadow-sm"}`}>
                            {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    )}

                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className={`border text-xs rounded-lg px-3 py-2 outline-none font-bold w-24 ${isDarkMode ? "bg-[#1a1f24] border-gray-700 text-gray-300" : "bg-white border-gray-300 text-gray-700 shadow-sm"}`}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <input type="text" placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className={`border text-xs rounded-lg px-3 py-2 outline-none min-w-[160px] ${isDarkMode ? "bg-[#1a1f24] border-gray-700 text-gray-300 placeholder-gray-600" : "bg-white border-gray-300 text-gray-700 shadow-sm"}`} />

                    <button onClick={() => { fetchEmployees(); fetchTargets(); }}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold uppercase transition-colors">
                        <FaSync className={loading ? "animate-spin" : ""} /> Sync
                    </button>
                </div>

                {/* Summary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: "Total Employees", value: filteredEmployees.length, colorClass: "bg-indigo-500/15 text-indigo-400", icon: <FaUsers /> },
                        { label: "Avg Call Target", value: filteredEmployees.length > 0 ? Math.round(filteredEmployees.reduce((s, e) => s + (targets[e._id]?.calls || 0), 0) / filteredEmployees.length) : 0, colorClass: "bg-yellow-500/15 text-yellow-400", icon: <FaChartBar /> },
                        { label: "Total Adm. Target", value: filteredEmployees.reduce((s, e) => s + (targets[e._id]?.admissions || 0), 0), colorClass: "bg-purple-500/15 text-purple-400", icon: <FaBullseye /> },
                        { label: "Collection Target", value: `₹${filteredEmployees.reduce((s, e) => s + (targets[e._id]?.collection || 0), 0).toLocaleString("en-IN")}`, colorClass: "bg-cyan-500/15 text-cyan-400", icon: <FaBuilding /> },
                    ].map((stat, i) => (
                        <div key={i} className={`rounded-xl border p-4 flex items-center gap-4 ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${stat.colorClass}`}>{stat.icon}</div>
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{stat.label}</p>
                                <p className={`text-xl font-black mt-0.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className={`rounded-xl border overflow-hidden ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-gray-200 shadow-xl"}`}>
                    <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20">
                                <tr className={`text-xs uppercase font-black border-b ${isDarkMode ? "bg-[#131619] text-gray-400 border-gray-800" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                    <th className={`px-6 py-4 sticky left-0 z-30 border-r border-inherit ${isDarkMode ? "bg-[#131619]" : "bg-gray-100"}`}>Employee</th>
                                    <th className="px-6 py-4 border-r border-inherit">Role</th>
                                    <th className="px-6 py-4 border-r border-inherit">Centre(s)</th>
                                    {metrics.map(m => (
                                        <th key={m.key} className={`px-6 py-4 text-center border-r border-inherit ${isDarkMode ? "bg-[#131619]" : "bg-gray-100"}`}>
                                            <span className={m.color}>{m.label}</span>
                                            <div className="text-[9px] opacity-50 mt-0.5">TARGET</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-gray-800" : "divide-gray-100"}`}>
                                {loading ? (
                                    <tr><td colSpan={7} className="px-6 py-16 text-center text-cyan-400 font-bold animate-pulse">Loading employees...</td></tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr><td colSpan={7} className={`px-6 py-16 text-center font-medium ${isDarkMode ? "text-gray-600" : "text-gray-400"}`}>No employees found for the selected filters.</td></tr>
                                ) : filteredEmployees.map(emp => (
                                    <tr key={emp._id} className={`transition-all ${isDarkMode ? "hover:bg-indigo-500/5" : "hover:bg-gray-50"}`}>
                                        <td className={`px-6 py-3 sticky left-0 z-10 border-r border-inherit ${isDarkMode ? "bg-[#1a1f24]" : "bg-white"}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${isDarkMode ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-700"}`}>
                                                    {(emp.name || emp.displayName || "?")[0].toUpperCase()}
                                                </div>
                                                <span className={`text-xs font-bold ${isDarkMode ? "text-gray-200" : "text-gray-900"}`}>{emp.displayName || emp.name}</span>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-3 border-r border-inherit text-xs font-semibold capitalize ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{emp.role}</td>
                                        <td className={`px-6 py-3 border-r border-inherit text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                                            {(emp.centres || []).slice(0, 2).map(c => typeof c === "object" ? (c.centreName || c.name) : c).join(", ")}
                                            {(emp.centres || []).length > 2 && (
                                                <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${isDarkMode ? "bg-gray-800 text-gray-500" : "bg-gray-100 text-gray-400"}`}>
                                                    +{(emp.centres || []).length - 2}
                                                </span>
                                            )}
                                        </td>
                                        {metrics.map(m => {
                                            const isEditing = editingCell?.empId === emp._id && editingCell?.metric === m.key;
                                            const val = targets[emp._id]?.[m.key] || 0;
                                            return (
                                                <td key={m.key} className="px-6 py-3 text-center border-r border-inherit group/cell">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={e => setEditValue(e.target.value)}
                                                                onKeyDown={e => { if (e.key === "Enter") saveTarget(emp._id, m.key); if (e.key === "Escape") cancelEdit(); }}
                                                                autoFocus
                                                                className={`w-24 px-2 py-1 text-xs font-bold rounded border outline-none ${isDarkMode ? "bg-[#131619] border-cyan-500 text-white" : "bg-white border-cyan-500 text-gray-900"}`}
                                                            />
                                                            <button onClick={() => saveTarget(emp._id, m.key)} disabled={saving} className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 transition-colors">
                                                                <FaCheck size={10} />
                                                            </button>
                                                            <button onClick={cancelEdit} className="p-1 rounded bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors">
                                                                <FaTimes size={10} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className={`text-sm font-black ${val > 0 ? m.color : (isDarkMode ? "text-gray-700" : "text-gray-300")}`}>
                                                                {m.key === "collection" && val > 0 ? `₹${val.toLocaleString("en-IN")}` : (val > 0 ? val : "—")}
                                                            </span>
                                                            <button onClick={() => startEdit(emp._id, m.key)}
                                                                className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-cyan-500/20 text-cyan-400 transition-all"
                                                                title="Set Target">
                                                                <FaEdit size={10} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                            {!loading && filteredEmployees.length > 0 && (
                                <tfoot className="sticky bottom-0 z-20">
                                    <tr className={`border-t-2 text-xs font-black uppercase ${isDarkMode ? "bg-[#131619] text-white border-gray-700" : "bg-gray-100 text-gray-900 border-gray-300"}`}>
                                        <td className={`px-6 py-4 sticky left-0 z-30 border-r border-inherit ${isDarkMode ? "bg-[#131619]" : "bg-gray-100"}`}>TOTAL ({filteredEmployees.length})</td>
                                        <td className="px-6 py-4 border-r border-inherit" />
                                        <td className="px-6 py-4 border-r border-inherit" />
                                        {metrics.map(m => (
                                            <td key={m.key} className="px-6 py-4 text-center border-r border-inherit">
                                                <span className={`text-sm font-black ${m.color}`}>
                                                    {m.key === "collection"
                                                        ? `₹${filteredEmployees.reduce((s, e) => s + (targets[e._id]?.[m.key] || 0), 0).toLocaleString("en-IN")}`
                                                        : filteredEmployees.reduce((s, e) => s + (targets[e._id]?.[m.key] || 0), 0)}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ManpowerTarget;
