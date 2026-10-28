import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Layout from "../../components/Layout";
import {
    FaChartPie,
    FaFilter,
    FaSync,
    FaDownload,
    FaSun,
    FaMoon,
    FaPhoneAlt,
    FaClock,
    FaUsers,
    FaComments,
    FaUserCheck,
    FaBullseye,
    FaLayerGroup,
    FaSearch,
    FaTimes,
    FaChevronDown,
    FaExchangeAlt,
    FaInfoCircle,
    FaPercentage,
    FaCheckCircle,
    FaHistory,
    FaUserGraduate,
    FaGraduationCap
} from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import { hasPermission } from "../../config/permissions";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from "recharts";

// Date formatting helper YYYY-MM-DD
const formatLocalDate = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Vibrant color palette for charts
const COLOR_PALETTE = [
    "#06b6d4", "#10b981", "#3b82f6", "#f59e0b",
    "#ec4899", "#8b5cf6", "#f97316", "#14b8a6",
    "#6366f1", "#84cc16", "#e11d48", "#0ea5e9",
    "#d946ef", "#eab308", "#22c55e", "#a855f7"
];

// Interactive Custom Tooltip Component for Pie Charts
const CustomPieTooltip = ({ active, payload, isDarkMode, suffix = "" }) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div
                className={`p-3 rounded-xl shadow-2xl border text-xs backdrop-blur-md transition-all z-50 ${
                    isDarkMode
                        ? "bg-slate-900/95 border-slate-700/80 text-white shadow-cyan-500/10"
                        : "bg-white/95 border-slate-200 text-slate-800 shadow-slate-300"
                }`}
                style={{ minWidth: "180px" }}
            >
                <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-700/30">
                    <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="font-black text-sm truncate">{item.name}</span>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                        <span>Volume:</span>
                        <span className="font-black text-cyan-400">
                            {Number(item.value || 0).toLocaleString()} {suffix}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                        <span>Percentage Share:</span>
                        <span className="font-extrabold text-emerald-400">
                            {item.share != null ? `${item.share}%` : "0%"}
                        </span>
                    </div>
                    {item.formattedAvg && (
                        <div className="flex justify-between items-center text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                            <span>Avg Duration:</span>
                            <span className="font-bold text-amber-400">{item.formattedAvg}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

// Reusable Donut Pie Chart Component
const DonutAnalysisCard = ({
    title,
    subtitle,
    icon: Icon,
    data = [],
    totalCount = 0,
    centerValue,
    centerSubtext,
    centerLabel = "TOTAL",
    isDarkMode = true,
    emptyMessage = "No data recorded for this selection",
    extraLegend
}) => {
    return (
        <div
            className={`p-5 rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden group ${
                isDarkMode
                    ? "bg-[#131619] border-gray-800 hover:border-cyan-500/40 shadow-xl shadow-black/40"
                    : "bg-white border-gray-200 hover:border-cyan-500/40 shadow-sm"
            }`}
        >
            <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-gray-800/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
                            <Icon size={18} />
                        </div>
                        <div>
                            <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {title}
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {Number(totalCount || 0).toLocaleString()} Total
                        </span>
                    </div>
                </div>

                {/* Donut Chart Canvas */}
                <div className="h-[250px] w-full relative flex items-center justify-center">
                    {data && data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={100}
                                    paddingAngle={3}
                                    stroke={isDarkMode ? "#131619" : "#ffffff"}
                                    strokeWidth={2}
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color || COLOR_PALETTE[index % COLOR_PALETTE.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={
                                        <CustomPieTooltip
                                            isDarkMode={isDarkMode}
                                        />
                                    }
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <FaInfoCircle className="text-2xl mx-auto mb-2 opacity-40 text-cyan-500" />
                            <p className="text-xs font-bold">{emptyMessage}</p>
                        </div>
                    )}

                    {/* Donut Center Label */}
                    {data && data.length > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                {centerLabel}
                            </span>
                            <span className="text-base font-black text-cyan-400 mt-0.5 max-w-[120px] truncate px-1 tracking-tight">
                                {centerValue != null ? centerValue : Number(totalCount || 0).toLocaleString()}
                            </span>
                            {centerSubtext && (
                                <span className="text-[10px] font-bold text-gray-500">
                                    {centerSubtext}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Breakdown List */}
            <div className="mt-4 pt-3 border-t border-gray-800/40">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                    <span>Segment Breakdown</span>
                    <span>Count (% Share)</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                    {data && data.length > 0 ? (
                        data.map((item, idx) => {
                            const shareVal = item.share != null ? item.share : (totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : 0);
                            return (
                                <div
                                    key={`${item.name}-${idx}`}
                                    className={`p-2 rounded-xl flex flex-col gap-1 text-xs transition-colors ${
                                        isDarkMode ? "bg-slate-900/60 hover:bg-slate-800/80" : "bg-gray-50 hover:bg-gray-100"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                                style={{ backgroundColor: item.color || COLOR_PALETTE[idx % COLOR_PALETTE.length] }}
                                            />
                                            <span className={`font-bold text-xs truncate ${isDarkMode ? "text-gray-200" : "text-gray-800"}`} title={item.name}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="font-black text-cyan-400 mr-1.5">
                                                {Number(item.value || 0).toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-500">
                                                ({shareVal}%)
                                            </span>
                                        </div>
                                    </div>
                                    {/* Subtle progress bar */}
                                    <div className="w-full bg-gray-700/30 h-1 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, Math.max(0, Number(shareVal)))}%`,
                                                backgroundColor: item.color || COLOR_PALETTE[idx % COLOR_PALETTE.length]
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-[11px] text-gray-500 text-center py-2">No segments to display</p>
                    )}
                </div>
                {extraLegend && (
                    <div className="mt-3 pt-2 border-t border-gray-800/30 text-[10px] text-gray-500">
                        {extraLegend}
                    </div>
                )}
            </div>
        </div>
    );
};

export default function LeadAnalysisPage() {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === "dark";

    // Navigation Tabs: "all" | "call_duration" | "source" | "remarks" | "followup" | "conversion"
    const [activeTab, setActiveTab] = useState("all");

    // Master Data State for Filters
    const [sources, setSources] = useState([]);
    const [courses, setCourses] = useState([]);
    const [boards, setBoards] = useState([]);
    const [classes, setClasses] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [allowedCentres, setAllowedCentres] = useState([]);
    const [feedbackCategories, setFeedbackCategories] = useState([]);
    const [zones, setZones] = useState([]);
    const [schoolsList, setSchoolsList] = useState([]);
    const [uploaders, setUploaders] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Filters State matching screenshot EXACTLY
    const [filters, setFilters] = useState({
        leadType: [],
        source: [],
        campaign: [],
        zone: [],
        centre: [],
        course: [],
        board: [],
        className: [],
        schoolName: [],
        leadResponsibility: [], // Agent
        uploadedBy: [],
        uploadedFromDate: "",
        uploadedToDate: "",
        marketingBy: [],
        fromDate: "", // Assigned At
        toDate: "",   // Assigned At
        feedback: [],
        followUpStatus: [],
        isPriority: "",
        showDuplicates: "",
        admissionSource: ""
    });

    // Date Presets State
    const [datePreset, setDatePreset] = useState("");
    const [showCustomDates, setShowCustomDates] = useState(false);
    const [uploadedDatePreset, setUploadedDatePreset] = useState("");
    const [showUploadedCustomDates, setShowUploadedCustomDates] = useState(false);

    // Enrollment dropdown state
    const [isEnrollmentDropdownOpen, setIsEnrollmentDropdownOpen] = useState(false);
    const enrollmentDropdownRef = useRef(null);

    // Analysis API response state
    const [loading, setLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState(null);
    const reqVersionRef = useRef(0);

    // Close enrollment dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (enrollmentDropdownRef.current && !enrollmentDropdownRef.current.contains(e.target)) {
                setIsEnrollmentDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter change handler
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Assigned At Date Preset Handler
    const applyDatePreset = (preset) => {
        const now = new Date();
        const fmt = formatLocalDate;
        const today = fmt(now);
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(now.getDate() - 1);
        const yesterday = fmt(yesterdayDate);
        const dayOfWeek = now.getDay();
        const diffToMon = (dayOfWeek + 6) % 7;
        const thisWeekMon = new Date(now); thisWeekMon.setDate(now.getDate() - diffToMon);
        const prevWeekMon = new Date(thisWeekMon); prevWeekMon.setDate(thisWeekMon.getDate() - 7);
        const prevWeekSun = new Date(thisWeekMon); prevWeekSun.setDate(thisWeekMon.getDate() - 1);
        const y = now.getFullYear(), m = now.getMonth();
        const thisMonStart = fmt(new Date(y, m, 1));
        const prevMonStart = fmt(new Date(y, m - 1, 1));
        const prevMonEnd = fmt(new Date(y, m, 0));
        const thisYearStart = fmt(new Date(y, 0, 1));
        const prevYearStart = fmt(new Date(y - 1, 0, 1));
        const prevYearEnd = fmt(new Date(y - 1, 11, 31));

        setDatePreset(preset);
        if (preset === 'custom') { setShowCustomDates(true); return; }
        setShowCustomDates(false);
        const ranges = {
            today: [today, today],
            yesterday: [yesterday, yesterday],
            thisWeek: [fmt(thisWeekMon), today],
            prevWeek: [fmt(prevWeekMon), fmt(prevWeekSun)],
            thisMonth: [thisMonStart, today],
            prevMonth: [prevMonStart, prevMonEnd],
            thisYear: [thisYearStart, today],
            prevYear: [prevYearStart, prevYearEnd],
        };
        const [from, to] = ranges[preset] || ['', ''];
        setFilters(prev => ({ ...prev, fromDate: from, toDate: to }));
    };

    // Uploaded At Date Preset Handler
    const applyUploadedDatePreset = (preset) => {
        const now = new Date();
        const fmt = formatLocalDate;
        const today = fmt(now);
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(now.getDate() - 1);
        const yesterday = fmt(yesterdayDate);
        const dayOfWeek = now.getDay();
        const diffToMon = (dayOfWeek + 6) % 7;
        const thisWeekMon = new Date(now); thisWeekMon.setDate(now.getDate() - diffToMon);
        const prevWeekMon = new Date(thisWeekMon); prevWeekMon.setDate(thisWeekMon.getDate() - 7);
        const prevWeekSun = new Date(thisWeekMon); prevWeekSun.setDate(thisWeekMon.getDate() - 1);
        const y = now.getFullYear(), m = now.getMonth();
        const thisMonStart = fmt(new Date(y, m, 1));
        const prevMonStart = fmt(new Date(y, m - 1, 1));
        const prevMonEnd = fmt(new Date(y, m, 0));
        const thisYearStart = fmt(new Date(y, 0, 1));
        const prevYearStart = fmt(new Date(y - 1, 0, 1));
        const prevYearEnd = fmt(new Date(y - 1, 11, 31));

        setUploadedDatePreset(preset);
        if (preset === 'custom') { setShowUploadedCustomDates(true); return; }
        setShowUploadedCustomDates(false);
        const ranges = {
            today: [today, today],
            yesterday: [yesterday, yesterday],
            thisWeek: [fmt(thisWeekMon), today],
            prevWeek: [fmt(prevWeekMon), fmt(prevWeekSun)],
            thisMonth: [thisMonStart, today],
            prevMonth: [prevMonStart, prevMonEnd],
            thisYear: [thisYearStart, today],
            prevYear: [prevYearStart, prevYearEnd],
        };
        const [from, to] = ranges[preset] || ['', ''];
        setFilters(prev => ({ ...prev, uploadedFromDate: from, uploadedToDate: to }));
    };

    // Reset All Filters
    const resetAllFilters = () => {
        setFilters({
            leadType: [],
            source: [],
            campaign: [],
            zone: [],
            centre: [],
            course: [],
            board: [],
            className: [],
            schoolName: [],
            leadResponsibility: [],
            uploadedBy: [],
            uploadedFromDate: "",
            uploadedToDate: "",
            marketingBy: [],
            fromDate: "",
            toDate: "",
            feedback: [],
            followUpStatus: [],
            isPriority: "",
            showDuplicates: "",
            admissionSource: ""
        });
        setDatePreset("");
        setShowCustomDates(false);
        setUploadedDatePreset("");
        setShowUploadedCustomDates(false);
    };

    // Initial Master Data Loading
    useEffect(() => {
        fetchFilterDropdowns();
    }, []);

    const fetchFilterDropdowns = async () => {
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const headers = { Authorization: `Bearer ${token}` };

            // User profile for allowed centres
            const userRes = await fetch(`${apiUrl}/profile/me`, { headers });
            let userProfile = null;
            if (userRes.ok) {
                const uData = await userRes.json();
                userProfile = uData.user;
                setCurrentUser(userProfile);
            }

            const [
                sourcesRes, distinctSourcesRes, coursesRes, boardsRes,
                classesRes, usersRes, feedbackRes, schoolsRes,
                zonesRes, uploadersRes, campaignsRes, centresRes
            ] = await Promise.all([
                fetch(`${apiUrl}/source`, { headers }),
                fetch(`${apiUrl}/lead-management/distinct-sources`, { headers }),
                fetch(`${apiUrl}/course`, { headers }),
                fetch(`${apiUrl}/board`, { headers }),
                fetch(`${apiUrl}/class`, { headers }),
                fetch(`${apiUrl}/superAdmin/getAllUsers`, { headers }),
                fetch(`${apiUrl}/master-data/follow-up-feedback`, { headers }),
                fetch(`${apiUrl}/lead-management/distinct-schools`, { headers }),
                fetch(`${apiUrl}/zone`, { headers }),
                fetch(`${apiUrl}/lead-management/uploaders`, { headers }),
                fetch(`${apiUrl}/lead-management/campaigns`, { headers }),
                userProfile?.role === "superAdmin"
                    ? fetch(`${apiUrl}/centre`, { headers })
                    : Promise.resolve(null)
            ]);

            // Sources
            if (sourcesRes.ok) {
                const sData = await sourcesRes.json();
                const masterSources = sData.sources || [];
                const distinctData = distinctSourcesRes.ok ? await distinctSourcesRes.json() : { sources: [] };
                const masterNames = new Set(masterSources.map(s => (s.sourceName || "").toLowerCase()));
                const extraSources = (distinctData.sources || [])
                    .filter(s => !masterNames.has(s.toLowerCase()))
                    .map(s => ({ sourceName: s }));
                setSources([...masterSources, ...extraSources]);
            }

            // Courses
            if (coursesRes.ok) {
                const cData = await coursesRes.json();
                setCourses(Array.isArray(cData) ? cData : (cData.data || []));
            }

            // Boards
            if (boardsRes.ok) {
                const bData = await boardsRes.json();
                setBoards(Array.isArray(bData) ? bData : []);
            }

            // Classes
            if (classesRes.ok) {
                const clData = await classesRes.json();
                setClasses(Array.isArray(clData) ? clData : []);
            }

            // Users / Agents
            if (usersRes.ok) {
                const uData = await usersRes.json();
                const leadUsers = (uData.users || []).filter(u => {
                    const r = u.role?.toLowerCase()?.replace(/[\s\-_]+/g, '') || '';
                    const isActive = u.isActive !== false;
                    const allowedRoles = ['telecaller', 'centralizedtelecaller', 'counsellor', 'marketing', 'rm', 'centerincharge', 'centreincharge', 'zonalmanager', 'hod', 'superadmin', 'assistantzonalmanager', 'assistantcenterincharge', 'areamanager', 'teacher'];
                    return isActive && allowedRoles.includes(r);
                });

                const nameCounts = {};
                leadUsers.forEach(u => {
                    const name = u.name?.trim();
                    if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
                });

                const formattedUsers = leadUsers.map(u => {
                    const name = u.name?.trim();
                    const isDuplicate = nameCounts[name] > 1;
                    let displayName = u.name;
                    if (isDuplicate) {
                        const centreNames = (u.centres || []).map(c => c.centreName || c.name).filter(Boolean).join(', ');
                        displayName = `${u.name} (${centreNames || 'No Centre'})`;
                    }
                    return {
                        ...u,
                        displayName,
                        value: u._id || u.name
                    };
                });
                formattedUsers.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
                setTelecallers(formattedUsers);
            }

            // Feedbacks
            if (feedbackRes.ok) {
                const fData = await feedbackRes.json();
                setFeedbackCategories(Array.isArray(fData) ? fData : []);
            }

            // Schools
            if (schoolsRes.ok) {
                const scData = await schoolsRes.json();
                const schools = scData.schools || [];
                schools.sort((a, b) => (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' }));
                setSchoolsList(schools);
            }

            // Zones
            if (zonesRes.ok) {
                const zData = await zonesRes.json();
                setZones(zData.data || zData.zones || []);
            }

            // Uploaders
            if (uploadersRes.ok) {
                const upData = await uploadersRes.json();
                setUploaders(upData.uploaders || []);
            }

            // Campaigns
            if (campaignsRes.ok) {
                const cmpData = await campaignsRes.json();
                setCampaigns(cmpData.campaigns || []);
            }

            // Allowed Centres
            if (centresRes && centresRes.ok) {
                const cntData = await centresRes.json();
                const list = Array.isArray(cntData) ? cntData : [];
                setAllowedCentres(list.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || "")));
            } else if (userProfile) {
                const userCentres = (userProfile.centres || []).sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setAllowedCentres(userCentres);
            }
        } catch (err) {
            console.error("Error loading master filter data:", err);
        }
    };

    // Re-fetch lead analysis data whenever filters change
    const fetchAnalysisData = useCallback(async () => {
        setLoading(true);
        const version = ++reqVersionRef.current;
        try {
            const token = localStorage.getItem("token");
            const apiUrl = import.meta.env.VITE_API_URL;
            const params = new URLSearchParams();

            // Append all active filters
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => {
                        const val = (v && typeof v === 'object' && 'value' in v) ? v.value : v;
                        if (val) params.append(key, val);
                    });
                } else if (value !== undefined && value !== null && value !== "") {
                    params.append(key, value);
                }
            });

            const response = await fetch(`${apiUrl}/lead-management/stats/lead-analysis?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (version === reqVersionRef.current) {
                    setAnalysisData(data);
                }
            } else {
                toast.error("Failed to load lead analysis data");
            }
        } catch (error) {
            console.error("Error fetching lead analysis:", error);
            toast.error("Network error loading lead analysis");
        } finally {
            if (version === reqVersionRef.current) {
                setLoading(false);
            }
        }
    }, [filters]);

    useEffect(() => {
        fetchAnalysisData();
    }, [fetchAnalysisData]);

    // Export Excel Handler
    const handleExportExcel = () => {
        if (!analysisData || analysisData.totalLeads === 0) {
            toast.warning("No data to export");
            return;
        }

        const wb = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryRows = [
            { "Metric": "Total Leads Filtered", "Value": analysisData.totalLeads },
            { "Metric": "Admitted / Converted", "Value": analysisData.summary?.admittedCount || 0 },
            { "Metric": "Overall Conversion Rate %", "Value": `${analysisData.summary?.conversionRate || 0}%` },
            { "Metric": "Counselled Leads", "Value": analysisData.summary?.counselledCount || 0 },
            { "Metric": "Walk-In Leads", "Value": analysisData.summary?.walkInCount || 0 },
            { "Metric": "Total Follow-up Calls Logged", "Value": analysisData.summary?.totalFollowUps || 0 },
            { "Metric": "Leads Contacted", "Value": analysisData.summary?.contactedCount || 0 },
            { "Metric": "Contact Rate %", "Value": `${analysisData.summary?.contactRate || 0}%` },
            { "Metric": "Average Call Duration", "Value": analysisData.summary?.avgCallDurationFormatted || "00:00" },
            { "Metric": "Top Lead Source", "Value": analysisData.summary?.topSource || "N/A" }
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Overview Summary");

        // 2. Call Duration Sheet
        if (analysisData.callDurationAnalysis?.durationRanges?.length > 0) {
            const durationRows = analysisData.callDurationAnalysis.durationRanges.map(d => ({
                "Duration Range Bracket": d.name,
                "Calls Count": d.value,
                "Share %": `${d.share}%`,
                "Average Duration in Bracket": d.formattedAvg || "N/A"
            }));
            const wsDuration = XLSX.utils.json_to_sheet(durationRows);
            XLSX.utils.book_append_sheet(wb, wsDuration, "Call Duration Ranges");
        }

        // 3. Lead Source Sheet
        if (analysisData.leadSourceAnalysis?.sources?.length > 0) {
            const sourceRows = analysisData.leadSourceAnalysis.sources.map(s => ({
                "Lead Source": s.name,
                "Lead Volume": s.value,
                "Share %": `${s.share}%`
            }));
            const wsSources = XLSX.utils.json_to_sheet(sourceRows);
            XLSX.utils.book_append_sheet(wb, wsSources, "Source Distribution");
        }

        // 4. Remarks & Feedback Sheet
        if (analysisData.remarksAnalysis?.feedbacks?.length > 0) {
            const feedbackRows = analysisData.remarksAnalysis.feedbacks.map(f => ({
                "Feedback / Remark Category": f.name,
                "Count": f.value,
                "Share %": `${f.share}%`
            }));
            const wsFeedbacks = XLSX.utils.json_to_sheet(feedbackRows);
            XLSX.utils.book_append_sheet(wb, wsFeedbacks, "Remarks & Feedback");
        }

        // 5. Follow-Up Analysis Sheet
        if (analysisData.followUpAnalysis?.frequencyBreakdown?.length > 0) {
            const followUpRows = analysisData.followUpAnalysis.frequencyBreakdown.map(f => ({
                "Follow-up Frequency Bucket": f.name,
                "Leads Count": f.value,
                "Share %": `${f.share}%`
            }));
            const wsFollowUps = XLSX.utils.json_to_sheet(followUpRows);
            XLSX.utils.book_append_sheet(wb, wsFollowUps, "Follow-Up Activity");
        }

        // 6. Conversion Pipeline Sheet
        if (analysisData.conversionAnalysis?.statusBreakdown?.length > 0) {
            const conversionRows = analysisData.conversionAnalysis.statusBreakdown.map(c => ({
                "Pipeline Stage": c.name,
                "Count": c.value,
                "Share %": `${c.share}%`
            }));
            const wsConversion = XLSX.utils.json_to_sheet(conversionRows);
            XLSX.utils.book_append_sheet(wb, wsConversion, "Conversion Pipeline");
        }

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(dataBlob, `Lead_Analysis_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success("Excel report exported successfully");
    };

    return (
        <Layout activePage="Lead Management">
            <div className={`p-4 md:p-6 min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-[#0a0a0b] text-slate-100" : "bg-slate-50 text-slate-800"}`}>
                
                {/* 1. Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Lead Management
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs font-semibold text-slate-400">Multi-Dimensional Analysis</span>
                        </div>
                        <h1 className={`text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                                <FaChartPie className="text-lg" />
                            </div>
                            Lead Analysis Module
                        </h1>
                        <p className="text-xs text-slate-400 mt-1">
                            Detailed visual analysis across Average Call Duration, Lead Source Distribution, Remarks & Feedback, Follow-Up Activity, and Conversion Pipeline
                        </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={toggleTheme}
                            className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-2 ${
                                isDarkMode
                                    ? "bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
                            }`}
                            title="Toggle Light/Dark"
                        >
                            {isDarkMode ? <FaSun className="text-sm" /> : <FaMoon className="text-sm" />}
                        </button>

                        <button
                            onClick={fetchAnalysisData}
                            className={`p-2.5 rounded-xl border transition-all text-xs font-bold flex items-center gap-2 ${
                                isDarkMode
                                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
                            }`}
                            title="Refresh Analysis Data"
                        >
                            <FaSync className={`text-sm ${loading ? "animate-spin text-cyan-400" : ""}`} />
                            <span>Refresh</span>
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                            title="Export analysis to Excel"
                        >
                            <FaDownload />
                            <span>Export Excel</span>
                        </button>
                    </div>
                </div>

                {/* 2. Full Filters Bar Matching Screenshot EXACTLY */}
                <div className={`border rounded-[2px] p-6 space-y-6 mb-6 ${isDarkMode ? "bg-[#131619] border-gray-800 shadow-xl" : "bg-white border-gray-200 shadow-sm"}`}>
                    <div className="flex items-center justify-between border-b pb-3 border-gray-800/40">
                        <div className="flex items-center gap-2.5">
                            <span className="p-2 bg-cyan-500/10 text-cyan-400 rounded-[2px]">
                                <FaFilter size={11} />
                            </span>
                            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                Filter Leads for Analysis
                            </h3>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={resetAllFilters}
                                className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                                    isDarkMode ? "text-rose-400 hover:bg-rose-500/10" : "text-rose-600 hover:bg-rose-50"
                                }`}
                            >
                                <FaTimes size={10} /> Reset Filters
                            </button>
                        </div>
                    </div>

                    {/* Filter Inputs Grid (Row 1 & Row 2 & Row 3) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-4">
                        
                        {/* 1. LEAD TYPE */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Lead Type
                            </label>
                            <CustomMultiSelect
                                options={[
                                    { value: "HOT LEAD", label: "HOT LEAD" },
                                    { value: "WARM LEAD", label: "WARM LEAD" },
                                    { value: "COLD LEAD", label: "COLD LEAD" },
                                    { value: "NEUTRAL LEAD", label: "NEUTRAL LEAD" },
                                    { value: "INVALID LEAD", label: "INVALID LEAD" }
                                ]}
                                value={filters.leadType}
                                onChange={(selected) => handleFilterChange("leadType", selected)}
                                placeholder="Select Type"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 2. SOURCE */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Source
                            </label>
                            <CustomMultiSelect
                                options={sources.map(s => ({ value: s.sourceName, label: s.sourceName }))}
                                value={filters.source}
                                onChange={(selected) => handleFilterChange("source", selected)}
                                placeholder="Select Source"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 3. CAMPAIGN */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Campaign
                            </label>
                            <CustomMultiSelect
                                options={campaigns.map(c => ({ value: c._id, label: c.adName || c.name }))}
                                value={filters.campaign}
                                onChange={(selected) => handleFilterChange("campaign", selected)}
                                placeholder="Select Campaign"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 4. ZONE */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Zone
                            </label>
                            <CustomMultiSelect
                                options={zones.map(z => ({ value: z._id, label: z.name }))}
                                value={filters.zone}
                                onChange={(selected) => handleFilterChange("zone", selected)}
                                placeholder="Select Zone"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 5. CENTRE */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Centre
                            </label>
                            <CustomMultiSelect
                                options={allowedCentres.map(c => ({ value: c._id, label: c.centreName }))}
                                value={filters.centre}
                                onChange={(selected) => handleFilterChange("centre", selected)}
                                placeholder="Select Centre"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 6. COURSE */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Course
                            </label>
                            <CustomMultiSelect
                                options={courses.map(c => ({ value: c._id, label: c.courseName }))}
                                value={filters.course}
                                onChange={(selected) => handleFilterChange("course", selected)}
                                placeholder="Select Course"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 7. BOARD */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Board
                            </label>
                            <CustomMultiSelect
                                options={boards.map(b => ({ value: b._id, label: b.boardName || b.boardCourse }))}
                                value={filters.board}
                                onChange={(selected) => handleFilterChange("board", selected)}
                                placeholder="Select Board"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 8. CLASS */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Class
                            </label>
                            <CustomMultiSelect
                                options={classes.map(c => ({ value: c._id, label: c.name }))}
                                value={filters.className}
                                onChange={(selected) => handleFilterChange("className", selected)}
                                placeholder="Select Class"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 9. SCHOOL */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                School
                            </label>
                            <CustomMultiSelect
                                options={schoolsList.map(s => ({ value: s, label: s }))}
                                value={filters.schoolName}
                                onChange={(selected) => handleFilterChange("schoolName", selected)}
                                placeholder="Select School"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 10. AGENT */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Agent
                            </label>
                            <CustomMultiSelect
                                options={telecallers.map(t => ({ value: t.value || t.name, label: t.displayName || t.name }))}
                                value={filters.leadResponsibility}
                                onChange={(selected) => handleFilterChange("leadResponsibility", selected)}
                                placeholder="Select Agent"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 11. UPLOADED BY */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Uploaded By
                            </label>
                            <CustomMultiSelect
                                options={uploaders.map(u => ({ value: u._id, label: u.name }))}
                                value={filters.uploadedBy}
                                onChange={(selected) => handleFilterChange("uploadedBy", selected)}
                                placeholder="Select Uploader"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 12. UPLOADED AT */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Uploaded At
                            </label>
                            <select
                                value={uploadedDatePreset}
                                onChange={(e) => applyUploadedDatePreset(e.target.value)}
                                className={`w-full px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all cursor-pointer ${
                                    isDarkMode
                                        ? "bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50"
                                        : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"
                                } ${uploadedDatePreset && uploadedDatePreset !== "custom" ? (isDarkMode ? "border-cyan-500/50 text-cyan-400" : "border-cyan-500 text-cyan-700") : ""}`}
                            >
                                <option value="">-- Select Range --</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="thisWeek">This Week</option>
                                <option value="prevWeek">Previous Week</option>
                                <option value="thisMonth">This Month</option>
                                <option value="prevMonth">Previous Month</option>
                                <option value="thisYear">This Year</option>
                                <option value="prevYear">Previous Year</option>
                                <option value="custom">Custom</option>
                            </select>
                            {filters.uploadedFromDate && filters.uploadedToDate && uploadedDatePreset !== "custom" && (
                                <p className={`text-[9px] font-bold mt-1 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                    {filters.uploadedFromDate} → {filters.uploadedToDate}
                                </p>
                            )}
                        </div>

                        {/* Custom date pickers for Uploaded At */}
                        {showUploadedCustomDates && (
                            <>
                                <div className="space-y-1.5">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                        Uploaded From
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.uploadedFromDate || ""}
                                        onChange={(e) => handleFilterChange("uploadedFromDate", e.target.value)}
                                        className={`w-full px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${
                                            isDarkMode ? "bg-[#0a0a0b] border-cyan-500/40 text-white focus:border-cyan-500" : "bg-gray-50 border-cyan-400 text-gray-900"
                                        }`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                        Uploaded To
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.uploadedToDate || ""}
                                        onChange={(e) => handleFilterChange("uploadedToDate", e.target.value)}
                                        className={`w-full px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${
                                            isDarkMode ? "bg-[#0a0a0b] border-cyan-500/40 text-white focus:border-cyan-500" : "bg-gray-50 border-cyan-400 text-gray-900"
                                        }`}
                                    />
                                </div>
                            </>
                        )}

                        {/* 13. MARKETING BY */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Marketing By
                            </label>
                            <CustomMultiSelect
                                options={telecallers.map(t => ({ value: t.value || t.name, label: t.displayName || t.name }))}
                                value={filters.marketingBy}
                                onChange={(selected) => handleFilterChange("marketingBy", selected)}
                                placeholder="Select Marketing User"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 14. ASSIGNED AT */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Assigned At
                            </label>
                            <select
                                value={datePreset}
                                onChange={(e) => applyDatePreset(e.target.value)}
                                className={`w-full px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all cursor-pointer ${
                                    isDarkMode
                                        ? "bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50"
                                        : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"
                                } ${datePreset && datePreset !== "custom" ? (isDarkMode ? "border-cyan-500/50 text-cyan-400" : "border-cyan-500 text-cyan-700") : ""}`}
                            >
                                <option value="">-- Select Range --</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="thisWeek">This Week</option>
                                <option value="prevWeek">Previous Week</option>
                                <option value="thisMonth">This Month</option>
                                <option value="prevMonth">Previous Month</option>
                                <option value="thisYear">This Year</option>
                                <option value="prevYear">Previous Year</option>
                                <option value="custom">Custom</option>
                            </select>
                            {filters.fromDate && filters.toDate && datePreset !== "custom" && (
                                <p className={`text-[9px] font-bold mt-1 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                    {filters.fromDate} → {filters.toDate}
                                </p>
                            )}
                        </div>

                        {/* Custom date pickers for Assigned At */}
                        {showCustomDates && (
                            <>
                                <div className="space-y-1.5">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                        From Date
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.fromDate || ""}
                                        onChange={(e) => handleFilterChange("fromDate", e.target.value)}
                                        className={`w-full px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${
                                            isDarkMode ? "bg-[#0a0a0b] border-cyan-500/40 text-white focus:border-cyan-500" : "bg-gray-50 border-cyan-400 text-gray-900"
                                        }`}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                        To Date
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.toDate || ""}
                                        onChange={(e) => handleFilterChange("toDate", e.target.value)}
                                        className={`w-full px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${
                                            isDarkMode ? "bg-[#0a0a0b] border-cyan-500/40 text-white focus:border-cyan-500" : "bg-gray-50 border-cyan-400 text-gray-900"
                                        }`}
                                    />
                                </div>
                            </>
                        )}

                        {/* 15. FEEDBACK */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Feedback
                            </label>
                            <CustomMultiSelect
                                options={feedbackCategories.length > 0
                                    ? feedbackCategories.map(f => ({ value: f.name, label: f.name }))
                                    : [
                                        { value: "Interested", label: "Interested" },
                                        { value: "Not Interested", label: "Not Interested" },
                                        { value: "Call back later", label: "Call back later" },
                                        { value: "Wrong Number", label: "Wrong Number" },
                                        { value: "Busy", label: "Busy" },
                                        { value: "Asked for details", label: "Asked for details" },
                                        { value: "Price Issue", label: "Price Issue" },
                                        { value: "Will visit centre", label: "Will visit centre" },
                                        { value: "Enrolled elsewhere", label: "Enrolled elsewhere" },
                                        { value: "Others", label: "Others" }
                                    ]
                                }
                                value={filters.feedback}
                                onChange={(selected) => handleFilterChange("feedback", selected)}
                                placeholder="Select Feedback"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 16. FOLLOW UP STATUS */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Follow Up Status
                            </label>
                            <CustomMultiSelect
                                options={[
                                    { value: "contacted", label: "Contacted" },
                                    { value: "remaining", label: "Pending" },
                                    { value: "walkin", label: "Walk In" }
                                ]}
                                value={filters.followUpStatus}
                                onChange={(selected) => handleFilterChange("followUpStatus", selected)}
                                placeholder="Select Status"
                                theme={isDarkMode ? "dark" : "light"}
                            />
                        </div>

                        {/* 17. PRIORITY STATUS */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Priority Status
                            </label>
                            <select
                                value={filters.isPriority || ""}
                                onChange={(e) => handleFilterChange("isPriority", e.target.value)}
                                style={{ colorScheme: isDarkMode ? "dark" : "light" }}
                                className={`w-full px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${
                                    isDarkMode ? "bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"
                                }`}
                            >
                                <option value="" className={isDarkMode ? "bg-[#15181f] text-white" : "bg-white text-gray-900"}>ALL LEADS</option>
                                <option value="true" className={isDarkMode ? "bg-[#15181f] text-white" : "bg-white text-gray-900"}>PRIORITY LEADS ONLY</option>
                                <option value="false" className={isDarkMode ? "bg-[#15181f] text-white" : "bg-white text-gray-900"}>NON-PRIORITY LEADS ONLY</option>
                            </select>
                        </div>

                        {/* 18. DUPLICATE MOBILE NUMBER */}
                        <div className="space-y-1.5">
                            <label className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                                Duplicate Mobile Number
                            </label>
                            <select
                                value={filters.showDuplicates || ""}
                                onChange={(e) => handleFilterChange("showDuplicates", e.target.value)}
                                style={{ colorScheme: isDarkMode ? "dark" : "light" }}
                                className={`w-full px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${
                                    isDarkMode ? "bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500/50" : "bg-gray-50 border-gray-200 text-gray-900 focus:border-cyan-500"
                                }`}
                            >
                                <option value="" className={isDarkMode ? "bg-[#15181f] text-white" : "bg-white text-gray-900"}>ALL LEADS</option>
                                <option value="true" className={isDarkMode ? "bg-[#15181f] text-white" : "bg-white text-gray-900"}>SHOW DUPLICATES ONLY</option>
                                <option value="false" className={isDarkMode ? "bg-[#15181f] text-white" : "bg-white text-gray-900"}>HIDE DUPLICATES</option>
                            </select>
                        </div>

                        {/* 19. ENROLLMENT STATUS (Row 3 matching screenshot) */}
                        <div className="space-y-1.5 relative" ref={enrollmentDropdownRef}>
                            <label className={`text-[9px] font-black uppercase tracking-widest ${
                                filters.admissionSource === "already_enrolled"
                                    ? (isDarkMode ? "text-purple-400" : "text-purple-600")
                                    : (isDarkMode ? "text-gray-400" : "text-gray-500")
                            }`}>
                                Enrollment Status
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsEnrollmentDropdownOpen(prev => !prev)}
                                className={`w-full px-3 py-2 rounded-[2px] border text-[10px] font-black uppercase tracking-wider flex items-center justify-between outline-none transition-all cursor-pointer ${
                                    filters.admissionSource === "already_enrolled"
                                        ? "border-purple-500 bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50 shadow-sm"
                                        : filters.admissionSource
                                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30"
                                            : isDarkMode
                                                ? "bg-[#0a0a0b] border-gray-800 text-white hover:border-gray-700"
                                                : "bg-gray-50 border-gray-200 text-gray-900 hover:border-gray-300"
                                }`}
                            >
                                <span className="truncate flex items-center gap-1.5">
                                    {filters.admissionSource === "already_enrolled" && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                                    )}
                                    {filters.admissionSource === "uploaded_admissions" && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                    )}
                                    {filters.admissionSource === "manual_admissions" && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                    )}
                                    {filters.admissionSource === "already_enrolled"
                                        ? "Already Enrolled"
                                        : filters.admissionSource === "uploaded_admissions"
                                            ? "Admitted (Uploaded)"
                                            : filters.admissionSource === "manual_admissions"
                                                ? "Admitted (Manual)"
                                                : "All Leads"}
                                </span>
                                <FaChevronDown size={8} className={`shrink-0 ml-1.5 transition-transform duration-200 ${isEnrollmentDropdownOpen ? "rotate-180 text-purple-400" : "text-gray-500"}`} />
                            </button>

                            {isEnrollmentDropdownOpen && (
                                <div className={`absolute top-full left-0 right-0 mt-1 z-[100] rounded-[2px] border shadow-2xl py-1 ${
                                    isDarkMode ? "bg-[#15181f] border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900 shadow-xl"
                                }`}>
                                    {[
                                        { value: "", label: "ALL LEADS", desc: "Show all inquiries", dot: "bg-gray-500" },
                                        { value: "already_enrolled", label: "ALREADY ENROLLED", desc: "Existing students inquiring again", dot: "bg-purple-500" },
                                        { value: "uploaded_admissions", label: "ADMITTED (UPLOADED)", desc: "Admitted from campaign uploads", dot: "bg-amber-500" },
                                        { value: "manual_admissions", label: "ADMITTED (MANUAL)", desc: "Admitted from walk-in / manual leads", dot: "bg-emerald-500" }
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                                handleFilterChange("admissionSource", opt.value);
                                                setIsEnrollmentDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-[10px] font-bold flex items-start gap-2 transition-colors ${
                                                filters.admissionSource === opt.value
                                                    ? (isDarkMode ? "bg-purple-500/20 text-purple-300" : "bg-purple-50 text-purple-700")
                                                    : (isDarkMode ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700")
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${opt.dot}`}></span>
                                            <div>
                                                <div className="font-black">{opt.label}</div>
                                                <div className="text-[8px] opacity-70 font-normal">{opt.desc}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* 3. Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    {/* Card 1: Total Leads */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">Filtered Leads</span>
                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                                <FaUsers size={12} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-cyan-400">
                            {Number(analysisData?.totalLeads || 0).toLocaleString()}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Total active matching query</p>
                    </div>

                    {/* Card 2: Avg Call Duration */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">Avg Call Duration</span>
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <FaClock size={12} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-emerald-400">
                            {analysisData?.summary?.avgCallDurationFormatted || "00:00"}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {Number(analysisData?.callDurationAnalysis?.callsWithDuration || 0).toLocaleString()} calls with duration
                        </p>
                    </div>

                    {/* Card 3: Top Lead Source */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">Top Source</span>
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <FaBullseye size={12} />
                            </div>
                        </div>
                        <div className="text-xl font-black text-blue-400 truncate" title={analysisData?.summary?.topSource || "N/A"}>
                            {analysisData?.summary?.topSource || "N/A"}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {analysisData?.leadSourceAnalysis?.sources?.[0]?.share || 0}% of all leads
                        </p>
                    </div>

                    {/* Card 4: Follow-up Contact Rate */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">Follow-Up Rate</span>
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                <FaComments size={12} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-amber-400">
                            {analysisData?.summary?.contactRate || 0}%
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {Number(analysisData?.summary?.contactedCount || 0).toLocaleString()} leads contacted
                        </p>
                    </div>

                    {/* Card 5: Admissions & Conversion */}
                    <div className={`p-4 rounded-xl border transition-all ${
                        isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200 shadow-sm"
                    }`}>
                        <div className="flex items-center justify-between text-gray-500 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider">Conversions</span>
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                <FaUserCheck size={12} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-purple-400">
                            {analysisData?.summary?.conversionRate || 0}%
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {Number(analysisData?.summary?.admittedCount || 0).toLocaleString()} admitted students
                        </p>
                    </div>
                </div>

                {/* 4. Tab Navigation to Focus on Specific Detailed Analysis */}
                <div className={`p-2.5 rounded-2xl border mb-6 flex items-center justify-between overflow-x-auto gap-2 ${
                    isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200 shadow-sm"
                }`}>
                    <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                        {[
                            { key: "all", label: "All Analysis (Grid View)", icon: FaChartPie },
                            { key: "call_duration", label: "Avg. Call Duration", icon: FaClock },
                            { key: "source", label: "Lead Source Distribution", icon: FaBullseye },
                            { key: "remarks", label: "Remarks & Feedback", icon: FaComments },
                            { key: "followup", label: "Follow-Up Activity", icon: FaHistory },
                            { key: "conversion", label: "Conversion Pipeline", icon: FaUserCheck }
                        ].map(tab => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide flex items-center gap-2 transition-all ${
                                        isActive
                                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25"
                                            : isDarkMode
                                                ? "bg-slate-900/60 text-gray-400 hover:text-white hover:bg-slate-800"
                                                : "bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                    }`}
                                >
                                    <TabIcon size={12} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 5. Detailed Analysis Views */}
                {loading ? (
                    <div className={`p-16 rounded-2xl border text-center ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200"}`}>
                        <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin mx-auto mb-4"></div>
                        <h4 className="text-sm font-black text-gray-300 uppercase tracking-widest">
                            Calculating Multi-Dimensional Analysis…
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">Aggregating call durations, source contributions, follow-ups, and conversions</p>
                    </div>
                ) : (
                    <>
                        {/* ========================================================= */}
                        {/* VIEW 1: ALL ANALYSIS (5 PIE CARDS IN RESPONSIVE GRID)      */}
                        {/* ========================================================= */}
                        {activeTab === "all" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                
                                {/* 1. AVG CALL DURATION */}
                                <DonutAnalysisCard
                                    title="Avg. Call Duration Analysis"
                                    subtitle="Distribution of follow-up call lengths across filtered leads"
                                    icon={FaClock}
                                    data={analysisData?.callDurationAnalysis?.durationRanges || []}
                                    totalCount={analysisData?.callDurationAnalysis?.totalCallsLogged || 0}
                                    centerLabel="AVG DURATION"
                                    centerValue={analysisData?.callDurationAnalysis?.formattedAvgDuration || "00:00"}
                                    centerSubtext={`${Number(analysisData?.callDurationAnalysis?.callsWithDuration || 0).toLocaleString()} Logged Calls`}
                                    isDarkMode={isDarkMode}
                                    emptyMessage="No call durations recorded for selected leads"
                                    extraLegend={
                                        <div className="flex justify-between items-center font-bold">
                                            <span>Total Recorded Talk Time:</span>
                                            <span className="text-cyan-400 font-black">{analysisData?.callDurationAnalysis?.formattedTotalDuration || "00:00"}</span>
                                        </div>
                                    }
                                />

                                {/* 2. LEAD SOURCE DISTRIBUTION */}
                                <DonutAnalysisCard
                                    title="Lead Source Distribution"
                                    subtitle="Inquiry breakdown by marketing and acquisition channels"
                                    icon={FaBullseye}
                                    data={analysisData?.leadSourceAnalysis?.sources || []}
                                    totalCount={analysisData?.totalLeads || 0}
                                    centerLabel="TOTAL LEADS"
                                    centerValue={Number(analysisData?.totalLeads || 0).toLocaleString()}
                                    centerSubtext={`${analysisData?.leadSourceAnalysis?.sources?.length || 0} Channels`}
                                    isDarkMode={isDarkMode}
                                    emptyMessage="No sources found matching filter criteria"
                                />

                                {/* 3. REMARKS & FEEDBACK */}
                                <DonutAnalysisCard
                                    title="Remarks & Feedback Analysis"
                                    subtitle="Response classifications and caller sentiment breakdown"
                                    icon={FaComments}
                                    data={analysisData?.remarksAnalysis?.feedbacks || []}
                                    totalCount={analysisData?.remarksAnalysis?.totalFeedbacks || 0}
                                    centerLabel="TOTAL REMARKS"
                                    centerValue={Number(analysisData?.remarksAnalysis?.totalFeedbacks || 0).toLocaleString()}
                                    centerSubtext="Logged Responses"
                                    isDarkMode={isDarkMode}
                                    emptyMessage="No remarks or feedback recorded yet"
                                />

                                {/* 4. FOLLOW UP ACTIVITY */}
                                <DonutAnalysisCard
                                    title="Follow-Up Activity Analysis"
                                    subtitle="Frequency and contact progression among leads"
                                    icon={FaHistory}
                                    data={analysisData?.followUpAnalysis?.frequencyBreakdown || []}
                                    totalCount={analysisData?.totalLeads || 0}
                                    centerLabel="CONTACT RATE"
                                    centerValue={`${analysisData?.followUpAnalysis?.contactedRate || 0}%`}
                                    centerSubtext={`${Number(analysisData?.followUpAnalysis?.leadsWithFollowUp || 0).toLocaleString()} Contacted`}
                                    isDarkMode={isDarkMode}
                                    emptyMessage="No follow-up activity found"
                                    extraLegend={
                                        <div className="flex justify-between items-center font-bold">
                                            <span>Avg Follow-ups / Lead:</span>
                                            <span className="text-cyan-400 font-black">{analysisData?.followUpAnalysis?.avgFollowUpsPerLead || 0}</span>
                                        </div>
                                    }
                                />

                                {/* 5. CONVERSION PIPELINE */}
                                <DonutAnalysisCard
                                    title="Conversion Analysis"
                                    subtitle="End-to-end progression from raw inquiries to student admissions"
                                    icon={FaUserCheck}
                                    data={analysisData?.conversionAnalysis?.statusBreakdown || []}
                                    totalCount={analysisData?.totalLeads || 0}
                                    centerLabel="CONVERSION"
                                    centerValue={`${analysisData?.conversionAnalysis?.conversionRate || 0}%`}
                                    centerSubtext={`${Number(analysisData?.conversionAnalysis?.admittedCount || 0).toLocaleString()} Admitted`}
                                    isDarkMode={isDarkMode}
                                    emptyMessage="No conversion statistics recorded"
                                    extraLegend={
                                        <div className="flex justify-between items-center font-bold">
                                            <span>Counselled-to-Admission Rate:</span>
                                            <span className="text-emerald-400 font-black">{analysisData?.conversionAnalysis?.counsellingConversionRate || 0}%</span>
                                        </div>
                                    }
                                />

                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* VIEW 2: FOCUSED CALL DURATION TAB                         */}
                        {/* ========================================================= */}
                        {activeTab === "call_duration" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <DonutAnalysisCard
                                    title="Call Duration Ranges (Pie Form)"
                                    subtitle="Proportion of inquiries in each duration bracket"
                                    icon={FaClock}
                                    data={analysisData?.callDurationAnalysis?.durationRanges || []}
                                    totalCount={analysisData?.callDurationAnalysis?.totalCallsLogged || 0}
                                    centerLabel="AVG DURATION"
                                    centerValue={analysisData?.callDurationAnalysis?.formattedAvgDuration || "00:00"}
                                    centerSubtext="Across All Calls"
                                    isDarkMode={isDarkMode}
                                />

                                {/* Agent Duration Ranking Table */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200"}`}>
                                    <h3 className={`text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                        <FaPhoneAlt className="text-cyan-400" /> Agent-Wise Call Duration Rankings
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">Detailed telecaller performance and talk time breakdown</p>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500"}`}>
                                                    <th className="py-2.5 px-3">Agent</th>
                                                    <th className="py-2.5 px-3 text-right">Total Calls</th>
                                                    <th className="py-2.5 px-3 text-right">Recorded Duration</th>
                                                    <th className="py-2.5 px-3 text-right">Avg Duration</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800/20">
                                                {(analysisData?.callDurationAnalysis?.agentBreakdown || []).map((agent, i) => (
                                                    <tr key={agent.agent} className={isDarkMode ? "hover:bg-gray-800/30" : "hover:bg-gray-50"}>
                                                        <td className="py-2.5 px-3 font-bold text-gray-300 flex items-center gap-2">
                                                            <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black flex items-center justify-center">
                                                                {i + 1}
                                                            </span>
                                                            <span className="truncate max-w-[200px]" title={agent.agent}>{agent.agent}</span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-semibold text-gray-400">{agent.totalCalls}</td>
                                                        <td className="py-2.5 px-3 text-right font-semibold text-slate-300">{agent.totalDurationFormatted}</td>
                                                        <td className="py-2.5 px-3 text-right font-black text-cyan-400">{agent.avgDurationFormatted}</td>
                                                    </tr>
                                                ))}
                                                {(!analysisData?.callDurationAnalysis?.agentBreakdown || analysisData?.callDurationAnalysis?.agentBreakdown?.length === 0) && (
                                                    <tr>
                                                        <td colSpan={4} className="py-8 text-center text-gray-500 font-bold">
                                                            No agent duration records logged for this filter selection
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* VIEW 3: FOCUSED SOURCE DISTRIBUTION TAB                   */}
                        {/* ========================================================= */}
                        {activeTab === "source" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <DonutAnalysisCard
                                    title="Lead Sources (Pie Form)"
                                    subtitle="Channel share and distribution"
                                    icon={FaBullseye}
                                    data={analysisData?.leadSourceAnalysis?.sources || []}
                                    totalCount={analysisData?.totalLeads || 0}
                                    centerLabel="TOTAL LEADS"
                                    centerValue={Number(analysisData?.totalLeads || 0).toLocaleString()}
                                    centerSubtext="Across All Sources"
                                    isDarkMode={isDarkMode}
                                />

                                {/* Detailed Sources Table */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200"}`}>
                                    <h3 className={`text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                        <FaLayerGroup className="text-cyan-400" /> Source Contribution Matrix
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">Complete breakdown of all lead acquisition sources</p>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500"}`}>
                                                    <th className="py-2.5 px-3">Lead Source</th>
                                                    <th className="py-2.5 px-3 text-right">Lead Count</th>
                                                    <th className="py-2.5 px-3 text-right">Share %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800/20">
                                                {(analysisData?.leadSourceAnalysis?.sources || []).map((s, i) => (
                                                    <tr key={s.name} className={isDarkMode ? "hover:bg-gray-800/30" : "hover:bg-gray-50"}>
                                                        <td className="py-2.5 px-3 font-bold text-gray-300 flex items-center gap-2">
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                                            <span>{s.name}</span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black text-cyan-400">{Number(s.value).toLocaleString()}</td>
                                                        <td className="py-2.5 px-3 text-right font-extrabold text-emerald-400">{s.share}%</td>
                                                    </tr>
                                                ))}
                                                {(!analysisData?.leadSourceAnalysis?.sources || analysisData?.leadSourceAnalysis?.sources?.length === 0) && (
                                                    <tr>
                                                        <td colSpan={3} className="py-8 text-center text-gray-500 font-bold">
                                                            No sources recorded for this filter selection
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* VIEW 4: FOCUSED REMARKS & FEEDBACK TAB                   */}
                        {/* ========================================================= */}
                        {activeTab === "remarks" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <DonutAnalysisCard
                                    title="Remarks & Feedback (Pie Form)"
                                    subtitle="Feedback classifications and disposition shares"
                                    icon={FaComments}
                                    data={analysisData?.remarksAnalysis?.feedbacks || []}
                                    totalCount={analysisData?.remarksAnalysis?.totalFeedbacks || 0}
                                    centerLabel="REMARKS"
                                    centerValue={Number(analysisData?.remarksAnalysis?.totalFeedbacks || 0).toLocaleString()}
                                    centerSubtext="Responses Logged"
                                    isDarkMode={isDarkMode}
                                />

                                {/* Sentiment & Feedback Matrix */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200"}`}>
                                    <h3 className={`text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                        <FaComments className="text-cyan-400" /> Feedback Classification Clusters
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">Intent grouping and objection categorization</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                        {(analysisData?.remarksAnalysis?.categories || []).map(cat => (
                                            <div
                                                key={cat.name}
                                                className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                                                    isDarkMode ? "bg-slate-900/60 border-gray-800" : "bg-gray-50 border-gray-200"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                                    <span className="text-xs font-bold text-gray-300">{cat.name}</span>
                                                </div>
                                                <div className="mt-2 flex items-baseline justify-between">
                                                    <span className="text-lg font-black text-cyan-400">{cat.value}</span>
                                                    <span className="text-xs font-bold text-emerald-400">{cat.share}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="overflow-x-auto mt-4">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500"}`}>
                                                    <th className="py-2 px-3">Disposition / Remark</th>
                                                    <th className="py-2 px-3 text-right">Count</th>
                                                    <th className="py-2 px-3 text-right">Share %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800/20">
                                                {(analysisData?.remarksAnalysis?.feedbacks || []).map(f => (
                                                    <tr key={f.name} className={isDarkMode ? "hover:bg-gray-800/30" : "hover:bg-gray-50"}>
                                                        <td className="py-2 px-3 font-bold text-gray-300 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                                                            <span>{f.name}</span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-black text-cyan-400">{f.value}</td>
                                                        <td className="py-2 px-3 text-right font-bold text-emerald-400">{f.share}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* VIEW 5: FOCUSED FOLLOW-UP TAB                             */}
                        {/* ========================================================= */}
                        {activeTab === "followup" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <DonutAnalysisCard
                                    title="Follow-Up Status (Pie Form)"
                                    subtitle="Contacted leads vs untouched vs walk-ins"
                                    icon={FaHistory}
                                    data={analysisData?.followUpAnalysis?.statusBreakdown || []}
                                    totalCount={analysisData?.totalLeads || 0}
                                    centerLabel="STATUS"
                                    centerValue={`${analysisData?.followUpAnalysis?.contactedRate || 0}%`}
                                    centerSubtext="Contacted Rate"
                                    isDarkMode={isDarkMode}
                                />

                                <DonutAnalysisCard
                                    title="Follow-Up Frequency (Pie Form)"
                                    subtitle="Number of follow-up attempts per inquiry"
                                    icon={FaPhoneAlt}
                                    data={analysisData?.followUpAnalysis?.frequencyBreakdown || []}
                                    totalCount={analysisData?.totalLeads || 0}
                                    centerLabel="TOTAL CALLS"
                                    centerValue={Number(analysisData?.followUpAnalysis?.totalFollowUps || 0).toLocaleString()}
                                    centerSubtext="Interactions Logged"
                                    isDarkMode={isDarkMode}
                                />
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* VIEW 6: FOCUSED CONVERSION TAB                           */}
                        {/* ========================================================= */}
                        {activeTab === "conversion" && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <DonutAnalysisCard
                                    title="Conversion Pipeline (Pie Form)"
                                    subtitle="Inquiry progression through counseling and enrolled admissions"
                                    icon={FaUserCheck}
                                    data={analysisData?.conversionAnalysis?.statusBreakdown || []}
                                    totalCount={analysisData?.totalLeads || 0}
                                    centerLabel="CONVERSION"
                                    centerValue={`${analysisData?.conversionAnalysis?.conversionRate || 0}%`}
                                    centerSubtext={`${Number(analysisData?.conversionAnalysis?.admittedCount || 0).toLocaleString()} Admitted`}
                                    isDarkMode={isDarkMode}
                                />

                                {/* Lead Type Conversion Matrix */}
                                <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#131619] border-gray-800" : "bg-white border-gray-200"}`}>
                                    <h3 className={`text-sm font-black uppercase tracking-wider mb-1 flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                        <FaBullseye className="text-cyan-400" /> Lead Type Conversion Effectiveness
                                    </h3>
                                    <p className="text-xs text-gray-500 mb-4">Conversion performance breakdown by initial lead qualification tag</p>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className={`border-b text-[10px] font-black uppercase tracking-widest ${isDarkMode ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500"}`}>
                                                    <th className="py-2.5 px-3">Lead Type</th>
                                                    <th className="py-2.5 px-3 text-right">Total Leads</th>
                                                    <th className="py-2.5 px-3 text-right">Admitted</th>
                                                    <th className="py-2.5 px-3 text-right">Conversion %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800/20">
                                                {(analysisData?.conversionAnalysis?.leadTypeConversion || []).map(lt => (
                                                    <tr key={lt.leadType} className={isDarkMode ? "hover:bg-gray-800/30" : "hover:bg-gray-50"}>
                                                        <td className="py-2.5 px-3 font-bold text-gray-300">{lt.leadType}</td>
                                                        <td className="py-2.5 px-3 text-right font-semibold text-gray-400">{Number(lt.total).toLocaleString()}</td>
                                                        <td className="py-2.5 px-3 text-right font-black text-cyan-400">{Number(lt.admitted).toLocaleString()}</td>
                                                        <td className="py-2.5 px-3 text-right font-black text-emerald-400">{lt.conversionRate}%</td>
                                                    </tr>
                                                ))}
                                                {(!analysisData?.conversionAnalysis?.leadTypeConversion || analysisData?.conversionAnalysis?.leadTypeConversion?.length === 0) && (
                                                    <tr>
                                                        <td colSpan={4} className="py-8 text-center text-gray-500 font-bold">
                                                            No conversion breakdown available
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

            </div>
        </Layout>
    );
}
