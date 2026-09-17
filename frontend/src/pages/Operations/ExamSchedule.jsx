import React, { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { hasPermission } from "../../config/permissions";
import {
    FaCalendarAlt,
    FaPlus,
    FaFileDownload,
    FaFileUpload,
    FaSearch,
    FaFilter,
    FaSync,
    FaTrash,
    FaEdit,
    FaCheckSquare,
    FaSquare,
    FaBuilding,
    FaClock,
    FaGraduationCap,
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaExclamationTriangle,
    FaCheckCircle,
    FaHourglassHalf,
    FaBan
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import ExamScheduleModal from "../../components/Operations/ExamScheduleModal";
import ExamImportModal from "../../components/Operations/ExamImportModal";

const ExamSchedule = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    const apiUrl = import.meta.env.VITE_API_URL;

    // Current user and permissions
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch (e) {
            return {};
        }
    });

    const isSuperAdmin = useMemo(() => {
        const role = (currentUser.role || "").toLowerCase().replace(/[\s\-_]+/g, "");
        return role === "superadmin";
    }, [currentUser]);

    const canView = isSuperAdmin || hasPermission(currentUser, "operations", "examSchedule", "view");
    const canCreate = isSuperAdmin || hasPermission(currentUser, "operations", "examSchedule", "create");
    const canEdit = isSuperAdmin || hasPermission(currentUser, "operations", "examSchedule", "edit");
    const canDelete = isSuperAdmin || hasPermission(currentUser, "operations", "examSchedule", "delete");

    // Master lists for filters and form dropdowns
    const [masterSessions, setMasterSessions] = useState([]);
    const [masterClasses, setMasterClasses] = useState([]);
    const [masterCentres, setMasterCentres] = useState([]);

    // Data and Loading
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        scheduled: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0,
        uniqueCentres: 0
    });

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [filterSession, setFilterSession] = useState("all");
    const [filterClass, setFilterClass] = useState("all");
    const [filterCentre, setFilterCentre] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterFromDate, setFilterFromDate] = useState("");
    const [filterToDate, setFilterToDate] = useState("");

    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch master dropdown data (Sessions, Classes, Centres)
    useEffect(() => {
        const fetchMasterData = async () => {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            try {
                const [sessRes, classRes, centreRes] = await Promise.all([
                    fetch(`${apiUrl}/session/list`, { headers }).catch(() => null),
                    fetch(`${apiUrl}/class`, { headers }).catch(() => null),
                    fetch(`${apiUrl}/centre`, { headers }).catch(() => null)
                ]);

                if (sessRes && sessRes.ok) {
                    const sData = await sessRes.json();
                    const activeSessions = Array.isArray(sData)
                        ? sData.filter(s => s.isGlobalActive === true)
                        : [];
                    setMasterSessions(activeSessions);
                }
                if (classRes && classRes.ok) {
                    const cData = await classRes.json();
                    setMasterClasses(Array.isArray(cData) ? cData : []);
                }
                if (centreRes && centreRes.ok) {
                    const ctrData = await centreRes.json();
                    const activeCentres = Array.isArray(ctrData)
                        ? ctrData.filter(c => c.status !== "deactive")
                        : [];
                    setMasterCentres(activeCentres);
                }
            } catch (err) {
                console.error("Error loading master data:", err);
            }
        };

        fetchMasterData();
    }, [apiUrl]);

    // Fetch exam schedules with current filters and pagination
    const fetchSchedules = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (search.trim()) params.append("search", search.trim());
            if (filterSession !== "all") params.append("session", filterSession);
            if (filterClass !== "all") params.append("className", filterClass);
            if (filterCentre !== "all") params.append("center", filterCentre);
            if (filterStatus !== "all") params.append("status", filterStatus);
            if (filterFromDate) params.append("fromDate", filterFromDate);
            if (filterToDate) params.append("toDate", filterToDate);

            params.append("page", page.toString());
            params.append("limit", limit.toString());

            const res = await fetch(`${apiUrl}/operations/exam-schedule?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const result = await res.json();
            if (res.ok && result.success) {
                setSchedules(result.data || []);
                setTotalPages(result.pagination?.totalPages || 1);
                setTotalCount(result.pagination?.total || 0);
                if (result.stats) {
                    setStats(result.stats);
                }
            } else {
                toast.error(result.message || "Failed to load exam schedules");
            }
        } catch (error) {
            console.error("Error fetching exam schedules:", error);
            toast.error("Network error while loading exam schedules");
        } finally {
            setLoading(false);
        }
    }, [apiUrl, search, filterSession, filterClass, filterCentre, filterStatus, filterFromDate, filterToDate, page, limit]);

    useEffect(() => {
        if (canView) {
            fetchSchedules();
        }
    }, [fetchSchedules, canView]);

    // Handle single delete
    const handleDelete = async (id) => {
        try {
            setActionLoading(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${apiUrl}/operations/exam-schedule/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || "Exam schedule deleted successfully");
                setDeleteConfirmId(null);
                setSelectedIds(prev => prev.filter(item => item !== id));
                fetchSchedules();
            } else {
                toast.error(data.message || "Failed to delete exam schedule");
            }
        } catch (error) {
            console.error("Error deleting schedule:", error);
            toast.error("Failed to delete exam schedule");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        try {
            setActionLoading(true);
            const token = localStorage.getItem("token");
            const res = await fetch(`${apiUrl}/operations/exam-schedule/bulk-delete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `Deleted ${selectedIds.length} exam schedules`);
                setSelectedIds([]);
                setIsBulkDeleteConfirm(false);
                fetchSchedules();
            } else {
                toast.error(data.message || "Bulk delete failed");
            }
        } catch (error) {
            console.error("Error during bulk delete:", error);
            toast.error("Failed to execute bulk delete");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Export to Excel (.xlsx)
    const handleExport = async () => {
        try {
            toast.info("Preparing exam schedules for export...");
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (search.trim()) params.append("search", search.trim());
            if (filterSession !== "all") params.append("session", filterSession);
            if (filterClass !== "all") params.append("className", filterClass);
            if (filterCentre !== "all") params.append("center", filterCentre);
            if (filterStatus !== "all") params.append("status", filterStatus);
            if (filterFromDate) params.append("fromDate", filterFromDate);
            if (filterToDate) params.append("toDate", filterToDate);

            const res = await fetch(`${apiUrl}/operations/exam-schedule/export?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const result = await res.json();
            if (!res.ok || !result.success || !Array.isArray(result.data) || result.data.length === 0) {
                toast.warn("No exam schedules found to export");
                return;
            }

            const ws = XLSX.utils.json_to_sheet(result.data);
            ws["!cols"] = [
                { wch: 30 },
                { wch: 20 },
                { wch: 15 },
                { wch: 35 },
                { wch: 14 },
                { wch: 14 },
                { wch: 12 },
                { wch: 12 },
                { wch: 30 },
                { wch: 15 },
                { wch: 35 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Exam_Schedules");
            const fileName = `Exam_Schedules_${new Date().toISOString().split("T")[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success(`Exported ${result.data.length} exam schedules to ${fileName}`);
        } catch (error) {
            console.error("Error exporting exam schedules:", error);
            toast.error("Failed to export exam schedules");
        }
    };

    // Reset all filters
    const handleResetFilters = () => {
        setSearch("");
        setFilterSession("all");
        setFilterClass("all");
        setFilterCentre("all");
        setFilterStatus("all");
        setFilterFromDate("");
        setFilterToDate("");
        setPage(1);
    };

    // Selection helpers
    const handleSelectAllOnPage = () => {
        const pageIds = schedules.map(s => s._id);
        const allSelected = pageIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const cardBg = isDarkMode
        ? "bg-[#181d22] border border-gray-800"
        : "bg-white border border-gray-200 shadow-sm";

    if (!canView) {
        return (
            <Layout activePage="Operations">
                <div className="p-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
                    <FaExclamationTriangle className="text-5xl text-amber-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-gray-500 max-w-md">
                        You do not have permission to view the Exam Schedule module. Please contact your SuperAdmin to request access.
                    </p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout activePage="Operations">
            <div className={`p-6 min-h-screen pb-24 ${isDarkMode ? "bg-[#0f1214] text-gray-100" : "bg-gray-50 text-gray-900"}`}>
                <ToastContainer theme={isDarkMode ? "dark" : "light"} />

                {/* Page Title & Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                                <FaCalendarAlt className="text-2xl" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                                    Exam Schedule
                                </h1>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                    Plan, schedule, and coordinate multi-centre examinations, schedules, and batch rosters
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Export Button */}
                        <button
                            type="button"
                            onClick={handleExport}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
                                isDarkMode
                                    ? "bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-200"
                                    : "bg-white hover:bg-gray-100 border-gray-300 text-gray-700"
                            }`}
                        >
                            <FaFileDownload className="text-blue-500 text-sm" /> Export Excel
                        </button>

                        {/* Import Button */}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(true)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-sm ${
                                    isDarkMode
                                        ? "bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-gray-200"
                                        : "bg-white hover:bg-gray-100 border-gray-300 text-gray-700"
                                }`}
                            >
                                <FaFileUpload className="text-emerald-500 text-sm" /> Import
                            </button>
                        )}

                        {/* Create Button */}
                        {canCreate && (
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 transition-all flex items-center gap-2"
                            >
                                <FaPlus /> Schedule Exam
                            </button>
                        )}
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {/* Total */}
                    <div className={`p-4 rounded-2xl ${cardBg} flex items-center justify-between`}>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Exams</p>
                            <p className="text-2xl font-black mt-1">{stats.total}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                            <FaCalendarAlt className="text-lg" />
                        </div>
                    </div>

                    {/* Scheduled */}
                    <div className={`p-4 rounded-2xl ${cardBg} flex items-center justify-between`}>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Scheduled</p>
                            <p className="text-2xl font-black text-blue-500 mt-1">{stats.scheduled}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                            <FaHourglassHalf className="text-lg" />
                        </div>
                    </div>

                    {/* Ongoing */}
                    <div className={`p-4 rounded-2xl ${cardBg} flex items-center justify-between`}>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Ongoing</p>
                            <p className="text-2xl font-black text-emerald-500 mt-1">{stats.ongoing}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <FaCheckCircle className="text-lg" />
                        </div>
                    </div>

                    {/* Completed */}
                    <div className={`p-4 rounded-2xl ${cardBg} flex items-center justify-between`}>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Completed</p>
                            <p className="text-2xl font-black text-gray-400 mt-1">{stats.completed}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-gray-500/10 text-gray-400">
                            <FaCheckSquare className="text-lg" />
                        </div>
                    </div>

                    {/* Active Centres */}
                    <div className={`p-4 rounded-2xl ${cardBg} flex items-center justify-between col-span-2 sm:col-span-1`}>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Centres Tagged</p>
                            <p className="text-2xl font-black text-purple-500 mt-1">{stats.uniqueCentres}</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
                            <FaBuilding className="text-lg" />
                        </div>
                    </div>
                </div>

                {/* Filter & Search Bar */}
                <div className={`p-5 rounded-3xl ${cardBg} mb-6 space-y-4`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {/* Search Input */}
                        <div className="sm:col-span-2 relative">
                            <FaSearch className="absolute left-3.5 top-3 text-gray-400 text-xs" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by exam name, centre, class..."
                                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                                    isDarkMode
                                        ? "bg-[#14181c] border-gray-700 text-white placeholder-gray-500"
                                        : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"
                                }`}
                            />
                        </div>

                        {/* Session Filter */}
                        <div>
                            <select
                                value={filterSession}
                                onChange={(e) => {
                                    setFilterSession(e.target.value);
                                    setPage(1);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                                    isDarkMode
                                        ? "bg-[#14181c] border-gray-700 text-white"
                                        : "bg-gray-50 border-gray-300 text-gray-900"
                                }`}
                            >
                                <option value="all">All Sessions</option>
                                {masterSessions.map((s, idx) => (
                                    <option key={s._id || idx} value={s.sessionName}>
                                        {s.sessionName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Class Filter */}
                        <div>
                            <select
                                value={filterClass}
                                onChange={(e) => {
                                    setFilterClass(e.target.value);
                                    setPage(1);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                                    isDarkMode
                                        ? "bg-[#14181c] border-gray-700 text-white"
                                        : "bg-gray-50 border-gray-300 text-gray-900"
                                }`}
                            >
                                <option value="all">All Classes</option>
                                {masterClasses.map((c, idx) => (
                                    <option key={c._id || idx} value={typeof c === "string" ? c : c.name}>
                                        {typeof c === "string" ? c : c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Centre Filter */}
                        <div>
                            <select
                                value={filterCentre}
                                onChange={(e) => {
                                    setFilterCentre(e.target.value);
                                    setPage(1);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                                    isDarkMode
                                        ? "bg-[#14181c] border-gray-700 text-white"
                                        : "bg-gray-50 border-gray-300 text-gray-900"
                                }`}
                            >
                                <option value="all">All Centres</option>
                                {masterCentres.map((c, idx) => {
                                    const cName = typeof c === "string" ? c : c.centreName;
                                    return (
                                        <option key={c._id || idx} value={cName}>
                                            {cName}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <select
                                value={filterStatus}
                                onChange={(e) => {
                                    setFilterStatus(e.target.value);
                                    setPage(1);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                                    isDarkMode
                                        ? "bg-[#14181c] border-gray-700 text-white"
                                        : "bg-gray-50 border-gray-300 text-gray-900"
                                }`}
                            >
                                <option value="all">All Status</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Second row: Dates & Reset */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800/50">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-semibold text-gray-400">Date Range:</span>
                            <input
                                type="date"
                                value={filterFromDate}
                                onChange={(e) => {
                                    setFilterFromDate(e.target.value);
                                    setPage(1);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs border ${
                                    isDarkMode
                                        ? "bg-[#14181c] border-gray-700 text-white"
                                        : "bg-gray-50 border-gray-300 text-gray-900"
                                }`}
                            />
                            <span className="text-xs text-gray-500">to</span>
                            <input
                                type="date"
                                value={filterToDate}
                                onChange={(e) => {
                                    setFilterToDate(e.target.value);
                                    setPage(1);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs border ${
                                    isDarkMode
                                        ? "bg-[#14181c] border-gray-700 text-white"
                                        : "bg-gray-50 border-gray-300 text-gray-900"
                                }`}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    isDarkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-400" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                }`}
                            >
                                Reset Filters
                            </button>
                            <button
                                type="button"
                                onClick={fetchSchedules}
                                className="p-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition-all"
                                title="Refresh"
                            >
                                <FaSync className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bulk Action Bar (when selected) */}
                {selectedIds.length > 0 && (
                    <div
                        className={`p-3.5 px-5 rounded-2xl mb-4 border flex items-center justify-between shadow-lg transition-all ${
                            isDarkMode ? "bg-blue-950/40 border-blue-800/60" : "bg-blue-50 border-blue-200"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                            <span className="text-xs font-bold text-blue-400">
                                {selectedIds.length} item(s) selected
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {canDelete && (
                                <button
                                    type="button"
                                    onClick={() => setIsBulkDeleteConfirm(true)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
                                >
                                    <FaTrash className="text-[10px]" /> Delete Selected
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelectedIds([])}
                                className="px-3 py-1.5 rounded-xl text-xs text-gray-400 hover:text-gray-200"
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Exam Schedule Table */}
                <div className={`rounded-3xl ${cardBg} overflow-hidden shadow-sm`}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr
                                    className={`border-b ${
                                        isDarkMode
                                            ? "bg-[#14181c] border-gray-800 text-gray-400"
                                            : "bg-gray-100/70 border-gray-200 text-gray-600"
                                    }`}
                                >
                                    <th className="p-4 w-12 text-center">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllOnPage}
                                            className="text-gray-400 hover:text-blue-500 transition-colors"
                                        >
                                            {schedules.length > 0 && schedules.every(s => selectedIds.includes(s._id)) ? (
                                                <FaCheckSquare className="text-blue-500 text-sm" />
                                            ) : (
                                                <FaSquare className="text-gray-500 text-sm" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="p-4 font-bold uppercase tracking-wider">Exam Details</th>
                                    <th className="p-4 font-bold uppercase tracking-wider">Class & Session</th>
                                    <th className="p-4 font-bold uppercase tracking-wider">Centres</th>
                                    <th className="p-4 font-bold uppercase tracking-wider">Schedule & Days</th>
                                    <th className="p-4 font-bold uppercase tracking-wider">Timing</th>
                                    <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                                    {(canEdit || canDelete) && (
                                        <th className="p-4 font-bold uppercase tracking-wider text-right pr-6">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-gray-400">
                                            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                            <p className="text-sm font-medium">Loading exam schedules...</p>
                                        </td>
                                    </tr>
                                ) : schedules.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-gray-500">
                                            <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-40 text-gray-400" />
                                            <p className="text-base font-semibold mb-1">No exam schedules found</p>
                                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                                {search || filterSession !== "all" || filterClass !== "all" || filterCentre !== "all" || filterStatus !== "all"
                                                    ? "Try adjusting your filters or search query"
                                                    : "Click 'Schedule Exam' above to create your first exam schedule."}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    schedules.map((schedule) => {
                                        const isSelected = selectedIds.includes(schedule._id);
                                        const fromDateStr = schedule.fromDate ? new Date(schedule.fromDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "";
                                        const toDateStr = schedule.toDate ? new Date(schedule.toDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "";

                                        // Status badge colors
                                        const statusClasses = {
                                            Scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                                            Ongoing: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                                            Completed: "bg-gray-500/10 text-gray-400 border-gray-500/30",
                                            Cancelled: "bg-red-500/10 text-red-400 border-red-500/30"
                                        }[schedule.status] || "bg-blue-500/10 text-blue-400 border-blue-500/30";

                                        return (
                                            <tr
                                                key={schedule._id}
                                                className={`transition-colors ${
                                                    isSelected
                                                        ? isDarkMode ? "bg-blue-950/25" : "bg-blue-50/70"
                                                        : isDarkMode ? "hover:bg-gray-800/30" : "hover:bg-gray-50/80"
                                                }`}
                                            >
                                                {/* Checkbox */}
                                                <td className="p-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSelectRow(schedule._id)}
                                                        className="text-gray-400 hover:text-blue-500 transition-colors"
                                                    >
                                                        {isSelected ? (
                                                            <FaCheckSquare className="text-blue-500 text-sm" />
                                                        ) : (
                                                            <FaSquare className="text-gray-600 text-sm" />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Exam Details */}
                                                <td className="p-4">
                                                    <div className="font-bold text-sm tracking-tight text-white mb-0.5">
                                                        {schedule.examName}
                                                    </div>
                                                    {schedule.description ? (
                                                        <p className="text-[11px] text-gray-400 max-w-xs line-clamp-1" title={schedule.description}>
                                                            {schedule.description}
                                                        </p>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-600">No extra remarks</span>
                                                    )}
                                                </td>

                                                {/* Classes & Session */}
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1 mb-1 max-w-[160px]">
                                                        {Array.isArray(schedule.className) ? (
                                                            schedule.className.map((cls, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                                                >
                                                                    {cls}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs">{schedule.className}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-gray-400">
                                                        {schedule.session}
                                                    </span>
                                                </td>

                                                {/* Centres (Multiple) */}
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                        {Array.isArray(schedule.centers) && schedule.centers.length > 0 ? (
                                                            schedule.centers.slice(0, 3).map((ctr, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 truncate max-w-[120px]"
                                                                    title={ctr}
                                                                >
                                                                    {ctr}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-500">—</span>
                                                        )}
                                                        {Array.isArray(schedule.centers) && schedule.centers.length > 3 && (
                                                            <span
                                                                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-700 cursor-help"
                                                                title={schedule.centers.slice(3).join(", ")}
                                                            >
                                                                +{schedule.centers.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Date Range & Days of week */}
                                                <td className="p-4">
                                                    <div className="font-semibold text-xs whitespace-nowrap mb-1">
                                                        {fromDateStr} — {toDateStr}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                        {Array.isArray(schedule.days) && schedule.days.length > 0 ? (
                                                            schedule.days.map((day, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-gray-800 text-gray-300 border border-gray-700/60"
                                                                >
                                                                    {day.slice(0, 3)}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-[10px] text-gray-500">All days</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Timing */}
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                                                        <FaClock className="text-[10px] text-blue-400" />
                                                        <span>{schedule.fromTime} - {schedule.toTime}</span>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="p-4 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${statusClasses}`}>
                                                        {schedule.status}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                {(canEdit || canDelete) && (
                                                    <td className="p-4 text-right pr-6 whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {canEdit && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingItem(schedule);
                                                                        setIsEditModalOpen(true);
                                                                    }}
                                                                    className="p-2 rounded-xl text-blue-400 hover:bg-blue-500/10 transition-colors"
                                                                    title="Edit Schedule"
                                                                >
                                                                    <FaEdit className="text-sm" />
                                                                </button>
                                                            )}
                                                            {canDelete && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeleteConfirmId(schedule._id)}
                                                                    className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                                                                    title="Delete Schedule"
                                                                >
                                                                    <FaTrash className="text-sm" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div
                        className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
                            isDarkMode
                                ? "border-gray-800 bg-[#14181c] text-gray-400"
                                : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span>Showing {schedules.length} of {totalCount} exam schedules</span>
                            <span className="text-gray-600">•</span>
                            <span>Per page:</span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className={`px-2 py-1 rounded-lg border text-xs ${
                                    isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
                                }`}
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page <= 1 || loading}
                                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 font-semibold transition-all disabled:opacity-40 ${
                                    isDarkMode
                                        ? "border-gray-700 hover:bg-gray-800 text-gray-300"
                                        : "border-gray-300 hover:bg-gray-200 text-gray-700"
                                }`}
                            >
                                <FaChevronLeft className="text-[10px]" /> Prev
                            </button>
                            <span className="font-bold text-blue-500 px-2">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page >= totalPages || loading}
                                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 font-semibold transition-all disabled:opacity-40 ${
                                    isDarkMode
                                        ? "border-gray-700 hover:bg-gray-800 text-gray-300"
                                        : "border-gray-300 hover:bg-gray-200 text-gray-700"
                                }`}
                            >
                                Next <FaChevronRight className="text-[10px]" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Create Modal */}
                {isCreateModalOpen && (
                    <ExamScheduleModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onSuccess={() => fetchSchedules()}
                        sessions={masterSessions}
                        classes={masterClasses}
                        centres={masterCentres}
                        isDarkMode={isDarkMode}
                    />
                )}

                {/* Edit Modal */}
                {isEditModalOpen && (
                    <ExamScheduleModal
                        isOpen={isEditModalOpen}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setEditingItem(null);
                        }}
                        onSuccess={() => fetchSchedules()}
                        initialData={editingItem}
                        sessions={masterSessions}
                        classes={masterClasses}
                        centres={masterCentres}
                        isDarkMode={isDarkMode}
                    />
                )}

                {/* Import Modal */}
                {isImportModalOpen && (
                    <ExamImportModal
                        isOpen={isImportModalOpen}
                        onClose={() => setIsImportModalOpen(false)}
                        onSuccess={() => fetchSchedules()}
                        isDarkMode={isDarkMode}
                    />
                )}

                {/* Delete Confirmation Modal */}
                {deleteConfirmId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                        <div
                            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                                isDarkMode ? "bg-[#181d22] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                            }`}
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                                <FaTrash className="text-xl" />
                            </div>
                            <h3 className="text-lg font-bold text-center mb-2">Delete Exam Schedule?</h3>
                            <p className="text-xs text-gray-400 text-center mb-6">
                                Are you sure you want to delete this exam schedule? This action cannot be undone.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-700 hover:bg-gray-800 transition-all text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(deleteConfirmId)}
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all"
                                >
                                    {actionLoading ? "Deleting..." : "Yes, Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Delete Confirmation Modal */}
                {isBulkDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                        <div
                            className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                                isDarkMode ? "bg-[#181d22] border-gray-800 text-white" : "bg-white border-gray-200 text-gray-900"
                            }`}
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                                <FaTrash className="text-xl" />
                            </div>
                            <h3 className="text-lg font-bold text-center mb-2">
                                Delete {selectedIds.length} Exam Schedules?
                            </h3>
                            <p className="text-xs text-gray-400 text-center mb-6">
                                You are about to permanently remove {selectedIds.length} exam schedules. This action cannot be undone.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsBulkDeleteConfirm(false)}
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-700 hover:bg-gray-800 transition-all text-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkDelete}
                                    disabled={actionLoading}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all"
                                >
                                    {actionLoading ? "Deleting..." : "Yes, Delete All"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ExamSchedule;
