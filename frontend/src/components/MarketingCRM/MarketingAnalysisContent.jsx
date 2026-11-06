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

// Modal Popup for Interactive KPI Card Details
const KpiDetailModal = ({
    modalType,
    onClose,
    userSummary = [],
    detailedTasks = [],
    stats = {},
    dateRangeInfo = {},
    isDarkMode = true,
    onOpenLightbox
}) => {
    const [subTab, setSubTab] = useState(() => {
        if (modalType === "planCompliance") return "pending";
        if (modalType === "leads") return "withLeads";
        return "all";
    });
    const [searchTerm, setSearchTerm] = useState("");

    // Lock body scrolling when modal is open
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Metadata config per card type
    const config = useMemo(() => {
        switch (modalType) {
            case "activeStaff":
                return {
                    title: "Active Marketing Staff Analysis",
                    icon: <FaUsers className="text-cyan-400" size={20} />,
                    accentText: "text-cyan-400",
                    accentBorder: "border-cyan-500/30",
                    accentBg: "bg-cyan-500/10",
                    badge: `${stats.activeStaff || 0} Active / ${stats.totalStaff || 0} Total Staff`,
                    description: "Staff-wise planner status, execution volume, compliance rate, and leads generated"
                };
            case "tomorrowPlan":
                return {
                    title: "Tomorrow Planner Pre-Planned Tasks",
                    icon: <FaTasks className="text-blue-400" size={20} />,
                    accentText: "text-blue-400",
                    accentBorder: "border-blue-500/30",
                    accentBg: "bg-blue-500/10",
                    badge: `${stats.totalPlanned || 0} Pre-Planned Tasks`,
                    description: "Activities scheduled ahead in Tomorrow Planner for the selected date range"
                };
            case "tasksDone":
                return {
                    title: "Total Executed Tasks",
                    icon: <FaCheckCircle className="text-emerald-400" size={20} />,
                    accentText: "text-emerald-400",
                    accentBorder: "border-emerald-500/30",
                    accentBg: "bg-emerald-500/10",
                    badge: `${stats.totalExecutedAll || 0} Executed (${stats.totalCompleted || 0} Plan + ${stats.totalAdHoc || 0} Direct)`,
                    description: "All completed ground visits and activities executed by marketing staff"
                };
            case "planCompliance":
                return {
                    title: "Plan Compliance & Pending Tasks",
                    icon: <FaAward className="text-yellow-400" size={20} />,
                    accentText: "text-yellow-400",
                    accentBorder: "border-yellow-500/30",
                    accentBg: "bg-yellow-500/10",
                    badge: `Compliance: ${stats.overallCompletionRate !== null ? stats.overallCompletionRate + '%' : 'N/A'} • ${stats.totalPending || 0} Pending`,
                    description: "Tracks whether staff fulfilled what was pre-planned in their Tomorrow Planner vs what was left pending"
                };
            case "leads":
                return {
                    title: "Leads Collected Analysis",
                    icon: <FaBullhorn className="text-purple-400" size={20} />,
                    accentText: "text-purple-400",
                    accentBorder: "border-purple-500/30",
                    accentBg: "bg-purple-500/10",
                    badge: `${stats.totalLeads || 0} Total Leads Collected`,
                    description: "Detailed breakdown of leads captured across all executed activities"
                };
            case "proofCompliance":
                return {
                    title: "Photo & GPS Proof Compliance",
                    icon: <FaCamera className="text-orange-400" size={20} />,
                    accentText: "text-orange-400",
                    accentBorder: "border-orange-500/30",
                    accentBg: "bg-orange-500/10",
                    badge: `${stats.totalProofs || 0} Photos • ${stats.totalGeoTagged || 0} GPS Verified`,
                    description: "Verification of photographic evidence and GPS geolocation tags submitted by marketing staff"
                };
            default:
                return {
                    title: "Details",
                    icon: <FaChartLine className="text-cyan-400" size={20} />,
                    accentText: "text-cyan-400",
                    accentBorder: "border-cyan-500/30",
                    accentBg: "bg-cyan-500/10",
                    badge: "",
                    description: ""
                };
        }
    }, [modalType, stats]);

    // Sub-tab definitions
    const tabs = useMemo(() => {
        if (modalType === "activeStaff") {
            const activeCount = userSummary.filter(u => {
                const totalExec = u.totalExecuted !== undefined ? u.totalExecuted : (u.totalExecutedAll || 0);
                const planned = u.plannedTasksCount !== undefined ? u.plannedTasksCount : (u.totalPlanned || 0);
                return totalExec > 0 || planned > 0;
            }).length;
            const inactiveCount = userSummary.length - activeCount;
            return [
                { id: "active", label: `Active Staff (${activeCount})` },
                { id: "all", label: `All Assigned Staff (${userSummary.length})` },
                { id: "inactive", label: `No Activity (${inactiveCount})` }
            ];
        }

        if (modalType === "tomorrowPlan") {
            const plannedTasks = detailedTasks.filter(t => t.isPlanned);
            const doneCount = plannedTasks.filter(t => t.isCompleted).length;
            const pendingCount = plannedTasks.filter(t => !t.isCompleted && t.status !== "Skipped").length;
            const skippedCount = plannedTasks.filter(t => t.status === "Skipped").length;
            return [
                { id: "all", label: `All Pre-Planned (${plannedTasks.length})` },
                { id: "completed", label: `Completed (${doneCount})` },
                { id: "pending", label: `Pending / Not Done (${pendingCount})` },
                { id: "skipped", label: `Skipped (${skippedCount})` }
            ];
        }

        if (modalType === "tasksDone") {
            const executedTasks = detailedTasks.filter(t => t.isCompleted);
            const fromPlan = executedTasks.filter(t => !t.isAdHoc).length;
            const direct = executedTasks.filter(t => t.isAdHoc).length;
            return [
                { id: "all", label: `All Executed (${executedTasks.length})` },
                { id: "fromPlan", label: `From Plan (${fromPlan})` },
                { id: "direct", label: `Direct Visits (${direct})` }
            ];
        }

        if (modalType === "planCompliance") {
            const plannedTasks = detailedTasks.filter(t => t.isPlanned);
            const doneCount = plannedTasks.filter(t => t.isCompleted).length;
            const pendingCount = plannedTasks.filter(t => !t.isCompleted && t.status !== "Skipped").length;
            const skippedCount = plannedTasks.filter(t => t.status === "Skipped").length;
            return [
                { id: "pending", label: `Pending / Not Done (${pendingCount})` },
                { id: "completed", label: `Completed As Planned (${doneCount})` },
                { id: "skipped", label: `Skipped (${skippedCount})` },
                { id: "all", label: `All Pre-Planned (${plannedTasks.length})` }
            ];
        }

        if (modalType === "leads") {
            const executedTasks = detailedTasks.filter(t => t.isCompleted);
            const withLeads = executedTasks.filter(t => Number(t.leads) > 0).length;
            return [
                { id: "withLeads", label: `Activities With Leads (${withLeads})` },
                { id: "all", label: `All Executed (${executedTasks.length})` }
            ];
        }

        if (modalType === "proofCompliance") {
            const executedTasks = detailedTasks.filter(t => t.isCompleted);
            const withPhoto = executedTasks.filter(t => t.photo || (t.photos && t.photos.length > 0)).length;
            const withGeo = executedTasks.filter(t => t.geoTagged).length;
            const missing = executedTasks.filter(t => !t.photo && !t.geoTagged).length;
            return [
                { id: "all", label: `All Executed (${executedTasks.length})` },
                { id: "photo", label: `With Photo (${withPhoto})` },
                { id: "geo", label: `With GPS Tag (${withGeo})` },
                { id: "missing", label: `Missing Proof (${missing})` }
            ];
        }

        return [];
    }, [modalType, userSummary, detailedTasks]);

    // Data filtering per modal type, subTab, and quick search
    const filteredRows = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();

        if (modalType === "activeStaff") {
            let list = userSummary.map(u => ({
                userId: u.user?._id || u.userId || u._id,
                userName: u.user?.name || u.userName || "Staff Member",
                employeeId: u.user?.employeeId || u.employeeId || "",
                userRole: u.user?.role || u.userRole || "marketing",
                centres: Array.isArray(u.user?.centres) ? u.user.centres.join(", ") : (u.centres || "—"),
                zone: u.user?.zone || u.zone || "",
                totalPlanned: u.plannedTasksCount !== undefined ? u.plannedTasksCount : (u.totalPlanned || 0),
                totalCompleted: u.completedPlanned !== undefined ? u.completedPlanned : (u.totalCompleted || 0),
                totalAdHoc: u.adHocCompleted !== undefined ? u.adHocCompleted : (u.totalAdHoc || 0),
                totalExecutedAll: u.totalExecuted !== undefined ? u.totalExecuted : (u.totalExecutedAll || 0),
                totalPending: u.pendingTasksCount !== undefined ? u.pendingTasksCount : (u.totalPending || 0),
                totalSkipped: u.skippedTasksCount !== undefined ? u.skippedTasksCount : (u.totalSkipped || 0),
                completionRate: u.completionRate !== undefined ? u.completionRate : null,
                totalLeads: u.totalLeads || 0,
                proofCount: u.proofCount || 0,
                geoCount: u.geoCount || 0,
                hasActivity: ((u.totalExecuted !== undefined ? u.totalExecuted : (u.totalExecutedAll || 0)) > 0) || ((u.plannedTasksCount !== undefined ? u.plannedTasksCount : (u.totalPlanned || 0)) > 0)
            }));

            if (subTab === "active") {
                list = list.filter(u => u.hasActivity);
            } else if (subTab === "inactive") {
                list = list.filter(u => !u.hasActivity);
            }
            if (q) {
                list = list.filter(u =>
                    (u.userName || "").toLowerCase().includes(q) ||
                    (u.employeeId || "").toLowerCase().includes(q) ||
                    (u.userRole || "").toLowerCase().includes(q) ||
                    (u.centres || "").toLowerCase().includes(q) ||
                    (u.zone || "").toLowerCase().includes(q)
                );
            }
            return list;
        }

        let tasks = [...detailedTasks];

        if (modalType === "tomorrowPlan") {
            tasks = tasks.filter(t => t.isPlanned);
            if (subTab === "completed") tasks = tasks.filter(t => t.isCompleted);
            else if (subTab === "pending") tasks = tasks.filter(t => !t.isCompleted && t.status !== "Skipped");
            else if (subTab === "skipped") tasks = tasks.filter(t => t.status === "Skipped");
        } else if (modalType === "tasksDone") {
            tasks = tasks.filter(t => t.isCompleted);
            if (subTab === "fromPlan") tasks = tasks.filter(t => !t.isAdHoc);
            else if (subTab === "direct") tasks = tasks.filter(t => t.isAdHoc);
        } else if (modalType === "planCompliance") {
            tasks = tasks.filter(t => t.isPlanned);
            if (subTab === "pending") tasks = tasks.filter(t => !t.isCompleted && t.status !== "Skipped");
            else if (subTab === "completed") tasks = tasks.filter(t => t.isCompleted);
            else if (subTab === "skipped") tasks = tasks.filter(t => t.status === "Skipped");
        } else if (modalType === "leads") {
            if (subTab === "withLeads") tasks = tasks.filter(t => Number(t.leads) > 0);
            else tasks = tasks.filter(t => t.isCompleted);
        } else if (modalType === "proofCompliance") {
            tasks = tasks.filter(t => t.isCompleted);
            if (subTab === "photo") tasks = tasks.filter(t => t.photo || (t.photos && t.photos.length > 0));
            else if (subTab === "geo") tasks = tasks.filter(t => t.geoTagged);
            else if (subTab === "missing") tasks = tasks.filter(t => !t.photo && !t.geoTagged);
        }

        if (q) {
            tasks = tasks.filter(t =>
                (t.userName || "").toLowerCase().includes(q) ||
                (t.centres || "").toLowerCase().includes(q) ||
                (t.place || "").toLowerCase().includes(q) ||
                (t.activityType || "").toLowerCase().includes(q) ||
                (t.activityPurpose || "").toLowerCase().includes(q) ||
                (t.locationName || "").toLowerCase().includes(q) ||
                (t.notes || "").toLowerCase().includes(q)
            );
        }

        return tasks;
    }, [modalType, subTab, searchTerm, userSummary, detailedTasks]);

    // Export Excel
    const handleExportExcel = () => {
        try {
            let exportData = [];
            if (modalType === "activeStaff") {
                exportData = filteredRows.map((u, i) => ({
                    "#": i + 1,
                    "Staff Name": u.userName || "",
                    "Employee ID": u.employeeId || "",
                    "Role": u.userRole || "",
                    "Centres": u.centres || "",
                    "Zone": u.zone || "",
                    "Planned Tasks": u.totalPlanned || 0,
                    "Tasks Done": u.totalExecutedAll || 0,
                    "From Plan": u.totalCompleted || 0,
                    "Direct Visits": u.totalAdHoc || 0,
                    "Pending Tasks": u.totalPending || 0,
                    "Skipped Tasks": u.totalSkipped || 0,
                    "Plan Compliance %": u.completionRate !== null ? `${u.completionRate}%` : "N/A",
                    "Leads": u.totalLeads || 0,
                    "Photos Submitted": u.proofCount || 0,
                    "GPS Tags Verified": u.geoCount || 0,
                    "Status": ((u.totalExecutedAll || 0) > 0 || (u.totalPlanned || 0) > 0) ? "Active" : "Inactive"
                }));
            } else {
                exportData = filteredRows.map((t, i) => ({
                    "#": i + 1,
                    "Date": t.date || "",
                    "Staff Name": t.userName || "",
                    "Centres": t.centres || "",
                    "Task Type": t.isPlanned ? "From Plan" : "Direct Visit",
                    "Activity Type": t.activityType || "",
                    "Activity Purpose": t.activityPurpose || "",
                    "Place / School": t.place || "",
                    "Scheduled Time": t.time || "",
                    "Actual Time": t.actualTime || "",
                    "Execution Status": t.status || (t.isCompleted ? "Completed" : "Pending"),
                    "Activity Outcome": t.activityStatus || "",
                    "Leads": t.leads || "0",
                    "Photo Proof": t.photo ? "Attached" : "No Photo",
                    "GPS Tag": t.geoTagged ? "Verified" : "No GPS",
                    "Location Name": t.locationName || "",
                    "ZM Review Status": t.approvalStatus || ""
                }));
            }

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Details");
            const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            saveAs(new Blob([buf], { type: "application/octet-stream" }), `${modalType}_details.xlsx`);
            toast.success("Excel exported successfully!");
        } catch (err) {
            console.error("Export error:", err);
            toast.error("Failed to export modal data");
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                    isDarkMode ? "bg-[#13171f] border-slate-700/80 text-slate-200" : "bg-white border-slate-200 text-slate-800"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── MODAL HEADER ── */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${
                    isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${config.accentBg} ${config.accentBorder}`}>
                            {config.icon}
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-base font-black tracking-wide text-white">
                                    {config.title}
                                </h3>
                                {config.badge && (
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${config.accentBg} ${config.accentBorder} ${config.accentText}`}>
                                        {config.badge}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                {config.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-colors shadow-sm"
                            title="Export this modal table to Excel"
                        >
                            <FaFileExcel size={13} />
                            <span>Export</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
                            title="Close (Esc)"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                </div>

                {/* ── TOOLBAR: TABS + QUICK SEARCH ── */}
                <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
                    isDarkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-100"
                }`}>
                    {/* Sub-tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                        {tabs.map((tab) => {
                            const isActive = subTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSubTab(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        isActive
                                            ? `${config.accentBg} ${config.accentText} border ${config.accentBorder} shadow`
                                            : isDarkMode
                                            ? "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Search */}
                    <div className="relative min-w-[240px] max-w-xs flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Filter in this modal..."
                            className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-xs font-medium border focus:outline-none transition-colors ${
                                isDarkMode
                                    ? "bg-slate-950/70 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500"
                                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500"
                            }`}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                            >
                                <FaTimes />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── MODAL TABLE BODY ── */}
                <div className="flex-1 overflow-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-700">
                    {modalType === "activeStaff" ? (
                        /* VIEW: ACTIVE STAFF TABLE */
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className={`sticky top-0 z-10 font-black uppercase tracking-wider text-[11px] ${
                                isDarkMode ? "bg-slate-950 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}>
                                <tr className="border-b border-slate-800/80">
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3 min-w-[180px]">Staff Name & Role</th>
                                    <th className="p-3 min-w-[150px]">Centres / Location</th>
                                    <th className="p-3 text-center min-w-[90px] text-blue-400">Tomorrow Plan</th>
                                    <th className="p-3 text-center min-w-[120px] text-emerald-400">Tasks Done</th>
                                    <th className="p-3 text-center min-w-[80px] text-amber-400">Pending</th>
                                    <th className="p-3 text-center min-w-[110px]">Compliance</th>
                                    <th className="p-3 text-center min-w-[80px] text-purple-400">Leads</th>
                                    <th className="p-3 text-center min-w-[100px] text-orange-400">Proof / Geo</th>
                                    <th className="p-3 text-center min-w-[100px]">Status</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/50 text-slate-300" : "divide-slate-200 text-slate-700"}`}>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="py-16 text-center text-slate-500">
                                            <FaExclamationTriangle className="text-3xl mx-auto mb-2 text-slate-600" />
                                            <p className="text-xs font-bold">No staff matching the criteria.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((u, idx) => {
                                        const isActive = (u.totalExecutedAll || 0) > 0 || (u.totalPlanned || 0) > 0;
                                        return (
                                            <tr key={u.userId || idx} className={`transition-colors ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                                                <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                                                <td className="p-3">
                                                    <div className="font-extrabold text-white">{u.userName}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                            {u.userRole || "Marketing"}
                                                        </span>
                                                        {u.employeeId && (
                                                            <span className="text-[10px] text-slate-500">ID: {u.employeeId}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-semibold text-slate-300">{u.centres || "—"}</div>
                                                    <div className="text-[10px] text-slate-500">{u.zone || ""}</div>
                                                </td>
                                                <td className="p-3 text-center font-black text-blue-400 text-sm">
                                                    {u.totalPlanned || 0}
                                                </td>
                                                <td className="p-3 text-center font-black text-emerald-400 text-sm">
                                                    <div>{u.totalExecutedAll || 0}</div>
                                                    <div className="text-[9px] text-slate-500 font-normal">
                                                        {u.totalCompleted || 0} plan + {u.totalAdHoc || 0} direct
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center font-bold text-amber-400">
                                                    {u.totalPending || 0}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                                        u.completionRate === null ? "bg-slate-800 text-slate-400" :
                                                        u.completionRate >= 80 ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                                                        u.completionRate >= 50 ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" :
                                                        "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                                    }`}>
                                                        {u.completionRate !== null ? `${u.completionRate}%` : "N/A"}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center font-black text-purple-400">
                                                    {u.totalLeads || 0}
                                                </td>
                                                <td className="p-3 text-center font-semibold text-orange-400 text-[11px]">
                                                    {u.proofCount || 0} Photos | {u.geoCount || 0} GPS
                                                </td>
                                                <td className="p-3 text-center">
                                                    {isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                                            Inactive
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    ) : (
                        /* VIEW: TASK-BASED DETAILED TABLE */
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className={`sticky top-0 z-10 font-black uppercase tracking-wider text-[11px] ${
                                isDarkMode ? "bg-slate-950 text-slate-300" : "bg-slate-100 text-slate-700"
                            }`}>
                                <tr className="border-b border-slate-800/80">
                                    <th className="p-3 w-12 text-center">#</th>
                                    <th className="p-3 min-w-[95px]">Date</th>
                                    <th className="p-3 min-w-[170px]">Staff Name & Centre</th>
                                    <th className="p-3 min-w-[180px]">Activity & Purpose</th>
                                    <th className="p-3 min-w-[170px]">Place / Institution</th>
                                    <th className="p-3 min-w-[110px]">Time</th>
                                    <th className="p-3 text-center min-w-[130px]">Status</th>
                                    <th className="p-3 text-center min-w-[90px]">Outcome</th>
                                    <th className="p-3 text-center min-w-[70px] text-purple-400">Leads</th>
                                    <th className="p-3 text-center min-w-[110px]">Proof & Geo</th>
                                    <th className="p-3 text-center min-w-[100px]">Review</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? "divide-slate-800/50 text-slate-300" : "divide-slate-200 text-slate-700"}`}>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan="11" className="py-16 text-center text-slate-500">
                                            <FaExclamationTriangle className="text-3xl mx-auto mb-2 text-slate-600" />
                                            <p className="text-xs font-bold">No tasks matching the criteria.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map((t, idx) => (
                                        <tr key={t._id || idx} className={`transition-colors ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}`}>
                                            <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                                            <td className="p-3 font-bold text-cyan-400 whitespace-nowrap">{t.date}</td>
                                            <td className="p-3">
                                                <div className="font-extrabold text-white">{t.userName}</div>
                                                <div className="text-[10px] text-slate-400 font-semibold">{t.centres}</div>
                                            </td>
                                            <td className="p-3">
                                                <div className="font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                                                    <span>{t.activityType}</span>
                                                    {t.isAdHoc ? (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20">Direct</span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-500/10 text-blue-400 border border-blue-500/20">Plan</span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400">{t.activityPurpose}</div>
                                            </td>
                                            <td className="p-3 font-semibold text-slate-200">{t.place}</td>
                                            <td className="p-3 text-slate-400 font-medium">
                                                <div>{t.actualTime && t.actualTime !== "—" ? t.actualTime : t.time}</div>
                                                {t.submittedAt && t.submittedAt !== "—" && (
                                                    <div className="text-[9px] text-slate-500">{t.submittedAt}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {t.isCompleted ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                                        Completed ✅
                                                    </span>
                                                ) : t.status === "Skipped" ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                                                        Skipped ⏹
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                                                        Pending ⏳
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    t.activityStatus === "Success" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                                                    t.activityStatus === "Failed" ? "bg-rose-500/15 text-rose-400 border border-rose-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                                                }`}>
                                                    {t.activityStatus}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center font-black text-purple-400 text-sm">
                                                {t.leads}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <PhotoProofThumbnail
                                                        photo={t.photo}
                                                        onClick={() => onOpenLightbox(t.photo)}
                                                        size="w-6 h-6"
                                                    />
                                                    {t.geoTagged ? (
                                                        <span className="text-emerald-400" title={t.locationName || "GPS Verified"}><FaMapMarkerAlt size={13} /></span>
                                                    ) : (
                                                        <span className="text-slate-600" title="No GPS tag"><FaMapMarkerAlt size={13} /></span>
                                                    )}
                                                </div>
                                                {t.locationName && t.locationName !== "No Geo-Tag" && (
                                                    <div className="text-[9px] text-slate-500 truncate max-w-[100px] mx-auto mt-0.5" title={t.locationName}>
                                                        {t.locationName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    t.approvalStatus === "Approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                    t.approvalStatus === "Rejected" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                                }`}>
                                                    {t.approvalStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── MODAL FOOTER ── */}
                <div className={`px-6 py-3 border-t flex items-center justify-between text-xs ${
                    isDarkMode ? "bg-slate-950/70 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                }`}>
                    <div>
                        Showing <span className="font-bold text-white">{filteredRows.length}</span> record{filteredRows.length === 1 ? "" : "s"}
                        {searchTerm && <span> matching "<span className="text-cyan-400">{searchTerm}</span>"</span>}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition-colors border border-slate-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
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

    // Active KPI Details Modal Popup ("activeStaff" | "tomorrowPlan" | "tasksDone" | "planCompliance" | "leads" | "proofCompliance")
    const [activeKpiModal, setActiveKpiModal] = useState(null);

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
                <div
                    onClick={() => setActiveKpiModal("activeStaff")}
                    className={`p-4 rounded-2xl border cursor-pointer hover:border-cyan-500/80 hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5 transition-all group relative ${
                        isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
                    }`}
                    title="Click to view Active Staff details in modal popup"
                >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider group-hover:text-cyan-400 transition-colors">Active Staff</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                            <FaUsers className="text-cyan-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-cyan-400">
                        {stats.activeStaff || 0}
                        <span className="text-xs font-medium text-slate-400 ml-1.5">/ {stats.totalStaff || 0}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center justify-between">
                        <span>Total marketing users</span>
                        <span className="text-cyan-400/80 text-[9px] group-hover:underline">Click for details</span>
                    </p>
                </div>

                {/* 2. Tomorrow Plan (Planned) */}
                <div
                    onClick={() => setActiveKpiModal("tomorrowPlan")}
                    className={`p-4 rounded-2xl border cursor-pointer hover:border-blue-500/80 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all group relative ${
                        isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
                    }`}
                    title="Click to view Tomorrow Planner tasks in modal popup"
                >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider group-hover:text-blue-400 transition-colors">Tomorrow Plan</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/15 text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                            <FaTasks className="text-blue-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-blue-400">
                        {stats.totalPlanned || 0}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center justify-between">
                        <span>Pre-planned tasks</span>
                        <span className="text-blue-400/80 text-[9px] group-hover:underline">Click for details</span>
                    </p>
                </div>

                {/* 3. Total Tasks Done */}
                <div
                    onClick={() => setActiveKpiModal("tasksDone")}
                    className={`p-4 rounded-2xl border cursor-pointer hover:border-emerald-500/80 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all group relative ${
                        isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
                    }`}
                    title="Click to view Total Executed Tasks in modal popup"
                >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider group-hover:text-emerald-400 transition-colors">Total Tasks Done</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                            <FaCheckCircle className="text-emerald-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-400">
                        {stats.totalExecutedAll || 0}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1 flex items-center justify-between">
                        <span>
                            <span className="text-emerald-400 font-bold">{stats.totalCompleted || 0} from plan</span>
                            <span className="mx-1">•</span>
                            <span className="text-teal-400 font-bold">{stats.totalAdHoc || 0} direct</span>
                        </span>
                        <span className="text-emerald-400/80 text-[9px] group-hover:underline">Click for details</span>
                    </p>
                </div>

                {/* 4. Plan Compliance Rate */}
                <div
                    onClick={() => setActiveKpiModal("planCompliance")}
                    className={`p-4 rounded-2xl border cursor-pointer hover:border-yellow-500/80 hover:shadow-lg hover:shadow-yellow-500/10 hover:-translate-y-0.5 transition-all group relative ${
                        isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
                    }`}
                    title="Click to view Plan Compliance & Pending Tasks in modal popup"
                >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider group-hover:text-yellow-400 transition-colors">Plan Compliance</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1 py-0.2 rounded bg-yellow-500/15 text-yellow-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                            <FaAward className="text-yellow-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                    <div className={`text-2xl font-black ${
                        stats.overallCompletionRate === null ? "text-slate-400" :
                        stats.overallCompletionRate >= 80 ? "text-emerald-400" : stats.overallCompletionRate >= 50 ? "text-yellow-400" : "text-rose-400"
                    }`}>
                        {stats.overallCompletionRate !== null ? `${stats.overallCompletionRate}%` : "N/A"}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center justify-between">
                        <span>{stats.overallCompletionRate !== null ? `${stats.totalPending || 0} pending planned tasks` : "No tomorrow plan filled"}</span>
                        <span className="text-yellow-400/80 text-[9px] group-hover:underline">Click for details</span>
                    </p>
                </div>

                {/* 5. Total Leads Collected */}
                <div
                    onClick={() => setActiveKpiModal("leads")}
                    className={`p-4 rounded-2xl border cursor-pointer hover:border-purple-500/80 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all group relative ${
                        isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
                    }`}
                    title="Click to view Leads Collected in modal popup"
                >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider group-hover:text-purple-400 transition-colors">Leads Collected</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/15 text-purple-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                            <FaBullhorn className="text-purple-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-purple-400">
                        {stats.totalLeads || 0}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center justify-between">
                        <span>From executed tasks</span>
                        <span className="text-purple-400/80 text-[9px] group-hover:underline">Click for details</span>
                    </p>
                </div>

                {/* 6. Proof & Geo-Tag Compliance */}
                <div
                    onClick={() => setActiveKpiModal("proofCompliance")}
                    className={`p-4 rounded-2xl border cursor-pointer hover:border-orange-500/80 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-0.5 transition-all group relative ${
                        isDarkMode ? "bg-[#161b22] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
                    }`}
                    title="Click to view Proof & GPS Compliance in modal popup"
                >
                    <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                        <span className="uppercase text-[10px] tracking-wider group-hover:text-orange-400 transition-colors">Proof Compliance</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] px-1 py-0.2 rounded bg-orange-500/15 text-orange-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View ↗</span>
                            <FaCamera className="text-orange-400 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-orange-400">
                        {stats.totalProofs || 0}
                        <span className="text-xs font-medium text-slate-400 ml-1.5">({stats.totalGeoTagged || 0} Geo)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1 flex items-center justify-between">
                        <span>Photo & GPS verified</span>
                        <span className="text-orange-400/80 text-[9px] group-hover:underline">Click for details</span>
                    </p>
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

            {/* ── KPI DETAILS MODAL POPUP ── */}
            {activeKpiModal && (
                <KpiDetailModal
                    modalType={activeKpiModal}
                    onClose={() => setActiveKpiModal(null)}
                    userSummary={analysisData?.userSummary || []}
                    detailedTasks={analysisData?.detailedTasks || []}
                    stats={stats}
                    dateRangeInfo={analysisData?.dateRangeInfo}
                    isDarkMode={isDarkMode}
                    onOpenLightbox={(photo) => setLightboxPhoto(photo)}
                />
            )}

            {/* ── LIGHTBOX PHOTO MODAL ── */}
            {lightboxPhoto && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
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

