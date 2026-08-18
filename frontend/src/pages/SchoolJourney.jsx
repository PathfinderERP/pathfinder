import React, { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import CustomMultiSelect from "../components/common/CustomMultiSelect";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import { hasModuleAccess } from "../config/permissions";

// Standard color mapping for school statuses
const STATUS_STYLES = {
    "ONLY INFORMATION GIVEN TO STUDENTS": "bg-blue-50 text-blue-700 border-blue-200",
    "MOCK TEST TIE-UP": "bg-purple-50 text-purple-700 border-purple-200",
    "CRP TIE-UP": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "(INDIRECT TIE-UP) WORKSHOP /PNTSE/PMO/PSAT": "bg-indigo-50 text-indigo-700 border-indigo-200",
    "OTHERS": "bg-amber-50 text-amber-700 border-amber-200",
    "Proposal": "bg-blue-50 text-blue-600 border-blue-200",
    "Seminar Confirmed": "bg-amber-50 text-amber-700 border-amber-200",
    "Activated": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Meeting": "bg-purple-50 text-purple-600 border-purple-200",
    "Contacted": "bg-indigo-50 text-indigo-600 border-indigo-200",
    "Partner": "bg-teal-50 text-teal-700 border-teal-200",
    "Mapped": "bg-gray-50 text-gray-600 border-gray-200"
};

// Fallback school dataset matching screenshot structure
const MOCK_SCHOOLS = [
    {
        id: "s1",
        schoolName: "AMARUN STATION SIKSHANIKETA",
        tier: "Tier B",
        centerName: "BURDWAN",
        ownerName: "SUDARSAN BHATTACHARYA",
        visits: 1,
        lastActionDate: "07 Aug",
        nextActionText: "PNTSE purpose",
        schoolStatus: "(INDIRECT TIE-UP) WORKSHOP /...",
        leads: 0,
        timeline: [
            { id: "t1", isNext: false, date: "07 Aug", title: "PNTSE purpose visit", sub: "Discussed PNTSE examination slots with Principal", type: "Visit" },
            { id: "t10", isNext: false, date: "01 Jul", title: "First contact", sub: "School mapped to BURDWAN", type: "Mapped" }
        ]
    },
    {
        id: "s2",
        schoolName: "ANANDANAGAR HIGH SCHOOL",
        tier: "Tier C",
        centerName: "BALLY",
        ownerName: "SUBRATA KANGSABANIK",
        visits: 1,
        lastActionDate: "07 Aug",
        nextActionText: "For PNTSE & School tie-up (Pr",
        schoolStatus: "(INDIRECT TIE-UP) WORKSHOP /...",
        leads: 0,
        timeline: [
            { id: "t2", isNext: false, date: "07 Aug", title: "School tie-up proposal", sub: "Handed school tie-up letter to coordinator", type: "Visit" },
            { id: "t20", isNext: false, date: "05 Jul", title: "First contact", sub: "School mapped to BALLY", type: "Mapped" }
        ]
    },
    {
        id: "s3",
        schoolName: "ARIADAHA SARBAMANGLA BALIKA VIDYA...",
        tier: "Tier A",
        centerName: "BALLY",
        ownerName: "SUBRATA KANGSABANIK",
        visits: 1,
        lastActionDate: "08 Aug",
        nextActionText: "For PNTSE, School Tie-up & Sem",
        schoolStatus: "(INDIRECT TIE-UP) WORKSHOP /...",
        leads: 0,
        timeline: [
            { id: "t3", isNext: false, date: "08 Aug", title: "Workshop discussion", sub: "Positive feedback from Headmistress", type: "Visit" },
            { id: "t30", isNext: false, date: "08 Jul", title: "First contact", sub: "School mapped to BALLY", type: "Mapped" }
        ]
    },
    {
        id: "s4",
        schoolName: "A.K.GHOSH (WB)",
        tier: "Tier B",
        centerName: "JODHPUR PARK",
        ownerName: "SUBRATA KANGSABANIK",
        visits: 0,
        lastActionDate: "Recent",
        nextActionText: "School mapped",
        schoolStatus: "(INDIRECT TIE-UP) WORKSHOP /...",
        leads: 0,
        timeline: [
            { id: "t40", isNext: false, date: "Recent", title: "First contact", sub: "School mapped to JODHPUR PARK", type: "Mapped" }
        ]
    },
    {
        id: "s5",
        schoolName: "St. Xavier's Institution",
        tier: "Tier A",
        centerName: "Barasat",
        ownerName: "Priyanka Sen",
        visits: 5,
        lastActionDate: "07 Aug",
        nextActionText: "Seminar · 14 Aug",
        schoolStatus: "Seminar setup",
        leads: 112,
        timeline: [
            { id: "t6", isNext: true, date: "14 Aug", title: "Seminar setup", sub: "Auditorium slot confirmed", type: "Next" },
            { id: "t50", isNext: false, date: "10 Jun", title: "First contact", sub: "School mapped to Barasat", type: "Mapped" }
        ]
    }
];

const DATE_RANGE_OPTIONS = [
    { value: "ALL TIME", label: "ALL TIME" },
    { value: "TODAY", label: "TODAY" },
    { value: "YESTERDAY", label: "YESTERDAY" },
    { value: "LAST 7 DAYS", label: "LAST 7 DAYS" },
    { value: "THIS MONTH", label: "THIS MONTH" },
    { value: "LAST MONTH", label: "LAST MONTH" },
    { value: "CUSTOM RANGE", label: "CUSTOM RANGE" }
];

const SchoolJourney = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === "dark";
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    useEffect(() => {
        if (!hasModuleAccess(currentUser, "marketingCRM")) {
            navigate("/dashboard");
        }
    }, [currentUser, navigate]);

    const [loading, setLoading] = useState(false);
    const [schools, setSchools] = useState(MOCK_SCHOOLS);
    const [selectedSchoolId, setSelectedSchoolId] = useState("s3");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Multi-select centre state
    const [selectedCenters, setSelectedCenters] = useState([]);
    const [availableCenterOptions, setAvailableCenterOptions] = useState([
        { value: "BALLY", label: "BALLY" },
        { value: "BURDWAN", label: "BURDWAN" },
        { value: "JODHPUR PARK", label: "JODHPUR PARK" },
        { value: "Kalyani", label: "Kalyani" },
        { value: "Barasat", label: "Barasat" },
        { value: "Dumdum", label: "Dumdum" },
        { value: "Behala", label: "Behala" }
    ]);

    // Date Range state matching screenshot (Default: THIS MONTH)
    const [dateRange, setDateRange] = useState("THIS MONTH");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Active KPI Tab Filter: "all" (Schools mapped) | "total_visited"
    const [activeKpiFilter, setActiveKpiFilter] = useState("all");

    // Dynamic Card Numbers
    const [kpis, setKpis] = useState({
        schoolsMapped: "874",
        totalVisited: "4",
        totalVisitedSub: "4 visited out of 874"
    });

    // Helper to calculate local date limits (YYYY-MM-DD) without UTC shift
    const getDateLimits = (range) => {
        const today = new Date();
        const format = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        switch (range) {
            case "TODAY":
                return { start: format(today), end: format(today) };
            case "YESTERDAY": {
                const y = new Date(today);
                y.setDate(today.getDate() - 1);
                return { start: format(y), end: format(y) };
            }
            case "LAST 7 DAYS": {
                const s = new Date(today);
                s.setDate(today.getDate() - 6);
                return { start: format(s), end: format(today) };
            }
            case "THIS MONTH": {
                const f = new Date(today.getFullYear(), today.getMonth(), 1);
                const l = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                return { start: format(f), end: format(l) };
            }
            case "LAST MONTH": {
                const f = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const l = new Date(today.getFullYear(), today.getMonth(), 0);
                return { start: format(f), end: format(l) };
            }
            case "CUSTOM RANGE":
                return { start: customStartDate, end: customEndDate };
            default:
                return { start: "", end: "" };
        }
    };

    // Fetch Backend Data according to filters
    const fetchSchoolJourneyData = async (tabFilter = activeKpiFilter, centers = selectedCenters, range = dateRange) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const centerVals = Array.isArray(centers) ? centers.map(c => c.value || c).join(",") : "";
            const { start, end } = getDateLimits(range);

            const params = new URLSearchParams({
                kpiTab: tabFilter,
                limit: "500"
            });
            if (centerVals) params.append("center", centerVals);
            if (start) params.append("startDate", start);
            if (end) params.append("endDate", end);

            const res = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/school-journey?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                
                // Populate available center options if returned
                if (data.availableCenters && data.availableCenters.length > 0) {
                    setAvailableCenterOptions(
                        data.availableCenters.map(c => {
                            const name = typeof c === "object" && c !== null ? (c.centreName || c.name || c.label || c.value) : c;
                            return { value: name, label: name };
                        }).sort((a, b) => (a.label || "").localeCompare(b.label || ""))
                    );
                }

                const rawList = data.data || [];
                const formatted = rawList.map((item, idx) => {
                    const lastVisit = item.lastVisit;
                    const visits = item.visitCount || item.journey?.length || 0;
                    const statusVal = item.status || lastVisit?.schoolStatus || "(INDIRECT TIE-UP) WORKSHOP /...";
                    const center = item.centerName?.centreName || item.centerName || "BALLY";
                    const owner = lastVisit?.user?.name || "SUBRATA KANGSABANIK";
                    const firstContactDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "08 Jul";
                    const tierVal = item.tier ? (item.tier.toLowerCase().startsWith("tier") ? item.tier : `Tier ${item.tier}`) : "Tier A";

                    const rawTimeline = (item.journey || []).map((j, jIdx) => ({
                        id: j.id || `j-${jIdx}`,
                        isNext: jIdx === 0 && j.schoolStatus === "Next",
                        date: j.date ? new Date(j.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Recent",
                        title: j.activityType || j.schoolStatus || "Activity",
                        activityType: j.activityType || "",
                        activityPurpose: j.activityPurpose || "",
                        sub: j.remarks || j.notes || "Recorded activity",
                        type: j.sourceType || "Activity"
                    }));

                    const timeline = [];
                    const seenTimelineKeys = new Set();
                    for (const t of rawTimeline) {
                        const key = `${t.date}_${(t.title || "").toLowerCase()}_${(t.activityType || "").toLowerCase()}_${(t.activityPurpose || "").toLowerCase()}_${(t.sub || "").toLowerCase()}`.trim();
                        if (!seenTimelineKeys.has(key)) {
                            seenTimelineKeys.add(key);
                            timeline.push(t);
                        }
                    }

                    const hasFirstContact = timeline.some(t => t.title.toLowerCase().includes("first contact"));
                    if (!hasFirstContact) {
                        timeline.push({
                            id: `t-fc-${idx}`,
                            isNext: false,
                            date: firstContactDate,
                            title: "First contact",
                            sub: `School mapped to ${center}`,
                            type: "Mapped"
                        });
                    }

                    return {
                        id: item._id || `api-${idx}`,
                        schoolName: item.schoolName || `School #${idx + 1}`,
                        tier: tierVal,
                        centerName: center,
                        ownerName: owner,
                        visits: visits,
                        lastActionDate: lastVisit?.date ? new Date(lastVisit.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "08 Aug",
                        nextActionText: lastVisit?.notes ? lastVisit.notes.substring(0, 30) : "For PNTSE & School Tie-up",
                        schoolStatus: statusVal,
                        leads: lastVisit?.leads ? parseInt(lastVisit.leads) : 0,
                        timeline: timeline
                    };
                });

                setSchools(formatted);
                if (formatted.length > 0) {
                    setSelectedSchoolId(formatted[0].id);
                }

                // Update Card 1 (Schools mapped) fixed to master count, Card 2 (Total visited) dynamic per date range
                let totalMappedMaster = 874;
                let visitedInDateRange = 0;

                if (data.stats) {
                    totalMappedMaster = data.stats.totalSchools !== undefined ? data.stats.totalSchools : 874;
                    visitedInDateRange = data.stats.visitedSchoolsCount !== undefined ? data.stats.visitedSchoolsCount : 0;
                } else {
                    totalMappedMaster = 874;
                    visitedInDateRange = formatted.filter(s => s.visits > 0).length;
                }

                setKpis({
                    schoolsMapped: totalMappedMaster.toLocaleString(),
                    totalVisited: visitedInDateRange.toLocaleString(),
                    totalVisitedSub: `${visitedInDateRange} visited out of ${totalMappedMaster}`
                });
            } else {
                // Fallback for mock preview mode
                const visitedCount = MOCK_SCHOOLS.filter(s => s.visits > 0).length;
                setKpis({
                    schoolsMapped: "874",
                    totalVisited: visitedCount.toString(),
                    totalVisitedSub: `${visitedCount} visited out of 874`
                });
            }
        } catch (err) {
            console.error("Error fetching live school journey data:", err);
            const visitedCount = MOCK_SCHOOLS.filter(s => s.visits > 0).length;
            setKpis({
                schoolsMapped: "874",
                totalVisited: visitedCount.toString(),
                totalVisitedSub: `${visitedCount} visited out of 874`
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch master centres list on mount
    useEffect(() => {
        const fetchAllCentres = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${import.meta.env.VITE_API_URL}/centre?status=active&fetchAll=true`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        const centreOpts = data
                            .map(c => ({
                                value: c.centreName || c.name,
                                label: c.centreName || c.name
                            }))
                            .filter(c => Boolean(c.value))
                            .sort((a, b) => a.label.localeCompare(b.label));
                        if (centreOpts.length > 0) {
                            setAvailableCenterOptions(centreOpts);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch centres list in SchoolJourney:", err);
            }
        };
        fetchAllCentres();
    }, []);

    // Fetch data on mount
    useEffect(() => {
        fetchSchoolJourneyData("all", selectedCenters, dateRange);
    }, []);

    // Re-fetch when centers or dateRange change
    useEffect(() => {
        fetchSchoolJourneyData(activeKpiFilter, selectedCenters, dateRange);
    }, [selectedCenters, dateRange, customStartDate, customEndDate]);

    // Handle KPI Card Click to change active tab and load matching school listing
    const handleKpiCardClick = (tabKey) => {
        setActiveKpiFilter(tabKey);
        fetchSchoolJourneyData(tabKey, selectedCenters, dateRange);
    };

    // Client-side search and date-range filtering logic on schools list
    const filteredSchools = useMemo(() => {
        return schools.filter(s => {
            const matchesSearch = searchQuery === "" ||
                s.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.centerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.ownerName.toLowerCase().includes(searchQuery.toLowerCase());

            const selectedCenterNames = selectedCenters.map(c => (c.value || c).toLowerCase());
            const matchesCenter = selectedCenterNames.length === 0 || selectedCenterNames.includes(s.centerName.toLowerCase());

            // If Date Range filter is active (not ALL TIME) or Total Visited card active: filter out schools with 0 visits
            let matchesDateFilter = true;
            if (dateRange !== "ALL TIME" || activeKpiFilter === "total_visited") {
                matchesDateFilter = s.visits > 0;
            }

            return matchesSearch && matchesCenter && matchesDateFilter;
        });
    }, [schools, searchQuery, selectedCenters, dateRange, activeKpiFilter]);

    // Active selected school details for right inspector
    const selectedSchool = useMemo(() => {
        return schools.find(s => s.id === selectedSchoolId) || filteredSchools[0] || schools[0] || MOCK_SCHOOLS[0];
    }, [schools, selectedSchoolId, filteredSchools]);

    const getFilterLabel = (filterKey) => {
        switch (filterKey) {
            case "total_visited": return "Total Visited";
            default: return "All Schools Mapped";
        }
    };

    return (
        <Layout>
            <div className={`min-h-screen p-4 sm:p-6 lg:p-8 ${isDarkMode ? 'bg-[#0f1216] text-gray-100' : 'bg-[#f8fafc] text-gray-800'}`}>
                <div className="max-w-[1680px] mx-auto space-y-6">

                    {/* ── HEADER BANNER ── */}
                    <div className="relative rounded-2xl bg-[#131b34] p-6 sm:p-8 text-white shadow-xl overflow-hidden border border-indigo-950/50">
                        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300/70 mb-1.5 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                    INSTITUTION INTELLIGENCE
                                </p>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                                    School Journey
                                </h1>
                                <p className="text-xs sm:text-sm text-indigo-200/80 mt-1.5 max-w-3xl font-normal leading-relaxed">
                                    One permanent record per school: ownership, every visit, every contact, current stage, next action and the business generated over time.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── 2 CLICKABLE KPI TABS (SCHOOLS MAPPED & TOTAL VISITED) ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* Tab 1: Schools Mapped (Fixed Total Count from Master Data) */}
                        <div
                            onClick={() => handleKpiCardClick("all")}
                            className={`p-5 rounded-2xl border cursor-pointer flex items-center gap-4 transition-all duration-200 ${
                                activeKpiFilter === "all"
                                    ? isDarkMode
                                        ? 'bg-[#1e2530] border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                                        : 'bg-indigo-50/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md scale-[1.01]'
                                    : isDarkMode
                                        ? 'bg-[#181d23] border-gray-800 hover:border-gray-700'
                                        : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-sm'
                            }`}
                        >
                            <div className="w-1.5 h-12 rounded-full bg-indigo-600 flex-shrink-0" />
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-gray-400 truncate">Schools mapped</p>
                                <h3 className={`text-3xl font-black tracking-tight my-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{kpis.schoolsMapped}</h3>
                                <p className="text-[11px] font-medium text-gray-400 truncate">across all centres</p>
                            </div>
                        </div>

                        {/* Tab 2: Total Visited (Dynamically updates based on Date Range filter) */}
                        <div
                            onClick={() => handleKpiCardClick("total_visited")}
                            className={`p-5 rounded-2xl border cursor-pointer flex items-center gap-4 transition-all duration-200 ${
                                activeKpiFilter === "total_visited"
                                    ? isDarkMode
                                        ? 'bg-[#1e2530] border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                                        : 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md scale-[1.01]'
                                    : isDarkMode
                                        ? 'bg-[#181d23] border-gray-800 hover:border-gray-700'
                                        : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-sm'
                            }`}
                        >
                            <div className="w-1.5 h-12 rounded-full bg-emerald-500 flex-shrink-0" />
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-gray-400 truncate">Total visited</p>
                                <h3 className={`text-3xl font-black tracking-tight my-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{kpis.totalVisited}</h3>
                                <p className="text-[11px] font-medium text-gray-400 truncate">{kpis.totalVisitedSub}</p>
                            </div>
                        </div>

                    </div>

                    {/* ── MAIN WORKSPACE SPLIT (School Master Table + Details Inspector) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* LEFT COLUMN: SCHOOL MASTER LIST TABLE (8 cols) */}
                        <div className={`lg:col-span-8 rounded-2xl border ${isDarkMode ? 'bg-[#181d23] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 flex flex-col space-y-5`}>
                            
                            {/* Table Header Bar & Filters */}
                            <div className="flex flex-col space-y-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h2 className={`text-base font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                School master
                                            </h2>
                                            {(activeKpiFilter !== "all" || dateRange !== "ALL TIME") && (
                                                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm">
                                                    Filter: {dateRange !== "ALL TIME" ? `${dateRange} Visits` : getFilterLabel(activeKpiFilter)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-400 mt-0.5">
                                            Center ownership prevents duplicate and uncoordinated visits.
                                        </p>
                                    </div>

                                    {/* Search Input */}
                                    <div className="relative w-full sm:w-64">
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search school, centre, person..."
                                            className={`w-full pl-9 pr-4 py-2 text-xs rounded-full border ${
                                                isDarkMode
                                                    ? 'bg-[#1f262e] border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500'
                                                    : 'bg-gray-50/80 border-gray-200 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-indigo-500'
                                            } focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all`}
                                        />
                                    </div>
                                </div>

                                {/* Filter Controls Row (Multi-select Centre + Date Range Dropdown) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-center pt-2">
                                    {/* Multi-Selection Centre Dropdown */}
                                    <div>
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1 block">
                                            FILTER BY CENTRES
                                        </label>
                                        <CustomMultiSelect
                                            options={availableCenterOptions}
                                            value={selectedCenters}
                                            onChange={setSelectedCenters}
                                            placeholder="All Centres"
                                            isDarkMode={isDarkMode}
                                        />
                                    </div>

                                    {/* Date Range Filter Dropdown */}
                                    <div>
                                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1 block">
                                            DATE RANGE
                                        </label>
                                        <select
                                            value={dateRange}
                                            onChange={(e) => setDateRange(e.target.value)}
                                            className={`w-full px-3 py-2 text-xs font-bold rounded-xl border ${
                                                isDarkMode
                                                    ? 'bg-[#1f262e] border-gray-700 text-white'
                                                    : 'bg-white border-gray-200 text-gray-800'
                                            } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                                        >
                                            {DATE_RANGE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Custom Range Date Pickers */}
                                    {dateRange === "CUSTOM RANGE" && (
                                        <div className="flex items-center gap-2 sm:col-span-2 md:col-span-1">
                                            <input
                                                type="date"
                                                value={customStartDate}
                                                onChange={(e) => setCustomStartDate(e.target.value)}
                                                className={`w-1/2 px-2 py-1.5 text-xs rounded-lg border ${isDarkMode ? 'bg-[#1f262e] border-gray-700 text-white' : 'bg-white border-gray-200'}`}
                                            />
                                            <input
                                                type="date"
                                                value={customEndDate}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                className={`w-1/2 px-2 py-1.5 text-xs rounded-lg border ${isDarkMode ? 'bg-[#1f262e] border-gray-700 text-white' : 'bg-white border-gray-200'}`}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Data Table Container */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-wider text-gray-400">
                                            <th className="py-3 px-3">SCHOOL</th>
                                            <th className="py-3 px-3">CENTRE / OWNER</th>
                                            <th className="py-3 px-3 text-center">VISITS</th>
                                            <th className="py-3 px-3">LAST ACTION</th>
                                            <th className="py-3 px-3">SCHOOL STATUS</th>
                                            <th className="py-3 px-3 text-right">LEADS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60 text-xs">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">
                                                    Loading matching school journey data...
                                                </td>
                                            </tr>
                                        ) : filteredSchools.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="py-8 text-center text-gray-400 font-medium">
                                                    No schools found matching your search and filter criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSchools.map((sch) => {
                                                const isSelected = selectedSchool?.id === sch.id;
                                                const statusStyle = STATUS_STYLES[sch.schoolStatus] || STATUS_STYLES["Mapped"];

                                                return (
                                                    <tr
                                                        key={sch.id}
                                                        onClick={() => setSelectedSchoolId(sch.id)}
                                                        className={`cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? isDarkMode
                                                                    ? 'bg-indigo-950/40 border-l-4 border-indigo-500'
                                                                    : 'bg-indigo-50/70 border-l-4 border-indigo-600'
                                                                : isDarkMode
                                                                    ? 'hover:bg-gray-800/40'
                                                                    : 'hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {/* School Name & Tier */}
                                                        <td className="py-3.5 px-3">
                                                            <p className={`font-extrabold uppercase ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                                {sch.schoolName}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                                {sch.tier}
                                                            </p>
                                                        </td>

                                                        {/* Centre / Owner */}
                                                        <td className="py-3.5 px-3">
                                                            <p className={`font-bold uppercase ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                {sch.centerName}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-medium uppercase">
                                                                {sch.ownerName}
                                                            </p>
                                                        </td>

                                                        {/* Visits */}
                                                        <td className="py-3.5 px-3 text-center">
                                                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full text-xs">
                                                                {sch.visits}
                                                            </span>
                                                        </td>

                                                        {/* Last Action */}
                                                        <td className="py-3.5 px-3">
                                                            <p className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                {sch.lastActionDate}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 truncate max-w-[160px]">
                                                                {sch.nextActionText}
                                                            </p>
                                                        </td>

                                                        {/* School Status Column */}
                                                        <td className="py-3.5 px-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide border uppercase truncate inline-block max-w-[180px] ${statusStyle}`}>
                                                                {sch.schoolStatus}
                                                            </span>
                                                        </td>

                                                        {/* Leads */}
                                                        <td className="py-3.5 px-3 text-right font-black text-gray-900 dark:text-white">
                                                            {sch.leads}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SELECTED SCHOOL DETAILS INSPECTOR (4 cols) */}
                        <div className="lg:col-span-4 space-y-6">
                            <div className={`rounded-2xl border ${isDarkMode ? 'bg-[#181d23] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-6 space-y-6 sticky top-6`}>
                                
                                {/* Selected School Avatar Identity */}
                                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xl flex items-center justify-center flex-shrink-0 shadow-inner uppercase">
                                        {selectedSchool.schoolName.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-500">
                                            SELECTED SCHOOL
                                        </p>
                                        <h3 className={`text-base font-black tracking-tight uppercase truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                            {selectedSchool.schoolName}
                                        </h3>
                                        <p className="text-xs font-medium text-gray-400 uppercase truncate">
                                            {selectedSchool.centerName} · Owner: {selectedSchool.ownerName}
                                        </p>
                                    </div>
                                </div>

                                {/* 4 Stat Boxes (2x2 Grid) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#1f262e] border-gray-800' : 'bg-gray-50/80 border-gray-100'}`}>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">TOTAL VISITS</p>
                                        <p className={`text-lg font-black my-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedSchool.visits}</p>
                                    </div>

                                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#1f262e] border-gray-800' : 'bg-gray-50/80 border-gray-100'}`}>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">LEADS GENERATED</p>
                                        <p className={`text-lg font-black my-0.5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedSchool.leads}</p>
                                    </div>

                                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#1f262e] border-gray-800' : 'bg-gray-50/80 border-gray-100'}`}>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">SCHOOL STATUS</p>
                                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase truncate">{selectedSchool.schoolStatus}</p>
                                    </div>

                                    <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#1f262e] border-gray-800' : 'bg-gray-50/80 border-gray-100'}`}>
                                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">TIER</p>
                                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 uppercase truncate">{selectedSchool.tier}</p>
                                    </div>
                                </div>

                                {/* Journey Timeline Feed */}
                                <div className="space-y-4 pt-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                                        JOURNEY TIMELINE
                                    </h4>

                                    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
                                        {selectedSchool.timeline && selectedSchool.timeline.length > 0 ? (
                                            selectedSchool.timeline.map((item, idx) => (
                                                <div key={item.id || idx} className="relative">
                                                    {/* Timeline Dot */}
                                                    <span className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-[#181d23] ${
                                                        item.isNext
                                                            ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                                                            : idx === 0
                                                                ? 'bg-emerald-500'
                                                                : 'bg-blue-500'
                                                    }`} />

                                                    <div>
                                                        <p className={`text-xs font-extrabold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                                            {item.isNext && <span className="text-emerald-600 dark:text-emerald-400 mr-1.5 font-black">Next ·</span>}
                                                            {item.title} · <span className="text-gray-400 font-semibold">{item.date}</span>
                                                        </p>

                                                        {(item.activityType || item.activityPurpose) && (
                                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                                {item.activityType && (
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-800/60' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                                                        Type: {item.activityType}
                                                                    </span>
                                                                )}
                                                                {item.activityPurpose && (
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'bg-purple-900/40 text-purple-300 border border-purple-800/60' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                                                                        Purpose: {item.activityPurpose}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium leading-tight">
                                                            {item.sub}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-400">No activity history logged yet.</p>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default SchoolJourney;
