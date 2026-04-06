import React, { useState, useEffect, useCallback } from "react";
import Layout from "../../components/Layout";
import Select from "react-select";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaFileExcel, FaFilter, FaTimes, FaSync, FaSearch, FaChevronDown, FaPlay } from "react-icons/fa";
import { hasPermission } from "../../config/permissions";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";

const UpcomingClass = () => {
    const [classes, setClasses] = useState([]);
    const [filteredClasses, setFilteredClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dropdownData, setDropdownData] = useState({ teachers: [], centres: [], subjects: [] });
    const [dropdownLoading, setDropdownLoading] = useState(false);
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";

    // Pagination
    const [limit, setLimit] = useState(10);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Global search (client-side across all visible fields)
    const [search, setSearch] = useState("");

    // Filter states
    const [filters, setFilters] = useState({
        teacherId: [],
        centreId: [],
        subjectId: [],
        classMode: [],
        fromDate: "",
        toDate: "",
        startTime: "",
    });

    const [showFilters, setShowFilters] = useState(false);
    const [canEdit, setCanEdit] = useState(false);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "admin" || user.role === "superAdmin";
    const isCoordinator = user.role === "Class_Coordinator";
    const isAcademicAdmin =
        isAdmin ||
        isCoordinator ||
        ["centerIncharge", "zonalManager", "zonalHead", "counsellor"].includes(user.role);

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        setCanEdit(
            hasPermission(userObj, "academics", "upcomingClass", "edit") ||
            hasPermission(userObj, "academics", "classes", "edit")
        );
        fetchDropdownData();
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [page, limit, filters]);

    // Apply client-side search (on top of server results) to cover populated fields like teacher name, centre name, subject
    useEffect(() => {
        if (!search.trim()) {
            setFilteredClasses(classes);
            return;
        }
        const q = search.toLowerCase();
        setFilteredClasses(
            classes.filter((cls) => {
                const teacherName = (cls.teacherId?.name || "").toLowerCase();
                const centreName = (cls.centreId?.centreName || cls.centreId?.centerName || cls.centreId?.name || "").toLowerCase();
                const subjectName = (cls.subjectId?.subjectName || cls.subjectId?.name || "").toLowerCase();
                const batchName = (cls.batchIds || []).map((b) => (b.batchName || b.name || "").toLowerCase()).join(" ");
                const className = (cls.className || "").toLowerCase();
                const mode = (cls.classMode || "").toLowerCase();
                const date = formatDate(cls.date).toLowerCase();
                const start = (cls.startTime || "").toLowerCase();
                const end = (cls.endTime || "").toLowerCase();
                const hours = String(cls.classHours || "").toLowerCase();

                return (
                    className.includes(q) ||
                    teacherName.includes(q) ||
                    centreName.includes(q) ||
                    subjectName.includes(q) ||
                    batchName.includes(q) ||
                    mode.includes(q) ||
                    date.includes(q) ||
                    start.includes(q) ||
                    end.includes(q) ||
                    hours.includes(q)
                );
            })
        );
    }, [search, classes]);

    const fetchDropdownData = async () => {
        setDropdownLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_URL}/academics/class-schedule/dropdown-data`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setDropdownData({
                    teachers: data.teachers || [],
                    centres: data.centres || [],
                    subjects: data.subjects || [],
                });
            }
        } catch {
            // ignore — filters just won't have options
        } finally {
            setDropdownLoading(false);
        }
    };

    const buildQuery = () => {
        const params = new URLSearchParams({
            page,
            limit,
            status: "Upcoming",
        });
        if (filters.teacherId && filters.teacherId.length > 0) params.append("teacherId", filters.teacherId.map(v => v.value).join(","));
        if (filters.centreId && filters.centreId.length > 0) params.append("centreId", filters.centreId.map(v => v.value).join(","));
        if (filters.subjectId && filters.subjectId.length > 0) params.append("subjectId", filters.subjectId.map(v => v.value).join(","));
        if (filters.classMode && filters.classMode.length > 0) params.append("classMode", filters.classMode.map(v => v.value).join(","));
        if (filters.fromDate) params.append("fromDate", filters.fromDate);
        if (filters.toDate) params.append("toDate", filters.toDate);
        if (filters.startTime) params.append("startTime", filters.startTime);
        return params;
    };

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${API_URL}/academics/class-schedule/list?${buildQuery()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await response.json();
            if (response.ok) {
                setClasses(data.classes);
                setFilteredClasses(data.classes);
                setTotalPages(data.totalPages);
                setTotalRecords(data.total);
            } else {
                toast.error(data.message || "Failed to fetch upcoming classes");
            }
        } catch {
            toast.error("Error fetching upcoming classes");
        } finally {
            setLoading(false);
        }
    };

    const handleStartClass = async (id) => {
        if (!window.confirm("Are you sure you want to start this class?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/academics/class-schedule/start/${id}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Class started successfully!");
                fetchClasses();
            } else {
                toast.error(data.message || "Failed to start class");
            }
        } catch {
            toast.error("Error starting class");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString("en-GB");
    };

    const handleFilterChange = (key, value) => {
        setPage(1);
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            teacherId: [],
            centreId: [],
            subjectId: [],
            classMode: [],
            fromDate: "",
            toDate: "",
            startTime: "",
        });
        setSearch("");
        setPage(1);
    };

    const hasActiveFilters =
        filters.teacherId.length > 0 ||
        filters.centreId.length > 0 ||
        filters.subjectId.length > 0 ||
        filters.classMode.length > 0 ||
        filters.fromDate !== "" ||
        filters.toDate !== "" ||
        filters.startTime !== "" ||
        search !== "";

    // Export to Excel
    const exportToExcel = () => {
        if (filteredClasses.length === 0) {
            toast.warning("No data to export.");
            return;
        }

        const rows = filteredClasses.map((cls, i) => ({
            "#": i + 1,
            "Class Name": cls.className || "",
            "Class Mode": cls.classMode || "",
            Batch:
                cls.batchIds && cls.batchIds.length > 0
                    ? cls.batchIds.map((b) => b.batchName || b.name || "").join(", ")
                    : cls.batchId?.batchName || cls.batchId?.name || "",
            Teacher: cls.teacherId?.name || "",
            Center:
                cls.centreId?.centreName ||
                cls.centreId?.centerName ||
                cls.centreId?.name ||
                "",
            Date: formatDate(cls.date),
            "Start Time": cls.startTime || "",
            "End Time": cls.endTime || "",
            "Class Hours": cls.classHours || 0,
            Subject:
                cls.subjectId?.subjectName || cls.subjectId?.name || "",
            Status: cls.status || "Upcoming",
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Upcoming Classes");

        // Auto-width columns
        const colWidths = Object.keys(rows[0] || {}).map((k) => ({
            wch: Math.max(k.length, ...rows.map((r) => String(r[k] || "").length)) + 2,
        }));
        worksheet["!cols"] = colWidths;

        XLSX.writeFile(workbook, `Upcoming_Classes_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success("Exported to Excel successfully!");
    };

    // ── Styles helpers ──
    const inputCls = `px-3 py-2 rounded-lg border focus:border-blue-500 outline-none transition-all text-sm
        ${isDarkMode ? "bg-[#131619] text-white border-gray-700 placeholder-gray-600" : "bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-400"}`;

    const selectCls = `px-3 py-2 rounded-lg border focus:border-blue-500 outline-none transition-all text-sm
        ${isDarkMode ? "bg-[#131619] text-white border-gray-700" : "bg-gray-50 text-gray-900 border-gray-300"}`;

    const labelCls = `block text-xs font-semibold uppercase tracking-wider mb-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`;

    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            backgroundColor: isDarkMode ? "#131619" : "#f9fafb",
            borderColor: state.isFocused ? "#3b82f6" : isDarkMode ? "#374151" : "#d1d5db",
            color: isDarkMode ? "#fff" : "#000",
            minHeight: "38px",
            fontSize: "14px",
            boxShadow: "none",
            "&:hover": {
                borderColor: "#3b82f6",
            },
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? "#1f2937" : "#fff",
            zIndex: 99,
            border: isDarkMode ? "1px solid #374151" : "1px solid #d1d5db",
        }),
        option: (base, { isFocused, isSelected }) => ({
            ...base,
            backgroundColor: isSelected
                ? "#3b82f6"
                : isFocused
                    ? isDarkMode ? "#374151" : "#eff6ff"
                    : "transparent",
            color: isSelected ? "#fff" : isDarkMode ? "#d1d5db" : "#374151",
            cursor: "pointer",
            fontSize: "14px",
            "&:active": {
                backgroundColor: "#3b82f6",
            },
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: isDarkMode ? "#3b82f633" : "#3b82f622",
            borderRadius: "4px",
            border: `1px solid ${isDarkMode ? "#3b82f666" : "#3b82f644"}`,
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: isDarkMode ? "#fff" : "#3b82f6",
            fontSize: "12px",
            fontWeight: "600",
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: isDarkMode ? "#9ca3af" : "#6b7280",
            "&:hover": {
                backgroundColor: "#ef4444",
                color: "#fff",
            },
        }),
        singleValue: (base) => ({
            ...base,
            color: isDarkMode ? "#fff" : "#374151",
        }),
        input: (base) => ({
            ...base,
            color: isDarkMode ? "#fff" : "#374151",
        }),
        placeholder: (base) => ({
            ...base,
            color: isDarkMode ? "#6b7280" : "#9ca3af",
            fontSize: "14px",
        }),
    };

    return (
        <Layout activePage="Academics">
            <div className={`p-6 min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? "text-gray-100" : "text-gray-900 bg-[#f8fafc]"}`}>
                <ToastContainer theme={theme} position="top-right" />

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className={`text-3xl font-bold uppercase italic tracking-wider ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        Upcoming Class
                    </h1>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition shadow-lg shadow-emerald-900/25"
                    >
                        <FaFileExcel />
                        Export to Excel
                    </button>
                </div>

                <div className={`${isDarkMode ? "bg-[#1e2530] border-gray-700 shadow-2xl" : "bg-white border-gray-200 shadow-md"} rounded-xl border overflow-hidden p-6 transition-colors`}>

                    {/* Top Controls Row */}
                    <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                        {/* Search */}
                        <div className="relative min-w-[240px] flex-1 max-w-sm">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search all fields…"
                                className={`px-4 py-2 pl-10 rounded-lg border focus:border-blue-500 outline-none w-full transition-all text-sm
                                    ${isDarkMode ? "bg-[#131619] text-white border-gray-700 placeholder-gray-600" : "bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-400"}`}
                            />
                            <FaSearch className="absolute left-3 top-3 text-gray-400" />
                            {search && (
                                <button onClick={() => setSearch("")} className="absolute right-3 top-3 text-gray-400 hover:text-red-400">
                                    <FaTimes size={12} />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2 items-center flex-wrap">
                            {/* Filter Toggle */}
                            <button
                                onClick={() => setShowFilters((s) => !s)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-sm transition
                                    ${showFilters
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : isDarkMode
                                            ? "bg-[#131619] text-gray-300 border-gray-700 hover:border-blue-500"
                                            : "bg-gray-50 text-gray-700 border-gray-300 hover:border-blue-400"}`}
                            >
                                <FaFilter size={12} />
                                Filters
                                {hasActiveFilters && (
                                    <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">!</span>
                                )}
                                <FaChevronDown size={10} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
                            </button>

                            {/* Clear Filters */}
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="flex items-center gap-1 px-3 py-2 rounded-lg border border-red-500 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold transition"
                                >
                                    <FaTimes size={10} /> Clear
                                </button>
                            )}

                            {/* Per Page */}
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className={selectCls}
                            >
                                <option value="10">10 per page</option>
                                <option value="20">20 per page</option>
                                <option value="50">50 per page</option>
                                <option value="100">100 per page</option>
                            </select>
                        </div>
                    </div>

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className={`mb-4 rounded-xl border p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4
                            ${isDarkMode ? "border-gray-700 bg-[#161b22]" : "border-gray-200 bg-gray-50"}`}>

                            {/* Teacher */}
                            <div className="col-span-1 min-w-[180px]">
                                <label className={labelCls}>Teacher</label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={dropdownData.teachers.map(t => ({ value: t._id, label: t.name }))}
                                    value={filters.teacherId}
                                    onChange={(val) => handleFilterChange("teacherId", val)}
                                    styles={customSelectStyles}
                                    placeholder="All Teachers"
                                    className="text-sm"
                                />
                            </div>

                            {/* From Date */}
                            <div>
                                <label className={labelCls}>From Date</label>
                                <input
                                    type="date"
                                    value={filters.fromDate}
                                    onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                                    className={`${inputCls} w-full`}
                                />
                            </div>

                            {/* To Date */}
                            <div>
                                <label className={labelCls}>To Date</label>
                                <input
                                    type="date"
                                    value={filters.toDate}
                                    onChange={(e) => handleFilterChange("toDate", e.target.value)}
                                    className={`${inputCls} w-full`}
                                />
                            </div>

                            {/* Center */}
                            <div className="col-span-1 min-w-[180px]">
                                <label className={labelCls}>Center</label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={dropdownData.centres.map(c => ({ value: c._id, label: c.centreName || c.centerName || c.name }))}
                                    value={filters.centreId}
                                    onChange={(val) => handleFilterChange("centreId", val)}
                                    styles={customSelectStyles}
                                    placeholder="All Centers"
                                    className="text-sm"
                                />
                            </div>

                            {/* Subject (Department) */}
                            <div className="col-span-1 min-w-[180px]">
                                <label className={labelCls}>Subject</label>
                                <Select
                                    isMulti
                                    isSearchable
                                    options={dropdownData.subjects.map(s => ({ value: s._id, label: s.subjectName || s.name }))}
                                    value={filters.subjectId}
                                    onChange={(val) => handleFilterChange("subjectId", val)}
                                    styles={customSelectStyles}
                                    placeholder="All Subjects"
                                    className="text-sm"
                                />
                            </div>

                            {/* Start Time */}
                            <div>
                                <label className={labelCls}>Start Time</label>
                                <input
                                    type="time"
                                    value={filters.startTime}
                                    onChange={(e) => handleFilterChange("startTime", e.target.value)}
                                    className={`${inputCls} w-full`}
                                />
                            </div>

                            {/* Class Mode */}
                            <div className="col-span-1 min-w-[150px]">
                                <label className={labelCls}>Mode</label>
                                <Select
                                    isMulti
                                    isSearchable={false}
                                    options={[
                                        { value: "Online", label: "Online" },
                                        { value: "Offline", label: "Offline" }
                                    ]}
                                    value={filters.classMode}
                                    onChange={(val) => handleFilterChange("classMode", val)}
                                    styles={customSelectStyles}
                                    placeholder="All Modes"
                                    className="text-sm"
                                />
                            </div>
                        </div>
                    )}

                    {/* Active filter chips */}
                    {hasActiveFilters && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {filters.teacherId.length > 0 && (
                                <FilterChip
                                    label={`Teachers: ${filters.teacherId.map(v => v.label).join(", ")}`}
                                    onRemove={() => handleFilterChange("teacherId", [])}
                                    isDarkMode={isDarkMode}
                                />
                            )}
                            {filters.centreId.length > 0 && (
                                <FilterChip
                                    label={`Centers: ${filters.centreId.map(v => v.label).join(", ")}`}
                                    onRemove={() => handleFilterChange("centreId", [])}
                                    isDarkMode={isDarkMode}
                                />
                            )}
                            {filters.subjectId.length > 0 && (
                                <FilterChip
                                    label={`Subjects: ${filters.subjectId.map(v => v.label).join(", ")}`}
                                    onRemove={() => handleFilterChange("subjectId", [])}
                                    isDarkMode={isDarkMode}
                                />
                            )}
                            {filters.classMode.length > 0 && (
                                <FilterChip
                                    label={`Modes: ${filters.classMode.map(v => v.label).join(", ")}`}
                                    onRemove={() => handleFilterChange("classMode", [])}
                                    isDarkMode={isDarkMode}
                                />
                            )}
                            {filters.fromDate && (
                                <FilterChip label={`From: ${filters.fromDate}`} onRemove={() => handleFilterChange("fromDate", "")} isDarkMode={isDarkMode} />
                            )}
                            {filters.toDate && (
                                <FilterChip label={`To: ${filters.toDate}`} onRemove={() => handleFilterChange("toDate", "")} isDarkMode={isDarkMode} />
                            )}
                            {filters.startTime && (
                                <FilterChip label={`Time: ${filters.startTime}`} onRemove={() => handleFilterChange("startTime", "")} isDarkMode={isDarkMode} />
                            )}
                            {search && (
                                <FilterChip label={`Search: "${search}"`} onRemove={() => setSearch("")} isDarkMode={isDarkMode} />
                            )}
                        </div>
                    )}

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDarkMode ? "bg-[#2a3038] text-gray-300 border-gray-700" : "bg-gray-50 text-gray-600 border-gray-200"} text-xs uppercase font-bold tracking-wider`}>
                                    <th className="p-4">#</th>
                                    <th className="p-4">Class Name</th>
                                    <th className="p-4">Mode</th>
                                    <th className="p-4">Batch</th>
                                    <th className="p-4">Teacher</th>
                                    <th className="p-4">Center</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Start Time</th>
                                    <th className="p-4">End Time</th>
                                    <th className="p-4">Hrs</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4">Chapter</th>
                                    <th className="p-4">Topic</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-gray-700" : "divide-gray-100"}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="12" className="p-8 text-center text-gray-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                </svg>
                                                Loading...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredClasses.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="p-10 text-center text-gray-500 uppercase tracking-widest opacity-50">
                                            No upcoming classes found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredClasses.map((cls, idx) => (
                                        <tr
                                            key={cls._id}
                                            className={`transition-colors text-sm ${isDarkMode ? "hover:bg-[#252b32] text-gray-300" : "hover:bg-blue-50/40 text-gray-600"}`}
                                        >
                                            <td className={`p-4 text-xs font-mono ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                                                {(page - 1) * limit + idx + 1}
                                            </td>
                                            <td className={`p-4 font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                                {cls.className}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                                                    ${cls.classMode === "Online"
                                                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                                        : "bg-orange-500/15 text-orange-400 border border-orange-500/30"}`}>
                                                    {cls.classMode}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs">
                                                {cls.batchIds && cls.batchIds.length > 0
                                                    ? cls.batchIds.map((b) => b.batchName || b.name).join(", ")
                                                    : cls.batchId?.batchName || cls.batchId?.name || "-"}
                                            </td>
                                            <td className={`p-4 font-medium ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                                {cls.teacherId?.name || "-"}
                                            </td>
                                            <td className="p-4">
                                                {cls.centreId?.centreName || cls.centreId?.centerName || cls.centreId?.name || "-"}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">{formatDate(cls.date)}</td>
                                            <td className="p-4 whitespace-nowrap font-mono text-xs">
                                                <span className={`px-2 py-0.5 rounded ${isDarkMode ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-700"}`}>
                                                    {cls.startTime}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap font-mono text-xs">
                                                <span className={`px-2 py-0.5 rounded ${isDarkMode ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-700"}`}>
                                                    {cls.endTime}
                                                </span>
                                            </td>
                                            <td className={`p-4 font-bold ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                                {cls.classHours || 0}
                                            </td>
                                            <td className="p-4">
                                                {cls.subjectId?.subjectName || cls.subjectId?.name || "-"}
                                            </td>
                                            <td className="p-4 text-xs font-bold text-gray-400">{cls.chapterName || "-"}</td>
                                            <td className="p-4 text-xs italic text-cyan-400/60">{cls.topicName || "-"}</td>
                                            <td className="p-4 text-center">
                                                {isAcademicAdmin ? (
                                                    <button
                                                        onClick={() => handleStartClass(cls._id)}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase transition shadow-lg shadow-green-900/20 mx-auto"
                                                    >
                                                        <FaPlay size={9} /> Start
                                                    </button>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase italic">Assigned</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer: count + pagination */}
                    <div className={`flex justify-between items-center mt-6 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        <div>
                            {search
                                ? `Showing ${filteredClasses.length} of ${totalRecords} entries (filtered)`
                                : `Showing ${totalRecords === 0 ? 0 : (page - 1) * limit + 1} to ${Math.min(page * limit, totalRecords)} of ${totalRecords} entries`}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={page === 1}
                                className={`px-4 py-2 rounded-lg disabled:opacity-40 transition font-bold ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                Previous
                            </button>
                            <div className="flex gap-1">
                                {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                                    const p = totalPages <= 7 ? i + 1 : i < 3 ? i + 1 : i === 3 ? page : i + totalPages - 6;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setPage(p)}
                                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition font-bold ${page === p
                                                ? "bg-blue-600 text-white shadow-lg"
                                                : isDarkMode
                                                    ? "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                disabled={page === totalPages || totalPages === 0}
                                className={`px-4 py-2 rounded-lg disabled:opacity-40 transition font-bold ${isDarkMode ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

// Small reusable chip for active filter tags
const FilterChip = ({ label, onRemove, isDarkMode }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border
        ${isDarkMode ? "bg-blue-900/30 text-blue-300 border-blue-700" : "bg-blue-100 text-blue-700 border-blue-300"}`}>
        {label}
        <button onClick={onRemove} className="hover:text-red-400 ml-1">
            <FaTimes size={9} />
        </button>
    </span>
);

export default UpcomingClass;
