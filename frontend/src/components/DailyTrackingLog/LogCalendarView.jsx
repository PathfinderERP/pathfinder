import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    FaCalendarAlt,
    FaPlus,
    FaChevronLeft,
    FaChevronRight,
    FaClock,
    FaMapMarkerAlt,
    FaEdit,
    FaTrash,
    FaCheck,
    FaSpinner,
    FaBuilding,
    FaList,
    FaThLarge,
    FaCalendarWeek,
    FaTimes,
    FaExclamationCircle,
    FaTag,
    FaFilter
} from "react-icons/fa";

const COLOR_PALETTE = [
    { name: "Indigo", hex: "#6366f1", bg: "bg-indigo-500" },
    { name: "Emerald", hex: "#10b981", bg: "bg-emerald-500" },
    { name: "Amber", hex: "#f59e0b", bg: "bg-amber-500" },
    { name: "Rose", hex: "#ef4444", bg: "bg-rose-500" },
    { name: "Purple", hex: "#8b5cf6", bg: "bg-purple-500" },
    { name: "Teal", hex: "#14b8a6", bg: "bg-teal-500" },
    { name: "Sky", hex: "#0284c7", bg: "bg-sky-500" }
];

const ACTIVITY_TYPES = [
    "Meeting",
    "Field Visit",
    "Seminar",
    "Audit",
    "School Visit",
    "Training",
    "Documentation",
    "Call Session",
    "Other"
];

