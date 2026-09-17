import React, { useState, useEffect } from "react";
import {
    FaTimes,
    FaCalendarAlt,
    FaClock,
    FaBuilding,
    FaGraduationCap,
    FaTag,
    FaCheck,
    FaSearch,
    FaExclamationTriangle
} from "react-icons/fa";
import { toast } from "react-toastify";

const ALL_WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

// Helper to convert "10:00 AM" or "10:00" to "HH:mm" for <input type="time" />
const toTimeInputValue = (timeStr) => {
    if (!timeStr) return "10:00";
    timeStr = String(timeStr).trim();
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) {
        return timeStr;
    }
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = match[2];
        const ampm = (match[3] || "").toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return `${String(hours).padStart(2, "0")}:${minutes}`;
    }
    return "10:00";
};

// Helper to convert 24-hour "HH:mm" to user-friendly "hh:mm AM/PM"
const to12HourTime = (time24) => {
    if (!time24) return "";
    time24 = String(time24).trim();
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

const ExamScheduleModal = ({
    isOpen,
    onClose,
    onSuccess,
    initialData = null,
    sessions = [],
    classes = [],
    centres = [],
    isDarkMode = true
}) => {
    const isEdit = Boolean(initialData?._id);

    // Only active sessions
    const activeSessions = React.useMemo(() => {
        const filtered = (sessions || []).filter(s => s.isGlobalActive === true);
        return filtered.length > 0 ? filtered : (sessions || []);
    }, [sessions]);

    const [formData, setFormData] = useState({
        examName: "",
        className: [],
        session: "",
        centers: [],
        fromDate: "",
        toDate: "",
        fromTime: "10:00 AM",
        toTime: "01:00 PM",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        status: "Scheduled",
        description: ""
    });

    const [centreSearch, setCentreSearch] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Populate or reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    examName: initialData.examName || "",
                    className: Array.isArray(initialData.className)
                        ? initialData.className
                        : [initialData.className].filter(Boolean),
                    session: initialData.session || (activeSessions[0]?.sessionName || ""),
                    centers: Array.isArray(initialData.centers)
                        ? initialData.centers
                        : [initialData.centers].filter(Boolean),
                    fromDate: initialData.fromDate
                        ? new Date(initialData.fromDate).toISOString().split("T")[0]
                        : "",
                    toDate: initialData.toDate
                        ? new Date(initialData.toDate).toISOString().split("T")[0]
                        : "",
                    fromTime: initialData.fromTime || "10:00 AM",
                    toTime: initialData.toTime || "01:00 PM",
                    days: Array.isArray(initialData.days) && initialData.days.length > 0
                        ? initialData.days
                        : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    status: initialData.status || "Scheduled",
                    description: initialData.description || ""
                });
            } else {
                setFormData({
                    examName: "",
                    className: [],
                    session: activeSessions[0]?.sessionName || "",
                    centers: [],
                    fromDate: new Date().toISOString().split("T")[0],
                    toDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    fromTime: "10:00 AM",
                    toTime: "01:00 PM",
                    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                    status: "Scheduled",
                    description: ""
                });
            }
            setCentreSearch("");
            setErrors({});
        }
    }, [isOpen, initialData, activeSessions]);

    if (!isOpen) return null;

    // Filter centres for searchable multi-select
    const filteredCentres = centres.filter(c => {
        const name = typeof c === "string" ? c : c.centreName || "";
        return name.toLowerCase().includes(centreSearch.toLowerCase());
    });

    const toggleCentre = (centreName) => {
        setFormData(prev => {
            const exists = prev.centers.includes(centreName);
            return {
                ...prev,
                centers: exists
                    ? prev.centers.filter(c => c !== centreName)
                    : [...prev.centers, centreName]
            };
        });
    };

    const handleSelectAllCentres = () => {
        const allNames = filteredCentres.map(c => typeof c === "string" ? c : c.centreName).filter(Boolean);
        setFormData(prev => {
            const merged = Array.from(new Set([...prev.centers, ...allNames]));
            return { ...prev, centers: merged };
        });
    };

    const handleClearAllCentres = () => {
        setFormData(prev => ({ ...prev, centers: [] }));
    };

    const toggleClass = (clsName) => {
        setFormData(prev => {
            const exists = prev.className.includes(clsName);
            return {
                ...prev,
                className: exists
                    ? prev.className.filter(c => c !== clsName)
                    : [...prev.className, clsName]
            };
        });
    };

    const toggleWeekday = (day) => {
        setFormData(prev => {
            const exists = prev.days.includes(day);
            return {
                ...prev,
                days: exists
                    ? prev.days.filter(d => d !== day)
                    : [...prev.days, day]
            };
        });
    };

    const setWeekdayPreset = (type) => {
        if (type === "all") {
            setFormData(prev => ({ ...prev, days: [...ALL_WEEKDAYS] }));
        } else if (type === "weekdays") {
            setFormData(prev => ({ ...prev, days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }));
        } else if (type === "weekends") {
            setFormData(prev => ({ ...prev, days: ["Saturday", "Sunday"] }));
        } else if (type === "auto") {
            if (!formData.fromDate || !formData.toDate) {
                toast.info("Please pick From Date and To Date first");
                return;
            }
            const start = new Date(formData.fromDate);
            const end = new Date(formData.toDate);
            const detected = new Set();
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday ...
                const map = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                detected.add(map[dayIndex]);
            }
            setFormData(prev => ({ ...prev, days: Array.from(detected) }));
            toast.success(`Detected ${detected.size} days from date range`);
        }
    };

    const validate = () => {
        const errs = {};
        if (!formData.examName.trim()) errs.examName = "Exam name is required";
        if (formData.className.length === 0) errs.className = "Select at least one class";
        if (!formData.session.trim()) errs.session = "Session is required";
        if (formData.centers.length === 0) errs.centers = "Select at least one center";
        if (!formData.fromDate) errs.fromDate = "From date is required";
        if (!formData.toDate) errs.toDate = "To date is required";
        if (formData.fromDate && formData.toDate && new Date(formData.fromDate) > new Date(formData.toDate)) {
            errs.toDate = "To date cannot be before From date";
        }
        if (!formData.fromTime) errs.fromTime = "From time is required";
        if (!formData.toTime) errs.toTime = "To time is required";
        if (formData.days.length === 0) errs.days = "Select at least one day";

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            toast.error("Please fill in all required fields properly");
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem("token");
            const url = isEdit
                ? `${import.meta.env.VITE_API_URL}/operations/exam-schedule/${initialData._id}`
                : `${import.meta.env.VITE_API_URL}/operations/exam-schedule`;
            const method = isEdit ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to save exam schedule");
            }

            toast.success(data.message || (isEdit ? "Exam updated" : "Exam scheduled successfully"));
            onSuccess(data.data);
            onClose();
        } catch (error) {
            console.error("Error saving exam schedule:", error);
            toast.error(error.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const inputClasses = `w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
        isDarkMode
            ? "bg-[#14181c] border-gray-700/80 text-white placeholder-gray-500 hover:border-gray-600"
            : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 hover:border-gray-400 shadow-sm"
    }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <div
                className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl transition-all my-6 ${
                    isDarkMode
                        ? "bg-[#181d22] border-gray-800 text-gray-100"
                        : "bg-white border-gray-200 text-gray-900"
                }`}
            >
                {/* Modal Header */}
                <div
                    className={`flex items-center justify-between px-6 py-5 border-b rounded-t-3xl ${
                        isDarkMode
                            ? "border-gray-800 bg-[#14181c]"
                            : "border-gray-100 bg-gray-50/80"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
                            <FaCalendarAlt className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">
                                {isEdit ? "Edit Exam Schedule" : "Create New Exam Schedule"}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Configure exam dates, multiple centres, class levels, and weekly timetable
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2.5 rounded-full transition-colors ${
                            isDarkMode
                                ? "hover:bg-gray-800 text-gray-400 hover:text-white"
                                : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
                        }`}
                        title="Close"
                    >
                        <FaTimes className="text-lg" />
                    </button>
                </div>

                {/* Form Body - Scrollable */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Exam Name */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Exam Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.examName}
                                onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                                placeholder="e.g., Term 1 Final Examination, JEE Main Mock 1"
                                className={`${inputClasses} ${errors.examName ? "border-red-500 ring-1 ring-red-500" : ""}`}
                            />
                            {errors.examName && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <FaExclamationTriangle /> {errors.examName}
                                </p>
                            )}
                        </div>

                        {/* Session Selection */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Academic Session <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.session}
                                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                                className={`${inputClasses} ${errors.session ? "border-red-500" : ""}`}
                            >
                                <option value="">Select Session</option>
                                {activeSessions.map((s, idx) => (
                                    <option key={s._id || idx} value={s.sessionName}>
                                        {s.sessionName}
                                    </option>
                                ))}
                                {formData.session && !activeSessions.some(s => s.sessionName === formData.session) && (
                                    <option value={formData.session}>{formData.session}</option>
                                )}
                            </select>
                            {errors.session && (
                                <p className="text-xs text-red-500 mt-1">{errors.session}</p>
                            )}
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className={inputClasses}
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Classes (Multi-select) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Target Class(es) <span className="text-red-500">*</span>
                            </label>
                            <span className="text-xs text-blue-500 font-medium">
                                {formData.className.length} selected
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-dashed border-gray-700/60 min-h-[50px] items-center bg-gray-500/5">
                            {classes.length > 0 ? (
                                classes.map((cls, idx) => {
                                    const cName = typeof cls === "string" ? cls : cls.name;
                                    const selected = formData.className.includes(cName);
                                    return (
                                        <button
                                            key={cls._id || idx}
                                            type="button"
                                            onClick={() => toggleClass(cName)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                                selected
                                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105"
                                                    : isDarkMode
                                                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                                                    : "bg-white border text-gray-700 hover:bg-gray-100 shadow-sm"
                                            }`}
                                        >
                                            {selected && <FaCheck className="text-[10px]" />}
                                            {cName}
                                        </button>
                                    );
                                })
                            ) : (
                                ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Repeater"].map(cName => {
                                    const selected = formData.className.includes(cName);
                                    return (
                                        <button
                                            key={cName}
                                            type="button"
                                            onClick={() => toggleClass(cName)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                                selected
                                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105"
                                                    : isDarkMode
                                                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                                                    : "bg-white border text-gray-700 hover:bg-gray-100 shadow-sm"
                                            }`}
                                        >
                                            {selected && <FaCheck className="text-[10px]" />}
                                            {cName}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        {errors.className && (
                            <p className="text-xs text-red-500 mt-1">{errors.className}</p>
                        )}
                    </div>

                    {/* Centres Multi-select Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                <FaBuilding className="text-indigo-400" /> Centres (Multiple) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleSelectAllCentres}
                                    className="text-xs text-blue-500 hover:underline font-semibold"
                                >
                                    Select All Filtered
                                </button>
                                <span className="text-gray-500">|</span>
                                <button
                                    type="button"
                                    onClick={handleClearAllCentres}
                                    className="text-xs text-red-500 hover:underline font-semibold"
                                >
                                    Clear
                                </button>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 ml-1">
                                    {formData.centers.length} selected
                                </span>
                            </div>
                        </div>

                        {/* Search in centres */}
                        <div className="relative mb-2">
                            <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
                            <input
                                type="text"
                                value={centreSearch}
                                onChange={(e) => setCentreSearch(e.target.value)}
                                placeholder="Search centres to add..."
                                className={`w-full pl-8 pr-3 py-2 rounded-xl text-xs border ${
                                    isDarkMode
                                        ? "bg-[#14181c] border-gray-700 text-white placeholder-gray-500"
                                        : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"
                                }`}
                            />
                        </div>

                        {/* Centre pills box */}
                        <div className="max-h-36 overflow-y-auto p-3 rounded-2xl border border-gray-700/60 flex flex-wrap gap-2 bg-gray-500/5 custom-scrollbar">
                            {filteredCentres.length > 0 ? (
                                filteredCentres.map((centre, idx) => {
                                    const cName = typeof centre === "string" ? centre : centre.centreName;
                                    if (!cName) return null;
                                    const selected = formData.centers.includes(cName);
                                    return (
                                        <button
                                            key={centre._id || idx}
                                            type="button"
                                            onClick={() => toggleCentre(cName)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                                                selected
                                                    ? "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/30 scale-105"
                                                    : isDarkMode
                                                    ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                                                    : "bg-white border text-gray-700 hover:bg-gray-100 shadow-sm"
                                            }`}
                                        >
                                            {selected && <FaCheck className="text-[10px]" />}
                                            {cName}
                                        </button>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-gray-400 py-2 w-full text-center">
                                    No centres matching "{centreSearch}"
                                </p>
                            )}
                        </div>
                        {errors.centers && (
                            <p className="text-xs text-red-500 mt-1">{errors.centers}</p>
                        )}
                    </div>

                    {/* Date & Time Grid */}
                    <div className="p-4 rounded-2xl border border-gray-700/50 bg-gray-500/5 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                            <FaCalendarAlt /> Timing & Date Window
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {/* From Date */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">
                                    From Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.fromDate}
                                    onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                                    className={`${inputClasses} ${errors.fromDate ? "border-red-500" : ""}`}
                                />
                                {errors.fromDate && (
                                    <p className="text-xs text-red-500 mt-1">{errors.fromDate}</p>
                                )}
                            </div>

                            {/* To Date */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">
                                    To Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.toDate}
                                    onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                                    className={`${inputClasses} ${errors.toDate ? "border-red-500" : ""}`}
                                />
                                {errors.toDate && (
                                    <p className="text-xs text-red-500 mt-1">{errors.toDate}</p>
                                )}
                            </div>

                            {/* From Time */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center justify-between">
                                    <span>From Time <span className="text-red-500">*</span></span>
                                    <span className="text-[11px] font-bold text-blue-400">{formData.fromTime}</span>
                                </label>
                                <input
                                    type="time"
                                    value={toTimeInputValue(formData.fromTime)}
                                    onClick={(e) => {
                                        try { e.target.showPicker(); } catch (err) {}
                                    }}
                                    onChange={(e) => setFormData({ ...formData, fromTime: to12HourTime(e.target.value) })}
                                    className={`${inputClasses} cursor-pointer ${errors.fromTime ? "border-red-500" : ""}`}
                                />
                                {errors.fromTime && (
                                    <p className="text-xs text-red-500 mt-1">{errors.fromTime}</p>
                                )}
                            </div>

                            {/* To Time */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center justify-between">
                                    <span>To Time <span className="text-red-500">*</span></span>
                                    <span className="text-[11px] font-bold text-indigo-400">{formData.toTime}</span>
                                </label>
                                <input
                                    type="time"
                                    value={toTimeInputValue(formData.toTime)}
                                    onClick={(e) => {
                                        try { e.target.showPicker(); } catch (err) {}
                                    }}
                                    onChange={(e) => setFormData({ ...formData, toTime: to12HourTime(e.target.value) })}
                                    className={`${inputClasses} cursor-pointer ${errors.toTime ? "border-red-500" : ""}`}
                                />
                                {errors.toTime && (
                                    <p className="text-xs text-red-500 mt-1">{errors.toTime}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Weekdays / Days Selection */}
                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Exam Days of Week <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setWeekdayPreset("weekdays")}
                                    className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-medium"
                                >
                                    Mon - Fri
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWeekdayPreset("weekends")}
                                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-medium"
                                >
                                    Weekends
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWeekdayPreset("all")}
                                    className="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 font-medium"
                                >
                                    All 7 Days
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWeekdayPreset("auto")}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-medium"
                                >
                                    Auto-Fill From Dates
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {ALL_WEEKDAYS.map(day => {
                                const selected = formData.days.includes(day);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleWeekday(day)}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 ${
                                            selected
                                                ? "bg-gradient-to-b from-blue-600 to-indigo-600 border-blue-500 text-white shadow-md shadow-blue-500/30"
                                                : isDarkMode
                                                ? "bg-[#14181c] border-gray-800 text-gray-400 hover:border-gray-700 hover:text-white"
                                                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900"
                                        }`}
                                    >
                                        <span>{day.slice(0, 3)}</span>
                                        <span className="text-[10px] font-normal opacity-80">{day}</span>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.days && (
                            <p className="text-xs text-red-500 mt-1">{errors.days}</p>
                        )}
                    </div>

                    {/* Remarks / Description */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            Description / Instructions (Optional)
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Additional instructions for invigilators, center in-charges, students, syllabus details..."
                            className={inputClasses}
                        />
                    </div>
                </form>

                {/* Modal Footer */}
                <div
                    className={`flex items-center justify-between px-6 py-4 border-t rounded-b-3xl ${
                        isDarkMode
                            ? "border-gray-800 bg-[#14181c]"
                            : "border-gray-100 bg-gray-50/80"
                    }`}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            isDarkMode
                                ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        }`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Saving...
                            </>
                        ) : isEdit ? (
                            "Update Schedule"
                        ) : (
                            "Schedule Exam"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExamScheduleModal;
