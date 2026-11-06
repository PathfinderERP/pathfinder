import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    FaBullhorn, FaUsers, FaChartLine, FaTasks, FaCheckCircle, FaClock,
    FaTimesCircle, FaFileExcel, FaSync, FaSearch, FaFilter, FaCalendarAlt,
    FaMapMarkerAlt, FaCamera, FaChevronDown, FaChevronUp, FaArrowLeft,
    FaExclamationTriangle, FaDownload, FaUserCheck, FaLayerGroup, FaThList,
    FaColumns, FaEye, FaTimes, FaRupeeSign, FaAward
} from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomMultiSelect from "../common/CustomMultiSelect";
import { useNavigate } from "react-router-dom";

// Resilient Photo Thumbnail with error fallback
const PhotoProofThumbnail = ({ photo, onClick, size = "w-7 h-7" }) => {
    const [hasError, setHasError] = useState(false);

    if (!photo) {
        return <span className="text-[10px] text-slate-600 font-semibold">—</span>;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${size} rounded-lg border border-slate-700/80 bg-slate-800/90 overflow-hidden hover:border-cyan-500 hover:scale-110 transition-all shadow flex items-center justify-center text-cyan-400 group cursor-pointer flex-shrink-0 relative`}
            title="Click to view photo proof"
        >
            {hasError ? (
                <FaCamera size={12} className="text-cyan-400 group-hover:text-cyan-300" title="Photo proof attached" />
            ) : (
                <img
                    src={photo}
                    alt=""
                    onError={() => setHasError(true)}
                    className="w-full h-full object-cover transition-opacity duration-200"
                    loading="lazy"
                />
            )}
        </button>
    );
};

const MarketingAnalysisContent = ({ isDarkMode = true }) => {
    const navigate = useNavigate();

    // Data State
    const [loading, setLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState(null);

    // Filter States
    const [dateRangePreset, setDateRangePreset] = useState("today");
    const todayStr = useMemo(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }), []);
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [selectedPurposes, setSelectedPurposes] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // View state: "summary" | "detailed"
    const [viewMode, setViewMode] = useState("summary");

    // Expanded user accordion rows in summary view
    const [expandedUsers, setExpandedUsers] = useState({});

    // Lightbox Modal for Photo Proofs
    const [lightboxPhoto, setLightboxPhoto] = useState(null);

    // Initial and parameter-driven data fetch
    const fetchAnalysisData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            params.set("dateRange", dateRangePreset);
            if (dateRangePreset === "custom") {
                if (startDate) params.set("startDate", startDate);
                if (endDate) params.set("endDate", endDate);
            }

            if (selectedUsers.length > 0) {
                params.set("userIds", selectedUsers.map(u => u.value || u).join(","));
            }
            if (selectedRoles.length > 0) {
                params.set("roles", selectedRoles.map(r => r.value || r).join(","));
            }
            if (selectedZones.length > 0) {
                params.set("zoneIds", selectedZones.map(z => z.value || z).join(","));
            }
            if (selectedCentres.length > 0) {
                params.set("centreIds", selectedCentres.map(c => c.value || c).join(","));
            }
            if (selectedTypes.length > 0) {
                params.set("activityTypes", selectedTypes.map(t => t.value || t).join(","));
            }
            if (selectedPurposes.length > 0) {
                params.set("activityPurposes", selectedPurposes.map(p => p.value || p).join(","));
            }
            if (statusFilter && statusFilter !== "all") {
                params.set("status", statusFilter);
            }
            if (searchTerm.trim()) {
                params.set("search", searchTerm.trim());
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/marketing/analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAnalysisData(data);
            } else {
                toast.error("Failed to load marketing analysis data");
            }
        } catch (error) {
            console.error("Error fetching marketing analysis:", error);
            toast.error("Network error loading marketing analysis");
        } finally {
            setLoading(false);
        }
    }, [dateRangePreset, startDate, endDate, selectedUsers, selectedRoles, selectedZones, selectedCentres, selectedTypes, selectedPurposes, statusFilter, searchTerm]);

    useEffect(() => {
        fetchAnalysisData();
    }, [fetchAnalysisData]);

    // Toggle user expansion in summary table
    const toggleUserExpand = (uid) => {
        setExpandedUsers(prev => ({
            ...prev,
            [uid]: !prev[uid]
        }));
    };

    // Expand / Collapse all users
    const toggleExpandAll = () => {
        const users = analysisData?.userSummary || [];
        const allExpanded = users.every(u => expandedUsers[u.user._id]);
        const newState = {};
        if (!allExpanded) {
            users.forEach(u => { newState[u.user._id] = true; });
        }
        setExpandedUsers(newState);
    };

    // Reset all filters to default
    const handleResetFilters = () => {
        setDateRangePreset("today");
        setStartDate(todayStr);
        setEndDate(todayStr);
        setSelectedUsers([]);
        setSelectedRoles([]);
        setSelectedZones([]);
        setSelectedCentres([]);
        setSelectedTypes([]);
        setSelectedPurposes([]);
        setStatusFilter("all");
        setSearchTerm("");
    };

    // Excel Export Handler
    const handleExportExcel = () => {
        if (!analysisData) {
            toast.warn("No data to export");
            return;
        }

        const cleanCell = (val) => {
            if (val === null || val === undefined) return "—";
            if (typeof val === "number" || typeof val === "boolean") return val;
            const str = String(val);
            if (str.startsWith("data:image")) {
                return "Attached (Photo Upload Verified)";
            }
            if (str.length > 32000) {
                return str.substring(0, 32000) + "... [truncated]";
            }
            return str;
        };

        const resolvePhotoCell = (task) => {
            const rawPhoto = task.photo || (task.photos && task.photos.length > 0 ? task.photos[0] : null);
            if (!rawPhoto) return "No Photo";
            if (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://")) {
                return rawPhoto.length > 32000 ? rawPhoto.substring(0, 32000) : rawPhoto;
            }
            return "Attached (Photo Upload Verified)";
        };

        const wb = XLSX.utils.book_new();

        // 1. User Summary Sheet
        const summaryRows = (analysisData.userSummary || []).map((s, idx) => ({
            "#": idx + 1,
            "Staff Name": cleanCell(s.user.name),
            "Employee ID": cleanCell(s.user.employeeId),
            "Role": cleanCell(s.user.role),
            "Centres": cleanCell(s.user.centres.join(", ")),
            "Zone": cleanCell(s.user.zone),
            "Tomorrow Plan (Planned)": s.plannedTasksCount,
            "Plan Completed": s.completedPlanned,
            "Direct Visits (Today Task)": s.adHocCompleted,
            "Total Tasks Done": s.totalExecuted,
            "Pending Plan": s.pendingTasksCount,
            "Skipped Plan": s.skippedTasksCount,
            "Plan Compliance %": s.completionRate !== null ? `${s.completionRate}%` : "No Plan Filled",
            "Leads Collected": s.totalLeads,
            "Proof Uploads": s.proofCount,
            "Geo-Tagged Tasks": s.geoCount,
            "Approved by ZM": s.approvals?.Approved || 0,
            "Pending ZM Review": s.approvals?.Pending || 0,
            "Rejected": s.approvals?.Rejected || 0
        }));

        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, "User Summary");

        // 2. Detailed Task Matrix Sheet
        const taskRows = (analysisData.detailedTasks || []).map((t, idx) => ({
            "#": idx + 1,
            "Date": cleanCell(t.date),
            "Staff Name": cleanCell(t.userName),
            "Role": cleanCell(t.userRole),
            "Centres": cleanCell(t.centres),
            "Zone": cleanCell(t.zone),
            "Task Origin": t.isPlanned ? "Tomorrow Planner" : "Direct Entry (Today Task)",
            "Activity Type": cleanCell(t.activityType),
            "Activity Purpose": cleanCell(t.activityPurpose),
            "Institution / School / Place": cleanCell(t.place),
            "Planned Time": cleanCell(t.time),
            "Planned Duration": cleanCell(t.estimatedDuration),
            "Priority": cleanCell(t.priority || "Medium"),
            "Execution Status": cleanCell(t.status),
            "Actual Execution Time": cleanCell(t.actualTime),
            "Submitted At": cleanCell(t.submittedAt),
            "Activity Outcome": cleanCell(t.activityStatus),
            "Leads Collected": cleanCell(t.leads),
            "Geo-Tagged?": t.geoTagged ? "Yes" : "No",
            "Location / GPS": cleanCell(t.locationName || (t.latitude ? `${t.latitude}, ${t.longitude}` : "—")),
            "Proof Photo Available?": (t.photo || (t.photos && t.photos.length > 0)) ? "Yes" : "No",
            "Proof Photo": resolvePhotoCell(t),
            "ZM Review Status": cleanCell(t.approvalStatus),
            "ZM Remarks": cleanCell(t.remarks),
            "Approved By": cleanCell(t.approvedBy),
            "Notes": cleanCell(t.notes)
        }));

        const wsTasks = XLSX.utils.json_to_sheet(taskRows);
        XLSX.utils.book_append_sheet(wb, wsTasks, "Detailed Tasks");

        // Save File
        const dateTag = analysisData.dateRangeInfo?.startDate === analysisData.dateRangeInfo?.endDate
            ? analysisData.dateRangeInfo?.startDate
            : `${analysisData.dateRangeInfo?.startDate}_to_${analysisData.dateRangeInfo?.endDate}`;
        saveAs(
            new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }),
            `Marketing_Analysis_${dateTag}.xlsx`
        );
        toast.success("Marketing Analysis Excel exported successfully! 📊");
    };

    // Filter Options extracted from API
    const roleOptions = useMemo(() => (analysisData?.filterOptions?.roles || []).map(r => ({ value: r.value, label: r.label })), [analysisData]);
    const zoneOptions = useMemo(() => (analysisData?.filterOptions?.zones || []).map(z => ({ value: z.value, label: z.label })), [analysisData]);
    const userOptions = useMemo(() => (analysisData?.filterOptions?.users || []).map(u => ({ value: u.value, label: `${u.label} (${u.role})` })), [analysisData]);
    const centreOptions = useMemo(() => (analysisData?.filterOptions?.centres || []).map(c => ({ value: c.value, label: c.label })), [analysisData]);
    const typeOptions = useMemo(() => (analysisData?.filterOptions?.activityTypes || []).map(t => ({ value: t, label: t })), [analysisData]);
    const purposeOptions = useMemo(() => (analysisData?.filterOptions?.activityPurposes || []).map(p => ({ value: p, label: p })), [analysisData]);

    const stats = analysisData?.overallStats || {};

    return (
        <div className="space-y-6">
            {/* ── HEADER & NAVIGATION ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate("/marketing-crm")}
                            className={`p-2.5 rounded-xl border transition-all ${
                                isDarkMode ? "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700" : "bg-white hover:bg-gray-100 text-gray-700 border-gray-200 shadow-sm"
                            }`}
                            title="Back to Command Centre"
                        >
                            <FaArrowLeft />
                        </button>
                        <div>
                            <h1 className={`text-2xl md:text-3xl font-black flex items-center gap-2.5 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                <FaChartLine className="text-cyan-400" /> Marketing Analysis
                            </h1>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                User-wise analysis: Tomorrow Planner plans vs Today's Task executions, proof verifications & lead outcomes
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchAnalysisData}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" : "bg-white hover:bg-gray-100 text-gray-800 border-gray-200 shadow-sm"
                        }`}
                    >
                        <FaSync className={loading ? "animate-spin text-cyan-400" : "text-cyan-400"} />
                        <span>Sync</span>
                    </button>

                    <button
                        onClick={handleExportExcel}
                        disabled={loading || !analysisData}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                        <FaFileExcel size={14} />
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            {/* ── DATE RANGE PRESET BUTTONS BAR ── */}
            <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5">
                            <FaCalendarAlt className="text-cyan-400" /> Date Preset:
                        </span>
                        {[
                            { id: "today", label: "Today" },
                            { id: "tomorrow", label: "Tomorrow" },
                            { id: "yesterday", label: "Yesterday" },
                            { id: "this_week", label: "This Week" },
                            { id: "this_month", label: "This Month" },
                            { id: "previous_month", label: "Previous Month" },
                            { id: "all", label: "All Time" },
                            { id: "custom", label: "Custom Range" }
                        ].map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => setDateRangePreset(preset.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                                    dateRangePreset === preset.id
                                        ? "bg-cyan-500 text-black shadow-md font-black shadow-cyan-500/25"
                                        : isDarkMode
                                            ? "bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                            isDarkMode ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200 font-extrabold"
                        }`}>
                            Active Range: {analysisData?.dateRangeInfo?.startDate} {analysisData?.dateRangeInfo?.startDate !== analysisData?.dateRangeInfo?.endDate ? `to ${analysisData?.dateRangeInfo?.endDate}` : ""} ({analysisData?.dateRangeInfo?.label})
                        </span>
                    </div>
                </div>

                {/* Custom Date Pickers (visible when Custom Range is selected) */}
                {dateRangePreset === "custom" && (
                    <div className="mt-3 pt-3 border-t border-slate-800/50 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">From:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                                    isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-cyan-400" : "bg-slate-50 border-slate-300 text-slate-800"
                                }`}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase">To:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                                    isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-cyan-400" : "bg-slate-50 border-slate-300 text-slate-800"
                                }`}
                            />
                        </div>
                        <button
                            onClick={fetchAnalysisData}
                            className="px-4 py-1.5 rounded-xl text-xs font-black bg-cyan-600 hover:bg-cyan-500 text-white shadow-md transition-all"
                        >
                            Apply Dates
                        </button>
                    </div>
                )}
            </div>

            {/* ── TOP KPI SUMMARY CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
                {/* 1. Marketing Staff */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider">Active Staff</span>
                        <FaUsers className="text-cyan-400" />
                    </div>
                    <div className="text-2xl font-black text-cyan-400">
                        {stats.activeStaff || 0}
                        <span className="text-xs font-medium text-slate-400 ml-1.5">/ {stats.totalStaff || 0}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Total marketing users</p>
                </div>

                {/* 2. Tomorrow Plan (Planned) */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider">Tomorrow Plan</span>
                        <FaTasks className="text-blue-400" />
                    </div>
                    <div className="text-2xl font-black text-blue-400">
                        {stats.totalPlanned || 0}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Pre-planned tasks</p>
                </div>

                {/* 3. Total Tasks Done */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider">Total Tasks Done</span>
                        <FaCheckCircle className="text-emerald-400" />
                    </div>
                    <div className="text-2xl font-black text-emerald-400">
                        {stats.totalExecutedAll || 0}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                        <span className="text-emerald-400 font-bold">{stats.totalCompleted || 0} from plan</span>
                        <span className="mx-1">•</span>
                        <span className="text-teal-400 font-bold">{stats.totalAdHoc || 0} direct visits</span>
                    </p>
                </div>

                {/* 4. Plan Compliance Rate */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider">Plan Compliance</span>
                        <FaAward className="text-yellow-400" />
                    </div>
                    <div className={`text-2xl font-black ${
                        stats.overallCompletionRate === null ? "text-slate-400" :
                        stats.overallCompletionRate >= 80 ? "text-emerald-400" : stats.overallCompletionRate >= 50 ? "text-yellow-400" : "text-rose-400"
                    }`}>
                        {stats.overallCompletionRate !== null ? `${stats.overallCompletionRate}%` : "N/A"}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        {stats.overallCompletionRate !== null ? `${stats.totalPending || 0} pending planned tasks` : "No tomorrow plan filled"}
                    </p>
                </div>

                {/* 5. Total Leads Collected */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider">Leads Collected</span>
                        <FaBullhorn className="text-purple-400" />
                    </div>
                    <div className="text-2xl font-black text-purple-400">
                        {stats.totalLeads || 0}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">From executed tasks</p>
                </div>

                {/* 6. Proof & Geo-Tag Compliance */}
                <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider">Proof Compliance</span>
                        <FaCamera className="text-orange-400" />
                    </div>
                    <div className="text-2xl font-black text-orange-400">
                        {stats.totalProofs || 0}
                        <span className="text-xs font-medium text-slate-400 ml-1.5">({stats.totalGeoTagged || 0} Geo)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Photo & GPS verified</p>
                </div>
            </div>

            {/* ── MULTI-SELECT FILTERS BAR ── */}
            <div className={`p-4 rounded-2xl border space-y-3 ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"}`}>
                <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <FaFilter className="text-cyan-400" /> Multi-Select Filters
                    </span>
                    {(selectedUsers.length > 0 || selectedRoles.length > 0 || selectedZones.length > 0 || selectedCentres.length > 0 || selectedTypes.length > 0 || selectedPurposes.length > 0 || statusFilter !== "all" || searchTerm) && (
                        <button
                            onClick={handleResetFilters}
                            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                        >
                            Reset All Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {/* 1. Role Filter */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                            Role
                        </label>
                        <CustomMultiSelect
                            options={roleOptions}
                            value={selectedRoles}
                            onChange={(val) => setSelectedRoles(val || [])}
                            placeholder="All Roles..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* 2. Zone Filter */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                            Zone
                        </label>
                        <CustomMultiSelect
                            options={zoneOptions}
                            value={selectedZones}
                            onChange={(val) => setSelectedZones(val || [])}
                            placeholder="All Zones..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* 3. Centre Multi-Select */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                            Centres
                        </label>
                        <CustomMultiSelect
                            options={centreOptions}
                            value={selectedCentres}
                            onChange={(val) => setSelectedCentres(val || [])}
                            placeholder="All Centres..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* 4. Marketing Staff Multi-Select */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                            Marketing Staff
                        </label>
                        <CustomMultiSelect
                            options={userOptions}
                            value={selectedUsers}
                            onChange={(val) => setSelectedUsers(val || [])}
                            placeholder="All Staff..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* 5. Activity Type Multi-Select */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                            Activity Types
                        </label>
                        <CustomMultiSelect
                            options={typeOptions}
                            value={selectedTypes}
                            onChange={(val) => setSelectedTypes(val || [])}
                            placeholder="All Types..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* 6. Activity Purpose Multi-Select */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                            Activity Purposes
                        </label>
                        <CustomMultiSelect
                            options={purposeOptions}
                            value={selectedPurposes}
                            onChange={(val) => setSelectedPurposes(val || [])}
                            placeholder="All Purposes..."
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* 7. Execution Status Dropdown */}
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                            Execution Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-bold border transition-colors outline-none cursor-pointer ${
                                isDarkMode ? "bg-slate-900 border-slate-700 text-white focus:border-cyan-400" : "bg-slate-50 border-slate-300 text-slate-800"
                            }`}
                        >
                            <option value="all">All Statuses</option>
                            <option value="completed">Completed (Today Task Done)</option>
                            <option value="pending">Pending (Not Done)</option>
                            <option value="skipped">Skipped</option>
                        </select>
                    </div>
                </div>

                {/* Quick Search */}
                <div className="relative pt-1">
                    <FaSearch className="absolute left-3 top-4 -translate-y-1/2 text-slate-400 text-xs" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by staff name, school / place name, activity type, notes..."
                        className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border transition-colors outline-none ${
                            isDarkMode ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400" : "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400"
                        }`}
                    />
                </div>
            </div>

            {/* ── VIEW MODE TOGGLE & TABLE ACTIONS ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className={`flex items-center gap-1 p-1 rounded-xl w-fit ${isDarkMode ? "bg-slate-900 border border-slate-800" : "bg-gray-100 border border-gray-200"}`}>
                    <button
                        onClick={() => setViewMode("summary")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs transition-all ${
                            viewMode === "summary"
                                ? "bg-cyan-500 text-black shadow-md font-black"
                                : isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-black"
                        }`}
                    >
                        <FaUsers size={12} />
                        <span>User-Wise Summary ({analysisData?.userSummary?.length || 0})</span>
                    </button>
                    <button
                        onClick={() => setViewMode("detailed")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs transition-all ${
                            viewMode === "detailed"
                                ? "bg-cyan-500 text-black shadow-md font-black"
                                : isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-black"
                        }`}
                    >
                        <FaThList size={12} />
                        <span>Detailed Task Matrix ({analysisData?.detailedTasks?.length || 0})</span>
                    </button>
                </div>

                {viewMode === "summary" && (
                    <button
                        onClick={toggleExpandAll}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                            isDarkMode ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}
                    >
                        Expand / Collapse All
                    </button>
                )}
            </div>

            {/* ── VIEW 1: USER-WISE SUMMARY TABLE ── */}
            {viewMode === "summary" && (
                <div className={`rounded-2xl border overflow-hidden shadow-xl ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200"}`}>
                    <div className="overflow-x-auto max-h-[750px] scrollbar-thin scrollbar-thumb-slate-700">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className={`sticky top-0 z-20 font-black uppercase tracking-wider text-[11px] ${
                                isDarkMode ? "bg-slate-950 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}>
                                <tr className="border-b border-slate-800/60">
                                    <th className="p-3.5 w-12 text-center">#</th>
                                    <th className="p-3.5 min-w-[200px]">Staff Name & Role</th>
                                    <th className="p-3.5 min-w-[150px]">Centres / Location</th>
                                    <th className="p-3.5 text-center min-w-[110px] bg-blue-500/5 text-blue-400 border-l border-blue-500/20" title="Tasks planned the previous day in Tomorrow Planner">
                                        Tomorrow Plan
                                    </th>
                                    <th className="p-3.5 text-center min-w-[90px] text-cyan-400 border-l border-slate-800/40" title="Planned tasks executed today">
                                        Plan Done
                                    </th>
                                    <th className="p-3.5 text-center min-w-[110px] text-teal-400 border-l border-slate-800/40" title="Direct visits added today without pre-planning">
                                        Direct Visits
                                    </th>
                                    <th className="p-3.5 text-center min-w-[125px] bg-emerald-500/10 text-emerald-300 border-l border-emerald-500/30" title="Total visits executed today (Plan Done + Direct Visits)">
                                        Total Tasks Done
                                    </th>
                                    <th className="p-3.5 text-center min-w-[90px] text-amber-400 border-l border-slate-800/40" title="Pre-planned tasks left incomplete">
                                        Pending Plan
                                    </th>
                                    <th className="p-3.5 text-center min-w-[140px] border-l border-slate-800/40" title="Percentage of pre-planned tasks completed">
                                        Plan Compliance %
                                    </th>
                                    <th className="p-3.5 text-center min-w-[90px] text-purple-400 border-l border-slate-800/40">
                                        Leads
                                    </th>
                                    <th className="p-3.5 text-center min-w-[120px] text-orange-400 border-l border-slate-800/40">
                                        Proof & Geo
                                    </th>
                                    <th className="p-3.5 text-right min-w-[100px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/50 text-slate-300" : "divide-slate-200 text-slate-700"}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="12" className="py-20 text-center">
                                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                            <p className="text-xs font-bold text-slate-400">Loading User-Wise Marketing Analysis...</p>
                                        </td>
                                    </tr>
                                ) : (analysisData?.userSummary || []).length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="py-20 text-center">
                                            <FaExclamationTriangle className="text-3xl text-slate-600 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-slate-400">No marketing records found for the selected date range and filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    (analysisData.userSummary || []).map((summary, idx) => {
                                        const isExpanded = !!expandedUsers[summary.user._id];
                                        return (
                                            <React.Fragment key={summary.user._id}>
                                                <tr className={`transition-colors ${
                                                    isDarkMode ? (isExpanded ? "bg-slate-900/90" : "hover:bg-slate-800/40") : (isExpanded ? "bg-blue-50/50" : "hover:bg-slate-50")
                                                }`}>
                                                    <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                                                    <td className="p-3.5">
                                                        <div className="font-extrabold text-white text-sm">
                                                            {summary.user.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-semibold capitalize flex items-center gap-1.5 mt-0.5">
                                                            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-cyan-300">{summary.user.role}</span>
                                                            {summary.user.employeeId && <span>ID: {summary.user.employeeId}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-3.5 font-semibold text-slate-300">
                                                        <div>{summary.user.centres.join(", ") || "—"}</div>
                                                        <div className="text-[10px] text-slate-500">{summary.user.zone}</div>
                                                    </td>
                                                    {/* 1. Tomorrow Plan (Planned) */}
                                                    <td className="p-3.5 text-center border-l border-blue-500/10">
                                                        {summary.plannedTasksCount > 0 ? (
                                                            <span className="font-black text-blue-400 text-sm">{summary.plannedTasksCount}</span>
                                                        ) : (
                                                            <div>
                                                                <span className="text-slate-500 font-bold text-sm">0</span>
                                                                <span className="text-[9px] text-slate-500 block">Not Planned</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* 2. Plan Done */}
                                                    <td className="p-3.5 text-center font-black text-cyan-400 border-l border-slate-800/40 text-sm">
                                                        {summary.completedPlanned}
                                                    </td>
                                                    {/* 3. Direct Visits (Today Task) */}
                                                    <td className="p-3.5 text-center border-l border-slate-800/40">
                                                        {summary.adHocCompleted > 0 ? (
                                                            <span className="px-2 py-0.5 rounded text-xs font-black bg-teal-500/15 text-teal-300 border border-teal-500/30">
                                                                +{summary.adHocCompleted} Direct
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 font-bold text-sm">0</span>
                                                        )}
                                                    </td>
                                                    {/* 4. Total Tasks Done */}
                                                    <td className="p-3.5 text-center border-l border-emerald-500/30 bg-emerald-500/5">
                                                        <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-sm">
                                                            <FaCheckCircle className="text-emerald-400" size={11} /> {summary.totalExecuted} Done
                                                        </span>
                                                    </td>
                                                    {/* 5. Pending Plan */}
                                                    <td className="p-3.5 text-center font-black text-amber-400 border-l border-slate-800/40 text-sm">
                                                        {summary.pendingTasksCount}
                                                    </td>
                                                    {/* 6. Plan Compliance % */}
                                                    <td className="p-3.5 text-center border-l border-slate-800/40">
                                                        {summary.completionRate !== null ? (
                                                            <div>
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <span className={`font-black text-xs ${
                                                                        summary.completionRate >= 80 ? "text-emerald-400" : summary.completionRate >= 50 ? "text-yellow-400" : "text-rose-400"
                                                                    }`}>
                                                                        {summary.completionRate}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-24 h-1.5 bg-slate-800 rounded-full mx-auto mt-1 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${
                                                                            summary.completionRate >= 80 ? "bg-emerald-500" : summary.completionRate >= 50 ? "bg-yellow-500" : "bg-rose-500"
                                                                        }`}
                                                                        style={{ width: `${Math.min(100, summary.completionRate)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/80">
                                                                No Plan Filled
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5 text-center font-black text-purple-400 border-l border-slate-800/40 text-sm">
                                                        {summary.totalLeads}
                                                    </td>
                                                    <td className="p-3.5 text-center border-l border-slate-800/40">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                            {summary.proofCount} Photos | {summary.geoCount} GPS
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 text-right">
                                                        <button
                                                            onClick={() => toggleUserExpand(summary.user._id)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ml-auto transition-colors ${
                                                                isExpanded
                                                                    ? "bg-cyan-500 text-black font-black"
                                                                    : isDarkMode ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                            }`}
                                                        >
                                                            <span>{isExpanded ? "Hide" : "Details"}</span>
                                                            {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expanded Drawer: User's individual planned & executed tasks */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan="12" className={`p-4 border-b ${isDarkMode ? "bg-slate-950/90 border-cyan-500/30" : "bg-slate-50 border-cyan-500/30"}`}>
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                                                                    <span>Task Breakdown for {summary.user.name} ({summary.tasks.length} tasks)</span>
                                                                    <span className="text-[11px] text-slate-400 lowercase font-normal">
                                                                        {summary.completedPlanned} planned done • {summary.pendingTasksCount} pending plan • {summary.adHocCompleted} direct visits
                                                                    </span>
                                                                </div>

                                                                {summary.tasks.length === 0 ? (
                                                                    <p className="text-xs text-slate-500 font-semibold py-4 text-center">No tasks recorded for this user in selected date range.</p>
                                                                ) : (
                                                                    <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                                                                        <table className="w-full text-left text-[11px]">
                                                                            <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[9px]">
                                                                                <tr>
                                                                                    <th className="p-2.5">Date</th>
                                                                                    <th className="p-2.5">Origin</th>
                                                                                    <th className="p-2.5">Activity Type & Purpose</th>
                                                                                    <th className="p-2.5">Place / School</th>
                                                                                    <th className="p-2.5">Plan Time</th>
                                                                                    <th className="p-2.5 text-center">Execution Status</th>
                                                                                    <th className="p-2.5">Actual Time</th>
                                                                                    <th className="p-2.5 text-center">Outcome</th>
                                                                                    <th className="p-2.5 text-center">Leads</th>
                                                                                    <th className="p-2.5 text-center">Proof / GPS</th>
                                                                                    <th className="p-2.5 text-center">Review</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-800/40 font-medium">
                                                                                {summary.tasks.map((task, tIdx) => (
                                                                                    <tr key={tIdx} className={isDarkMode ? "hover:bg-slate-900/60" : "hover:bg-white"}>
                                                                                        <td className="p-2.5 font-bold text-slate-300">{task.date}</td>
                                                                                        <td className="p-2.5">
                                                                                            {task.isPlanned ? (
                                                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Tomorrow Plan</span>
                                                                                            ) : (
                                                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">Direct Visit</span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="p-2.5 font-bold text-white">
                                                                                            <div>{task.activityType}</div>
                                                                                            <div className="text-[9px] text-slate-400 font-normal">{task.activityPurpose}</div>
                                                                                        </td>
                                                                                        <td className="p-2.5 text-slate-200 font-semibold">{task.place}</td>
                                                                                        <td className="p-2.5 text-slate-400">{task.time}</td>
                                                                                        <td className="p-2.5 text-center">
                                                                                            {task.status === "Completed" || task.status === "Completed (Ad-Hoc)" ? (
                                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                                                                    Completed ✅
                                                                                                </span>
                                                                                            ) : task.status === "Skipped" ? (
                                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700">
                                                                                                    Skipped ⏹
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                                                                                    Pending ⏳
                                                                                                </span>
                                                                                            )}
                                                                                        </td>
                                                                                        <td className="p-2.5 text-slate-300">{task.actualTime || "—"}</td>
                                                                                        <td className="p-2.5 text-center">
                                                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                                                                task.activityStatus === "Success" ? "bg-emerald-500/10 text-emerald-400" :
                                                                                                task.activityStatus === "Failed" ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-400"
                                                                                            }`}>
                                                                                                {task.activityStatus}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="p-2.5 text-center font-bold text-purple-400">{task.leads || 0}</td>
                                                                                        <td className="p-2.5 text-center">
                                                                                            <div className="flex items-center justify-center gap-1.5">
                                                                                                <PhotoProofThumbnail
                                                                                                    photo={task.photo}
                                                                                                    onClick={() => setLightboxPhoto(task.photo)}
                                                                                                    size="w-6 h-6"
                                                                                                />
                                                                                                {task.geoTagged ? (
                                                                                                    <span className="text-emerald-400" title={task.locationName || "GPS verified"}><FaMapMarkerAlt size={12} /></span>
                                                                                                ) : (
                                                                                                    <span className="text-slate-600" title="No GPS tag"><FaMapMarkerAlt size={12} /></span>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="p-2.5 text-center">
                                                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                                                                task.approvalStatus === "Approved" ? "bg-emerald-500/10 text-emerald-400" :
                                                                                                task.approvalStatus === "Rejected" ? "bg-rose-500/10 text-rose-400" : "bg-yellow-500/10 text-yellow-400"
                                                                                            }`}>
                                                                                                {task.approvalStatus}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── VIEW 2: DETAILED TASK MATRIX TABLE ── */}
            {viewMode === "detailed" && (
                <div className={`rounded-2xl border overflow-hidden shadow-xl ${isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200"}`}>
                    <div className="overflow-x-auto max-h-[750px] scrollbar-thin scrollbar-thumb-slate-700">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className={`sticky top-0 z-20 font-black uppercase tracking-wider text-[11px] ${
                                isDarkMode ? "bg-slate-950 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}>
                                <tr className="border-b border-slate-800/60">
                                    <th className="p-3.5 w-12 text-center">#</th>
                                    <th className="p-3.5 min-w-[100px]">Date</th>
                                    <th className="p-3.5 min-w-[170px]">Staff Name & Centre</th>
                                    <th className="p-3.5 min-w-[180px]">Planned Activity & Purpose</th>
                                    <th className="p-3.5 min-w-[180px]">Place / Institution</th>
                                    <th className="p-3.5 min-w-[110px]">Planned Time</th>
                                    <th className="p-3.5 text-center min-w-[140px] bg-emerald-500/5 text-emerald-400 border-l border-emerald-500/20">
                                        Did They Do Task?
                                    </th>
                                    <th className="p-3.5 min-w-[110px]">Actual Time</th>
                                    <th className="p-3.5 text-center min-w-[90px]">Outcome</th>
                                    <th className="p-3.5 text-center min-w-[80px] text-purple-400">Leads</th>
                                    <th className="p-3.5 text-center min-w-[120px]">Proof & Location</th>
                                    <th className="p-3.5 text-center min-w-[110px]">ZM Review</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/50 text-slate-300" : "divide-slate-200 text-slate-700"}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="12" className="py-20 text-center">
                                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                            <p className="text-xs font-bold text-slate-400">Loading Detailed Tasks...</p>
                                        </td>
                                    </tr>
                                ) : (analysisData?.detailedTasks || []).length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="py-20 text-center">
                                            <FaExclamationTriangle className="text-3xl text-slate-600 mx-auto mb-2" />
                                            <p className="text-xs font-bold text-slate-400">No tasks found matching your filter criteria.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    (analysisData.detailedTasks || []).map((t, idx) => (
                                        <tr key={t._id || idx} className={`transition-colors ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                                            <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                                            <td className="p-3.5 font-bold text-cyan-400 whitespace-nowrap">{t.date}</td>
                                            <td className="p-3.5">
                                                <div className="font-extrabold text-white">{t.userName}</div>
                                                <div className="text-[10px] text-slate-400 font-semibold">{t.centres}</div>
                                            </td>
                                            <td className="p-3.5">
                                                <div className="font-extrabold text-white flex items-center gap-1.5">
                                                    <span>{t.activityType}</span>
                                                    {t.isAdHoc ? (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20">Direct Visit</span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">From Plan</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400">{t.activityPurpose}</div>
                                            </td>
                                            <td className="p-3.5 font-semibold text-slate-200">{t.place}</td>
                                            <td className="p-3.5 text-slate-400 font-medium">
                                                <div>{t.time}</div>
                                                {t.estimatedDuration && <div className="text-[10px] text-slate-500">{t.estimatedDuration}</div>}
                                            </td>
                                            <td className="p-3.5 text-center border-l border-emerald-500/10">
                                                {t.isCompleted ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                                        Completed ✅
                                                    </span>
                                                ) : t.status === "Skipped" ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                                                        Skipped ⏹
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                                                        Pending / Not Done ⏳
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3.5 font-semibold text-slate-300">
                                                <div>{t.actualTime}</div>
                                                {t.submittedAt && t.submittedAt !== "—" && (
                                                    <div className="text-[9px] text-slate-500">{t.submittedAt}</div>
                                                )}
                                            </td>
                                            <td className="p-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    t.activityStatus === "Success" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                                                    t.activityStatus === "Failed" ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                                                }`}>
                                                    {t.activityStatus}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-center font-black text-purple-400 text-sm">
                                                {t.leads}
                                            </td>
                                            <td className="p-3.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <PhotoProofThumbnail
                                                        photo={t.photo}
                                                        onClick={() => setLightboxPhoto(t.photo)}
                                                        size="w-7 h-7"
                                                    />
                                                    {t.geoTagged ? (
                                                        <span className="text-emerald-400" title={t.locationName}><FaMapMarkerAlt size={14} /></span>
                                                    ) : (
                                                        <span className="text-slate-700" title="No GPS tag"><FaMapMarkerAlt size={14} /></span>
                                                    )}
                                                </div>
                                                {t.locationName && t.locationName !== "No Geo-Tag" && (
                                                    <div className="text-[9px] text-slate-500 truncate max-w-[110px] mx-auto mt-0.5" title={t.locationName}>
                                                        {t.locationName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    t.approvalStatus === "Approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                    t.approvalStatus === "Rejected" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                                }`}>
                                                    {t.approvalStatus}
                                                </span>
                                                {t.remarks && (
                                                    <div className="text-[9px] text-slate-500 italic mt-0.5 max-w-[100px] truncate mx-auto" title={t.remarks}>
                                                        "{t.remarks}"
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── LIGHTBOX PHOTO MODAL ── */}
            {lightboxPhoto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setLightboxPhoto(null)}
                >
                    <div
                        className="relative max-w-3xl max-h-[90vh] w-full bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <FaCamera className="text-cyan-400" /> Activity Photo Proof
                            </span>
                            <div className="flex items-center gap-3">
                                {typeof lightboxPhoto === "string" && lightboxPhoto.startsWith("http") && (
                                    <a
                                        href={lightboxPhoto}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-semibold"
                                    >
                                        Open Full Size ↗
                                    </a>
                                )}
                                <button
                                    onClick={() => setLightboxPhoto(null)}
                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                                    title="Close"
                                >
                                    <FaTimes size={13} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 overflow-auto max-h-[80vh] flex items-center justify-center bg-black/40">
                            <img
                                src={lightboxPhoto}
                                alt="Activity Proof"
                                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketingAnalysisContent;

