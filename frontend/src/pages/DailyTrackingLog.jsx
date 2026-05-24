import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
    FaClock, 
    FaHistory, 
    FaPlus, 
    FaEdit, 
    FaTrash, 
    FaSearch, 
    FaBuilding, 
    FaCalendarAlt, 
    FaCheckCircle, 
    FaSpinner,
    FaCheck,
    FaTasks
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import Layout from "../components/Layout";


const DailyTrackingLog = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem("token");

    // State management
    const [activeTab, setActiveTab] = useState("myLog"); // "myLog" | "deptBoard"
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [myActivities, setMyActivities] = useState([]);
    const [myLogId, setMyLogId] = useState(null);
    const [boardLogs, setBoardLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Form states
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:00");
    const [workDetails, setWorkDetails] = useState("");
    const [completedWork, setCompletedWork] = useState("");
    const [status, setStatus] = useState("Completed");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Board filters
    const [selectedDept, setSelectedDept] = useState("All");
    const [searchEmployee, setSearchEmployee] = useState("");

    // Editing states
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [editStartTime, setEditStartTime] = useState("");
    const [editEndTime, setEditEndTime] = useState("");
    const [editWorkDetails, setEditWorkDetails] = useState("");
    const [editCompletedWork, setEditCompletedWork] = useState("");
    const [editStatus, setEditStatus] = useState("Completed");

    // Roles list & display labels
    const rolesMap = {
        "All": "All",
        "admin": "Admin",
        "superadmin": "Superadmin",
        "coordinator": "Coordinator",
        "accounts": "Accounts",
        "hr": "HR",
        "digital": "Digital",
        "marketing": "Marketing",
        "telecaller": "Telecaller",
        "counsellor": "Counsellor",
        "teacher": "Teacher"
    };
    const roles = Object.keys(rolesMap);

    const getDisplayRoleName = (role) => {
        if (!role) return "Employee";
        const normalized = role.toLowerCase();
        if (normalized.includes("admin")) {
            if (normalized.includes("super")) return "Superadmin";
            return "Admin";
        }
        if (normalized.includes("coordinator")) return "Coordinator";
        if (normalized.includes("telecaller")) return "Telecaller";
        if (normalized.includes("accounts")) return "Accounts";
        if (normalized.includes("hr")) return "HR";
        if (normalized.includes("digital")) return "Digital";
        if (normalized.includes("marketing")) return "Marketing";
        if (normalized.includes("counsellor")) return "Counsellor";
        if (normalized.includes("teacher")) return "Teacher";
        return role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    };

    // Fetch user's logs
    const fetchMyLog = async (date) => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/daily-tracking-logs/my-log?date=${date}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setMyActivities(data.log?.activities || []);
                setMyLogId(data.log?._id || null);
            } else {
                toast.error(data.message || "Failed to fetch log.");
            }
        } catch (error) {
            console.error("Error fetching logs:", error);
            toast.error("Error connecting to server.");
        } finally {
            setLoading(false);
        }
    };

    // Fetch board logs
    const fetchBoardLogs = async (date, role, name) => {
        setLoading(true);
        try {
            let url = `${apiUrl}/daily-tracking-logs/board?date=${date}`;
            if (role && role !== "All") url += `&role=${role}`;
            if (name) url += `&employeeName=${encodeURIComponent(name)}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setBoardLogs(data.logs || []);
            } else {
                toast.error(data.message || "Failed to fetch board logs.");
            }
        } catch (error) {
            console.error("Error fetching board logs:", error);
            toast.error("Error connecting to server.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "myLog") {
            fetchMyLog(selectedDate);
        } else {
            fetchBoardLogs(selectedDate, selectedDept, searchEmployee);
        }
    }, [activeTab, selectedDate, selectedDept, searchEmployee]);

    // Handle Form Submit
    const handleAddActivity = async (e) => {
        e.preventDefault();
        if (!startTime || !endTime || !workDetails.trim()) {
            toast.warning("Please fill in the time range and work details.");
            return;
        }

        setIsSubmitting(true);
        const formatTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(":");
            const hr = parseInt(hours);
            const ampm = hr >= 12 ? "PM" : "AM";
            const adjustedHr = hr % 12 || 12;
            const pad = (num) => String(num).padStart(2, "0");
            return `${pad(adjustedHr)}:${pad(minutes)} ${ampm}`;
        };

        const timeRange = `${formatTime(startTime)} - ${formatTime(endTime)}`;

        try {
            const res = await fetch(`${apiUrl}/daily-tracking-logs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    time: timeRange,
                    workDetails,
                    completedWork,
                    status
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Activity logged successfully!");
                setWorkDetails("");
                setCompletedWork("");
                // Set start time of next block to end time of this one
                setStartTime(endTime);
                
                // Adjust end time to +1 hour later helper
                try {
                    const [h, m] = endTime.split(":");
                    const nextH = (parseInt(h) + 1) % 24;
                    setEndTime(`${String(nextH).padStart(2, "0")}:${m}`);
                } catch (_) {}

                fetchMyLog(selectedDate);
            } else {
                toast.error(data.message || "Failed to log activity.");
            }
        } catch (error) {
            console.error("Error saving activity:", error);
            toast.error("Failed to submit.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Delete Activity
    const handleDeleteActivity = async (activityId) => {
        if (!window.confirm("Are you sure you want to delete this activity?")) return;

        try {
            const res = await fetch(`${apiUrl}/daily-tracking-logs/${myLogId}/activity/${activityId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Activity deleted.");
                fetchMyLog(selectedDate);
            } else {
                toast.error(data.message || "Failed to delete activity.");
            }
        } catch (error) {
            console.error("Error deleting activity:", error);
            toast.error("Error deleting activity.");
        }
    };

    // Enter edit mode
    const startEdit = (activity) => {
        setEditingActivityId(activity._id);
        
        // Parse time back (e.g. "09:00 AM - 10:00 AM")
        const parseTimeTo24h = (timeStr) => {
            try {
                const parts = timeStr.trim().split(" ");
                let [hh, mm] = parts[0].split(":");
                let hr = parseInt(hh);
                const ampm = parts[1].toUpperCase();
                if (ampm === "PM" && hr < 12) hr += 12;
                if (ampm === "AM" && hr === 12) hr = 0;
                return `${String(hr).padStart(2, "0")}:${mm}`;
            } catch (e) {
                return "09:00";
            }
        };

        const timeParts = activity.time.split(" - ");
        if (timeParts.length === 2) {
            setEditStartTime(parseTimeTo24h(timeParts[0]));
            setEditEndTime(parseTimeTo24h(timeParts[1]));
        } else {
            setEditStartTime("09:00");
            setEditEndTime("10:00");
        }

        setEditWorkDetails(activity.workDetails);
        setEditCompletedWork(activity.completedWork || "");
        setEditStatus(activity.status || "Completed");
    };

    // Save Edit
    const handleUpdateActivity = async (activityId) => {
        if (!editStartTime || !editEndTime || !editWorkDetails.trim()) {
            toast.warning("Please fill in all required fields.");
            return;
        }

        const formatTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(":");
            const hr = parseInt(hours);
            const ampm = hr >= 12 ? "PM" : "AM";
            const adjustedHr = hr % 12 || 12;
            const pad = (num) => String(num).padStart(2, "0");
            return `${pad(adjustedHr)}:${pad(minutes)} ${ampm}`;
        };

        const timeRange = `${formatTime(editStartTime)} - ${formatTime(editEndTime)}`;

        try {
            const res = await fetch(`${apiUrl}/daily-tracking-logs/${myLogId}/activity/${activityId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    time: timeRange,
                    workDetails: editWorkDetails,
                    completedWork: editCompletedWork,
                    status: editStatus
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Activity updated successfully!");
                setEditingActivityId(null);
                fetchMyLog(selectedDate);
            } else {
                toast.error(data.message || "Failed to update activity.");
            }
        } catch (error) {
            console.error("Error updating activity:", error);
            toast.error("Failed to update.");
        }
    };

    // Fast status switch in my activity log
    const toggleActivityStatus = async (activity, newStatus) => {
        try {
            const res = await fetch(`${apiUrl}/daily-tracking-logs/${myLogId}/activity/${activity._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(`Status updated to ${newStatus}`);
                fetchMyLog(selectedDate);
            } else {
                toast.error(data.message || "Failed to toggle status.");
            }
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("Failed to change status.");
        }
    };

    // Board filtration handlers
    const handleFilterChange = (role) => {
        setSelectedDept(role);
    };

    const handleSearchChange = (val) => {
        setSearchEmployee(val);
    };

    return (
        <Layout>
            <div className={`flex-1 p-6 min-h-screen overflow-y-auto transition-colors duration-300 ${
                isDarkMode ? "bg-[#131619] text-white" : "bg-[#f8fafc] text-gray-900"
            }`}>
            <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "colored"} />

            {/* Header section with glass effect */}
            <div className={`p-6 rounded-2xl border mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                isDarkMode 
                    ? "bg-[#1a1f24]/80 border-gray-800/80 backdrop-blur-md" 
                    : "bg-white/80 border-slate-200/80 backdrop-blur-md shadow-sm"
            }`}>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                        <FaHistory className="text-xl" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Daily Tracking Log</h2>
                        <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Input and track employee daily working activity log department-wise
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-stretch md:self-auto">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                        isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-white border-slate-200"
                    }`}>
                        <FaCalendarAlt className="text-indigo-500" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={`bg-transparent font-medium focus:outline-none text-sm ${
                                isDarkMode ? "text-white" : "text-gray-800"
                            }`}
                        />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-800/20 mb-6 gap-2">
                <button
                    onClick={() => setActiveTab("myLog")}
                    className={`px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 flex items-center gap-2 ${
                        activeTab === "myLog"
                            ? "border-indigo-500 text-indigo-500 font-bold"
                            : "border-transparent text-gray-500 hover:text-gray-400"
                    }`}
                >
                    <FaTasks className="text-sm" />
                    My Daily Log
                </button>
                <button
                    onClick={() => setActiveTab("deptBoard")}
                    className={`px-5 py-3 font-semibold text-sm transition-all duration-200 border-b-2 flex items-center gap-2 ${
                        activeTab === "deptBoard"
                            ? "border-indigo-500 text-indigo-500 font-bold"
                            : "border-transparent text-gray-500 hover:text-gray-400"
                    }`}
                >
                    <FaBuilding className="text-sm" />
                    Department Board
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && (
                <div className="flex items-center justify-center p-12">
                    <FaSpinner className="animate-spin text-3xl text-indigo-500 mr-2" />
                    <span className="text-gray-500 font-medium">Fetching activities...</span>
                </div>
            )}

            {!loading && activeTab === "myLog" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left side: Add activity form */}
                    <div className="lg:col-span-1">
                        <div className={`p-6 rounded-2xl border sticky top-6 ${
                            isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                        }`}>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FaPlus className="text-indigo-500 text-sm" />
                                Add Work Entry
                            </h3>
                            <form onSubmit={handleAddActivity} className="space-y-4">
                                <div>
                                    <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                    }`}>
                                        Time Frame
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[10px] text-gray-500 block mb-1">Start Time</span>
                                            <input
                                                type="time"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                                                    isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-gray-500 block mb-1">End Time</span>
                                            <input
                                                type="time"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                                                    isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                    }`}>
                                        Work Details / Activity
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={workDetails}
                                        onChange={(e) => setWorkDetails(e.target.value)}
                                        placeholder="What are you working on right now?"
                                        className={`w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                                            isDarkMode ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500" : "bg-slate-50 border-slate-200 text-slate-900"
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                    }`}>
                                        Completed Tasks (If any)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={completedWork}
                                        onChange={(e) => setCompletedWork(e.target.value)}
                                        placeholder="Mention completed deliverables (optional)..."
                                        className={`w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                                            isDarkMode ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500" : "bg-slate-50 border-slate-200 text-slate-900"
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${
                                        isDarkMode ? "text-gray-400" : "text-gray-500"
                                    }`}>
                                        Work Status
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                                            isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                        }`}
                                    >
                                        <option value="Completed">Completed</option>
                                        <option value="In Progress">In Progress</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                                >
                                    {isSubmitting ? <FaSpinner className="animate-spin text-white" /> : <FaPlus />}
                                    Log Activity
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right side: Current activities list */}
                    <div className="lg:col-span-2">
                        <div className={`p-6 rounded-2xl border ${
                            isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                        }`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <FaClock className="text-indigo-500 text-sm" />
                                    Today's Activity Timeline
                                </h3>
                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                    isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                                }`}>
                                    {myActivities.length} logs
                                </span>
                            </div>

                            {myActivities.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center justify-center">
                                    <FaHistory className={`text-4xl mb-3 ${isDarkMode ? "text-gray-700" : "text-gray-300"}`} />
                                    <p className={`text-sm ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>No activity logs found for today.</p>
                                    <p className="text-xs text-gray-500 mt-1">Use the left form to submit your first activity.</p>
                                </div>
                            ) : (
                                <div className="relative pl-6 border-l border-indigo-500/20 space-y-6">
                                    {myActivities.map((act) => (
                                        <div key={act._id} className="relative group">
                                            {/* Timeline marker */}
                                            <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all ${
                                                act.status === "Completed" 
                                                    ? "bg-emerald-500 border-emerald-500 group-hover:scale-125" 
                                                    : "bg-amber-500 border-amber-500 group-hover:scale-125"
                                            }`} />

                                            {editingActivityId === act._id ? (
                                                /* Edit mode card */
                                                <div className={`p-4 rounded-xl border space-y-3 ${
                                                    isDarkMode ? "bg-gray-800/80 border-indigo-500/30" : "bg-slate-50 border-indigo-500/20"
                                                }`}>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <span className="text-[10px] text-gray-400 block mb-1">Start Time</span>
                                                            <input
                                                                type="time"
                                                                value={editStartTime}
                                                                onChange={(e) => setEditStartTime(e.target.value)}
                                                                className={`w-full p-2 rounded-lg border text-sm ${
                                                                    isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                }`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] text-gray-400 block mb-1">End Time</span>
                                                            <input
                                                                type="time"
                                                                value={editEndTime}
                                                                onChange={(e) => setEditEndTime(e.target.value)}
                                                                className={`w-full p-2 rounded-lg border text-sm ${
                                                                    isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                }`}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] text-gray-400 block mb-1">Work Details</span>
                                                        <textarea
                                                            rows={2}
                                                            value={editWorkDetails}
                                                            onChange={(e) => setEditWorkDetails(e.target.value)}
                                                            className={`w-full p-2 rounded-lg border text-sm ${
                                                                isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                            }`}
                                                        />
                                                    </div>

                                                    <div>
                                                        <span className="text-[10px] text-gray-400 block mb-1">Completed Tasks</span>
                                                        <textarea
                                                            rows={2}
                                                            value={editCompletedWork}
                                                            onChange={(e) => setEditCompletedWork(e.target.value)}
                                                            className={`w-full p-2 rounded-lg border text-sm ${
                                                                isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                            }`}
                                                        />
                                                    </div>

                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <span className="text-[10px] text-gray-400 block mb-1">Status</span>
                                                            <select
                                                                value={editStatus}
                                                                onChange={(e) => setEditStatus(e.target.value)}
                                                                className={`p-1.5 rounded border text-xs ${
                                                                    isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                }`}
                                                            >
                                                                <option value="Completed">Completed</option>
                                                                <option value="In Progress">In Progress</option>
                                                            </select>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setEditingActivityId(null)}
                                                                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold rounded-lg transition"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateActivity(act._id)}
                                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                                                            >
                                                                Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* View mode activity card */
                                                <div className={`p-4 rounded-2xl border transition duration-200 group-hover:shadow-md ${
                                                    isDarkMode 
                                                        ? "bg-[#1f252d]/40 border-gray-800/80 group-hover:border-gray-700" 
                                                        : "bg-slate-50/50 border-slate-200 group-hover:border-slate-300"
                                                }`}>
                                                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-extrabold tracking-wide uppercase px-2 py-0.5 rounded-md ${
                                                                isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                                                            }`}>
                                                                {act.time}
                                                            </span>

                                                            {/* Status badge toggler */}
                                                            <button
                                                                onClick={() => toggleActivityStatus(act, act.status === "Completed" ? "In Progress" : "Completed")}
                                                                title="Click to toggle status"
                                                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                                                                    act.status === "Completed"
                                                                        ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                                                        : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                                                }`}
                                                            >
                                                                <span className={`w-1.5 h-1.5 rounded-full ${act.status === "Completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                                {act.status}
                                                            </button>
                                                        </div>

                                                        {/* Edit/Delete controls */}
                                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <button
                                                                onClick={() => startEdit(act)}
                                                                title="Edit Log"
                                                                className={`p-1.5 rounded-lg text-xs transition ${
                                                                    isDarkMode ? "hover:bg-gray-800 text-gray-400 hover:text-white" : "hover:bg-slate-200 text-gray-500 hover:text-slate-900"
                                                                }`}
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteActivity(act._id)}
                                                                title="Delete Log"
                                                                className={`p-1.5 rounded-lg text-xs transition ${
                                                                    isDarkMode ? "hover:bg-red-950/30 text-gray-400 hover:text-red-400" : "hover:bg-red-550/10 text-gray-500 hover:text-red-500"
                                                                }`}
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div>
                                                            <h4 className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Work Description</h4>
                                                            <p className={`text-sm leading-relaxed ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>{act.workDetails}</p>
                                                        </div>

                                                        {act.completedWork && (
                                                            <div className={`p-2.5 rounded-xl border border-dashed ${
                                                                isDarkMode ? "bg-emerald-950/5 border-emerald-900/30" : "bg-emerald-50/20 border-emerald-200"
                                                            }`}>
                                                                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold mb-0.5">
                                                                    <FaCheckCircle />
                                                                    <span>Completed Output / Milestone</span>
                                                                </div>
                                                                <p className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>{act.completedWork}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {!loading && activeTab === "deptBoard" && (
                <div>
                    {/* Filters dashboard panel */}
                    <div className={`p-5 rounded-2xl border mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between ${
                        isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter:</span>
                            <div className="flex flex-wrap gap-1">
                                {roles.map(roleKey => (
                                    <button
                                        key={roleKey}
                                        onClick={() => handleFilterChange(roleKey)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                                            selectedDept === roleKey
                                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                                : (isDarkMode 
                                                    ? "bg-gray-800 text-gray-400 hover:text-white" 
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200")
                                        }`}
                                    >
                                        {rolesMap[roleKey]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search field */}
                        <div className="relative flex-1 md:max-w-xs">
                            <FaSearch className="absolute left-3.5 top-3.5 text-gray-500 text-sm" />
                            <input
                                type="text"
                                placeholder="Search employee by name..."
                                value={searchEmployee}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                                    isDarkMode 
                                        ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500" 
                                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-gray-400"
                                }`}
                            />
                        </div>
                    </div>

                    {/* Employee Logs Grid */}
                    {boardLogs.length === 0 ? (
                        <div className="text-center py-16 flex flex-col items-center justify-center">
                            <FaBuilding className={`text-5xl mb-3 ${isDarkMode ? "text-gray-700" : "text-gray-300"}`} />
                            <p className="text-gray-500 text-sm font-medium">No tracking logs found on the board for today.</p>
                            <p className="text-xs text-gray-500 mt-1">Try changing the filters or selecting another date.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {boardLogs.map((log) => {
                                const completedCount = log.activities.filter(a => a.status === "Completed").length;
                                const pendingCount = log.activities.filter(a => a.status === "In Progress").length;

                                return (
                                    <div 
                                        key={log._id}
                                        className={`p-6 rounded-2xl border transition duration-200 hover:shadow-md ${
                                            isDarkMode 
                                                ? "bg-[#1a1f24] border-gray-800/80 hover:border-gray-700" 
                                                : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                                        }`}
                                    >
                                        {/* Employee Header */}
                                        <div className="flex items-start justify-between mb-4 border-b border-gray-800/10 pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white font-bold flex items-center justify-center shadow">
                                                    {log.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm leading-tight">{log.userName}</h4>
                                                    <p className={`text-[10px] ${isDarkMode ? "text-indigo-400" : "text-indigo-600"} font-black uppercase tracking-wider`}>
                                                        {getDisplayRoleName(log.user?.role || log.department)}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500">
                                                        {log.user?.designation || "Employee"}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Work ratios */}
                                            <div className="flex gap-2">
                                                {completedCount === 0 && pendingCount === 0 && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                        No Entry
                                                    </span>
                                                )}
                                                {completedCount > 0 && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                                                        <FaCheck className="text-[7px]" />
                                                        {completedCount} Done
                                                    </span>
                                                )}
                                                {pendingCount > 0 && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        {pendingCount} Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Employee Activities today */}
                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                                            {log.activities.length === 0 ? (
                                                <div className={`p-4 rounded-xl border border-dashed text-center flex flex-col items-center justify-center ${
                                                    isDarkMode 
                                                        ? "bg-[#1f252d]/30 border-gray-800 text-gray-500" 
                                                        : "bg-slate-50 border-slate-200 text-gray-400"
                                                }`}>
                                                    <FaClock className="text-xl mb-1 text-gray-500/50" />
                                                    <p className="text-xs font-semibold">Pending Log Submission</p>
                                                    <p className="text-[10px] opacity-75">This employee hasn't logged any activities yet today.</p>
                                                </div>
                                            ) : (
                                                log.activities.map((act) => (
                                                    <div 
                                                        key={act._id} 
                                                        className={`p-3 rounded-xl border ${
                                                            isDarkMode 
                                                                ? "bg-[#1f252d]/60 border-gray-800" 
                                                                : "bg-slate-50 border-slate-100"
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                                isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                                                            }`}>
                                                                {act.time}
                                                            </span>
                                                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                                act.status === "Completed"
                                                                    ? "bg-emerald-500/10 text-emerald-500"
                                                                    : "bg-amber-500/10 text-amber-500"
                                                            }`}>
                                                                {act.status}
                                                            </span>
                                                        </div>

                                                        <p className={`text-xs leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                            {act.workDetails}
                                                        </p>

                                                        {act.completedWork && (
                                                            <div className={`mt-2 p-2 rounded border border-dashed text-[11px] ${
                                                                isDarkMode 
                                                                    ? "bg-emerald-950/5 border-emerald-900/30 text-emerald-400" 
                                                                    : "bg-emerald-50/20 border-emerald-200 text-emerald-700"
                                                            }`}>
                                                                <div className="font-extrabold flex items-center gap-1 mb-0.5 text-[9px] uppercase tracking-wider">
                                                                    <FaCheckCircle /> Completed Work
                                                                </div>
                                                                <p className="opacity-90">{act.completedWork}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            </div>
        </Layout>
    );
};

export default DailyTrackingLog;
