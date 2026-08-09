import React, { useState, useEffect, useMemo } from "react";
import CustomMultiSelect from "../common/CustomMultiSelect";
import {
    FaTrophy, FaMedal, FaMapMarkerAlt, FaCalendarAlt, FaUserCheck,
    FaSearch, FaSync, FaEye, FaCamera, FaRoute, FaFilter, FaAward,
    FaBuilding, FaPhoneAlt, FaEnvelope, FaExclamationTriangle, FaCheckCircle, FaTimes, FaExternalLinkAlt,
    FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import { toast } from "react-toastify";

const DATE_RANGE_OPTIONS = [
    { value: "ALL TIME", label: "ALL TIME" },
    { value: "TODAY", label: "TODAY" },
    { value: "YESTERDAY", label: "YESTERDAY" },
    { value: "LAST 7 DAYS", label: "LAST 7 DAYS" },
    { value: "THIS MONTH", label: "THIS MONTH" },
    { value: "LAST MONTH", label: "LAST MONTH" },
    { value: "CUSTOM RANGE", label: "CUSTOM RANGE" }
];

const formatCentreName = (cStr) => {
    if (!cStr) return "All Centres";
    const str = String(cStr).trim();
    if (str.match(/^[0-9a-fA-F]{24}$/)) {
        return "General";
    }
    return str;
};

const getPhotoUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const cleanBase = baseUrl.replace(/\/api\/?$/, "");
    return `${cleanBase}/${url.replace(/^\//, "")}`;
};

