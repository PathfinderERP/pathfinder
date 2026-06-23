import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { 
    FaPlus, FaSearch, FaFilter, FaCalendarAlt, FaTrash, 
    FaCommentDots, FaUserCheck, FaSpinner, FaTimes, FaBullseye,
    FaArrowRight, FaEdit
} from "react-icons/fa";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import MultiSelectFilter from "../../components/common/MultiSelectFilter";
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

const AssignTask = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [newComment, setNewComment] = useState("");
    const [postingComment, setPostingComment] = useState(false);

    // Modal filters
    const [selectedCentre, setSelectedCentre] = useState("");
    const [selectedRole, setSelectedRole] = useState("");

    // Form states
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        assignedTo: "",
        role: "",
        target: "",
        deadline: ""
    });
    const [submitting, setSubmitting] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState([]);
    const [roleFilter, setRoleFilter] = useState([]);
    const [centreFilter, setCentreFilter] = useState([]);
    const [dateRange, setDateRange] = useState("All");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset pagination to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, roleFilter, centreFilter, dateRange, customStartDate, customEndDate]);

    useEffect(() => {
        fetchTasks();
        fetchUsers();
        fetchCentres();
    }, []);

    const fetchTasks = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/task-workflow/tasks`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            toast.error("Failed to load tasks");
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data.users || []);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users for assignment");
        }
    };

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const activeCentres = (res.data || []).filter(c => c.status !== "deactive");
            activeCentres.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
            setCentres(activeCentres);
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    // Filter users inside Assign Modal
    const filteredModalUsers = users.filter(u => {
        // Only active users
        if (u.isActive === false) return false;

        if (selectedCentre) {
            const userCentres = u.centres || [];
            const hasCentre = userCentres.some(c => {
                const cId = typeof c === "object" ? c._id : c;
                return cId === selectedCentre;
            });
            if (!hasCentre) return false;
        }
        if (selectedRole) {
            const userRole = Array.isArray(u.role) ? u.role[0] : u.role;
            if ((userRole || "").toLowerCase() !== selectedRole.toLowerCase()) {
                return false;
            }
        }
        return true;
    });

    useEffect(() => {
        if (formData.assignedTo) {
            const stillVisible = filteredModalUsers.some(u => u._id === formData.assignedTo);
            if (!stillVisible) {
                setFormData(prev => ({ ...prev, assignedTo: "", role: "" }));
            }
        }
    }, [selectedCentre, selectedRole, users]);

    const handleUserChange = (userId) => {
        const selectedUser = users.find(u => u._id === userId);
        if (selectedUser) {
            const roleVal = Array.isArray(selectedUser.role) 
                ? selectedUser.role[0] 
                : selectedUser.role;
            
            setFormData(prev => ({
                ...prev,
                assignedTo: userId,
                role: roleVal || ""
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                assignedTo: "",
                role: ""
            }));
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.assignedTo || !formData.deadline) {
            toast.error("Please fill all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            if (editingTask) {
                await axios.put(
                    `${import.meta.env.VITE_API_URL}/task-workflow/tasks/${editingTask._id}`, 
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Task updated successfully");
            } else {
                await axios.post(
                    `${import.meta.env.VITE_API_URL}/task-workflow/tasks`, 
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Task assigned successfully");
            }
            setShowAssignModal(false);
            setEditingTask(null);
            setSelectedCentre("");
            setSelectedRole("");
            setFormData({
                title: "",
                description: "",
                assignedTo: "",
                role: "",
                target: "",
                deadline: ""
            });
            fetchTasks();
            window.dispatchEvent(new Event("tasks-updated"));
        } catch (error) {
            console.error("Error saving task:", error);
            toast.error(error.response?.data?.message || "Failed to save task");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        const userCentre = task.assignedTo?.centres?.[0];
        const userCentreId = typeof userCentre === "object" ? userCentre._id : userCentre;
        setSelectedCentre(userCentreId || "");
        setSelectedRole(task.role || "");
        
        setFormData({
            title: task.title || "",
            description: task.description || "",
            assignedTo: task.assignedTo?._id || task.assignedTo || "",
            role: task.role || "",
            target: task.target || "",
            deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ""
        });
        setShowAssignModal(true);
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        try {
            const token = localStorage.getItem("token");
            await axios.delete(`${import.meta.env.VITE_API_URL}/task-workflow/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Task deleted successfully");
            fetchTasks();
            window.dispatchEvent(new Event("tasks-updated"));
            if (selectedTask && selectedTask._id === taskId) {
                setShowCommentsModal(false);
                setSelectedTask(null);
            }
        } catch (error) {
            console.error("Error deleting task:", error);
            toast.error("Failed to delete task");
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
            toast.success("Comment posted");
            setNewComment("");
            setSelectedTask(res.data.task);
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

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            task.title.toLowerCase().includes(searchLower) ||
            (task.assignedTo?.name || "").toLowerCase().includes(searchLower) ||
            (task.assignedTo?.employeeId || "").toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(task.status);
        
        const taskRole = Array.isArray(task.role) ? task.role[0] : task.role;
        const matchesRole = roleFilter.length === 0 || roleFilter.some(r => r.toLowerCase() === (taskRole || "").toLowerCase());

        const matchesCentre = centreFilter.length === 0 || (() => {
            const userCentres = task.assignedTo?.centres || [];
            return userCentres.some(c => {
                const cId = (typeof c === "object" && c != null) ? c._id : c;
                return cId && centreFilter.includes(cId.toString());
            });
        })();

        // Date filter
        const taskDate = new Date(task.createdAt);
        const tzOffset = taskDate.getTimezoneOffset() * 60 * 1000;
        const taskDateStr = new Date(taskDate.getTime() - tzOffset).toISOString().split('T')[0];
        const matchesDate = matchesDateRange(taskDateStr);

        return matchesSearch && matchesStatus && matchesRole && matchesCentre && matchesDate;
    });

    const paginatedTasks = filteredTasks.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusColor = (status) => {
        switch (status) {
            case "Completed":
                return "bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/20";
            case "In Progress":
                return "bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20";
            default:
                return "bg-yellow-500/10 text-yellow-650 dark:text-yellow-400 border border-yellow-500/20";
        }
    };

    return (
        <Layout activePage="Task Workflow">
            <div className={`p-4 md:p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0f1214] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-indigo-500">
                                Task Assignment Desk
                            </span>
                            <span className="text-3xl">📋</span>
                        </h1>
                        <p className={`text-sm mt-1.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Assign, track, and review goals and tasks for ERP users.</p>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedCentre("");
                            setSelectedRole("");
                            setShowAssignModal(true);
                        }}
                        className="bg-gradient-to-r from-cyan-500 to-indigo-650 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-cyan-500/20 cursor-pointer"
                    >
                        <FaPlus size={14} /> Assign New Task
                    </button>
                </div>

                {/* Filters Row */}
                <div className={`p-4 rounded-2xl mb-8 flex flex-wrap gap-4 items-center border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="relative flex-grow max-w-md">
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by task title, user name, ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full border pl-11 pr-4 py-2.5 rounded-xl outline-none text-xs font-semibold focus:ring-2 focus:ring-cyan-500 transition-all ${
                                isDarkMode 
                                    ? 'bg-[#131619] border-gray-800 text-gray-100 placeholder-gray-600' 
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                            }`}
                        />
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                        {/* Centre Filter */}
                        <MultiSelectFilter
                            label="Centres"
                            placeholder="All Centres"
                            options={centres.map(c => ({ value: c._id, label: c.centreName }))}
                            selectedValues={centreFilter}
                            onChange={setCentreFilter}
                            theme={isDarkMode ? 'dark' : 'light'}
                        />

                        {/* Status Filter */}
                        <MultiSelectFilter
                            label="Statuses"
                            placeholder="All Statuses"
                            options={[
                                { value: "Pending", label: "Pending" },
                                { value: "In Progress", label: "In Progress" },
                                { value: "Completed", label: "Completed" }
                            ]}
                            selectedValues={statusFilter}
                            onChange={setStatusFilter}
                            theme={isDarkMode ? 'dark' : 'light'}
                        />

                        {/* Role Filter */}
                        <MultiSelectFilter
                            label="Roles"
                            placeholder="All Roles"
                            options={ALL_ROLES}
                            selectedValues={roleFilter}
                            onChange={setRoleFilter}
                            theme={isDarkMode ? 'dark' : 'light'}
                        />

                        {/* Date Range Filter */}
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

                        {/* Custom Dates */}
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
                </div>

                {/* Tasks List */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <FaSpinner className="animate-spin text-cyan-500 text-4xl" />
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className={`border rounded-2xl p-16 text-center shadow-md transition-colors ${
                        isDarkMode ? 'bg-[#1a1f24]/50 border-gray-800 text-gray-500' : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                        <FaBullseye className="text-5xl mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">No tasks found matching your filters.</p>
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
                                    <th className="py-4 px-6 font-semibold">Assigned To</th>
                                    <th className="py-4 px-6 font-semibold">Target/Goal</th>
                                    <th className="py-4 px-6 font-semibold">Assigned Date</th>
                                    <th className="py-4 px-6 font-semibold">Deadline</th>
                                    <th className="py-4 px-6 font-semibold">Status</th>
                                    <th className="py-4 px-6 text-right font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-850' : 'divide-gray-100'}`}>
                                {paginatedTasks.map((task, index) => (
                                    <tr key={task._id} className={`transition-colors ${
                                        isDarkMode ? 'hover:bg-gray-900/30 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                                    }`}>
                                        <td className="py-4 px-6 text-sm font-semibold">
                                            {index + 1 + (currentPage - 1) * itemsPerPage}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{task.title}</div>
                                            {task.description && (
                                                <p className="text-gray-400 text-xs mt-0.5 line-clamp-1 max-w-xs">
                                                    {task.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                {task.assignedTo?.name || "Unknown"}
                                            </div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                                                    isDarkMode ? 'bg-gray-800 text-cyan-400' : 'bg-gray-100 text-cyan-700'
                                                }`}>
                                                    {(() => {
                                                        const taskRole = Array.isArray(task.role) ? task.role[0] : task.role;
                                                        return ALL_ROLES.find(r => r.value === taskRole)?.label || taskRole;
                                                    })()}
                                                </span>
                                                <span>• ID: {task.assignedTo?.employeeId || "N/A"}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm">
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
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                                            <button
                                                onClick={() => handleEditTask(task)}
                                                className={`p-2.5 rounded-lg inline-flex items-center justify-center transition-all gap-1.5 text-xs font-bold border ${
                                                    isDarkMode 
                                                        ? 'bg-gray-805 hover:bg-gray-700 text-yellow-450 border-yellow-500/20' 
                                                        : 'bg-gray-50 hover:bg-gray-100 text-yellow-700 border-yellow-250'
                                                }`}
                                                title="Edit Task Directive"
                                            >
                                                <FaEdit size={14} />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setShowCommentsModal(true);
                                                }}
                                                className={`p-2.5 rounded-lg inline-flex items-center justify-center transition-all gap-1.5 text-xs font-bold border ${
                                                    isDarkMode 
                                                        ? 'bg-gray-800 hover:bg-gray-700 text-cyan-400 border-cyan-500/20' 
                                                        : 'bg-gray-50 hover:bg-gray-100 text-cyan-700 border-gray-200'
                                                }`}
                                                title="View Comments & Reviews"
                                            >
                                                <FaCommentDots size={14} />
                                                <span>Review ({task.comments?.length || 0})</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTask(task._id)}
                                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 p-2.5 rounded-lg inline-flex items-center justify-center transition-all"
                                                title="Delete Task"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
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

                {/* MODAL 1: Assign Task Modal */}
                {showAssignModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className={`border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                            isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900 shadow-2xl'
                        }`}>
                            <div className={`p-6 border-b flex justify-between items-center ${
                                isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-150 bg-white'
                            }`}>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <span>🎯</span> {editingTask ? "Edit Task Directive" : "Assign Task to User"}
                                </h2>
                                <button 
                                    onClick={() => {
                                        setShowAssignModal(false);
                                        setEditingTask(null);
                                        setSelectedCentre("");
                                        setSelectedRole("");
                                        setFormData({
                                            title: "",
                                            description: "",
                                            assignedTo: "",
                                            role: "",
                                            target: "",
                                            deadline: ""
                                        });
                                    }}
                                    className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Task Title *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Call 100 General Leads"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 ${
                                            isDarkMode 
                                                ? 'bg-[#131619] border-gray-800 text-white' 
                                                : 'bg-gray-50 border-gray-200 text-gray-900'
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        rows="3"
                                        placeholder="Enter detailed description of the task workflow..."
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-500 resize-none placeholder-gray-500 ${
                                            isDarkMode 
                                                ? 'bg-[#131619] border-gray-800 text-white' 
                                                : 'bg-gray-50 border-gray-200 text-gray-900'
                                        }`}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Filter by Centre
                                        </label>
                                        <select
                                            value={selectedCentre}
                                            onChange={(e) => setSelectedCentre(e.target.value)}
                                            className={`w-full border rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-cyan-500 ${
                                                isDarkMode 
                                                    ? 'bg-[#131619] border-gray-800 text-white' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                            }`}
                                        >
                                            <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>All Centres</option>
                                            {centres.map(c => (
                                                <option key={c._id} value={c._id} className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>
                                                    {c.centreName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Filter by Role
                                        </label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className={`w-full border rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-cyan-500 ${
                                                isDarkMode 
                                                    ? 'bg-[#131619] border-gray-800 text-white' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                            }`}
                                        >
                                            <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>All Roles</option>
                                            {ALL_ROLES.map(role => (
                                                <option key={role.value} value={role.value} className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>
                                                    {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Assign To User *
                                        </label>
                                        <select
                                            required
                                            value={formData.assignedTo}
                                            onChange={(e) => handleUserChange(e.target.value)}
                                            className={`w-full border rounded-xl px-4 py-2.5 outline-none cursor-pointer focus:ring-2 focus:ring-cyan-500 ${
                                                isDarkMode 
                                                    ? 'bg-[#131619] border-gray-800 text-white' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                            }`}
                                        >
                                            <option value="" className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>Select User</option>
                                            {filteredModalUsers.map(u => (
                                                <option key={u._id} value={u._id} className={isDarkMode ? 'bg-[#1a1f24]' : 'bg-white'}>
                                                    {u.name} ({u.employeeId})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                            Assigned Role
                                        </label>
                                        <input
                                            type="text"
                                            readOnly
                                            placeholder="Auto-filled"
                                            value={formData.role ? (ALL_ROLES.find(r => r.value === formData.role)?.label || formData.role) : ""}
                                            className={`w-full border rounded-xl px-4 py-2.5 font-bold focus:outline-none ${
                                                isDarkMode 
                                                    ? 'bg-[#131619]/60 border-gray-800 text-cyan-400' 
                                                    : 'bg-gray-100 border-gray-200 text-cyan-700'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Target/Goal (e.g. leads, hours)
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 50 calls, 10 registrations"
                                            value={formData.target}
                                            onChange={(e) => setFormData(prev => ({ ...prev, target: e.target.value }))}
                                            className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 ${
                                                isDarkMode 
                                                    ? 'bg-[#131619] border-gray-800 text-white' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                            }`}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Deadline Date *
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.deadline}
                                            onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                                            className={`w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-500 dark-picker ${
                                                isDarkMode 
                                                    ? 'bg-[#131619] border-gray-800 text-white' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                            }`}
                                        />
                                    </div>
                                </div>

                                <div className={`flex justify-end gap-3 pt-4 border-t ${
                                    isDarkMode ? 'border-gray-800' : 'border-gray-150'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAssignModal(false);
                                            setEditingTask(null);
                                            setSelectedCentre("");
                                            setSelectedRole("");
                                            setFormData({
                                                title: "",
                                                description: "",
                                                assignedTo: "",
                                                role: "",
                                                target: "",
                                                deadline: ""
                                            });
                                        }}
                                        className={`font-bold px-5 py-2.5 rounded-xl transition-all border ${
                                            isDarkMode 
                                                ? 'bg-gray-805 hover:bg-gray-700 text-gray-300 border-gray-800' 
                                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                                        }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-gradient-to-r from-cyan-500 to-indigo-650 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
                                    >
                                        {submitting ? (
                                            <>
                                                <FaSpinner className="animate-spin" /> {editingTask ? "Updating..." : "Assigning..."}
                                            </>
                                        ) : (editingTask ? "Update Task" : "Assign Task")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: Comments Timeline Modal */}
                {showCommentsModal && selectedTask && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className={`border rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 ${
                            isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'
                        }`}>
                            <div className={`p-6 border-b flex justify-between items-center sticky top-0 z-10 ${
                                isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white'
                            }`}>
                                <div>
                                    <h2 className={`text-lg font-bold truncate max-w-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        Review Thread: {selectedTask.title}
                                    </h2>
                                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Assigned user: <span className="text-cyan-500 font-semibold">{selectedTask.assignedTo?.name}</span>
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
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Task Details</h3>
                                    <p className={`text-sm mt-1 whitespace-pre-wrap ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{selectedTask.description || "No description provided."}</p>
                                    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800/60 text-xs">
                                        <div>
                                            <span className="text-gray-500 font-medium">Target: </span>
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
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(selectedTask.status)}`}>
                                                {selectedTask.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Comments List */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Timeline & Reviews</h3>
                                    
                                    {(!selectedTask.comments || selectedTask.comments.length === 0) ? (
                                        <p className="text-sm text-gray-500 text-center py-6">No comments or reviews posted yet.</p>
                                    ) : (
                                        <div className={`relative pl-6 border-l-2 space-y-6 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                            {selectedTask.comments.map((comment, index) => {
                                                const roleName = Array.isArray(comment.user?.role) 
                                                    ? comment.user?.role[0] 
                                                    : comment.user?.role;
                                                const isSelfSuperadmin = (roleName || "").toLowerCase().includes("superadmin");
                                                
                                                return (
                                                    <div key={comment._id || index} className="relative">
                                                        {/* Timeline bullet */}
                                                        <div className={`absolute -left-[31px] top-1.5 w-2 h-2 rounded-full border-2 ${
                                                            isSelfSuperadmin 
                                                                ? 'bg-cyan-500 border-cyan-500' 
                                                                : 'bg-indigo-500 border-indigo-500'
                                                        }`}></div>
                                                        
                                                        <div className={`p-4 rounded-2xl border ${
                                                            isDarkMode ? 'bg-[#131619] border-gray-850' : 'bg-gray-50 border-gray-100'
                                                        }`}>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-805'}`}>
                                                                        {comment.user?.name || "User"}
                                                                    </span>
                                                                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                                                        isSelfSuperadmin 
                                                                            ? "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20" 
                                                                            : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20"
                                                                    }`}>
                                                                        {roleName || "Staff"}
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

                            {/* Comment Form */}
                            <form onSubmit={handleAddComment} className={`p-6 border-t sticky bottom-0 ${
                                isDarkMode ? 'border-gray-800 bg-[#1a1f24]' : 'border-gray-100 bg-white'
                            }`}>
                                <div className="flex gap-2">
                                    <textarea
                                        rows="1"
                                        placeholder="Write a reply or review note..."
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

export default AssignTask;
