import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { 
    FaCalendarAlt, FaCommentDots, FaSpinner, FaTimes, 
    FaBullseye, FaArrowRight, FaCheckCircle, FaClock, FaExclamationCircle
} from "react-icons/fa";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import Pagination from "../../components/common/Pagination";

const ALL_ROLES = [
    { value: "admin", label: "Admin" },
    { value: "teacher", label: "Teacher" },
    { value: "telecaller", label: "Telecaller" },
    { value: "counsellor", label: "Counsellor" },
    { value: "marketing", label: "Marketing" },
    { value: "centerIncharge", label: "Center Incharge" },
    { value: "zonalManager", label: "Zonal Manager" },
    { value: "HOD", label: "HOD" },
    { value: "Class_Coordinator", label: "Class Coordinator" },
    { value: "hr", label: "HR" },
    { value: "accounts", label: "Accounts" },
    { value: "coordinator", label: "Coordinator" },
    { value: "digital", label: "Digital" },
    { value: "assistantZonalManager", label: "Assistant Zonal Manager" },
    { value: "assistantCenterIncharge", label: "Assistant Center Incharge" },
    { value: "supportStaff", label: "Support Staff" },
    { value: "superAdmin", label: "SuperAdmin" }
];

const Tasks = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingTaskId, setUpdatingTaskId] = useState(null);

    // Modal state for comment/review
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [newComment, setNewComment] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    const [statusFilter, setStatusFilter] = useState("All");
    const [dateRange, setDateRange] = useState("All");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, dateRange, customStartDate, customEndDate]);

    useEffect(() => {
        fetchMyTasks();
    }, []);

    const fetchMyTasks = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/task-workflow/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data);
            setLoading(false);
            
            // Mark tasks as viewed since page is opened
            await axios.put(`${import.meta.env.VITE_API_URL}/task-workflow/tasks/mark-viewed`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.dispatchEvent(new Event("tasks-updated"));
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast.error("Failed to load tasks");
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (taskId, newStatus) => {
        setUpdatingTaskId(taskId);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.patch(
                `${import.meta.env.VITE_API_URL}/task-workflow/tasks/${taskId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Task status updated to ${newStatus}`);
            setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
            
            // If the modal is currently open and showing the updated task, update it
            if (selectedTask && selectedTask._id === taskId) {
                setSelectedTask(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            console.error("Error updating task status:", error);
            toast.error("Failed to update status");
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setPostingComment(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/task-workflow/tasks/${selectedTask._id}/comments`,
                { text: newComment },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Comment/review posted successfully");
            setNewComment("");
            setSelectedTask(res.data.task);
            
            // Update in local tasks list
            setTasks(prev => prev.map(t => t._id === res.data.task._id ? res.data.task : t));
        } catch (error) {
            console.error("Error adding comment:", error);
            toast.error("Failed to post comment");
        } finally {
            setPostingComment(false);
        }
    };

    // Date range checking logic
    const matchesDateRange = (taskDateStr) => {
        if (dateRange === "All") return true;
        const today = new Date();
        
        const formatDate = (d) => {
            const tzOffset = d.getTimezoneOffset() * 60 * 1000;
            return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
        };

        const todayStr = formatDate(today);

        if (dateRange === "Today") {
            return taskDateStr === todayStr;
        }
        if (dateRange === "Tomorrow") {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            return taskDateStr === formatDate(tomorrow);
        }
        if (dateRange === "Yesterday") {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            return taskDateStr === formatDate(yesterday);
        }
        if (dateRange === "Last 7 Days") {
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 6);
            return taskDateStr >= formatDate(sevenDaysAgo) && taskDateStr <= todayStr;
        }
        if (dateRange === "This Month") {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            return taskDateStr >= formatDate(startOfMonth) && taskDateStr <= todayStr;
        }
        if (dateRange === "This Year") {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            return taskDateStr >= formatDate(startOfYear) && taskDateStr <= todayStr;
        }
        if (dateRange === "Custom Range") {
            if (!customStartDate || !customEndDate) return true;
            return taskDateStr >= customStartDate && taskDateStr <= customEndDate;
        }
        return true;
    };

    const filteredTasks = tasks.filter(task => {
        // Status filter
        const matchesStatus = statusFilter === "All" || task.status === statusFilter;

        // Date filter (by task creation/assignment date)
        const taskDate = new Date(task.createdAt);
        const tzOffset = taskDate.getTimezoneOffset() * 60 * 1000;
        const taskDateStr = new Date(taskDate.getTime() - tzOffset).toISOString().split('T')[0];
        const matchesDate = matchesDateRange(taskDateStr);

        return matchesStatus && matchesDate;
    });

    const paginatedTasks = filteredTasks.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusStyle = (status) => {
        switch (status) {
            case "Completed":
                return {
                    badge: "bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/20",
                    border: "border-green-500/20",
                    icon: <FaCheckCircle className="text-green-500 dark:text-green-400" />
                };
            case "In Progress":
                return {
                    badge: "bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20",
                    border: "border-blue-500/20",
                    icon: <FaClock className="text-blue-500 dark:text-blue-400" />
                };
            default:
                return {
                    badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20",
                    border: "border-yellow-500/20",
                    icon: <FaExclamationCircle className="text-yellow-600 dark:text-yellow-400" />
                };
        }
    };

    return (
        <Layout activePage="Task Workflow">
            <div className={`p-4 md:p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500">
                            My Assigned Tasks
                        </span>
                        <span className="text-3xl">🎯</span>
                    </h1>
                    <p className={`text-sm mt-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>View task directives, track goals, and post updates for admin review.</p>
                </div>

                {/* Filters Row */}
                <div className={`p-4 rounded-2xl mb-8 flex flex-wrap gap-4 items-center border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    {/* Status Filters */}
                    <div className={`flex gap-1 p-1 rounded-xl border min-w-[360px] ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                        {["All", "Pending", "In Progress", "Completed"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                    statusFilter === status 
                                        ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20" 
                                        : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Assigned Date Filter */}
                    <div className="relative min-w-[150px]">
                        <select
                            value={dateRange}
                            onChange={e => {
                                setDateRange(e.target.value);
                                if (e.target.value !== "Custom Range") {
                                    setCustomStartDate("");
                                    setCustomEndDate("");
                                }
                            }}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none cursor-pointer appearance-none transition-all focus:ring-2 focus:ring-cyan-500 ${
                                isDarkMode
                                    ? 'bg-[#131619] border-gray-800 text-white'
                                    : 'bg-white border-gray-200 text-gray-900'
                            }`}
                        >
                            {["All", "Today", "Tomorrow", "Yesterday", "Last 7 Days", "This Month", "This Year", "Custom Range"].map(d => (
                                <option key={d} value={d} className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>{d}</option>
                            ))}
                        </select>
                        <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 border rounded z-10 ${
                            isDarkMode ? 'bg-[#1a1f24] text-gray-500 border-gray-800' : 'bg-white text-gray-400 border-gray-200'
                        }`}>Assigned Date</span>
                    </div>

                    {/* Custom Range */}
                    {dateRange === "Custom Range" && (
                        <div className="flex gap-2 flex-wrap">
                            <div className="relative">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={e => setCustomStartDate(e.target.value)}
                                    className={`px-3 py-2 rounded-xl border text-xs font-semibold outline-none cursor-pointer transition-all focus:ring-2 focus:ring-cyan-500 dark-picker ${
                                        isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                                    }`}
                                />
                                <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 border rounded z-10 ${
                                    isDarkMode ? 'bg-[#1a1f24] text-gray-500 border-gray-800' : 'bg-white text-gray-400 border-gray-200'
                                }`}>From</span>
                            </div>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={e => setCustomEndDate(e.target.value)}
                                    className={`px-3 py-2 rounded-xl border text-xs font-semibold outline-none cursor-pointer transition-all focus:ring-2 focus:ring-cyan-500 dark-picker ${
                                        isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                                    }`}
                                />
                                <span className={`absolute left-3 -top-2 text-[8px] font-black uppercase tracking-widest px-1 border rounded z-10 ${
                                    isDarkMode ? 'bg-[#1a1f24] text-gray-500 border-gray-800' : 'bg-white text-gray-400 border-gray-200'
                                }`}>To</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Loading state */}
                {loading ? (
                    <div className="flex justify-center py-24">
                        <FaSpinner className="animate-spin text-cyan-500 text-4xl" />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className={`border rounded-3xl p-16 text-center shadow-md transition-colors ${
                        isDarkMode ? 'bg-[#1a1f24]/50 border-gray-800 text-gray-500' : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                        <FaBullseye className="text-5xl mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-semibold">No tasks match your selection.</p>
                    </div>
                ) : (
                    <>
                        <div className={`overflow-x-auto border rounded-2xl shadow-xl transition-all ${
                            isDarkMode ? 'bg-[#1a1f24]/20 border-gray-800' : 'bg-white border-gray-200'
                        }`}>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`border-b text-xs uppercase tracking-wider font-bold ${
                                        isDarkMode ? 'bg-[#1a1f24]/60 border-gray-850 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                                    }`}>
                                        <th className="py-4 px-6 font-semibold">Sl No.</th>
                                        <th className="py-4 px-6 font-semibold">Task Detail</th>
                                        <th className="py-4 px-6 font-semibold">Target/Goal</th>
                                        <th className="py-4 px-6 font-semibold">Assigned Date</th>
                                        <th className="py-4 px-6 font-semibold">Deadline</th>
                                        <th className="py-4 px-6 font-semibold">Status</th>
                                        <th className="py-4 px-6 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-850' : 'divide-gray-100'}`}>
                                    {paginatedTasks.map((task, index) => {
                                        const isOverdue = new Date(task.deadline) < new Date() && task.status !== "Completed";
                                        return (
                                            <tr key={task._id} className={`transition-colors ${
                                                isDarkMode ? 'hover:bg-gray-900/30 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                                            } ${isOverdue ? 'bg-red-500/5 hover:bg-red-500/10' : ''}`}>
                                                <td className="py-4 px-6 text-sm font-semibold">
                                                    {index + 1 + (currentPage - 1) * itemsPerPage}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{task.title}</div>
                                                        {isOverdue && (
                                                            <span className="text-[9px] font-black uppercase text-red-500 dark:text-red-400 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded animate-pulse">
                                                                OVERDUE
                                                            </span>
                                                        )}
                                                    </div>
                                                    {task.description && (
                                                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-1 max-w-xs">
                                                            {task.description}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-sm font-semibold">
                                                    {task.target || <span className="text-gray-405">—</span>}
                                                </td>
                                                <td className="py-4 px-6 text-sm">
                                                    <span>
                                                        {new Date(task.createdAt).toLocaleDateString("en-US", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric"
                                                        })}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <FaCalendarAlt className="text-cyan-500/80 text-xs shrink-0" />
                                                        <span>
                                                            {new Date(task.deadline).toLocaleDateString("en-US", {
                                                                day: "numeric",
                                                                month: "short",
                                                                year: "numeric"
                                                            })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="w-32">
                                                        <select
                                                            value={task.status}
                                                            disabled={updatingTaskId === task._id}
                                                            onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                                                            className={`w-full border font-bold py-1.5 px-3 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-xs cursor-pointer disabled:opacity-50 ${
                                                                isDarkMode 
                                                                    ? 'bg-[#131619] border-gray-800 text-gray-300' 
                                                                    : 'bg-white border-gray-200 text-gray-700 shadow-sm'
                                                            }`}
                                                        >
                                                            <option value="Pending" className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>Pending</option>
                                                            <option value="In Progress" className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>In Progress</option>
                                                            <option value="Completed" className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>Completed</option>
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowCommentsModal(true);
                                                        }}
                                                        className={`p-2.5 rounded-lg inline-flex items-center justify-center transition-all gap-1.5 text-xs font-bold border ${
                                                            isDarkMode 
                                                                ? 'bg-[#131619] text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10' 
                                                                : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                                                        }`}
                                                    >
                                                        <FaCommentDots size={14} />
                                                        <span>Reviews ({task.comments?.length || 0})</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {filteredTasks.length > 0 && (
                            <div className="mt-6">
                                <Pagination
                                    currentPage={currentPage}
                                    totalItems={filteredTasks.length}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={setCurrentPage}
                                    theme={isDarkMode ? 'dark' : 'light'}
                                    onItemsPerPageChange={setItemsPerPage}
                                />
                            </div>
                        )}
                    </>
                )}

                {/* MODAL: Comments/Reviews Timeline */}
                {showCommentsModal && selectedTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className={`border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 ${
                            isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'
                        }`}>
                            {/* Sticky Modal Header */}
                            <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${
                                isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white'
                            }`}>
                                <div>
                                    <h2 className={`text-lg font-bold truncate max-w-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        Review Thread: {selectedTask.title}
                                    </h2>
                                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Assigned by Superadmin
                                    </p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowCommentsModal(false);
                                        setSelectedTask(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Task Brief */}
                                <div className={`p-4 rounded-2xl border ${
                                    isDarkMode ? 'bg-[#131619] border-gray-800/80' : 'bg-gray-50 border-gray-200'
                                }`}>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Directive Brief</h3>
                                    <p className={`text-sm mt-1 whitespace-pre-wrap ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{selectedTask.description || "No description provided."}</p>
                                    
                                    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800/60 text-xs">
                                        <div>
                                            <span className="text-gray-500 font-medium">Target/Goal: </span>
                                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{selectedTask.target || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 font-medium">Deadline: </span>
                                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                {new Date(selectedTask.deadline).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 font-medium">Status: </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(selectedTask.status).badge}`}>
                                                {selectedTask.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments List */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Timeline & Progress Log</h3>
                                    
                                    {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                                        <p className="text-sm text-gray-500 text-center py-6">No updates logged yet. Add your comment below.</p>
                                    ) : (
                                        <div className={`relative pl-6 border-l-2 space-y-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                            {selectedTask.comments.map((comment, index) => {
                                                const roleName = Array.isArray(comment.user?.role) 
                                                    ? comment.user?.role[0] 
                                                    : comment.user?.role;
                                                const isSuperadmin = (roleName || "").toLowerCase().includes("superadmin");
                                                
                                                return (
                                                    <div key={comment._id || index} className="relative">
                                                        {/* Timeline bullet */}
                                                        <div className={`absolute -left-[31px] top-1.5 w-2 h-2 rounded-full border-2 ${
                                                            isSuperadmin 
                                                                ? 'bg-cyan-500 border-cyan-500' 
                                                                : 'bg-indigo-500 border-indigo-500'
                                                        }`}></div>
                                                        
                                                        <div className={`p-4 rounded-2xl border ${
                                                            isDarkMode ? 'bg-[#131619] border-gray-850' : 'bg-gray-50 border-gray-100'
                                                        }`}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                                                        {comment.user?.name || "User"}
                                                                    </span>
                                                                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                                                        isSuperadmin 
                                                                            ? "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20" 
                                                                            : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
                                                                    }`}>
                                                                        {(() => {
                                                                            const rLabel = ALL_ROLES.find(r => r.value === roleName)?.label || roleName;
                                                                            return rLabel || "Staff";
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] text-gray-500">
                                                                    {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className={`text-sm mt-1 whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{comment.text}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Comment Input Form */}
                            <form onSubmit={handleAddComment} className={`p-6 border-t sticky bottom-0 ${
                                isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white'
                            }`}>
                                <div className="flex gap-2">
                                    <textarea
                                        rows="1"
                                        placeholder="Add comment or log task progress updates..."
                                        required
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className={`flex-1 border rounded-xl px-4 py-2.5 placeholder-gray-500 outline-none resize-none focus:ring-2 focus:ring-cyan-500 ${
                                            isDarkMode 
                                                ? 'bg-[#131619] border-gray-800 text-white' 
                                                : 'bg-gray-50 border-gray-200 text-gray-900'
                                        }`}
                                    />
                                    <button
                                        type="submit"
                                        disabled={postingComment || !newComment.trim()}
                                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold p-3 rounded-xl inline-flex items-center justify-center transition-all disabled:opacity-40"
                                    >
                                        {postingComment ? <FaSpinner className="animate-spin" /> : <FaArrowRight />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Tasks;