const TeamPerformanceContent = ({ isDarkMode, availableCenters = [] }) => {
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState([]);
    const [overallStats, setOverallStats] = useState({
        totalFieldVisits: 0,
        activePersonnelCount: 0,
        totalSchoolsVisited: 0,
        totalLeadsCollected: 0,
        topPerformer: null
    });
    const [leaderboard, setLeaderboard] = useState([]);

    // Filters
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [backendActivityTypes, setBackendActivityTypes] = useState([]);
    const [dateRange, setDateRange] = useState("THIS MONTH");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state for viewing individual staff's visit logs
    const [selectedStaffForModal, setSelectedStaffForModal] = useState(null);

    // Modal state for viewing individual staff's detailed lead entries
    const [selectedStaffForLeadsModal, setSelectedStaffForLeadsModal] = useState(null);
    const [leadModalSearch, setLeadModalSearch] = useState("");
    const [leadModalTypeFilter, setLeadModalTypeFilter] = useState("ALL");

    // Modal state for viewing individual staff's detailed unique schools
    const [selectedStaffForSchoolsModal, setSelectedStaffForSchoolsModal] = useState(null);
    const [schoolModalSearch, setSchoolModalSearch] = useState("");

    // Modal state for viewing a specific school's full visit & feedback history
    const [selectedSchoolForVisitsModal, setSelectedSchoolForVisitsModal] = useState(null);

    // Lightbox modal state for viewing photo proof images full size
    const [previewPhotos, setPreviewPhotos] = useState(null);
    const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);

    const centreOptions = useMemo(() => {
        return availableCenters.map(c => ({
            value: c.centreName || c.name || c,
            label: c.centreName || c.name || c
        }));
    }, [availableCenters]);

    const DEFAULT_ACTIVITY_TYPES = useMemo(() => [
        "WEBSITE",
        "META",
        "FOUNDATION",
        "MOCK",
        "REPEATER",
        "2 YEAR",
        "Leafletting",
        "Others Activity",
        "DIGITAL LEAD",
        "Tuition Visit",
        "Data Calling",
        "Referral Drive",
        "Shikkha Bondhu",
        "School Visit",
        "SURVEY FORM",
        "Walk In",
        "Tele Enquiry",
        "Market Activity",
        "Canopy",
        "Seminar",
        "Workshop",
        "Assigned Task"
    ], []);

    const activityTypeOptions = useMemo(() => {
        const combined = Array.from(new Set([...DEFAULT_ACTIVITY_TYPES, ...backendActivityTypes]));
        return combined.map(act => ({
            value: act,
            label: act
        }));
    }, [DEFAULT_ACTIVITY_TYPES, backendActivityTypes]);

    const extractSelectValues = (val) => {
        if (!val) return "";
        if (Array.isArray(val)) {
            return val.map(v => {
                if (!v) return "";
                if (typeof v === "object") return v.value || v.label || "";
                return String(v);
            }).filter(Boolean).join(",");
        }
        if (typeof val === "object") return val.value || val.label || "";
        return String(val);
    };

    const fetchTeamPerformance = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            const centersStr = extractSelectValues(selectedCentres);
            if (centersStr) {
                params.append("centers", centersStr);
            }

            const activitiesStr = extractSelectValues(selectedActivities);
            if (activitiesStr) {
                params.append("activities", activitiesStr);
            }

            // Standardize date range parameter
            let apiDateRange = "This Month";
            if (dateRange === "ALL TIME") apiDateRange = "All Time";
            else if (dateRange === "TODAY") apiDateRange = "Today";
            else if (dateRange === "YESTERDAY") apiDateRange = "Yesterday";
            else if (dateRange === "LAST 7 DAYS") apiDateRange = "Last 7 Days";
            else if (dateRange === "THIS MONTH") apiDateRange = "This Month";
            else if (dateRange === "LAST MONTH") apiDateRange = "Last Month";
            else if (dateRange === "CUSTOM RANGE") apiDateRange = "Custom Range";

            params.append("dateRange", apiDateRange);
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            if (searchQuery) params.append("search", searchQuery);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/marketing/team-performance?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setPerformanceData(data.teamPerformance || []);
                setOverallStats(data.overallStats || {});
                setLeaderboard(data.leaderboard || []);
                if (data.availableActivityTypes && Array.isArray(data.availableActivityTypes)) {
                    setBackendActivityTypes(data.availableActivityTypes);
                }
            } else {
                toast.error("Failed to load team performance data");
            }
        } catch (err) {
            console.error("Team Performance Fetch Error:", err);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamPerformance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange]);

    const handleApplyFilters = () => {
        fetchTeamPerformance();
    };

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedActivities([]);
        setDateRange("THIS MONTH");
        setStartDate("");
        setEndDate("");
        setSearchQuery("");
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* TOP HEADER & FILTERS BAR */}
            <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-md'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <FaAward className="text-cyan-400" /> Executive Analytics
                            </span>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                                Live Field Tracking
                            </span>
                        </div>
                        <h2 className={`text-2xl font-black italic uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Marketing <span className="text-cyan-500">Team Performance</span>
                        </h2>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                            Track field visit volume, activity frequency, and top marketing executives across centres
                        </p>
                    </div>

                    <button
                        onClick={fetchTeamPerformance}
                        className={`px-4 py-2.5 rounded-xl border text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 ${
                            isDarkMode
                                ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        <FaSync className={loading ? "animate-spin text-cyan-400" : "text-cyan-500"} /> Refresh Performance
                    </button>
                </div>

                {/* FILTER CONTROLS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
                    {/* Multi-Selection Centre Dropdown */}
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                            Centres
                        </label>
                        <CustomMultiSelect
                            options={centreOptions}
                            value={selectedCentres}
                            onChange={setSelectedCentres}
                            placeholder="All Centres"
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* Multi-Selection Activity Type Dropdown */}
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                            Activity Types
                        </label>
                        <CustomMultiSelect
                            options={activityTypeOptions}
                            value={selectedActivities}
                            onChange={setSelectedActivities}
                            placeholder="All Activity Types"
                            isDarkMode={isDarkMode}
                        />
                    </div>

                    {/* Date Range Dropdown */}
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                            Date Range
                        </label>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className={`w-full border rounded-xl py-2.5 px-3 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all cursor-pointer ${
                                isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                            }`}
                        >
                            {DATE_RANGE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value} className={isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Date Inputs if Custom Range is selected */}
                    {dateRange === "CUSTOM RANGE" && (
                        <>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">From Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`w-full border rounded-xl py-2 px-3 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${
                                        isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                    }`}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">To Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`w-full border rounded-xl py-2 px-3 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${
                                        isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                    }`}
                                />
                            </div>
                        </>
                    )}

                    {/* Search Input */}
                    <div className="lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                            Search Staff
                        </label>
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
                            <input
                                type="text"
                                placeholder="Search by name/email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full border rounded-xl py-2 pl-8 pr-3 font-bold text-xs outline-none focus:border-cyan-500/50 transition-all ${
                                    isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                                }`}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleApplyFilters}
                            className="flex-1 py-2.5 bg-cyan-500 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20"
                        >
                            Apply
                        </button>
                        <button
                            onClick={handleResetFilters}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                                isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                            }`}
                            title="Reset Filters"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* OVERALL PERFORMANCE SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Activities & Visits</span>
                        <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                            <FaRoute />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter text-cyan-400">
                        {overallStats.totalActivitiesDone || overallStats.totalFieldVisits || 0}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-wider">Total activities & field visits</p>
                </div>

                <div className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Staff On Ground</span>
                        <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                            <FaUserCheck />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter text-emerald-400">
                        {overallStats.activePersonnelCount || 0}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-wider">Executives with logged activities</p>
                </div>

                <div className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Schools & Venues Reached</span>
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                            <FaBuilding />
                        </div>
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter text-amber-400">
                        {overallStats.totalSchoolsVisited || 0}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-wider">Distinct institutions covered</p>
                </div>

                <div className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Top Active Executive</span>
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                            <FaTrophy />
                        </div>
                    </div>
                    <h3 className="text-xl font-black italic tracking-tight text-purple-400 truncate">
                        {overallStats.topPerformer ? overallStats.topPerformer.name : "N/A"}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-wider truncate">
                        {overallStats.topPerformer ? `${overallStats.topPerformer.totalActivities} activities logged` : "No activities logged yet"}
                    </p>
                </div>
            </div>

            {/* LEADERBOARD PODIUM CARDS */}
            {leaderboard && leaderboard.length > 0 && (
                <div className="space-y-4">
                    <h3 className={`text-lg font-black uppercase italic tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        🏆 Most Active <span className="text-cyan-500">Marketing Personnel</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {leaderboard.map((person, idx) => {
                            const isFirst = idx === 0;
                            const isSecond = idx === 1;
                            const isThird = idx === 2;

                            const cardStyle = isFirst
                                ? 'bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40 shadow-xl shadow-amber-500/10'
                                : isSecond
                                ? 'bg-gradient-to-b from-slate-400/15 via-slate-400/5 to-transparent border-slate-400/30'
                                : 'bg-gradient-to-b from-amber-700/15 via-amber-700/5 to-transparent border-amber-700/30';

                            const badgeColor = isFirst
                                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                                : isSecond
                                ? 'bg-slate-300 text-black'
                                : 'bg-amber-700 text-white';

                            return (
                                <div
                                    key={person.userId}
                                    className={`p-6 rounded-3xl border relative flex flex-col justify-between transition-all hover:scale-[1.02] ${
                                        isDarkMode ? 'bg-[#131619]' : 'bg-white'
                                    } ${cardStyle}`}
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${badgeColor}`}>
                                                {isFirst ? <FaTrophy /> : isSecond ? <FaMedal /> : `#${idx + 1}`}
                                            </div>
                                            <div>
                                                <h4 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {person.name}
                                                </h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {person.designation || person.role}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            Rank #{person.rank}
                                        </span>
                                    </div>

                                    <div className="space-y-3 my-2">
                                        <div className="flex justify-between items-center text-xs font-bold">
                                            <span className="text-gray-400 uppercase tracking-wider">TOTAL ACTIVITIES</span>
                                            <span className="font-black text-cyan-400 text-base">{person.totalActivities}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold">
                                            <span className="text-gray-400 uppercase tracking-wider">UNIQUE SCHOOLS</span>
                                            <button
                                                onClick={() => {
                                                    setSelectedStaffForSchoolsModal(person);
                                                    setSchoolModalSearch("");
                                                }}
                                                className="font-black text-amber-400 text-sm hover:underline hover:text-amber-300 cursor-pointer bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 transition-all hover:scale-105"
                                                title="Click to view detailed unique schools list"
                                            >
                                                {person.uniqueSchoolsVisitedCount}
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-bold">
                                            <span className="text-gray-400 uppercase tracking-wider">LEADS COLLECTED</span>
                                            <button
                                                onClick={() => {
                                                    setSelectedStaffForLeadsModal(person);
                                                    setLeadModalSearch("");
                                                    setLeadModalTypeFilter("ALL");
                                                }}
                                                className="font-black text-purple-400 text-sm hover:underline hover:text-purple-300 cursor-pointer bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 transition-all hover:scale-105"
                                                title="Click to view detailed lead details"
                                            >
                                                {person.totalLeads}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Activity breakdown pill badges */}
                                    {person.activityBreakdown && Object.keys(person.activityBreakdown).length > 0 && (
                                        <div className="flex flex-wrap gap-1 my-2 pt-2 border-t border-gray-800/30">
                                            {Object.entries(person.activityBreakdown).map(([actType, count]) => (
                                                <span key={actType} className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                                    {actType}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-gray-800/40 flex items-center justify-between text-[10px] font-bold">
                                        <span className="text-gray-400">
                                            {person.centres && person.centres.length > 0 ? person.centres.map(formatCentreName).slice(0, 2).join(", ") : "All Centres"}
                                        </span>
                                        <button
                                            onClick={() => setSelectedStaffForModal(person)}
                                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-black font-black uppercase tracking-widest transition-all"
                                        >
                                            View Logs
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* DETAILED TEAM PERFORMANCE TABLE */}
            <div className={`rounded-3xl border overflow-hidden ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100 shadow-xl'}`}>
                <div className="p-6 border-b border-gray-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className={`text-lg font-black uppercase italic tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Marketing Personnel <span className="text-cyan-500">Activity Roster</span>
                        </h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                            Showing all activity counts, types breakdown, schools covered, and leads
                        </p>
                    </div>

                    <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">
                        Total Staff: {performanceData.length}
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-900/50 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                <th className="p-5">Rank & Personnel</th>
                                <th className="p-5">Centres</th>
                                <th className="p-5 text-center">Total Activities</th>
                                <th className="p-5">Activity Breakdown</th>
                                <th className="p-5 text-center">Unique Schools</th>
                                <th className="p-5 text-center">Leads Gathered</th>
                                <th className="p-5">Last Activity Date</th>
                                <th className="p-5 text-center">Activity Status</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="animate-spin h-8 w-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 animate-pulse">Loading Marketing Performance Data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : performanceData.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-16 text-center italic text-gray-500 font-bold uppercase tracking-widest">
                                        No marketing personnel performance records found for selected filters
                                    </td>
                                </tr>
                            ) : (
                                performanceData.map((staff) => {
                                    const statusBadge = staff.activityScore === "Highly Active"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : staff.activityScore === "Moderately Active"
                                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                        : "bg-gray-500/10 text-gray-400 border-gray-500/20";

                                    return (
                                        <tr key={staff.userId} className="hover:bg-cyan-500/5 transition-all text-xs font-bold">
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                                        staff.rank === 1 ? 'bg-amber-500 text-black' : staff.rank === 2 ? 'bg-slate-300 text-black' : staff.rank === 3 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-300'
                                                    }`}>
                                                        #{staff.rank}
                                                    </span>
                                                    <div>
                                                        <div className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                            {staff.name}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                            {staff.designation || staff.role}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-5">
                                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                    {staff.centres && staff.centres.length > 0 ? (
                                                        staff.centres.map(formatCentreName).slice(0, 2).map((c, i) => (
                                                            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 truncate">
                                                                {c}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-500 text-[10px]">All Centres</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-5 text-center">
                                                <span className="text-sm font-black text-cyan-400">
                                                    {staff.totalActivities}
                                                </span>
                                            </td>

                                            <td className="p-5">
                                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                    {staff.activityBreakdown && Object.keys(staff.activityBreakdown).length > 0 ? (
                                                        Object.entries(staff.activityBreakdown).map(([actType, count]) => (
                                                            <span key={actType} className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800/60 text-gray-300 border border-gray-700">
                                                                {actType}: {count}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-500 text-[10px]">None</span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-5 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedStaffForSchoolsModal(staff);
                                                        setSchoolModalSearch("");
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black border border-amber-500/30 transition-all font-black text-sm cursor-pointer shadow-sm hover:scale-105"
                                                    title="Click to view detailed unique schools list"
                                                >
                                                    {staff.uniqueSchoolsVisitedCount}
                                                </button>
                                            </td>

                                            <td className="p-5 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedStaffForLeadsModal(staff);
                                                        setLeadModalSearch("");
                                                        setLeadModalTypeFilter("ALL");
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white border border-purple-500/30 transition-all font-black text-sm cursor-pointer shadow-sm hover:scale-105"
                                                    title="Click to view detailed lead details"
                                                >
                                                    {staff.totalLeads}
                                                </button>
                                            </td>

                                            <td className="p-5">
                                                <span className="text-gray-400 font-mono text-[11px]">
                                                    {staff.lastVisitDate ? staff.lastVisitDate : "No Recent Activity"}
                                                </span>
                                            </td>

                                            <td className="p-5 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusBadge}`}>
                                                    {staff.activityScore}
                                                </span>
                                            </td>

                                            <td className="p-5 text-right">
                                                <button
                                                    onClick={() => setSelectedStaffForModal(staff)}
                                                    className="px-3 py-1.5 rounded-xl bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all flex items-center justify-end gap-1.5 ml-auto shadow-sm"
                                                >
                                                    <FaEye /> View Logs ({staff.visitLogs ? staff.visitLogs.length : 0})
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VISIT LOGS MODAL */}
            {selectedStaffForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-4xl max-h-[85vh] rounded-3xl border overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} shadow-2xl`}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800/40 flex justify-between items-center bg-cyan-500/5">
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Field Visit History: <span className="text-cyan-500">{selectedStaffForModal.name}</span>
                                </h3>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                    {selectedStaffForModal.designation || selectedStaffForModal.role} • Total Visits: {selectedStaffForModal.totalVisits}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedStaffForModal(null)}
                                className="p-2.5 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {selectedStaffForModal.visitLogs && selectedStaffForModal.visitLogs.length === 0 ? (
                                <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                    No recorded visit logs available for this marketing executive in selected period
                                </div>
                            ) : (
                                selectedStaffForModal.visitLogs.map((log, idx) => (
                                    <div
                                        key={log.id || idx}
                                        className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} space-y-3`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-gray-800/40">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 font-black text-xs">
                                                    Visit #{idx + 1}
                                                </span>
                                                <h4 className={`font-black text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {log.institution}
                                                </h4>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-400">
                                                <FaCalendarAlt className="text-cyan-500" />
                                                <span>{log.date}</span>
                                                {log.planTime && <span>({log.planTime})</span>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                                            <div>
                                                <span className="text-gray-500 uppercase tracking-widest text-[10px] block">Visit Type</span>
                                                <span className="text-gray-300">{log.type || "School Visit"}</span>
                                            </div>

                                            <div>
                                                <span className="text-gray-500 uppercase tracking-widest text-[10px] block">Leads Collected</span>
                                                <span className="text-emerald-400 font-black">{log.leads || 0} Leads</span>
                                            </div>

                                            <div>
                                                <span className="text-gray-500 uppercase tracking-widest text-[10px] block">Approval Status</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                                    log.status === "Approved" ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                        </div>

                                        {log.notes && (
                                            <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-xl">
                                                <span className="font-bold text-gray-300">Notes: </span>{log.notes}
                                            </div>
                                        )}

                                        {/* GPS & Photo proof if available */}
                                        {(log.latitude || (log.photos && log.photos.length > 0)) && (
                                            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-gray-800/40">
                                                {log.latitude && log.longitude ? (
                                                    <a
                                                        href={`https://maps.google.com/?q=${log.latitude},${log.longitude}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-cyan-400 hover:underline flex items-center gap-1 font-bold text-[11px]"
                                                    >
                                                        <FaMapMarkerAlt /> View GPS Location ({log.latitude.toFixed(4)}, {log.longitude.toFixed(4)}) <FaExternalLinkAlt className="text-[9px]" />
                                                    </a>
                                                ) : <div />}

                                                {log.photos && log.photos.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setPreviewPhotos(log.photos);
                                                            setPreviewPhotoIndex(0);
                                                        }}
                                                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/30 font-bold text-[11px] cursor-pointer transition-all hover:scale-105"
                                                        title="Click to view photo proof(s) in full resolution"
                                                    >
                                                        <FaCamera className="text-emerald-400" />
                                                        <span>{log.photos.length} Photo Proof(s) Uploaded (Click to View)</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILED LEADS POPUP MODAL */}
            {selectedStaffForLeadsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-5xl max-h-[88vh] rounded-3xl border overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} shadow-2xl`}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-purple-500/5">
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Captured Leads: <span className="text-purple-400">{selectedStaffForLeadsModal.name}</span>
                                </h3>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                    {selectedStaffForLeadsModal.designation || selectedStaffForLeadsModal.role} • Total Leads: {selectedStaffForLeadsModal.totalLeads}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedStaffForLeadsModal(null)}
                                className="p-2.5 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        {/* Modal Sub-toolbar Filters */}
                        <div className={`p-4 border-b ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'} flex flex-col md:flex-row items-center justify-between gap-4`}>
                            <div className="relative w-full md:w-80">
                                <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Search student name, phone, school..."
                                    value={leadModalSearch}
                                    onChange={(e) => setLeadModalSearch(e.target.value)}
                                    className={`w-full border rounded-xl py-2 pl-8 pr-3 font-bold text-xs outline-none focus:border-purple-500/50 ${
                                        isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                />
                            </div>

                            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                                {["ALL", "HOT LEAD", "WARM LEAD", "COLD LEAD"].map(tFilter => (
                                    <button
                                        key={tFilter}
                                        onClick={() => setLeadModalTypeFilter(tFilter)}
                                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                            leadModalTypeFilter === tFilter
                                                ? 'bg-purple-500 text-white shadow-md'
                                                : 'bg-gray-800/40 text-gray-400 hover:text-white border border-gray-700'
                                        }`}
                                    >
                                        {tFilter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modal Body - Leads Table */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {(() => {
                                const rawLeads = selectedStaffForLeadsModal.detailedLeads || [];
                                const filteredLeads = rawLeads.filter(lead => {
                                    const matchesSearch = !leadModalSearch.trim() ||
                                        (lead.name || "").toLowerCase().includes(leadModalSearch.toLowerCase()) ||
                                        (lead.phone || "").includes(leadModalSearch) ||
                                        (lead.schoolName || "").toLowerCase().includes(leadModalSearch.toLowerCase()) ||
                                        (lead.email || "").toLowerCase().includes(leadModalSearch.toLowerCase());

                                    const matchesType = leadModalTypeFilter === "ALL" || (lead.leadType || "").toUpperCase().includes(leadModalTypeFilter);

                                    return matchesSearch && matchesType;
                                });

                                if (filteredLeads.length === 0) {
                                    const visitLogsWithLeads = (selectedStaffForLeadsModal.visitLogs || []).filter(v => parseFloat(v.leads) > 0);

                                    return (
                                        <div className="p-8 text-center text-gray-500 font-bold text-xs space-y-4">
                                            <p className="uppercase tracking-widest">No individual lead records matching selected filters</p>
                                            
                                            {visitLogsWithLeads.length > 0 && (
                                                <div className="mt-4 p-4 rounded-2xl bg-purple-500/5 border border-purple-500/15 text-left max-w-2xl mx-auto space-y-2">
                                                    <h5 className="font-black text-purple-400 text-xs uppercase tracking-wider">
                                                        Field Visit Lead Summary Logs ({selectedStaffForLeadsModal.totalLeads} total leads logged)
                                                    </h5>
                                                    <div className="space-y-1.5 divide-y divide-gray-800/40">
                                                        {visitLogsWithLeads.map((vl, vIdx) => (
                                                            <div key={vIdx} className="pt-2 flex justify-between items-center text-xs">
                                                                <div>
                                                                    <span className="font-black text-white">{vl.institution}</span>
                                                                    <span className="text-gray-400 ml-2">({vl.date})</span>
                                                                </div>
                                                                <span className="font-black text-purple-400">{vl.leads} Leads</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }

                                return (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse min-w-[950px]">
                                            <thead>
                                                <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-900/50 border-gray-800 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                                                    <th className="p-4">#</th>
                                                    <th className="p-4">Student Name</th>
                                                    <th className="p-4">Phone Number</th>
                                                    <th className="p-4">School / Institution</th>
                                                    <th className="p-4">Target Class/Course</th>
                                                    <th className="p-4 text-center">Admission Status</th>
                                                    <th className="p-4">Admitted Course & Down Payment</th>
                                                    <th className="p-4 text-center">Lead Type</th>
                                                    <th className="p-4 text-right">Date Captured</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                {filteredLeads.map((lead, idx) => {
                                                    const typeStyle = (lead.leadType || "").toUpperCase().includes("HOT")
                                                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                        : (lead.leadType || "").toUpperCase().includes("WARM")
                                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                        : "bg-purple-500/10 text-purple-400 border-purple-500/20";

                                                    const statusBadge = lead.admissionStatus === "Admitted (Regular)"
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : lead.admissionStatus === "Admitted (Board)"
                                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                        : lead.admissionStatus === "Counselled"
                                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                        : "bg-purple-500/10 text-purple-400 border-purple-500/20";

                                                    const isAdmitted = lead.admissionStatus && lead.admissionStatus.startsWith("Admitted");

                                                    return (
                                                        <tr key={lead.id || idx} className="hover:bg-purple-500/5 transition-all text-xs font-bold">
                                                            <td className="p-4 text-gray-500">{idx + 1}</td>
                                                            <td className="p-4">
                                                                <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                                    {lead.name}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-cyan-400 font-mono">
                                                                {lead.phone}
                                                            </td>
                                                            <td className="p-4 text-amber-400">
                                                                {lead.schoolName}
                                                            </td>
                                                            <td className="p-4 text-gray-300">
                                                                {lead.course !== "N/A" ? lead.course : lead.className}
                                                            </td>

                                                            {/* Admission / Counselling Status Badge */}
                                                            <td className="p-4 text-center">
                                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${statusBadge}`}>
                                                                    {lead.admissionStatus || "In Lead Page"}
                                                                </span>
                                                            </td>

                                                            {/* Admitted Course & Down Payment */}
                                                            <td className="p-4">
                                                                {isAdmitted ? (
                                                                    <div>
                                                                        <span className={`font-black text-xs block ${lead.admissionStatus.includes("Board") ? "text-blue-400" : "text-emerald-400"}`}>
                                                                            {lead.admittedCourse || "Course Enrolled"}
                                                                        </span>
                                                                        <span className="text-[10px] font-extrabold text-emerald-400 block mt-0.5">
                                                                            Down Payment Paid: ₹{Number(lead.downPaymentPaid || 0).toLocaleString('en-IN')}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-500 font-mono text-[11px]">—</span>
                                                                )}
                                                            </td>

                                                            <td className="p-4 text-center">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${typeStyle}`}>
                                                                    {lead.leadType}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right text-gray-400 font-mono text-[11px]">
                                                                {lead.createdAt}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILED UNIQUE SCHOOLS POPUP MODAL */}
            {selectedStaffForSchoolsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-5xl max-h-[88vh] rounded-3xl border overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} shadow-2xl`}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-500/5">
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Unique Schools Covered: <span className="text-amber-400">{selectedStaffForSchoolsModal.name}</span>
                                </h3>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                    {selectedStaffForSchoolsModal.designation || selectedStaffForSchoolsModal.role} • Total Unique Schools: {selectedStaffForSchoolsModal.uniqueSchoolsVisitedCount}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedStaffForSchoolsModal(null)}
                                className="p-2.5 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        {/* Modal Sub-toolbar Search */}
                        <div className={`p-4 border-b ${isDarkMode ? 'bg-black/30 border-gray-800' : 'bg-gray-50 border-gray-200'} flex items-center justify-between gap-4`}>
                            <div className="relative w-full md:w-80">
                                <FaSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
                                <input
                                    type="text"
                                    placeholder="Search school name, centre, status..."
                                    value={schoolModalSearch}
                                    onChange={(e) => setSchoolModalSearch(e.target.value)}
                                    className={`w-full border rounded-xl py-2 pl-8 pr-3 font-bold text-xs outline-none focus:border-amber-500/50 ${
                                        isDarkMode ? 'bg-black/40 border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                />
                            </div>
                            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                {selectedStaffForSchoolsModal.detailedSchoolsList ? selectedStaffForSchoolsModal.detailedSchoolsList.length : 0} Schools
                            </span>
                        </div>

                        {/* Modal Body - Schools Table */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {(() => {
                                const rawSchools = selectedStaffForSchoolsModal.detailedSchoolsList || [];
                                const filteredSchools = rawSchools.filter(sch => {
                                    return !schoolModalSearch.trim() ||
                                        (sch.schoolName || "").toLowerCase().includes(schoolModalSearch.toLowerCase()) ||
                                        (sch.centerName || "").toLowerCase().includes(schoolModalSearch.toLowerCase()) ||
                                        (sch.status || "").toLowerCase().includes(schoolModalSearch.toLowerCase());
                                });

                                if (filteredSchools.length === 0) {
                                    return (
                                        <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                            No school records matching selected search query
                                        </div>
                                    );
                                }

                                return (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'bg-gray-900/50 border-gray-800 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                                                    <th className="p-4">#</th>
                                                    <th className="p-4">School / Venue Name</th>
                                                    <th className="p-4">Centre</th>
                                                    <th className="p-4 text-center">Tier</th>
                                                    <th className="p-4 text-center">Status / Tie-Up</th>
                                                    <th className="p-4 text-center">Visits Conducted</th>
                                                    <th className="p-4 text-center">Leads Gathered</th>
                                                    <th className="p-4 text-right">Last Visit Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                                {filteredSchools.map((sch, idx) => (
                                                    <tr key={idx} className="hover:bg-amber-500/5 transition-all text-xs font-bold">
                                                        <td className="p-4 text-gray-500">{idx + 1}</td>
                                                        <td className="p-4">
                                                            <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                                {sch.schoolName}
                                                            </span>
                                                            {sch.lastNotes && (
                                                                <div className="text-[10px] text-gray-400 font-normal mt-0.5 truncate max-w-xs">
                                                                    {sch.lastNotes}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                                {sch.centerName}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                {sch.tier}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                {sch.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <button
                                                                onClick={() => setSelectedSchoolForVisitsModal({
                                                                    staffName: selectedStaffForSchoolsModal.name,
                                                                    schoolName: sch.schoolName,
                                                                    centerName: sch.centerName,
                                                                    tier: sch.tier,
                                                                    status: sch.status,
                                                                    schoolVisits: sch.schoolVisits || []
                                                                })}
                                                                className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black border border-cyan-500/30 transition-all font-black text-xs cursor-pointer shadow-sm hover:scale-105"
                                                                title="Click to view detailed visit feedback, remarks & history for this school"
                                                            >
                                                                {sch.visitCount} {sch.visitCount === 1 ? 'Visit' : 'Visits'}
                                                            </button>
                                                        </td>
                                                        <td className="p-4 text-center text-purple-400 font-black">
                                                            {sch.leadsCount}
                                                        </td>
                                                        <td className="p-4 text-right text-gray-400 font-mono text-[11px]">
                                                            {sch.lastVisitDate || "N/A"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* SCHOOL VISIT DETAILS & FEEDBACK HISTORY MODAL */}
            {selectedSchoolForVisitsModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-4xl max-h-[85vh] rounded-3xl border overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'} shadow-2xl`}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800/40 flex justify-between items-center bg-cyan-500/5">
                            <div>
                                <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    Visit History & Feedback: <span className="text-cyan-400">{selectedSchoolForVisitsModal.schoolName}</span>
                                </h3>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                                    Executive: {selectedSchoolForVisitsModal.staffName} • Centre: {selectedSchoolForVisitsModal.centerName} • Total Visits: {selectedSchoolForVisitsModal.schoolVisits ? selectedSchoolForVisitsModal.schoolVisits.length : 0}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedSchoolForVisitsModal(null)}
                                className="p-2.5 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {selectedSchoolForVisitsModal.schoolVisits && selectedSchoolForVisitsModal.schoolVisits.length === 0 ? (
                                <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                                    No individual visit logs available for this school in selected period
                                </div>
                            ) : (
                                selectedSchoolForVisitsModal.schoolVisits.map((vLog, vIdx) => (
                                    <div
                                        key={vLog.id || vIdx}
                                        className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-gray-50 border-gray-200'} space-y-3`}
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-gray-800/40">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 font-black text-xs">
                                                    Visit #{vIdx + 1}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                                    vLog.status === "Approved" ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                    {vLog.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-400">
                                                <FaCalendarAlt className="text-cyan-500" />
                                                <span>{vLog.date}</span>
                                                {vLog.planTime && <span>({vLog.planTime})</span>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                                            <div>
                                                <span className="text-gray-500 uppercase tracking-widest text-[10px] block">Activity Type</span>
                                                <span className="text-gray-300">{vLog.type || "School Visit"}</span>
                                            </div>

                                            <div>
                                                <span className="text-gray-500 uppercase tracking-widest text-[10px] block">Leads Gathered</span>
                                                <span className="text-purple-400 font-black">{vLog.leads || 0} Leads</span>
                                            </div>

                                            <div>
                                                <span className="text-gray-500 uppercase tracking-widest text-[10px] block">Location / Venue</span>
                                                <span className="text-amber-400">{vLog.locationName || selectedSchoolForVisitsModal.centerName}</span>
                                            </div>
                                        </div>

                                        {/* Detailed Feedback & Remarks */}
                                        <div className="text-xs bg-white/5 p-4 rounded-xl space-y-1">
                                            <span className="font-black text-cyan-400 uppercase tracking-wider text-[10px] block">Detailed Feedback / Activity Remarks:</span>
                                            <p className="text-gray-300 font-normal leading-relaxed">
                                                {vLog.notes ? vLog.notes : "No additional text remarks provided for this visit."}
                                            </p>
                                        </div>

                                        {/* GPS & Photo proof */}
                                        {(vLog.latitude || (vLog.photos && vLog.photos.length > 0)) && (
                                            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-gray-800/40">
                                                {vLog.latitude && vLog.longitude ? (
                                                    <a
                                                        href={`https://maps.google.com/?q=${vLog.latitude},${vLog.longitude}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-cyan-400 hover:underline flex items-center gap-1 font-bold text-[11px]"
                                                    >
                                                        <FaMapMarkerAlt /> View GPS Coordinates ({vLog.latitude.toFixed(4)}, {vLog.longitude.toFixed(4)}) <FaExternalLinkAlt className="text-[9px]" />
                                                    </a>
                                                ) : <div />}

                                                {vLog.photos && vLog.photos.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setPreviewPhotos(vLog.photos);
                                                            setPreviewPhotoIndex(0);
                                                        }}
                                                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/30 font-bold text-[11px] cursor-pointer transition-all hover:scale-105"
                                                        title="Click to view photo proof(s) in full resolution"
                                                    >
                                                        <FaCamera className="text-emerald-400" />
                                                        <span>{vLog.photos.length} Photo Proof(s) Uploaded (Click to View)</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PHOTO PROOF FULL IMAGE LIGHTBOX MODAL */}
            {previewPhotos && previewPhotos.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col items-center justify-center">
                        {/* Top Toolbar */}
                        <div className="w-full flex items-center justify-between p-4 bg-black/60 rounded-t-2xl border-b border-gray-800 text-white">
                            <div className="flex items-center gap-2">
                                <FaCamera className="text-emerald-400" />
                                <span className="font-black text-sm uppercase tracking-wider">
                                    Photo Proof ({previewPhotoIndex + 1} of {previewPhotos.length})
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <a
                                    href={getPhotoUrl(previewPhotos[previewPhotoIndex])}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                                >
                                    <FaExternalLinkAlt className="text-xs" /> Open Full
                                </a>
                                <button
                                    onClick={() => setPreviewPhotos(null)}
                                    className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-red-600/80 transition-all cursor-pointer"
                                >
                                    <FaTimes className="text-lg" />
                                </button>
                            </div>
                        </div>

                        {/* Main Image Display Box */}
                        <div className="relative w-full flex-1 flex items-center justify-center p-4 bg-black/80 rounded-b-2xl overflow-hidden min-h-[350px] max-h-[70vh]">
                            <img
                                src={getPhotoUrl(previewPhotos[previewPhotoIndex])}
                                alt={`Photo Proof ${previewPhotoIndex + 1}`}
                                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl border border-gray-800"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://via.placeholder.com/600x400?text=Photo+Proof+Unavailable";
                                }}
                            />

                            {/* Left/Right Prev/Next Buttons if multiple photos */}
                            {previewPhotos.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setPreviewPhotoIndex((prev) => (prev > 0 ? prev - 1 : previewPhotos.length - 1))}
                                        className="absolute left-4 p-3 rounded-full bg-black/60 text-white hover:bg-cyan-500 hover:text-black transition-all border border-gray-700 shadow-lg cursor-pointer"
                                    >
                                        <FaChevronLeft className="text-lg" />
                                    </button>

                                    <button
                                        onClick={() => setPreviewPhotoIndex((prev) => (prev < previewPhotos.length - 1 ? prev + 1 : 0))}
                                        className="absolute right-4 p-3 rounded-full bg-black/60 text-white hover:bg-cyan-500 hover:text-black transition-all border border-gray-700 shadow-lg cursor-pointer"
                                    >
                                        <FaChevronRight className="text-lg" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnail Strip if multiple photos */}
                        {previewPhotos.length > 1 && (
                            <div className="flex items-center gap-2 mt-3 overflow-x-auto max-w-full p-2">
                                {previewPhotos.map((p, pIdx) => (
                                    <button
                                        key={pIdx}
                                        onClick={() => setPreviewPhotoIndex(pIdx)}
                                        className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                                            pIdx === previewPhotoIndex ? 'border-emerald-400 scale-105 shadow-lg' : 'border-gray-700 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <img src={getPhotoUrl(p)} alt="thumb" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamPerformanceContent;
