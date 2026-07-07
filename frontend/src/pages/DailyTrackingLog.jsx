import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
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
    FaTasks,
    FaFileExcel
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import Layout from "../components/Layout";
import CustomMultiSelect from "../components/common/CustomMultiSelect";
import { hasPermission } from "../config/permissions";

const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const DailyTrackingLog = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    const apiUrl = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem("token");

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const tabParam = queryParams.get("tab");

    // State management
    const [activeTab, setActiveTab] = useState(tabParam === "deptBoard" ? "deptBoard" : "myLog"); // "myLog" | "deptBoard"

    useEffect(() => {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const isSuperAdminUser = Array.isArray(currentUser.role)
            ? currentUser.role.includes('superAdmin') || currentUser.role.includes('superadmin')
            : currentUser.role === 'superAdmin' || currentUser.role === 'superadmin';

        const gp = currentUser?.granularPermissions;
        const hasMyLogAccess = isSuperAdminUser || !!(gp?.dailyTrackingLog?.myDailyLog);
        const hasLogTrackingAccess = isSuperAdminUser || !!(gp?.dailyTrackingLog?.logTracking);

        if (tabParam === "deptBoard") {
            if (!hasLogTrackingAccess) {
                toast.error("Access denied. You do not have permission to view Log Tracking.");
                if (hasMyLogAccess) {
                    navigate("/daily-tracking-log?tab=myLog");
                } else {
                    navigate("/dashboard");
                }
            } else {
                setActiveTab("deptBoard");
            }
        } else {
            // Default: myLog tab
            if (!hasMyLogAccess) {
                toast.error("Access denied. You do not have permission to view My Daily Log.");
                if (hasLogTrackingAccess) {
                    navigate("/daily-tracking-log?tab=deptBoard");
                } else {
                    navigate("/dashboard");
                }
            } else {
                setActiveTab("myLog");
            }
        }
    }, [tabParam, navigate]);
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [loggedDates, setLoggedDates] = useState([]);

    const fetchLoggedDates = async (year, month) => {
        try {
            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month + 1, 0).getDate();
            const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
            const res = await fetch(`${apiUrl}/daily-tracking-logs/my-log-dates?startDate=${startDate}&endDate=${endDate}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setLoggedDates(data.dates || []);
            }
        } catch (err) {
            console.error("Failed to fetch log dates", err);
        }
    };

    useEffect(() => {
        if (activeTab === "myLog") {
            fetchLoggedDates(currentYear, currentMonth);
        }
    }, [activeTab, currentYear, currentMonth]);

    useEffect(() => {
        if (selectedDate) {
            const d = new Date(selectedDate);
            if (!isNaN(d.getTime())) {
                setCurrentYear(d.getFullYear());
                setCurrentMonth(d.getMonth());
            }
        }
    }, [selectedDate]);

    const [myActivities, setMyActivities] = useState([]);
    const [myLogId, setMyLogId] = useState(null);
    const [boardLogs, setBoardLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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

    const handleDateClick = (cell) => {
        setSelectedDate(cell.dateStr);
        if (!cell.isCurrentMonth) {
            const d = new Date(cell.dateStr);
            setCurrentYear(d.getFullYear());
            setCurrentMonth(d.getMonth());
        }
    };

    const getCalendarCells = () => {
        const cells = [];
        const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevMonthTotalDays = new Date(currentYear, currentMonth, 0).getDate();

        // Previous month's trailing days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const day = prevMonthTotalDays - i;
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            cells.push({
                day,
                isCurrentMonth: false,
                dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            });
        }

        // Current month's days
        for (let day = 1; day <= totalDays; day++) {
            cells.push({
                day,
                isCurrentMonth: true,
                dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            });
        }

        // Next month's leading days to fill grid (usually 42 cells)
        const remaining = 42 - cells.length;
        for (let day = 1; day <= remaining; day++) {
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            cells.push({
                day,
                isCurrentMonth: false,
                dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            });
        }

        return cells;
    };

    // Form states
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:00");
    const [workDetails, setWorkDetails] = useState("");
    const [completedWork, setCompletedWork] = useState("");
    const [status, setStatus] = useState("Completed");
    const [selectedEntryCentre, setSelectedEntryCentre] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Board filters
    const [selectedDept, setSelectedDept] = useState([]);
    const [selectedCentre, setSelectedCentre] = useState([]);
    const [searchEmployee, setSearchEmployee] = useState("");

    // Get current user's centres
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isSuperAdmin = Array.isArray(currentUser.role)
        ? currentUser.role.includes('superAdmin') || currentUser.role.includes('superadmin')
        : currentUser.role === 'superAdmin' || currentUser.role === 'superadmin';

    const isToday = selectedDate === getTodayDateString();
    const isPreviousDate = (dateStr) => {
        const todayStr = getTodayDateString();
        return dateStr < todayStr;
    };
    const canModify = isSuperAdmin || !isPreviousDate(selectedDate);
    const [availableCentres, setAvailableCentres] = useState([]);
    const [availableRoles, setAvailableRoles] = useState([]);

    // Fetch distinct roles from all users
    useEffect(() => {
        const fetchRoles = async () => {
            const defaultRoles = [
                'superAdmin',
                'admin',
                'teacher',
                'telecaller',
                'counsellor',
                'marketing',
                'centerIncharge',
                'zonalManager',
                'HOD',
                'accounts',
                'coordinator',
                'digital',
                'assistantZonalManager',
                'assistantCenterIncharge',
                'supportStaff'
            ];
            try {
                const res = await fetch(`${apiUrl}/superAdmin/getAllUsers`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok && data && Array.isArray(data.users)) {
                    const distinctRoles = [...new Set([
                        ...defaultRoles,
                        ...data.users
                            .map(u => u.role)
                            .filter(Boolean)
                            .map(r => Array.isArray(r) ? r : [r])
                            .flat()
                    ])];
                    setAvailableRoles(distinctRoles);
                } else {
                    setAvailableRoles(defaultRoles);
                }
            } catch (err) {
                console.error('Failed to fetch roles:', err);
                setAvailableRoles(defaultRoles);
            }
        };
        fetchRoles();
    }, [apiUrl, token]);

    useEffect(() => {
        const fetchAllCentres = async () => {
            try {
                const res = await fetch(`${apiUrl}/centre?status=active&fetchAll=true`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setAvailableCentres(data);
                }
            } catch (err) {
                console.error("Failed to fetch all centres:", err);
            }
        };

        const initCentres = async () => {
            if (isSuperAdmin) {
                await fetchAllCentres();
            } else {
                let freshUser = currentUser;
                try {
                    const res = await fetch(`${apiUrl}/profile/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (res.ok && data.user) {
                        freshUser = data.user;
                        localStorage.setItem("user", JSON.stringify(freshUser));
                    }
                } catch (err) {
                    console.error("Failed to fetch fresh user profile:", err);
                }

                const userCentres = freshUser.centres || [];
                if (freshUser.centre && !userCentres.some(c => c._id === (freshUser.centre._id || freshUser.centre))) {
                    userCentres.push(typeof freshUser.centre === 'object' ? freshUser.centre : { _id: freshUser.centre, centreName: 'Primary Centre' });
                }
                setAvailableCentres(userCentres);
            }
        };

        initCentres();
    }, [apiUrl, token, isSuperAdmin]);

    useEffect(() => {
        if (availableCentres.length > 0 && !selectedEntryCentre) {
            const userObj = JSON.parse(localStorage.getItem("user") || "{}");
            const primaryId = userObj.centre?._id || userObj.centre;
            const hasPrimary = availableCentres.some(c => c._id === primaryId);
            if (hasPrimary) {
                setSelectedEntryCentre(primaryId);
            } else {
                setSelectedEntryCentre(availableCentres[0]._id);
            }
        }
    }, [availableCentres, selectedEntryCentre]);

    // Editing states
    const [editingActivityId, setEditingActivityId] = useState(null);
    const [editStartTime, setEditStartTime] = useState("");
    const [editEndTime, setEditEndTime] = useState("");
    const [editWorkDetails, setEditWorkDetails] = useState("");
    const [editCompletedWork, setEditCompletedWork] = useState("");
    const [editStatus, setEditStatus] = useState("Completed");
    const [editCentre, setEditCentre] = useState("");

    const getDisplayRoleName = (role) => {
        if (!role) return "Employee";
        const normalized = role.toLowerCase();
        if (normalized === "superadmin") return "SuperAdmin";
        if (normalized === "admin") return "Admin";
        if (normalized === "teacher") return "Teacher";
        if (normalized === "telecaller" || normalized === "centralizedtelecaller") return "Telecaller";
        if (normalized === "counsellor") return "Counsellor";
        if (normalized === "marketing") return "Marketing";
        if (normalized === "centerincharge" || normalized === "centreincharge") return "Center Incharge";
        if (normalized === "zonalmanager") return "Zonal Manager";
        if (normalized === "hod") return "HOD";
        if (normalized === "accounts") return "Accounts";
        if (normalized === "coordinator") return "Coordinator";
        if (normalized === "digital") return "Digital";
        if (normalized === "assistantzonalmanager") return "Assistant Zonal Manager";
        if (normalized === "assistantcenterincharge") return "Assistant Center Incharge";
        if (normalized === "supportstaff") return "Support Staff";
        if (normalized === "hr") return "HR";

        if (normalized.includes("admin")) {
            if (normalized.includes("super")) return "SuperAdmin";
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
        if (normalized.includes("zonal") && normalized.includes("manager")) return "Zonal Manager";
        return role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    };

    const rolesOptions = availableRoles
        .map(role => ({
            value: role,
            label: getDisplayRoleName(role)
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

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
    const fetchBoardLogs = async (date, role, name, centreId) => {
        setLoading(true);
        try {
            let url = `${apiUrl}/daily-tracking-logs/board?date=${date}`;

            // Handle multi-select roles
            let rolesParam = "";
            if (role) {
                if (Array.isArray(role)) {
                    rolesParam = role.map(r => r.value).join(",");
                } else if (role !== "All") {
                    rolesParam = role;
                }
            }
            if (rolesParam) url += `&role=${rolesParam}`;

            if (name) url += `&employeeName=${encodeURIComponent(name)}`;

            // Handle multi-select centres
            let centresParam = "";
            if (centreId) {
                if (Array.isArray(centreId)) {
                    centresParam = centreId.map(c => c.value).join(",");
                } else if (centreId !== "All") {
                    centresParam = centreId;
                }
            }
            if (centresParam) url += `&centreId=${centresParam}`;

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

    const handleExportExcel = async () => {
        try {
            let url = `${apiUrl}/daily-tracking-logs/board/export?date=${selectedDate}`;

            // Handle multi-select roles
            let rolesParam = "";
            if (selectedDept) {
                if (Array.isArray(selectedDept)) {
                    rolesParam = selectedDept.map(r => r.value).join(",");
                } else if (selectedDept !== "All") {
                    rolesParam = selectedDept;
                }
            }
            if (rolesParam) url += `&role=${rolesParam}`;

            if (searchEmployee) url += `&employeeName=${encodeURIComponent(searchEmployee)}`;

            // Handle multi-select centres
            let centresParam = "";
            if (selectedCentre) {
                if (Array.isArray(selectedCentre)) {
                    centresParam = selectedCentre.map(c => c.value).join(",");
                } else if (selectedCentre !== "All") {
                    centresParam = selectedCentre;
                }
            }
            if (centresParam) url += `&centreId=${centresParam}`;

            toast.info("Preparing Excel download...");

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Failed to download Excel report.");
            }

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;

            const formattedDate = selectedDate.replace(/\//g, '-');
            link.setAttribute("download", `Daily_Tracking_Logs_${formattedDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success("Excel report downloaded successfully!");
        } catch (error) {
            console.error("Error exporting Excel:", error);
            toast.error(error.message || "Failed to export Excel report.");
        }
    };

    useEffect(() => {
        if (activeTab === "myLog") {
            fetchMyLog(selectedDate);
        } else {
            fetchBoardLogs(selectedDate, selectedDept, searchEmployee, selectedCentre);
        }
    }, [activeTab, selectedDate, selectedDept, searchEmployee, selectedCentre]);

    // Handle Form Submit
    const handleAddActivity = async (e) => {
        e.preventDefault();
        if (!workDetails.trim()) {
            toast.warning("Please fill in the work details.");
            return;
        }

        if (availableCentres.length > 0 && !selectedEntryCentre) {
            toast.warning("Please select a centre.");
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`${apiUrl}/daily-tracking-logs`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    workDetails,
                    completedWork,
                    status,
                    centre: selectedEntryCentre || null,
                    date: selectedDate
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Activity logged successfully!");
                setWorkDetails("");
                setCompletedWork("");

                fetchMyLog(selectedDate);
                fetchLoggedDates(currentYear, currentMonth);
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
                fetchLoggedDates(currentYear, currentMonth);
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

        if (activity.time) {
            const timeParts = activity.time.split(" - ");
            if (timeParts.length === 2) {
                setEditStartTime(parseTimeTo24h(timeParts[0]));
                setEditEndTime(parseTimeTo24h(timeParts[1]));
            } else {
                setEditStartTime("09:00");
                setEditEndTime("10:00");
            }
        } else {
            setEditStartTime("09:00");
            setEditEndTime("10:00");
        }

        setEditWorkDetails(activity.workDetails);
        setEditCompletedWork(activity.completedWork || "");
        setEditStatus(activity.status || "Completed");
        setEditCentre(activity.centre?._id || activity.centre || "");
    };

    // Save Edit
    const handleUpdateActivity = async (activityId) => {
        if (!editWorkDetails.trim()) {
            toast.warning("Please fill in all required fields.");
            return;
        }

        if (availableCentres.length > 0 && !editCentre) {
            toast.warning("Please select a centre.");
            return;
        }

        try {
            const res = await fetch(`${apiUrl}/daily-tracking-logs/${myLogId}/activity/${activityId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    workDetails: editWorkDetails,
                    completedWork: editCompletedWork,
                    status: editStatus,
                    centre: editCentre || null
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Activity updated successfully!");
                setEditingActivityId(null);
                fetchMyLog(selectedDate);
                fetchLoggedDates(currentYear, currentMonth);
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

    const centreOptions = availableCentres.map(c => ({
        value: c._id,
        label: c.centreName || 'Unknown Centre'
    }));


    const handleSearchChange = (val) => {
        setSearchEmployee(val);
    };

    return (
        <Layout activePage="Daily Tracking Log">
            <div className={`flex-1 p-6 min-h-screen overflow-y-auto transition-colors duration-300 ${isDarkMode ? "bg-[#131619] text-white" : "bg-[#f8fafc] text-gray-900"
                }`}>

                {/* Header section with glass effect */}
                <div className={`p-6 rounded-2xl border mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isDarkMode
                    ? "bg-[#1a1f24]/80 border-gray-800/80 backdrop-blur-md"
                    : "bg-white/80 border-slate-200/80 backdrop-blur-md shadow-sm"
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                            <FaHistory className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                {activeTab === "deptBoard" ? "Daily Tracking" : "My Daily Log"}
                            </h2>
                            <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                {activeTab === "deptBoard"
                                    ? "Track employee daily working activity logs"
                                    : "Input and track employee daily working activity log"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-stretch md:self-auto">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDarkMode ? "bg-gray-800/50 border-gray-700" : "bg-white border-slate-200"
                            }`}>
                            <FaCalendarAlt className="text-indigo-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className={`bg-transparent font-medium focus:outline-none text-sm ${isDarkMode ? "text-white" : "text-gray-800"
                                    }`}
                            />
                        </div>
                    </div>
                </div>

                {activeTab === "myLog" && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left side: Calendar + Add activity form */}
                        <div className="lg:col-span-1 flex flex-col gap-6 sticky top-6 self-start">
                            {/* Calendar Card */}
                            <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"}`}>
                                <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
                                    <h3 className="text-md font-bold flex items-center gap-2">
                                        <FaCalendarAlt className="text-indigo-500 text-sm" />
                                        Log Calendar
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button"
                                            onClick={handlePrevMonth}
                                            className={`p-1.5 rounded-lg border transition-colors ${isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-white" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"}`}
                                        >
                                            &lt;
                                        </button>
                                        <span className="text-sm font-bold min-w-[90px] text-center">
                                            {monthNames[currentMonth]} {currentYear}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={handleNextMonth}
                                            className={`p-1.5 rounded-lg border transition-colors ${isDarkMode ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-white" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"}`}
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                </div>

                                {/* Calendar grid weekdays */}
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                                        <div key={d} className={`text-xs font-bold py-1 ${isDarkMode ? "text-gray-500" : "text-slate-400"}`}>
                                            {d}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar grid days */}
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {getCalendarCells().map((cell, idx) => {
                                        const isSelected = cell.dateStr === selectedDate;
                                        const hasLog = cell.isCurrentMonth && loggedDates.includes(cell.dateStr);
                                        const isCurrentMonth = cell.isCurrentMonth;
                                        
                                        let cellStyle = "";
                                        if (isCurrentMonth) {
                                            if (hasLog) {
                                                cellStyle = "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border border-emerald-500/30";
                                            } else {
                                                cellStyle = "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20";
                                            }
                                        } else {
                                            cellStyle = "text-gray-400 dark:text-gray-600 opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800";
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleDateClick(cell)}
                                                className={`text-xs font-semibold py-2 rounded-xl transition duration-150 relative ${cellStyle} ${
                                                    isSelected ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-[#1a1f24] font-black z-10 scale-105" : ""
                                                }`}
                                            >
                                                {cell.day}
                                                {/* Current day dot */}
                                                {cell.dateStr === new Date().toISOString().split("T")[0] && (
                                                    <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full"></span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 flex justify-between text-[10px] font-bold text-gray-500 px-1 border-t border-gray-100 dark:border-gray-800 pt-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30"></div>
                                        <span>Log Submitted</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/10 border border-rose-500/20"></div>
                                        <span>No Log</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add activity form card */}
                            {canModify && (
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                                    }`}>
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <FaPlus className="text-indigo-500 text-sm" />
                                        Add Work Entry
                                    </h3>
                                    <form onSubmit={handleAddActivity} className="space-y-4">

                                        <div>
                                            <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                                }`}>
                                                Work Details / Activity
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={workDetails}
                                                onChange={(e) => setWorkDetails(e.target.value)}
                                                placeholder="What are you working on right now?"
                                                className={`w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500" : "bg-slate-50 border-slate-200 text-slate-900"
                                                    }`}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                                }`}>
                                                Completed Tasks (If any)
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={completedWork}
                                                onChange={(e) => setCompletedWork(e.target.value)}
                                                placeholder="Mention completed deliverables (optional)..."
                                                className={`w-full p-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500" : "bg-slate-50 border-slate-200 text-slate-900"
                                                    }`}
                                            />
                                        </div>

                                        {availableCentres.length > 0 && (
                                            <div>
                                                <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                                    }`}>
                                                    Centre
                                                </label>
                                                <select
                                                    value={selectedEntryCentre}
                                                    onChange={(e) => setSelectedEntryCentre(e.target.value)}
                                                    className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                                                        }`}
                                                >
                                                    <option value="">Select Centre</option>
                                                    {availableCentres.map((c) => (
                                                        <option key={c._id} value={c._id}>
                                                            {c.centreName || 'Unknown Centre'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className={`block text-xs font-semibold mb-1 uppercase tracking-wider ${isDarkMode ? "text-gray-400" : "text-gray-500"
                                                }`}>
                                                Work Status
                                            </label>
                                            <select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                                className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDarkMode ? "bg-gray-800/80 border-gray-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
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
                            )}
                        </div>

                        {/* Right side: Current activities list */}
                        <div className="lg:col-span-2">
                            <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                                }`}>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <FaClock className="text-indigo-500 text-sm" />
                                        Today's Activity Timeline
                                    </h3>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"
                                        }`}>
                                        {myActivities.length} logs
                                    </span>
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <FaSpinner className="animate-spin text-3xl text-indigo-500 mr-2" />
                                        <span className="text-gray-500 font-medium">Fetching activities...</span>
                                    </div>
                                ) : myActivities.length === 0 ? (
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
                                                <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 transition-all ${act.status === "Completed"
                                                    ? "bg-emerald-500 border-emerald-500 group-hover:scale-125"
                                                    : "bg-amber-500 border-amber-500 group-hover:scale-125"
                                                    }`} />

                                                {editingActivityId === act._id ? (
                                                    /* Edit mode card */
                                                    <div className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? "bg-gray-800/80 border-indigo-500/30" : "bg-slate-50 border-indigo-500/20"
                                                        }`}>
                                                        {/* <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-[10px] text-gray-400 block mb-1">Start Time</span>
                                                                <input
                                                                    type="time"
                                                                    value={editStartTime}
                                                                    onChange={(e) => setEditStartTime(e.target.value)}
                                                                    className={`w-full p-2 rounded-lg border text-sm ${isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                        }`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-gray-400 block mb-1">End Time</span>
                                                                <input
                                                                    type="time"
                                                                    value={editEndTime}
                                                                    onChange={(e) => setEditEndTime(e.target.value)}
                                                                    className={`w-full p-2 rounded-lg border text-sm ${isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                        }`}
                                                                />
                                                            </div>
                                                        </div> */}

                                                        <div>
                                                            <span className="text-[10px] text-gray-400 block mb-1">Work Details</span>
                                                            <textarea
                                                                rows={2}
                                                                value={editWorkDetails}
                                                                onChange={(e) => setEditWorkDetails(e.target.value)}
                                                                className={`w-full p-2 rounded-lg border text-sm ${isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                    }`}
                                                            />
                                                        </div>

                                                        <div>
                                                            <span className="text-[10px] text-gray-400 block mb-1">Completed Tasks</span>
                                                            <textarea
                                                                rows={2}
                                                                value={editCompletedWork}
                                                                onChange={(e) => setEditCompletedWork(e.target.value)}
                                                                className={`w-full p-2 rounded-lg border text-sm ${isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                    }`}
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-[10px] text-gray-400 block mb-1">Status</span>
                                                                <select
                                                                    value={editStatus}
                                                                    onChange={(e) => setEditStatus(e.target.value)}
                                                                    className={`w-full p-1.5 rounded border text-xs ${isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                        }`}
                                                                >
                                                                    <option value="Completed">Completed</option>
                                                                    <option value="In Progress">In Progress</option>
                                                                </select>
                                                            </div>
                                                            {availableCentres.length > 0 && (
                                                                <div>
                                                                    <span className="text-[10px] text-gray-400 block mb-1">Centre</span>
                                                                    <select
                                                                        value={editCentre}
                                                                        onChange={(e) => setEditCentre(e.target.value)}
                                                                        className={`w-full p-1.5 rounded border text-xs ${isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-slate-300"
                                                                            }`}
                                                                    >
                                                                        <option value="">Select Centre</option>
                                                                        {availableCentres.map((c) => (
                                                                            <option key={c._id} value={c._id}>
                                                                                {c.centreName || 'Unknown Centre'}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex justify-end gap-2 mt-2">
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
                                                ) : (
                                                    /* View mode activity card */
                                                    <div className={`p-4 rounded-2xl border transition duration-200 group-hover:shadow-md ${isDarkMode
                                                        ? "bg-[#1f252d]/40 border-gray-800/80 group-hover:border-gray-700"
                                                        : "bg-slate-50/50 border-slate-200 group-hover:border-slate-300"
                                                        }`}>
                                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {/* Status badge toggler */}
                                                                {canModify ? (
                                                                    <button
                                                                        onClick={() => toggleActivityStatus(act, act.status === "Completed" ? "In Progress" : "Completed")}
                                                                        title="Click to toggle status"
                                                                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 transition ${act.status === "Completed"
                                                                            ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                                                            : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                                                            }`}
                                                                    >
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${act.status === "Completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                                        {act.status}
                                                                    </button>
                                                                ) : (
                                                                    <div
                                                                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${act.status === "Completed"
                                                                            ? "bg-emerald-500/10 text-emerald-500"
                                                                            : "bg-amber-500/10 text-amber-500"
                                                                            }`}
                                                                    >
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${act.status === "Completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                                        {act.status}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Edit/Delete controls */}
                                                            {canModify && (
                                                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                    <button
                                                                        onClick={() => startEdit(act)}
                                                                        title="Edit Log"
                                                                        className={`p-1.5 rounded-lg text-xs transition ${isDarkMode ? "hover:bg-gray-800 text-gray-400 hover:text-white" : "hover:bg-slate-200 text-gray-500 hover:text-slate-900"
                                                                            }`}
                                                                    >
                                                                        <FaEdit />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteActivity(act._id)}
                                                                        title="Delete Log"
                                                                        className={`p-1.5 rounded-lg text-xs transition ${isDarkMode ? "hover:bg-red-950/30 text-gray-400 hover:text-red-400" : "hover:bg-red-550/10 text-gray-500 hover:text-red-500"
                                                                            }`}
                                                                    >
                                                                        <FaTrash />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div>
                                                                <h4 className={`text-xs font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Work Description</h4>
                                                                <p className={`text-sm leading-relaxed ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>{act.workDetails}</p>
                                                                {act.centre && (
                                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                                                                            <FaBuilding className="text-[9px]" />
                                                                            {act.centre.centreName}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {act.completedWork && (
                                                                <div className={`p-2.5 rounded-xl border border-dashed ${isDarkMode ? "bg-emerald-950/5 border-emerald-900/30" : "bg-emerald-50/20 border-emerald-200"
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

                {activeTab === "deptBoard" && (
                    <div>
                        {/* Filters dashboard panel */}
                        <div className={`p-5 rounded-2xl border mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between ${isDarkMode ? "bg-[#1a1f24] border-gray-800" : "bg-white border-slate-200 shadow-sm"
                            }`}>
                            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-4 w-full lg:w-auto">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest self-center">Filter:</span>

                                {/* Centre Filter */}
                                {(availableCentres.length > 0 || currentUser.role === "superAdmin") && (
                                    <div className="w-full sm:w-64">
                                        <CustomMultiSelect
                                            placeholder="ALL CENTRES"
                                            options={centreOptions}
                                            value={selectedCentre}
                                            onChange={(val) => setSelectedCentre(val || [])}
                                        />
                                    </div>
                                )}

                                {/* Role Filters */}
                                <div className="w-full sm:w-64">
                                    <CustomMultiSelect
                                        placeholder="ALL ROLES"
                                        options={rolesOptions}
                                        value={selectedDept}
                                        onChange={(val) => setSelectedDept(val || [])}
                                    />
                                </div>
                            </div>

                            {/* Search field and Export Excel */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:max-w-md justify-end mt-3 md:mt-0">
                                <div className="relative flex-1">
                                    <FaSearch className="absolute left-3.5 top-3.5 text-gray-500 text-sm" />
                                    <input
                                        type="text"
                                        placeholder="Search employee by name..."
                                        value={searchEmployee}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDarkMode
                                            ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500"
                                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder-gray-400"
                                            }`}
                                    />
                                </div>
                                <button
                                    onClick={handleExportExcel}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition duration-200 shrink-0 active:scale-95"
                                    title="Export logs to Excel"
                                >
                                    <FaFileExcel className="text-sm" />
                                    Export Excel
                                </button>
                            </div>
                        </div>

                        {/* Employee Logs Grid */}
                        {loading ? (
                            <div className="flex items-center justify-center p-12">
                                <FaSpinner className="animate-spin text-3xl text-indigo-500 mr-2" />
                                <span className="text-gray-500 font-medium">Fetching activities...</span>
                            </div>
                        ) : boardLogs.length === 0 ? (
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
                                            className={`p-6 rounded-2xl border transition duration-200 hover:shadow-md ${isDarkMode
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
                                                        {log.user?.primaryCentre?.centreName && (
                                                            <p className={`text-[10px] font-bold ${isDarkMode ? "text-indigo-400" : "text-indigo-600"} mt-0.5`}>
                                                                🏢 {log.user.primaryCentre.centreName}
                                                            </p>
                                                        )}
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
                                                    <div className={`p-4 rounded-xl border border-dashed text-center flex flex-col items-center justify-center ${isDarkMode
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
                                                            className={`p-3 rounded-xl border ${isDarkMode
                                                                ? "bg-[#1f252d]/60 border-gray-800"
                                                                : "bg-slate-50 border-slate-100"
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${act.status === "Completed"
                                                                    ? "bg-emerald-500/10 text-emerald-500"
                                                                    : "bg-amber-500/10 text-amber-500"
                                                                    }`}>
                                                                    {act.status}
                                                                </span>
                                                                {act.centre && (
                                                                    <span className={`inline-flex items-center gap-1 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${isDarkMode ? "bg-indigo-500/10 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                                                                        <FaBuilding className="text-[7px]" />
                                                                        {act.centre.centreName}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className={`text-xs leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                                                                {act.workDetails}
                                                            </p>

                                                            {act.completedWork && (
                                                                <div className={`mt-2 p-2 rounded border border-dashed text-[11px] ${isDarkMode
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
