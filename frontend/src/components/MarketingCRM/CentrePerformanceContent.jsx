import React, { useState, useEffect, useMemo } from "react";
import CustomMultiSelect from "../common/CustomMultiSelect";
import {
    FaBuilding, FaTrophy, FaCalendarAlt, FaSearch, FaRedo,
    FaSync, FaMapMarkerAlt, FaFileAlt, FaCheckCircle, FaUserCheck,
    FaUsers, FaUniversity, FaTimes, FaExternalLinkAlt, FaImage,
    FaMedal, FaLayerGroup
} from "react-icons/fa";

const CentrePerformanceContent = ({ isDarkMode, availableCenters = [] }) => {
    const [performanceData, setPerformanceData] = useState([]);
    const [overallStats, setOverallStats] = useState({});
    const [leaderboard, setLeaderboard] = useState([]);
    const [backendActivityTypes, setBackendActivityTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters state
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [dateRange, setDateRange] = useState("THIS MONTH");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal States
    const [selectedCentreForLogsModal, setSelectedCentreForLogsModal] = useState(null);
    const [selectedCentreForSchoolsModal, setSelectedCentreForSchoolsModal] = useState(null);
    const [selectedCentreForLeadsModal, setSelectedCentreForLeadsModal] = useState(null);
    const [selectedCentreForStaffModal, setSelectedCentreForStaffModal] = useState(null);

    // Nested School Visit Feedback Modal
    const [selectedSchoolForVisitsModal, setSelectedSchoolForVisitsModal] = useState(null);

    // Lightbox Modal for Photo Proofs
    const [previewPhotos, setPreviewPhotos] = useState(null);
    const [activePhotoIdx, setActivePhotoIdx] = useState(0);

    const centreOptions = useMemo(() => {
        return (availableCenters || []).map(c => ({
            value: c.centreName || c.name || c,
            label: c.centreName || c.name || c
        }));
    }, [availableCenters]);

    const DEFAULT_ACTIVITY_TYPES = useMemo(() => [
        "WEBSITE", "META", "FOUNDATION", "MOCK", "REPEATER", "2 YEAR",
        "Leafletting", "Others Activity", "DIGITAL LEAD", "Tuition Visit",
        "Data Calling", "Referral Drive", "Shikkha Bondhu", "School Visit",
        "SURVEY FORM", "Walk In", "Tele Enquiry", "Market Activity",
        "Canopy", "Seminar", "Workshop", "Assigned Task"
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

    const fetchCentrePerformance = async () => {
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

            const res = await fetch(`${import.meta.env.VITE_API_URL}/marketing/centre-performance?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setPerformanceData(data.centrePerformance || []);
                setOverallStats(data.overallStats || {});
                setLeaderboard(data.leaderboard || []);
                if (data.availableActivityTypes && Array.isArray(data.availableActivityTypes)) {
                    setBackendActivityTypes(data.availableActivityTypes);
                }
            }
        } catch (error) {
            console.error("Error fetching Centre Performance:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCentrePerformance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange]);

    const handleApplyFilters = () => {
        fetchCentrePerformance();
    };

    const handleResetFilters = () => {
        setSelectedCentres([]);
        setSelectedActivities([]);
        setDateRange("THIS MONTH");
        setStartDate("");
        setEndDate("");
        setSearchQuery("");
    };

    const openPhotoLightbox = (photos, initialIndex = 0) => {
        if (!photos || photos.length === 0) return;
        const photoArr = Array.isArray(photos) ? photos : [photos];
        setPreviewPhotos(photoArr);
        setActivePhotoIdx(initialIndex);
    };

    const renderActivityPills = (breakdown = {}) => {
        const entries = Object.entries(breakdown);
        if (entries.length === 0) {
            return <span className="text-[10px] text-gray-400 font-bold uppercase">No activities logged</span>;
        }
        return (
            <div className="flex flex-wrap gap-1.5">
                {entries.map(([act, count]) => (
                    <span
                        key={act}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            isDarkMode
                                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                                : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                        }`}
                    >
                        {act}: <span className="text-cyan-400 font-extrabold">{count}</span>
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* TOP HEADER & FILTERS BAR */}
            <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#131619] border-gray-800 shadow-2xl' : 'bg-white border-gray-100 shadow-md'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                🏢 Regional Analytics
                            </span>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Field Operations By Master Centre
                            </span>
                        </div>
                        <h1 className={`text-3xl font-black tracking-tight uppercase ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            MARKETING <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">CENTRE PERFORMANCE</span>
                        </h1>
                        <p className={`text-xs font-semibold mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            TRACK AND COMPARE FIELD VISIT VOLUME, SCHOOL REACH, AND LEADS GENERATED ACROSS MASTER CENTRES
                        </p>
                    </div>

                    <button
                        onClick={fetchCentrePerformance}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 self-start lg:self-auto cursor-pointer"
                    >
                        <FaSync className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Performance
                    </button>
                </div>

                {/* Filter Controls Grid */}
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                    {/* Multi-Selection Centre Dropdown */}
                    <div className="lg:col-span-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Date Range
                        </label>
                        <div className="relative">
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider outline-none appearance-none cursor-pointer transition-all ${
                                    isDarkMode ? 'bg-[#181c20] border-gray-700 text-white focus:border-cyan-500' : 'bg-gray-50 border-gray-200 text-gray-800'
                                }`}
                            >
                                <option value="TODAY">TODAY</option>
                                <option value="YESTERDAY">YESTERDAY</option>
                                <option value="LAST 7 DAYS">LAST 7 DAYS</option>
                                <option value="THIS MONTH">THIS MONTH</option>
                                <option value="LAST MONTH">LAST MONTH</option>
                                <option value="CUSTOM RANGE">CUSTOM RANGE</option>
                            </select>
                            <FaCalendarAlt className="absolute right-3 top-3 text-gray-400 pointer-events-none w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="lg:col-span-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Search Centre
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by centre..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                                    isDarkMode ? 'bg-[#181c20] border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-emerald-600'
                                }`}
                            />
                            <FaSearch className="absolute left-3 top-3 text-gray-400 w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="lg:col-span-1 flex items-end gap-2">
                        <button
                            onClick={handleApplyFilters}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                            Apply
                        </button>
                        <button
                            onClick={handleResetFilters}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
                                isDarkMode ? 'border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-700' : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Reset Filters"
                        >
                            <FaRedo className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Custom Date Pickers */}
                {dateRange === "CUSTOM RANGE" && (
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`w-full px-4 py-2 rounded-xl border text-xs font-bold ${
                                    isDarkMode ? 'bg-[#181c20] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                                }`}
                            />
                        </div>
                        <div>
                            <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`w-full px-4 py-2 rounded-xl border text-xs font-bold ${
                                    isDarkMode ? 'bg-[#181c20] border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
                                }`}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* OVERALL METRICS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Activities Card */}
                <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all hover:scale-[1.01] ${
                    isDarkMode ? 'bg-[#131619] border-gray-800 shadow-xl' : 'bg-white border-gray-100 shadow-md'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Ground Activities</span>
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <FaLayerGroup className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-cyan-400">
                        {loading ? "..." : (overallStats.totalActivitiesDone || 0)}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Total Activities & Visits Across Field
                    </p>
                </div>

                {/* Active Field Centres */}
                <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all hover:scale-[1.01] ${
                    isDarkMode ? 'bg-[#131619] border-gray-800 shadow-xl' : 'bg-white border-gray-100 shadow-md'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Field Centres</span>
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <FaBuilding className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-emerald-400">
                        {loading ? "..." : (overallStats.activeCentresCount || 0)}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Master Centres with Logged Field Work
                    </p>
                </div>

                {/* Schools & Venues Covered */}
                <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all hover:scale-[1.01] ${
                    isDarkMode ? 'bg-[#131619] border-gray-800 shadow-xl' : 'bg-white border-gray-100 shadow-md'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Schools & Venues Reached</span>
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <FaUniversity className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-amber-400">
                        {loading ? "..." : (overallStats.totalSchoolsVisited || 0)}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Distinct Institutions Covered
                    </p>
                </div>

                {/* Top Active Field Centre */}
                <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all hover:scale-[1.01] ${
                    isDarkMode ? 'bg-[#131619] border-gray-800 shadow-xl' : 'bg-white border-gray-100 shadow-md'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Top Active Centre</span>
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <FaTrophy className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black tracking-tight text-purple-400 truncate">
                        {loading ? "..." : (overallStats.topPerformerCentre?.centreName || "N/A")}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {overallStats.topPerformerCentre ? `${overallStats.topPerformerCentre.totalActivities} Activities Logged` : "No Activities Logged Yet"}
                    </p>
                </div>
            </div>

            {/* TOP 3 PODIUM LEADERBOARD SECTION */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className={`text-xl font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <span>🏆</span> MOST ACTIVE <span className="text-emerald-400">FIELD CENTRES</span>
                    </h2>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Top Master Performers</span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-400 font-bold animate-pulse">Loading Centre Leaderboard...</div>
                ) : leaderboard.length === 0 ? (
                    <div className={`p-8 rounded-3xl border text-center text-gray-400 text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-100'}`}>
                        No activity data available for the selected filters
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {leaderboard.map((centre, idx) => {
                            const isGold = idx === 0;
                            const isSilver = idx === 1;
                            const isBronze = idx === 2;

                            const cardBorder = isDarkMode
                                ? isGold
                                    ? 'bg-[#181611] border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                                    : isSilver
                                    ? 'bg-[#15181c] border-slate-400/50 shadow-[0_0_20px_rgba(148,163,184,0.12)]'
                                    : 'bg-[#1a1512] border-amber-700/60 shadow-[0_0_20px_rgba(180,83,9,0.12)]'
                                : isGold
                                    ? 'bg-amber-50/40 border-amber-300 shadow-md'
                                    : isSilver
                                    ? 'bg-slate-50/40 border-slate-300 shadow-md'
                                    : 'bg-orange-50/40 border-orange-300 shadow-md';

                            const rankBadgeBg = isGold
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black'
                                : isSilver
                                ? 'bg-gradient-to-r from-slate-300 to-gray-400 text-black'
                                : 'bg-gradient-to-r from-amber-700 to-orange-800 text-white';

                            return (
                                <div
                                    key={centre.centreId || idx}
                                    className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all hover:-translate-y-1 ${cardBorder}`}
                                >
                                    {/* Top Rank Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-12 h-12 rounded-2xl ${rankBadgeBg} flex items-center justify-center font-black text-xl shadow-lg flex-shrink-0`}>
                                                {isGold ? <FaTrophy className="w-6 h-6" /> : `#${idx + 1}`}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className={`font-black text-lg uppercase tracking-tight leading-tight truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    {centre.centreName}
                                                </h3>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex-shrink-0 ${rankBadgeBg}`}>
                                            RANK #{centre.rank || idx + 1}
                                        </span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className={`grid grid-cols-2 gap-3 py-3 border-y my-3 ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                        <div>
                                            <span className={`text-[9px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Activities</span>
                                            <span className="text-xl font-black text-cyan-400">{centre.totalActivities}</span>
                                        </div>

                                        <div>
                                            <span className={`text-[9px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Unique Schools</span>
                                            <button
                                                onClick={() => setSelectedCentreForSchoolsModal(centre)}
                                                className="text-amber-400 hover:text-amber-300 font-black text-sm uppercase tracking-wider underline cursor-pointer"
                                            >
                                                {centre.uniqueSchoolsVisitedCount} Schools ➔
                                            </button>
                                        </div>

                                        <div>
                                            <span className={`text-[9px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Leads Gathered</span>
                                            <button
                                                onClick={() => setSelectedCentreForLeadsModal(centre)}
                                                className="text-purple-400 hover:text-purple-300 font-black text-sm uppercase tracking-wider underline cursor-pointer"
                                            >
                                                {centre.totalLeads} Leads ➔
                                            </button>
                                        </div>

                                        <div>
                                            <span className={`text-[9px] font-black uppercase tracking-wider block ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Staff</span>
                                            <span className="text-sm font-black text-emerald-400">
                                                👥 {centre.activePersonnelCount} Staff
                                            </span>
                                        </div>
                                    </div>

                                    {/* Activity breakdown */}
                                    <div className="mt-3">
                                        <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Activity Breakdown</span>
                                        {renderActivityPills(centre.activityBreakdown)}
                                    </div>

                                    {/* Footer Button */}
                                    <button
                                        onClick={() => setSelectedCentreForLogsModal(centre)}
                                        className="w-full mt-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <FaFileAlt className="w-3.5 h-3.5" />
                                        View Centre Field Logs
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FULL CENTRE PERFORMANCE ROSTER TABLE */}
            <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-[#131619] border-gray-800 shadow-xl' : 'bg-white border-gray-100 shadow-md'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className={`text-xl font-black uppercase tracking-tight flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span>🏢</span> MASTER CENTRE <span className="text-cyan-400">PERFORMANCE ROSTER</span>
                        </h2>
                        <p className={`text-xs font-bold uppercase tracking-wider mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Comprehensive Field Metrics and School Coverage per Master Centre
                        </p>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Showing {performanceData.length} Master Centres
                    </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${
                                isDarkMode ? 'border-gray-800 text-gray-300 bg-[#0b0e11]' : 'border-gray-100 text-gray-600 bg-gray-50'
                            }`}>
                                <th className="p-4">Rank & Master Centre</th>
                                <th className="p-4 text-center">Active Staff</th>
                                <th className="p-4 text-center">Total Activities</th>
                                <th className="p-4">Activity Breakdown</th>
                                <th className="p-4 text-center">Unique Schools</th>
                                <th className="p-4 text-center">Leads Gathered</th>
                                <th className="p-4">Last Activity Date</th>
                                <th className="p-4 text-center">Performance Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y text-xs font-semibold ${isDarkMode ? 'divide-gray-800/60' : 'divide-gray-100'}`}>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-gray-400 font-bold animate-pulse">
                                        Loading Master Centre Performance Roster...
                                    </td>
                                </tr>
                            ) : performanceData.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-gray-400 font-bold uppercase tracking-wider">
                                        No master centres match your filter criteria
                                    </td>
                                </tr>
                            ) : (
                                performanceData.map((centre, idx) => {
                                    const statusBadge = centre.performanceScore === "Highly Active"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : centre.performanceScore === "Moderately Active"
                                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                        : centre.performanceScore === "Needs Improvement"
                                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        : "bg-gray-500/10 text-gray-400 border-gray-500/20";

                                    return (
                                        <tr
                                            key={centre.centreId || idx}
                                            className={`transition-colors ${
                                                isDarkMode ? 'hover:bg-[#181d22] text-gray-200' : 'hover:bg-emerald-50/50 text-gray-800'
                                            }`}
                                        >
                                            {/* Rank & Centre */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-amber-400 border ${
                                                        isDarkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-100 border-gray-200'
                                                    }`}>
                                                        #{centre.rank || idx + 1}
                                                    </span>
                                                    <span className="font-black text-sm uppercase tracking-tight text-emerald-400">
                                                        {centre.centreName}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Active Staff */}
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setSelectedCentreForStaffModal(centre)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer hover:scale-105 shadow-sm"
                                                    title="Click to view detailed active staff roster for this centre"
                                                >
                                                    👥 {centre.activePersonnelCount} Staff
                                                </button>
                                            </td>

                                            {/* Total Activities */}
                                            <td className="p-4 text-center font-black text-sm text-cyan-400">
                                                {centre.totalActivities}
                                            </td>

                                            {/* Activity Breakdown */}
                                            <td className="p-4 max-w-[280px]">
                                                {renderActivityPills(centre.activityBreakdown)}
                                            </td>

                                            {/* Unique Schools (Clickable Modal) */}
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setSelectedCentreForSchoolsModal(centre)}
                                                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                                                >
                                                    🏫 {centre.uniqueSchoolsVisitedCount} Schools
                                                </button>
                                            </td>

                                            {/* Leads Gathered (Clickable Modal) */}
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setSelectedCentreForLeadsModal(centre)}
                                                    className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                                                >
                                                    🎯 {centre.totalLeads} Leads
                                                </button>
                                            </td>

                                            {/* Last Activity Date */}
                                            <td className={`p-4 font-mono text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {centre.lastActivityDate ? centre.lastActivityDate : "—"}
                                            </td>

                                            {/* Performance Status */}
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusBadge}`}>
                                                    {centre.performanceScore}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => setSelectedCentreForLogsModal(centre)}
                                                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    View Field Logs
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

            {/* MODAL 1: CENTRE FIELD LOGS MODAL */}
            {selectedCentreForLogsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
                        isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800/40 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 to-cyan-950/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black">
                                    🏢
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        {selectedCentreForLogsModal.centreName} — Field Activity Logs
                                    </h3>
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                        Master Centre Logs Overview
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCentreForLogsModal(null)}
                                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <FaTimes className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            {selectedCentreForLogsModal.activityLogs.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-wider">
                                    No field activity logs recorded for this centre
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${
                                                isDarkMode ? 'border-gray-800 text-gray-300 bg-[#0b0e11]' : 'border-gray-100 text-gray-600 bg-gray-50'
                                            }`}>
                                                <th className="p-3">Date</th>
                                                <th className="p-3">Staff Member</th>
                                                <th className="p-3">Activity Type</th>
                                                <th className="p-3">Institution / Venue</th>
                                                <th className="p-3">Plan / Actual</th>
                                                <th className="p-3">Feedback / Remarks</th>
                                                <th className="p-3 text-center">Proof / GPS</th>
                                                <th className="p-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y text-xs font-semibold ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                            {selectedCentreForLogsModal.activityLogs.map((log, idx) => (
                                                <tr key={log.id || idx} className={`${isDarkMode ? 'hover:bg-[#181d22]' : 'hover:bg-cyan-50/50'} transition-colors`}>
                                                    <td className="p-3 font-mono text-[11px] text-gray-400">{log.date || "—"}</td>
                                                    <td className="p-3 font-black text-emerald-400">{log.staffName || "Executive"}</td>
                                                    <td className="p-3">
                                                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                            {log.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 font-bold text-amber-400">{log.institution || "—"}</td>
                                                    <td className="p-3 font-mono text-[11px] text-gray-400">
                                                        Plan: {log.planTime || "—"} <br />
                                                        Actual: <span className="text-emerald-400">{log.actualTime || "—"}</span>
                                                    </td>
                                                    <td className={`p-3 max-w-[250px] font-normal italic ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        "{log.notes || "No remarks provided"}"
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {log.photos && log.photos.length > 0 && (
                                                                <button
                                                                    onClick={() => openPhotoLightbox(log.photos, 0)}
                                                                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <FaImage className="w-3 h-3" />
                                                                    Photo ({log.photos.length})
                                                                </button>
                                                            )}
                                                            {log.latitude && log.longitude && (
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                                                                >
                                                                    <FaMapMarkerAlt className="w-3 h-3" />
                                                                    GPS
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                                                            log.status === "Approved"
                                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                        }`}>
                                                            {log.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className={`p-4 border-t flex justify-end ${isDarkMode ? 'border-gray-800 bg-[#0f1215]' : 'border-gray-100 bg-gray-50'}`}>
                            <button
                                onClick={() => setSelectedCentreForLogsModal(null)}
                                className="px-6 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                                Close Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: UNIQUE SCHOOLS COVERED MODAL */}
            {selectedCentreForSchoolsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
                        isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}>
                        <div className="p-6 border-b border-gray-800/40 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-orange-950/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black">
                                    🏫
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        Unique Schools Covered — {selectedCentreForSchoolsModal.centreName}
                                    </h3>
                                    <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">
                                        Total Institutions: {selectedCentreForSchoolsModal.detailedSchoolsList.length}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCentreForSchoolsModal(null)}
                                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <FaTimes className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-3">
                            {selectedCentreForSchoolsModal.detailedSchoolsList.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-wider">
                                    No unique schools logged for this centre
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedCentreForSchoolsModal.detailedSchoolsList.map((school, sIdx) => (
                                        <div
                                            key={sIdx}
                                            onClick={() => setSelectedSchoolForVisitsModal(school)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-amber-500/50 hover:scale-[1.01] ${
                                                isDarkMode ? 'bg-[#181d22] border-gray-800' : 'bg-gray-50 border-gray-200'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="font-black text-sm uppercase tracking-tight text-amber-400">
                                                    🏫 {school.schoolName}
                                                </h4>
                                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    {school.tier}
                                                </span>
                                            </div>
                                            <div className={`flex items-center justify-between text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                                                <span>Visits Conducted: <strong className="text-cyan-400">{school.visitCount}</strong></span>
                                                <span>Leads: <strong className="text-purple-400">{school.leadsCount}</strong></span>
                                            </div>
                                            <div className={`mt-3 text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between pt-2 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                                                <span>Last Visit: {school.lastVisitDate || "—"}</span>
                                                <span className="underline">View Full Remarks ➔</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* NESTED MODAL: SCHOOL VISIT DETAILS & FEEDBACK MODAL */}
            {selectedSchoolForVisitsModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
                        isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}>
                        <div className="p-6 border-b border-gray-800/40 flex items-center justify-between bg-gradient-to-r from-amber-950/50 to-yellow-950/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black">
                                    🏫
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        {selectedSchoolForVisitsModal.schoolName} — Visit Feedback & Remarks
                                    </h3>
                                    <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">
                                        Total Visits: {selectedSchoolForVisitsModal.schoolVisits?.length || 0}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSchoolForVisitsModal(null)}
                                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <FaTimes className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            {selectedSchoolForVisitsModal.schoolVisits?.map((visit, vIdx) => (
                                <div
                                    key={visit.id || vIdx}
                                    className={`p-4 rounded-2xl border space-y-2 ${
                                        isDarkMode ? 'bg-[#181d22] border-gray-800' : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between text-xs font-black">
                                        <span className="text-emerald-400">📅 Visiting Date: {visit.date || "—"}</span>
                                        <span className="px-2.5 py-1 rounded-md text-[10px] uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            {visit.type}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-300">
                                        <strong className={`block mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Executive Remarks / Detailed Feedback:</strong>
                                        <p className={`italic p-3 rounded-xl border text-gray-200 ${isDarkMode ? 'bg-black/40 border-gray-800' : 'bg-white border-gray-200 text-gray-800'}`}>
                                            "{visit.notes || "No specific feedback provided"}"
                                        </p>
                                    </div>
                                    {visit.photos && visit.photos.length > 0 && (
                                        <div className="pt-2 flex items-center gap-2">
                                            <button
                                                onClick={() => openPhotoLightbox(visit.photos, 0)}
                                                className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                            >
                                                <FaImage className="w-3.5 h-3.5" />
                                                View Visit Proof Photos ({visit.photos.length})
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: DETAILED LEADS MODAL */}
            {selectedCentreForLeadsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
                        isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}>
                        <div className="p-6 border-b border-gray-800/40 flex items-center justify-between bg-gradient-to-r from-purple-950/40 to-indigo-950/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black">
                                    🎯
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        Leads Gathered — {selectedCentreForLeadsModal.centreName}
                                    </h3>
                                    <span className="text-xs text-purple-400 font-bold uppercase tracking-widest">
                                        Total Enquiries / Leads: {selectedCentreForLeadsModal.detailedLeads.length}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCentreForLeadsModal(null)}
                                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <FaTimes className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-3">
                            {selectedCentreForLeadsModal.detailedLeads.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-wider">
                                    No lead details captured yet for this centre
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[900px]">
                                        <thead>
                                            <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${
                                                isDarkMode ? 'border-gray-800 text-gray-300 bg-[#0b0e11]' : 'border-gray-100 text-gray-600 bg-gray-50'
                                            }`}>
                                                <th className="p-3">Student Name</th>
                                                <th className="p-3">Phone</th>
                                                <th className="p-3">School Name</th>
                                                <th className="p-3">Target Class/Course</th>
                                                <th className="p-3 text-center">Admission Status</th>
                                                <th className="p-3">Admitted Course & Down Payment</th>
                                                <th className="p-3 text-center">Lead Type</th>
                                                <th className="p-3 font-mono">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y text-xs font-semibold ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                            {selectedCentreForLeadsModal.detailedLeads.map((lead, lIdx) => {
                                                const statusBadge = lead.admissionStatus === "Admitted (Regular)"
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : lead.admissionStatus === "Admitted (Board)"
                                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                    : lead.admissionStatus === "Counselled"
                                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                    : "bg-purple-500/10 text-purple-400 border-purple-500/20";

                                                const isAdmitted = lead.admissionStatus && lead.admissionStatus.startsWith("Admitted");

                                                return (
                                                    <tr key={lead.id || lIdx} className={`${isDarkMode ? 'hover:bg-[#181d22]' : 'hover:bg-purple-50/50'} transition-colors`}>
                                                        <td className="p-3 font-black text-purple-400">{lead.name}</td>
                                                        <td className={`p-3 font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lead.phone}</td>
                                                        <td className="p-3 font-bold text-amber-400">{lead.schoolName}</td>
                                                        <td className={`p-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{lead.className} • {lead.course}</td>
                                                        
                                                        {/* Admission / Counselling Status Badge */}
                                                        <td className="p-3 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${statusBadge}`}>
                                                                {lead.admissionStatus || "In Lead Page"}
                                                            </span>
                                                        </td>

                                                        {/* Admitted Course & Down Payment */}
                                                        <td className="p-3">
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

                                                        <td className="p-3 text-center">
                                                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                {lead.leadType}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-mono text-[11px] text-gray-400">{lead.createdAt}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVE STAFF / PERSONNEL ROSTER MODAL */}
            {selectedCentreForStaffModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className={`w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
                        isDarkMode ? 'bg-[#131619] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}>
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800/40 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 to-teal-950/40">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg">
                                    👥
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white">
                                        Active Staff Roster — {selectedCentreForStaffModal.centreName}
                                    </h3>
                                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-widest">
                                        Total Active Personnel / Users: {selectedCentreForStaffModal.detailedActiveStaff ? selectedCentreForStaffModal.detailedActiveStaff.length : 0}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCentreForStaffModal(null)}
                                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <FaTimes className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-3">
                            {(!selectedCentreForStaffModal.detailedActiveStaff || selectedCentreForStaffModal.detailedActiveStaff.length === 0) ? (
                                <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-wider">
                                    No active staff assigned or logged for this centre
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${
                                                isDarkMode ? 'border-gray-800 text-gray-300 bg-[#0b0e11]' : 'border-gray-100 text-gray-600 bg-gray-50'
                                            }`}>
                                                <th className="p-3">#</th>
                                                <th className="p-3">Staff Name</th>
                                                <th className="p-3">Role / Designation</th>
                                                <th className="p-3">Contact (Phone / Email)</th>
                                                <th className="p-3 text-center">Activities Logged</th>
                                                <th className="p-3 text-center">Visits Completed</th>
                                                <th className="p-3 text-center">Leads Gathered</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y text-xs font-semibold ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                            {selectedCentreForStaffModal.detailedActiveStaff.map((staff, sIdx) => (
                                                <tr key={staff.userId || sIdx} className={`${isDarkMode ? 'hover:bg-[#181d22]' : 'hover:bg-emerald-50/50'} transition-colors`}>
                                                    <td className="p-3 font-mono text-gray-500">{sIdx + 1}</td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30 uppercase">
                                                                {staff.name ? staff.name.charAt(0) : "S"}
                                                            </div>
                                                            <span className="font-black text-emerald-400 text-xs">
                                                                {staff.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                            {staff.designation || staff.role || "Executive"}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="space-y-0.5">
                                                            <span className={`font-mono text-xs block ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                {staff.phone}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 block font-normal">
                                                                {staff.email}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center font-black text-cyan-400">
                                                        {staff.activitiesCount}
                                                    </td>
                                                    <td className="p-3 text-center font-black text-emerald-400">
                                                        {staff.completedVisits}
                                                    </td>
                                                    <td className="p-3 text-center font-black text-purple-400">
                                                        {staff.leadsCount}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX MODAL: FULL RESOLUTION PHOTO PROOFS */}
            {previewPhotos && previewPhotos.length > 0 && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
                    onClick={() => setPreviewPhotos(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full p-4 flex flex-col items-center justify-center">
                        <button
                            onClick={() => setPreviewPhotos(null)}
                            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center text-xl font-bold cursor-pointer"
                        >
                            &times;
                        </button>

                        <div className="relative overflow-hidden rounded-2xl border border-gray-800 shadow-2xl max-h-[75vh] flex items-center justify-center">
                            <img
                                src={previewPhotos[activePhotoIdx]}
                                alt={`Proof ${activePhotoIdx + 1}`}
                                className="max-w-full max-h-[75vh] object-contain rounded-xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>

                        {previewPhotos.length > 1 && (
                            <div className="flex items-center gap-3 mt-4 overflow-x-auto p-2" onClick={(e) => e.stopPropagation()}>
                                {previewPhotos.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`Thumb ${idx + 1}`}
                                        onClick={() => setActivePhotoIdx(idx)}
                                        className={`w-14 h-14 object-cover rounded-xl border-2 cursor-pointer transition-all ${
                                            activePhotoIdx === idx
                                                ? 'border-emerald-400 scale-105 shadow-lg shadow-emerald-500/20'
                                                : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CentrePerformanceContent;
