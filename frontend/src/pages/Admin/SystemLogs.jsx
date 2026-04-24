import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { 
    FaHistory, FaSearch, FaFilter, FaUser, FaTimes, 
    FaFileExcel, FaEye, FaShieldAlt, FaExclamationTriangle, FaInfoCircle, 
    FaTrashAlt, FaChartPie, FaChartLine, FaChartBar, FaAngleLeft, FaAngleRight, FaArrowRight 
} from "react-icons/fa";
import { toast } from "react-toastify";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';

const SystemLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(50);
    const [jumpPage, setJumpPage] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState('table');
    const [selectedLog, setSelectedLog] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filters, setFilters] = useState({ userName: "", module: "", action: "", startDate: "", endDate: "" });
    const [stats, setStats] = useState({ moduleStats: [], riskStats: [], trendStats: [], topUsers: [] });

    const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];
    const RISK_COLORS = { low: '#06b6d4', medium: '#f59e0b', high: '#ef4444' };

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({ page, limit, ...filters });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/system-logs/all?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await response.json();
            if (response.ok) {
                setLogs(data.logs);
                setTotal(data.total);
                setTotalPages(data.totalPages);
                setCurrentPage(data.currentPage);
            }
        } catch (error) {
            toast.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/system-logs/stats`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
            });
            const data = await response.json();
            if (response.ok) setStats(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchLogs(1);
        fetchStats();
    }, [filters, limit]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => setFilters({ userName: "", module: "", action: "", startDate: "", endDate: "" });

    const toggleSelectAll = () => {
        if (selectedIds.length === logs.length) setSelectedIds([]);
        else setSelectedIds(logs.map(log => log._id));
    };

    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(i => i !== id));
        else setSelectedIds(prev => [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selectedIds.length} logs?`)) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/system-logs/bulk-delete`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem("token")}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ logIds: selectedIds })
            });
            if (response.ok) {
                toast.success("Logs deleted");
                setSelectedIds([]);
                fetchLogs(currentPage);
                fetchStats();
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleJumpPage = (e) => {
        e.preventDefault();
        const p = parseInt(jumpPage);
        if (p >= 1 && p <= totalPages) {
            fetchLogs(p);
            setJumpPage("");
        }
    };

    const exportToExcel = () => {
        const exportData = logs.map(log => ({
            'Time': format(new Date(log.createdAt), 'dd-MM-yyyy HH:mm:ss'),
            'User': log.userName,
            'Action': log.action,
            'Module': log.module,
            'Status': `${log.method} ${log.statusCode}`
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Logs");
        XLSX.writeFile(wb, `SystemLogs_${Date.now()}.xlsx`);
    };

    const getStatusColor = (method) => {
        switch (method) {
            case 'POST': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'PUT': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'DELETE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <Layout activePage="System Logs">
            <div className="space-y-6">
                {/* Previous Cyan Header Style */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
                            <FaHistory className="text-2xl text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Activity Logs</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Audit trail of all mutations</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            <button onClick={() => setActiveTab('table')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'table' ? 'bg-white dark:bg-gray-700 text-cyan-600 shadow-sm' : 'text-gray-500'}`}>Table</button>
                            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'analytics' ? 'bg-white dark:bg-gray-700 text-cyan-600 shadow-sm' : 'text-gray-500'}`}>Analytics</button>
                        </div>
                        <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-green-600/20 transition-all">
                            <FaFileExcel /> Export
                        </button>
                    </div>
                </div>

                {activeTab === 'analytics' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-6">Activity Trend</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={stats.trendStats}>
                                        <XAxis dataKey="_id" tick={{fontSize: 10}} />
                                        <YAxis tick={{fontSize: 10}} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="total" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} />
                                        <Bar dataKey="highRisk" barSize={20} fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase mb-6">Module Distribution</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.moduleStats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="_id">
                                            {stats.moduleStats.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Previous Filter Style */}
                        <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <input type="text" name="userName" value={filters.userName} onChange={handleFilterChange} placeholder="Search user..." className="px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
                                <input type="text" name="module" value={filters.module} onChange={handleFilterChange} placeholder="Module..." className="px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
                                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
                                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
                                <button onClick={clearFilters} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-sm font-bold">Reset</button>
                            </div>
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="bg-red-600 p-4 rounded-xl flex items-center justify-between text-white shadow-xl animate-slideUp">
                                <span className="font-bold text-sm">{selectedIds.length} Logs Selected</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setSelectedIds([])} className="px-4 py-2 text-xs font-bold">Cancel</button>
                                    <button onClick={handleBulkDelete} disabled={isDeleting} className="px-6 py-2 bg-white text-red-600 rounded-lg text-xs font-bold">
                                        {isDeleting ? "Deleting..." : "Delete Permanently"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                                        <tr>
                                            <th className="px-6 py-4 w-10">
                                                <input type="checkbox" checked={selectedIds.length === logs.length && logs.length > 0} onChange={toggleSelectAll} />
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">User Details</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Risk</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Device/IP</th>
                                            <th className="px-6 py-4 text-center">Audit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {loading ? (
                                            Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan="7" className="px-6 py-8 animate-pulse"></td></tr>)
                                        ) : logs.map((log) => (
                                            <tr key={log._id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selectedIds.includes(log._id) ? 'bg-cyan-50 dark:bg-cyan-900/10' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <input type="checkbox" checked={selectedIds.includes(log._id)} onChange={() => toggleSelect(log._id)} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 font-bold text-sm">
                                                            {log.userName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{log.userName}</div>
                                                            <div className="text-[10px] text-cyan-600 font-bold uppercase tracking-wider">{log.userDesignation}</div>
                                                            <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{log.userCentre}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{log.action}</span>
                                                        <span className="text-[10px] text-gray-400 italic">{log.module} • {format(new Date(log.createdAt), 'HH:mm:ss')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${log.riskLevel === 'high' ? 'bg-red-500' : log.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-cyan-500'}`}></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(log.method)}`}>
                                                        {log.method} {log.statusCode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{log.ip}</div>
                                                    <div className="text-[9px] text-gray-400 truncate max-w-[100px]">{log.device?.split(' ')[0]}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => { setSelectedLog(log); setShowModal(true); }} className="p-2 text-gray-400 hover:text-cyan-600 transition-all"><FaEye size={18} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))} className="bg-white dark:bg-gray-800 border border-gray-200 rounded px-2 py-1 text-xs font-bold">
                                        {[20, 50, 100, 200, 500].map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                    <span className="text-xs text-gray-500 font-bold">Page {currentPage} of {totalPages}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <form onSubmit={handleJumpPage} className="flex border border-gray-200 rounded overflow-hidden">
                                        <input type="number" value={jumpPage} onChange={(e) => setJumpPage(e.target.value)} placeholder="Go to..." className="w-16 px-2 py-1 text-xs outline-none" />
                                        <button type="submit" className="px-2 bg-gray-100 hover:bg-cyan-500 hover:text-white transition-all"><FaArrowRight size={10} /></button>
                                    </form>
                                    <button disabled={currentPage === 1} onClick={() => fetchLogs(currentPage - 1)} className="p-2 bg-white border rounded hover:text-cyan-600 disabled:opacity-30"><FaAngleLeft /></button>
                                    <button disabled={currentPage === totalPages} onClick={() => fetchLogs(currentPage + 1)} className="p-2 bg-white border rounded hover:text-cyan-600 disabled:opacity-30"><FaAngleRight /></button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showModal && selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
                    <div className="bg-white dark:bg-[#1a1f24] rounded-2xl w-full max-w-4xl shadow-2xl relative z-10 overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl text-cyan-600"><FaHistory size={20} /></div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Audit Details</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FaTimes /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">User Context</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-[10px] text-gray-400 font-bold uppercase">Name</p><p className="text-sm font-bold">{selectedLog.userName}</p></div>
                                        <div><p className="text-[10px] text-gray-400 font-bold uppercase">Designation</p><p className="text-sm font-bold text-cyan-600">{selectedLog.userDesignation}</p></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Risk & Status</h3>
                                    <div className="flex items-center gap-4">
                                        <div className={`px-3 py-1 rounded text-[10px] font-bold text-white ${selectedLog.riskLevel === 'high' ? 'bg-red-500' : 'bg-cyan-500'}`}>{selectedLog.riskLevel?.toUpperCase()} RISK</div>
                                        <div className="text-sm font-bold text-green-600">{selectedLog.method} {selectedLog.statusCode}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Mutation Payload</h3>
                                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedLog.details?.body && Object.entries(selectedLog.details.body).map(([key, value]) => {
                                            if (key.startsWith('_') || key === 'password') return null;
                                            const resName = selectedLog.details.body[`_${key}Name`];
                                            return (
                                                <div key={key} className="flex flex-col sm:flex-row sm:items-start border-b border-gray-100 dark:border-gray-800/50 py-2 last:border-0">
                                                    <span className="text-[10px] font-bold text-cyan-600 w-32 shrink-0 uppercase">{key}</span>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                                                        {resName && <span className="text-[10px] text-green-600 font-bold">Resolved: {resName}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t flex justify-end">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-sm transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default SystemLogs;