const formatDateToIsoString = (d) => {
    const dateObj = new Date(d);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const LogCalendarView = ({ isDarkMode, availableCentres = [] }) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem("token");

    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [viewMode, setViewMode] = useState("month"); // "month" | "week" | "agenda"

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLogId, setEditingLogId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form fields
    const [title, setTitle] = useState("");
    const [activityType, setActivityType] = useState("Meeting");
    const [startDate, setStartDate] = useState(formatDateToIsoString(new Date()));
    const [endDate, setEndDate] = useState(formatDateToIsoString(new Date()));
    const [time, setTime] = useState("");
    const [place, setPlace] = useState("");
    const [selectedCentre, setSelectedCentre] = useState("");
    const [priority, setPriority] = useState("Medium");
    const [status, setStatus] = useState("Upcoming");
    const [color, setColor] = useState("#6366f1");
    const [notes, setNotes] = useState("");

    // Details Drawer / Modal
    const [selectedLogForDetails, setSelectedLogForDetails] = useState(null);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Fetch user's logs for the calendar
    const fetchMyLogs = async () => {
        setLoading(true);
        try {
            // Fetch logs for current month view +/- 15 days window
            const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
            const endOfMonth = new Date(currentYear, currentMonth + 2, 0);

            const startStr = formatDateToIsoString(startOfMonth);
            const endStr = formatDateToIsoString(endOfMonth);

            const res = await fetch(`${apiUrl}/log-calendar/my-logs?startDate=${startStr}&endDate=${endStr}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setLogs(data.logs || []);
            } else {
                toast.error(data.message || "Failed to load log calendar.");
            }
        } catch (err) {
            console.error("Error fetching log calendar:", err);
            toast.error("Failed to fetch log calendar.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyLogs();
    }, [currentYear, currentMonth]);

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(prev => prev - 1);
        } else {
            setCurrentMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(prev => prev + 1);
        } else {
            setCurrentMonth(prev => prev + 1);
        }
    };

    const handleToday = () => {
        const today = new Date();
        setCurrentYear(today.getFullYear());
        setCurrentMonth(today.getMonth());
    };

    const openCreateModal = (prefilledStart = null, prefilledEnd = null) => {
        const todayStr = formatDateToIsoString(new Date());
        setEditingLogId(null);
        setTitle("");
        setActivityType("Meeting");
        setStartDate(prefilledStart || todayStr);
        setEndDate(prefilledEnd || prefilledStart || todayStr);
        setTime("10:00 AM - 01:00 PM");
        setPlace("");
        setSelectedCentre("");
        setPriority("Medium");
        setStatus("Upcoming");
        setColor("#6366f1");
        setNotes("");
        setIsModalOpen(true);
    };

    const openEditModal = (log) => {
        setEditingLogId(log._id);
        setTitle(log.title || "");
        setActivityType(log.activityType || "Meeting");
        setStartDate(formatDateToIsoString(log.startDate));
        setEndDate(formatDateToIsoString(log.endDate));
        setTime(log.time || "");
        setPlace(log.place || "");
        setSelectedCentre(log.centre?._id || log.centre || "");
        setPriority(log.priority || "Medium");
        setStatus(log.status || "Upcoming");
        setColor(log.color || "#6366f1");
        setNotes(log.notes || "");
        setSelectedLogForDetails(null);
        setIsModalOpen(true);
    };

    const handleQuickPreset = (preset) => {
        const today = new Date();
        let s = new Date(today);
        let e = new Date(today);

        if (preset === "today") {
            // Already today
        } else if (preset === "tomorrow") {
            s.setDate(today.getDate() + 1);
            e.setDate(today.getDate() + 1);
        } else if (preset === "next3days") {
            e.setDate(today.getDate() + 2);
        } else if (preset === "thisweek") {
            const dayOfWeek = today.getDay();
            s.setDate(today.getDate() - dayOfWeek);
            e.setDate(today.getDate() + (6 - dayOfWeek));
        } else if (preset === "next7days") {
            e.setDate(today.getDate() + 6);
        }

        setStartDate(formatDateToIsoString(s));
        setEndDate(formatDateToIsoString(e));
    };

    const handleSubmitLog = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Please enter a title/details for the upcoming log.");
            return;
        }

        if (new Date(endDate) < new Date(startDate)) {
            toast.error("End Date cannot be earlier than Start Date.");
            return;
        }

        setIsSubmitting(true);
        try {
            const centreObj = availableCentres.find(c => c._id === selectedCentre);
            const payload = {
                title: title.trim(),
                activityType,
                startDate,
                endDate,
                time,
                place: place.trim(),
                priority,
                status,
                notes: notes.trim(),
                color,
                centre: selectedCentre || null,
                centreName: centreObj ? (centreObj.centreName || "") : ""
            };

            const url = editingLogId
                ? `${apiUrl}/log-calendar/${editingLogId}`
                : `${apiUrl}/log-calendar`;
            const method = editingLogId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(editingLogId ? "Upcoming log updated!" : "Upcoming log scheduled successfully!");
                setIsModalOpen(false);
                fetchMyLogs();
            } else {
                toast.error(data.message || "Failed to save log.");
            }
        } catch (err) {
            console.error("Error saving calendar log:", err);
            toast.error("Failed to save calendar log.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLog = async (logId) => {
        if (!window.confirm("Are you sure you want to delete this upcoming log entry?")) return;

        try {
            const res = await fetch(`${apiUrl}/log-calendar/${logId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Log deleted.");
                setSelectedLogForDetails(null);
                fetchMyLogs();
            } else {
                toast.error(data.message || "Failed to delete log.");
            }
        } catch (err) {
            console.error("Error deleting log:", err);
            toast.error("Failed to delete log.");
        }
    };

    const handleStatusToggle = async (log, newStatus) => {
        try {
            const res = await fetch(`${apiUrl}/log-calendar/${log._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                toast.success(`Status updated to ${newStatus}`);
                fetchMyLogs();
                if (selectedLogForDetails) {
                    setSelectedLogForDetails(prev => prev ? { ...prev, status: newStatus } : null);
                }
            } else {
                toast.error("Failed to update status.");
            }
        } catch (err) {
            console.error("Error updating status:", err);
            toast.error("Failed to update status.");
        }
    };

    // Calculate Month Grid cells
    const getCalendarGridCells = () => {
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

        const startingDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        const cells = [];

        // Previous month padding days
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const dateObj = new Date(currentYear, currentMonth - 1, day);
            cells.push({
                day,
                dateStr: formatDateToIsoString(dateObj),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(currentYear, currentMonth, day);
            cells.push({
                day,
                dateStr: formatDateToIsoString(dateObj),
                isCurrentMonth: true
            });
        }

        // Next month padding days to fill 35 or 42 grid cells
        const totalSoFar = cells.length;
        const totalNeeded = totalSoFar > 35 ? 42 : 35;
        for (let day = 1; day <= totalNeeded - totalSoFar; day++) {
            const dateObj = new Date(currentYear, currentMonth + 1, day);
            cells.push({
                day,
                dateStr: formatDateToIsoString(dateObj),
                isCurrentMonth: false
            });
        }

        return cells;
    };

    // Helper: Find logs active on a specific cell date
    const getLogsForDate = (dateStr) => {
        const targetDate = new Date(dateStr);
        targetDate.setHours(12, 0, 0, 0);

        return logs.filter(log => {
            const s = new Date(log.startDate);
            s.setHours(0, 0, 0, 0);
            const e = new Date(log.endDate);
            e.setHours(23, 59, 59, 999);
            return targetDate >= s && targetDate <= e;
        });
    };

    // Quick Stats
    const totalUpcoming = logs.filter(l => l.status === "Upcoming").length;
    const totalInProgress = logs.filter(l => l.status === "In Progress").length;
    const totalCompleted = logs.filter(l => l.status === "Completed").length;

    return (
        <div className="space-y-6">
            {/* Top Bar Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                }`}>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">UPCOMING LOGS</p>
                        <h4 className="text-2xl font-black">{totalUpcoming}</h4>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <FaCalendarAlt className="text-xl" />
                    </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                }`}>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">IN PROGRESS</p>
                        <h4 className="text-2xl font-black text-amber-500">{totalInProgress}</h4>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                        <FaClock className="text-xl" />
                    </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                }`}>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500">COMPLETED</p>
                        <h4 className="text-2xl font-black text-emerald-500">{totalCompleted}</h4>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <FaCheck className="text-xl" />
                    </div>
                </div>
            </div>

            {/* Calendar Controls & Navigation Bar */}
            <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
            }`}>
                {/* Month navigation */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToday}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                            isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-white" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800"
                        }`}
                    >
                        Today
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevMonth}
                            className={`p-2 rounded-xl border transition ${
                                isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-white" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800"
                            }`}
                        >
                            <FaChevronLeft className="text-xs" />
                        </button>
                        <button
                            onClick={handleNextMonth}
                            className={`p-2 rounded-xl border transition ${
                                isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-white" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800"
                            }`}
                        >
                            <FaChevronRight className="text-xs" />
                        </button>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">
                        {monthNames[currentMonth]} {currentYear}
                    </h3>
                </div>

                {/* View switcher & Action button */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className={`flex items-center p-1 rounded-xl border ${
                        isDarkMode ? "bg-gray-900 border-gray-800" : "bg-slate-100 border-slate-200"
                    }`}>
                        <button
                            onClick={() => setViewMode("month")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                viewMode === "month"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <FaThLarge className="text-xs" /> Month
                        </button>
                        <button
                            onClick={() => setViewMode("week")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                viewMode === "week"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <FaCalendarWeek className="text-xs" /> Week
                        </button>
                        <button
                            onClick={() => setViewMode("agenda")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                viewMode === "agenda"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            <FaList className="text-xs" /> Agenda
                        </button>
                    </div>

                    <button
                        onClick={() => openCreateModal()}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition active:scale-95"
                    >
                        <FaPlus /> Fill Upcoming Log
                    </button>
                </div>
            </div>

            {/* MAIN CALENDAR DISPLAY */}
            {loading ? (
                <div className={`p-16 rounded-2xl border text-center flex flex-col items-center justify-center ${
                    isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200"
                }`}>
                    <FaSpinner className="animate-spin text-3xl text-indigo-500 mb-3" />
                    <p className="text-gray-500 font-medium text-sm">Loading log calendar entries...</p>
                </div>
            ) : viewMode === "month" ? (
                /* GOOGLE CALENDAR MONTH GRID VIEW */
                <div className={`rounded-2xl border overflow-hidden ${
                    isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                }`}>
                    {/* Weekday headers */}
                    <div className={`grid grid-cols-7 text-center font-bold text-xs border-b ${
                        isDarkMode ? "bg-gray-900/60 border-gray-800 text-gray-400" : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                            <div key={day} className="py-3 uppercase tracking-wider text-[11px]">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Month cells grid */}
                    <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-200 dark:divide-gray-800">
                        {getCalendarGridCells().map((cell, idx) => {
                            const dateLogs = getLogsForDate(cell.dateStr);
                            const isToday = cell.dateStr === formatDateToIsoString(new Date());

                            return (
                                <div
                                    key={idx}
                                    onClick={() => openCreateModal(cell.dateStr)}
                                    className={`min-h-[110px] p-2 transition group hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 cursor-pointer flex flex-col justify-between ${
                                        !cell.isCurrentMonth
                                            ? (isDarkMode ? "bg-gray-900/40 text-gray-600" : "bg-slate-50/50 text-slate-400")
                                            : (isDarkMode ? "bg-[#1a1f24] text-white" : "bg-white text-gray-900")
                                    }`}
                                >
                                    {/* Cell header date */}
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                            isToday
                                                ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50"
                                                : cell.isCurrentMonth ? "font-semibold" : "opacity-40"
                                        }`}>
                                            {cell.day}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openCreateModal(cell.dateStr);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition text-[10px] bg-indigo-500/10 text-indigo-500 font-bold px-1.5 py-0.5 rounded hover:bg-indigo-500 hover:text-white"
                                            title="Add log for this date"
                                        >
                                            + Log
                                        </button>
                                    </div>

                                    {/* Event pills for cell */}
                                    <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] no-scrollbar">
                                        {dateLogs.map(log => {
                                            const isStart = formatDateToIsoString(log.startDate) === cell.dateStr;
                                            const isEnd = formatDateToIsoString(log.endDate) === cell.dateStr;
                                            const isMultiDay = formatDateToIsoString(log.startDate) !== formatDateToIsoString(log.endDate);

                                            return (
                                                <div
                                                    key={log._id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedLogForDetails(log);
                                                    }}
                                                    style={{ backgroundColor: log.color || "#6366f1" }}
                                                    className={`text-white text-[11px] px-2 py-1 font-semibold transition hover:brightness-110 shadow-sm cursor-pointer truncate flex items-center justify-between gap-1 ${
                                                        isMultiDay
                                                            ? (isStart ? "rounded-l-lg" : isEnd ? "rounded-r-lg" : "rounded-none opacity-90")
                                                            : "rounded-lg"
                                                    }`}
                                                    title={`${log.title} (${log.status})`}
                                                >
                                                    <div className="flex items-center gap-1 truncate">
                                                        {isStart && <span className="text-[9px] opacity-80 shrink-0">●</span>}
                                                        <span className="truncate">{log.title}</span>
                                                    </div>
                                                    {log.status === "Completed" && <FaCheck className="text-[9px] shrink-0" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : viewMode === "week" ? (
                /* WEEK VIEW */
                <div className={`p-6 rounded-2xl border ${
                    isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                }`}>
                    <h4 className="text-md font-bold mb-4 flex items-center gap-2">
                        <FaCalendarWeek className="text-indigo-500" />
                        Upcoming Logs for Current Month View
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {logs.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-gray-500">
                                No upcoming logs scheduled for this period.
                            </div>
                        ) : (
                            logs.map(log => (
                                <div
                                    key={log._id}
                                    onClick={() => setSelectedLogForDetails(log)}
                                    className={`p-4 rounded-xl border transition cursor-pointer hover:shadow-md ${
                                        isDarkMode ? "bg-gray-800/80 border-gray-700 hover:border-gray-600" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span
                                            style={{ backgroundColor: log.color || "#6366f1" }}
                                            className="text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                                        >
                                            {log.activityType || "Activity"}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                            log.status === "Completed"
                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                                : log.status === "In Progress"
                                                ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                                : "bg-indigo-500/10 text-indigo-500 border-indigo-500/30"
                                        }`}>
                                            {log.status}
                                        </span>
                                    </div>
                                    <h5 className="font-bold text-sm mb-1 line-clamp-1">{log.title}</h5>
                                    <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-2">
                                        <FaCalendarAlt className="text-indigo-500 text-[10px]" />
                                        {formatDateToIsoString(log.startDate)}
                                        {formatDateToIsoString(log.startDate) !== formatDateToIsoString(log.endDate) && (
                                            <span> to {formatDateToIsoString(log.endDate)}</span>
                                        )}
                                    </p>
                                    {log.place && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                                            <FaMapMarkerAlt className="text-rose-500 text-[10px]" />
                                            {log.place}
                                        </p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                /* AGENDA VIEW */
                <div className={`p-6 rounded-2xl border ${
                    isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                }`}>
                    <h4 className="text-md font-bold mb-4 flex items-center gap-2">
                        <FaList className="text-indigo-500" />
                        Upcoming Logs Agenda Timeline
                    </h4>
                    {logs.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            No upcoming logs scheduled. Click "+ Fill Upcoming Log" to schedule one.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map(log => {
                                const sStr = formatDateToIsoString(log.startDate);
                                const eStr = formatDateToIsoString(log.endDate);
                                const isMulti = sStr !== eStr;

                                return (
                                    <div
                                        key={log._id}
                                        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition ${
                                            isDarkMode ? "bg-gray-800/60 border-gray-700 hover:border-gray-600" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                style={{ backgroundColor: log.color || "#6366f1" }}
                                                className="w-3 h-12 rounded-full shrink-0 mt-1"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <h5 className="font-bold text-base">{log.title}</h5>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        log.priority === "High"
                                                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                                            : "bg-slate-500/10 text-slate-500"
                                                    }`}>
                                                        {log.priority} Priority
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                                                    <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                                                        <FaCalendarAlt />
                                                        {sStr} {isMulti && ` → ${eStr}`}
                                                    </span>
                                                    {log.time && (
                                                        <span className="flex items-center gap-1">
                                                            <FaClock /> {log.time}
                                                        </span>
                                                    )}
                                                    {log.place && (
                                                        <span className="flex items-center gap-1">
                                                            <FaMapMarkerAlt className="text-rose-500" /> {log.place}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-center">
                                            <button
                                                onClick={() => handleStatusToggle(log, log.status === "Completed" ? "Upcoming" : "Completed")}
                                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                                                    log.status === "Completed"
                                                        ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                                                        : "bg-gray-700/40 text-gray-300 border-gray-600 hover:bg-gray-700"
                                                }`}
                                            >
                                                <FaCheck className="text-xs" /> {log.status}
                                            </button>
                                            <button
                                                onClick={() => openEditModal(log)}
                                                className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition"
                                                title="Edit log"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLog(log._id)}
                                                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                                                title="Delete log"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* CREATE / EDIT UPCOMING LOG MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className={`w-full max-w-xl p-6 rounded-3xl border shadow-2xl overflow-y-auto max-h-[90vh] ${
                        isDarkMode ? "bg-[#1a1f24] border-gray-800 text-white" : "bg-white border-slate-200 text-gray-900"
                    }`}>
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <FaCalendarAlt className="text-indigo-500" />
                                {editingLogId ? "Edit Upcoming Log" : "Fill Upcoming Log (Date Range)"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="mb-4">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                                QUICK DATE PRESETS
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: "Today", value: "today" },
                                    { label: "Tomorrow", value: "tomorrow" },
                                    { label: "Next 3 Days", value: "next3days" },
                                    { label: "This Week", value: "thisweek" },
                                    { label: "Next 7 Days", value: "next7days" }
                                ].map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => handleQuickPreset(p.value)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                            isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-indigo-600 hover:text-white" : "bg-slate-100 border-slate-200 hover:bg-indigo-600 hover:text-white"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSubmitLog} className="space-y-4">
                            {/* Date Range Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/5">
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-indigo-400">
                                        START DATE *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-200 text-gray-900"
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-indigo-400">
                                        END DATE *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-200 text-gray-900"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Title & Activity Type */}
                            <div>
                                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                    WORK DETAILS / ACTIVITY TITLE *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Zonal School Audit & Seminar Session"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                        isDarkMode ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500" : "bg-slate-50 border-slate-200 text-gray-900"
                                    }`}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                        ACTIVITY TYPE
                                    </label>
                                    <select
                                        value={activityType}
                                        onChange={(e) => setActivityType(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
                                        }`}
                                    >
                                        {ACTIVITY_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                        TIME / DURATION
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 10:00 AM - 02:00 PM"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-slate-50 border-slate-200 text-gray-900"
                                        }`}
                                    />
                                </div>
                            </div>

                            {/* Location & Centre */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                        PLACE / SCHOOL / VENUE
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. St. Xavier's School"
                                        value={place}
                                        onChange={(e) => setPlace(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-slate-50 border-slate-200 text-gray-900"
                                        }`}
                                    />
                                </div>

                                {availableCentres.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                            CENTRE
                                        </label>
                                        <select
                                            value={selectedCentre}
                                            onChange={(e) => setSelectedCentre(e.target.value)}
                                            className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                                isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
                                            }`}
                                        >
                                            <option value="">Select Centre</option>
                                            {availableCentres.map(c => (
                                                <option key={c._id} value={c._id}>
                                                    {c.centreName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Priority, Status, Color Tag */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                        PRIORITY
                                    </label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
                                        }`}
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                        STATUS
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                            isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-gray-900"
                                        }`}
                                    >
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                        CALENDAR COLOR
                                    </label>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        {COLOR_PALETTE.map(c => (
                                            <button
                                                key={c.hex}
                                                type="button"
                                                onClick={() => setColor(c.hex)}
                                                style={{ backgroundColor: c.hex }}
                                                className={`w-6 h-6 rounded-full transition transform hover:scale-110 ${
                                                    color === c.hex ? "ring-2 ring-white ring-offset-2 scale-110" : ""
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold mb-1 uppercase tracking-wider text-gray-400">
                                    NOTES / DESCRIPTION
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Add any specific instructions or requirements..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className={`w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                        isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-slate-50 border-slate-200 text-gray-900"
                                    }`}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                            >
                                {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                                {editingLogId ? "Update Upcoming Log" : "Save Upcoming Log"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* EVENT DETAILS MODAL */}
            {selectedLogForDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl ${
                        isDarkMode ? "bg-[#1a1f24] border-gray-800 text-white" : "bg-white border-slate-200 text-gray-900"
                    }`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <div
                                    style={{ backgroundColor: selectedLogForDetails.color || "#6366f1" }}
                                    className="w-3 h-10 rounded-full"
                                />
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                                        {selectedLogForDetails.activityType || "Upcoming Activity"}
                                    </span>
                                    <h3 className="text-lg font-bold leading-tight">{selectedLogForDetails.title}</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLogForDetails(null)}
                                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <div className="space-y-3 my-4 p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 font-bold">DATE RANGE:</span>
                                <span className="font-semibold text-indigo-400">
                                    {formatDateToIsoString(selectedLogForDetails.startDate)}
                                    {formatDateToIsoString(selectedLogForDetails.startDate) !== formatDateToIsoString(selectedLogForDetails.endDate) && (
                                        <span> → {formatDateToIsoString(selectedLogForDetails.endDate)}</span>
                                    )}
                                </span>
                            </div>

                            {selectedLogForDetails.time && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 font-bold">TIME:</span>
                                    <span>{selectedLogForDetails.time}</span>
                                </div>
                            )}

                            {selectedLogForDetails.place && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400 font-bold">LOCATION:</span>
                                    <span>{selectedLogForDetails.place}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 font-bold">PRIORITY:</span>
                                <span className={`font-bold px-2 py-0.5 rounded ${
                                    selectedLogForDetails.priority === "High" ? "bg-rose-500/10 text-rose-500" : "bg-indigo-500/10 text-indigo-500"
                                }`}>
                                    {selectedLogForDetails.priority}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 font-bold">STATUS:</span>
                                <span className={`font-bold px-2 py-0.5 rounded ${
                                    selectedLogForDetails.status === "Completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                }`}>
                                    {selectedLogForDetails.status}
                                </span>
                            </div>

                            {selectedLogForDetails.notes && (
                                <div className="pt-2 border-t border-gray-500/10">
                                    <span className="text-gray-400 font-bold block mb-1">NOTES:</span>
                                    <p className="italic text-gray-300">{selectedLogForDetails.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-6">
                            <button
                                onClick={() => handleStatusToggle(
                                    selectedLogForDetails,
                                    selectedLogForDetails.status === "Completed" ? "Upcoming" : "Completed"
                                )}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                                    selectedLogForDetails.status === "Completed"
                                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                }`}
                            >
                                <FaCheck /> {selectedLogForDetails.status === "Completed" ? "Mark Upcoming" : "Mark Completed"}
                            </button>
                            <button
                                onClick={() => openEditModal(selectedLogForDetails)}
                                className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition"
                                title="Edit"
                            >
                                <FaEdit />
                            </button>
                            <button
                                onClick={() => handleDeleteLog(selectedLogForDetails._id)}
                                className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition"
                                title="Delete"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogCalendarView;
