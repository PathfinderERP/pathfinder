import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaHistory, FaSearch, FaFilter, FaUser, FaMicrochip, FaCalendarAlt, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import Pagination from "../../components/common/Pagination";
import { format } from "date-fns";

const SystemLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        userName: "",
        module: "",
        action: "",
        startDate: "",
        endDate: ""
    });
    const [stats, setStats] = useState({ moduleStats: [], topUsers: [] });

    const fetchLogs = async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page,
                limit: 50,
                ...filters
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/system-logs/all?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setLogs(data.logs);
                setTotal(data.total);
                setTotalPages(data.totalPages);
                setCurrentPage(data.currentPage);
            } else {
                toast.error(data.message || "Failed to fetch logs");
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            toast.error("An error occurred while fetching logs");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/system-logs/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem("token")}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setStats(data);
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({
            userName: "",
            module: "",
            action: "",
            startDate: "",
            endDate: ""
        });
    };

    const getStatusColor = (method) => {
        switch (method) {
            case 'POST': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'PUT': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'DELETE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'PATCH': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <Layout activePage="System Logs">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
                            <FaHistory className="text-2xl text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Activity Logs</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Track user actions and system changes</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{total.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Actions Tracked</div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.moduleStats.slice(0, 4).map((stat, idx) => (
                        <div key={idx} className="bg-white dark:bg-[#1a1f24] p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat._id}</div>
                                <div className="p-1 bg-cyan-50 dark:bg-cyan-900/20 rounded text-cyan-600 dark:text-cyan-400">
                                    <FaMicrochip size={12} />
                                </div>
                            </div>
                            <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{stat.count}</div>
                            <div className="text-xs text-gray-500">Total activities recorded</div>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-[#1a1f24] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white font-semibold">
                        <FaFilter />
                        <span>Filter Logs</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 font-medium">User Name</label>
                            <div className="relative">
                                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    name="userName"
                                    value={filters.userName}
                                    onChange={handleFilterChange}
                                    placeholder="Search user..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 font-medium">Module</label>
                            <input
                                type="text"
                                name="module"
                                value={filters.module}
                                onChange={handleFilterChange}
                                placeholder="Module name..."
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 font-medium">Action</label>
                            <input
                                type="text"
                                name="action"
                                value={filters.action}
                                onChange={handleFilterChange}
                                placeholder="Action type..."
                                className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 font-medium">Start Date</label>
                            <div className="relative">
                                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="date"
                                    name="startDate"
                                    value={filters.startDate}
                                    onChange={handleFilterChange}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <div className="space-y-1 flex-1">
                                <label className="text-xs text-gray-500 font-medium">End Date</label>
                                <div className="relative">
                                    <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={clearFilters}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Clear Filters"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white dark:bg-[#1a1f24] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="6" className="px-6 py-4 h-16 bg-gray-50/50 dark:bg-gray-800/20"></td>
                                        </tr>
                                    ))
                                ) : logs.length > 0 ? (
                                    logs.map((log) => (
                                        <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                                                        {log.userName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{log.userName}</div>
                                                        <div className="text-[10px] text-gray-500">{log.user?.email || log.userRole}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{log.action}</span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px]">{log.url}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                                    {log.module}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(log.method)}`}>
                                                    {log.method} {log.statusCode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                {log.ip || '---'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 dark:text-white">{format(new Date(log.createdAt), 'dd MMM yyyy')}</div>
                                                <div className="text-[10px] text-gray-500">{format(new Date(log.createdAt), 'HH:mm:ss')}</div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                                            No activity logs found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-center">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={fetchLogs}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default SystemLogs;
