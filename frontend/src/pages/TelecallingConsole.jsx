import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import {
    FaFilter, FaUserTie, FaUsers, FaPhoneAlt, FaCalendarAlt,
    FaSearch, FaArrowLeft, FaChartPie, FaChartBar, FaSun, FaMoon, FaSync, FaChartLine, FaHistory, FaCheckCircle, FaTimesCircle,
    FaFileExcel, FaRedo, FaClock, FaDownload, FaArrowDown, FaStar, FaExclamationTriangle
} from "react-icons/fa";
import { saveAs } from 'file-saver';
import { ToastContainer } from "react-toastify";
import * as XLSX from 'xlsx';
import {
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LabelList
} from 'recharts';
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import LeadListModal from "./LeadListModal";
import FollowUpActivityModal from "../components/LeadManagement/FollowUpActivityModal";
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CounsellingConsole from "../components/PerformanceConsoles/CounsellingConsole";


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const AnalyticsDashboard = ({ data, isDarkMode }) => {
    if (!data) return null;

    const { leadStatus = [], feedbackAnalysis = [], calls = {} } = data;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: "Today's Calls", value: calls.today, icon: <FaPhoneAlt />, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Yesterday", value: calls.yesterday, icon: <FaCalendarAlt />, color: "text-purple-500", bg: "bg-purple-500/10" },
                    { label: "Last 7 Days", value: calls.last7Days, icon: <FaChartBar />, color: "text-green-500", bg: "bg-green-500/10" },
                    { label: "Last 30 Days", value: calls.last30Days, icon: <FaChartLine />, color: "text-orange-500", bg: "bg-orange-500/10" },
                    { label: "Filtered Performance", value: calls.filtered, icon: <FaSearch />, color: "text-cyan-500", bg: "bg-cyan-500/10" }
                ].map((stat, idx) => (
                    <div key={idx} className={`p-4 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'} flex items-center justify-between ${stat.label === "Filtered Performance" && calls.filtered === 0 ? 'opacity-50 grayscale' : 'hover:border-cyan-500/50'}`}>
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</p>
                            <h4 className={`text-2xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</h4>
                        </div>
                        <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Status Distribution */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaChartPie className="text-cyan-500" /> Lead Disposition
                    </h5>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <PieChart>
                                <Pie
                                    data={leadStatus}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {leadStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className={`text-[10px] uppercase font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Call Trend */}
                <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaChartLine className="text-green-500" /> Follow-up Activity (30 Days)
                    </h5>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <AreaChart data={calls.trend}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10, fontWeight: 'bold' }}
                                    tickFormatter={(tick) => tick.slice(5)}
                                />
                                <YAxis tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ color: '#06b6d4' }}
                                    labelStyle={{ color: isDarkMode ? '#fff' : '#000', marginBottom: '4px' }}
                                />
                                <Area type="monotone" dataKey="calls" stroke="#06b6d4" fillOpacity={1} fill="url(#colorCalls)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Feedback Analysis */}
                <div className={`col-span-1 lg:col-span-2 p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaChartBar className="text-purple-500" /> Top Feedback Analysis
                    </h5>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <BarChart layout="vertical" data={feedbackAnalysis} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} horizontal={false} />
                                <XAxis type="number" tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={150}
                                    tick={{ fill: isDarkMode ? '#9ca3af' : '#4b5563', fontSize: 10, fontWeight: 'bold' }}
                                />
                                <Tooltip
                                    cursor={{ fill: isDarkMode ? '#374151' : '#f3f4f6', opacity: 0.4 }}
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                    itemStyle={{ color: '#8884d8' }}
                                />
                                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20}>
                                    {feedbackAnalysis.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            {/* Admission Analysis Section (Conditional for Counsellors) */}
            {data.admissionDetail && (data.admissionDetail.bySource.length > 0 || data.admissionDetail.byCenter.length > 0) && (
                <div className="space-y-6 pt-10 border-t border-gray-800/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className={`text-lg font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                <FaChartLine className="text-cyan-500" /> Admission Analysis Report
                            </h4>
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                Comprehensive breakdown of admission conversions
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                const exportData = [
                                    ...data.admissionDetail.bySource.map(s => ({ Type: 'Source', Name: s.name, Count: s.value })),
                                    ...data.admissionDetail.byCenter.map(c => ({ Type: 'Center', Name: c.name, Count: c.value }))
                                ];
                                if (exportData.length === 0) return alert("No data to export");
                                const worksheet = XLSX.utils.json_to_sheet(exportData);
                                const workbook = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(workbook, worksheet, "Admissions");
                                XLSX.writeFile(workbook, `Admission_Analysis_${new Date().toLocaleDateString()}.xlsx`);
                            }}
                            className={`px-6 py-2 rounded-[2px] transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-black' : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white'}`}
                        >
                            <FaFileExcel /> Export Admission Report
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Admissions Trend */}
                        <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                            <h5 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admission Growth</h5>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                                    <AreaChart data={data.admissionDetail.trend}>
                                        <defs>
                                            <linearGradient id="colorAdmissionsDetailed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" hide />
                                        <Tooltip labelStyle={{ color: '#000' }} />
                                        <Area type="monotone" dataKey="admissions" stroke="#10b981" fill="url(#colorAdmissionsDetailed)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Admissions by Center */}
                        <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                            <h5 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admissions by Center</h5>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                                    <BarChart data={data.admissionDetail.byCenter}>
                                        <XAxis dataKey="name" hide />
                                        <Tooltip labelStyle={{ color: '#000' }} />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Admissions by Source */}
                        <div className={`p-6 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                            <h5 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lead Source Mix</h5>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                                    <PieChart>
                                        <Pie data={data.admissionDetail.bySource} innerRadius={40} outerRadius={60} dataKey="value" nameKey="name" paddingAngle={5}>
                                            {data.admissionDetail.bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom Label Component for Bar Chart - Shows profile image or initials above each bar
const CustomBarLabel = (props) => {
    const { x, y, width, index, payload } = props;

    // Safety check for undefined payload
    if (!payload || !payload.name) return null;

    const centerX = x + width / 2;

    // Get initials from name
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    };

    const initials = getInitials(payload.name);
    const profileImage = payload.profileImage;
    const centerCount = (payload.centres || payload.centers || []).length;
    const safeNameId = payload.name.replace(/[^a-zA-Z0-9]/g, '_');

    return (
        <g>
            {/* Profile Image Circle or Initials */}
            {profileImage ? (
                <>
                    <defs>
                        <clipPath id={`clip-${safeNameId}-${index}`}>
                            <circle cx={centerX} cy={y - 35} r="18" />
                        </clipPath>
                    </defs>
                    <image
                        href={profileImage}
                        x={centerX - 18}
                        y={y - 53}
                        width="36"
                        height="36"
                        clipPath={`url(#clip-${safeNameId}-${index})`}
                        preserveAspectRatio="xMidYMid slice"
                    />
                    <circle
                        cx={centerX}
                        cy={y - 35}
                        r="18"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2"
                    />
                </>
            ) : (
                <>
                    <circle
                        cx={centerX}
                        cy={y - 35}
                        r="18"
                        fill="#1a1f24"
                        stroke="#06b6d4"
                        strokeWidth="2"
                    />
                    <text
                        x={centerX}
                        y={y - 30}
                        textAnchor="middle"
                        fill="#06b6d4"
                        fontSize="11"
                        fontWeight="bold"
                    >
                        {initials}
                    </text>
                </>
            )}

            {/* Down Arrow */}
            <path
                d={`M ${centerX} ${y - 15} L ${centerX - 4} ${y - 20} L ${centerX + 4} ${y - 20} Z`}
                fill="#06b6d4"
            />

            {/* Center Count Badge */}
            {centerCount > 0 && (
                <>
                    <circle
                        cx={centerX + 15}
                        cy={y - 45}
                        r="8"
                        fill="#f59e0b"
                        stroke="#1a1f24"
                        strokeWidth="1.5"
                    />
                    <text
                        x={centerX + 15}
                        y={y - 42}
                        textAnchor="middle"
                        fill="#000"
                        fontSize="9"
                        fontWeight="bold"
                    >
                        {centerCount}
                    </text>
                </>
            )}
        </g>
    );
};

const TelecallingConsole = () => {
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const [activeConsole, setActiveConsole] = useState('telecalling');
    const [telecallers, setTelecallers] = useState([]);
    const [assignedLeads, setAssignedLeads] = useState([]); // This might still be useful for "limit 100" partial view if we want to show a list somewhere, but we removed the list. It's now just for... checking length?
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [followUpStats, setFollowUpStats] = useState({
        totalScheduled: 0,
        totalFollowUps: 0,
        hotLeads: 0,
        coldLeads: 0,
        negativeLeads: 0,
        recentActivity: []
    });

    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        startTime: "",
        endTime: ""
    });

    const [activityModal, setActivityModal] = useState({
        isOpen: false,
        title: "",
        data: []
    });

    const [showLeadModal, setShowLeadModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalLeads, setModalLeads] = useState([]);

    const [showPerformanceTable, setShowPerformanceTable] = useState(false);
    const [performanceLogs, setPerformanceLogs] = useState([]);
    const [viewTableLoading, setViewTableLoading] = useState(false);

    // Main View Enhancements State
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCenters, setSelectedCenters] = useState([]);
    const [availableCenters, setAvailableCenters] = useState([]);
    const [allPerformance, setAllPerformance] = useState([]);
    const [globalTrends, setGlobalTrends] = useState([]);
    const [globalAdmissionDetail, setGlobalAdmissionDetail] = useState({ bySource: [], byCenter: [] });
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState('daily'); // 'daily', 'weekly', 'monthly'

    // Memoized computation of enriched telecallers (base info + performance stats)
    const enrichedTelecallers = React.useMemo(() => {
        if (!telecallers || telecallers.length === 0) return [];
        return telecallers.map(tc => {
            const perf = allPerformance.find(p =>
                (p.name?.trim().toLowerCase() === tc.name?.trim().toLowerCase()) ||
                (p.userId === tc._id || p._id === tc._id)
            );
            return perf ? { ...tc, ...perf, taskProgress: perf.taskProgress } : tc;
        });
    }, [telecallers, allPerformance]);

    const [historyDetail, setHistoryDetail] = useState(null);

    // Excel Export Function
    const exportToExcel = () => {
        if (!allPerformance || allPerformance.length === 0) {
            alert('No data to export');
            return;
        }

        // Apply same filters as the UI view for squad export
        const filteredData = allPerformance.filter(u => {
            const matchesRole = u.role === 'telecaller' || u.role === 'centralizedTelecaller';
            const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
            const uCentres = u.centres || u.centers || [];
            const matchesCenter = selectedCenters.length === 0 || (uCentres.some(c => selectedCenters.includes(c.centreName || c)));
            return matchesRole && matchesSearch && matchesCenter;
        });

        if (filteredData.length === 0) {
            alert('No telecallers match the current filters');
            return;
        }

        const exportData = filteredData.map(item => {
            const row = {
                'Telecaller Name': item.name,
                'Role': item.role,
                'Centers': (item.centres || item.centers || []).map(c => c.centreName || c).join(', ') || 'N/A',
            };

            if (timePeriod === 'daily') {
                row['Today Calls'] = item.todayCalls || 0;
                row['Yesterday Calls'] = item.yesterdayCalls || 0;
            } else if (timePeriod === 'weekly') {
                row['This Week Calls'] = item.currentCalls || 0;
                row['Last Week Calls'] = item.previousCalls || 0;
            } else if (timePeriod === 'monthly') {
                row['This Month Calls'] = item.thisMonthCalls || 0;
                row['Last Month Calls'] = item.lastMonthCalls || 0;
            } else {
                row['Current Period Calls'] = item.currentCalls;
                row['Previous Period Calls'] = item.previousCalls;
            }

            row['Admissions'] = item.admissions || 0;
            row['Counselled'] = item.counselledCount || 0;
            row['Hot interest'] = item.hotLeads || 0;
            row['Conversion %'] = item.currentCalls > 0 ? ((item.admissions / item.currentCalls) * 100).toFixed(2) + '%' : '0%';
            row['Report Type'] = timePeriod.toUpperCase();

            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Squad Performance');

        const fileName = `Telecalling_Squad_Report_${timePeriod}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const handleActivityCardClick = (type) => {
        let title = "";
        let data = [];

        switch (type) {
            case 'UPCOMING':
                title = "Upcoming Scheduled Follow-ups";
                data = followUpStats.scheduledList || [];
                break;
            case 'TODAY':
                title = "Today's Follow-up Activity";
                data = followUpStats.recentActivity || [];
                break;
            case 'HOT':
                title = "Hot Interest Leads Details";
                data = (followUpStats.recentActivity || []).filter(item =>
                    item.status?.toUpperCase() === 'HOT LEAD'
                );
                break;
            case 'COLD':
                title = "Cold Leads Discussions";
                data = (followUpStats.recentActivity || []).filter(item =>
                    item.status?.toUpperCase() === 'COLD LEAD'
                );
                break;
            case 'NEGATIVE':
                title = "Negative Results Records";
                data = (followUpStats.recentActivity || []).filter(item =>
                    item.status?.toUpperCase() === 'NEGATIVE'
                );
                break;
            default:
                return;
        }

        setActivityModal({
            isOpen: true,
            title: title.toUpperCase(),
            data
        });
    };

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const telecallerNameFromUrl = queryParams.get("telecaller");

    useEffect(() => {
        fetchTelecallers();
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (!telecallerNameFromUrl) {
            fetchTelecallers();
            fetchAllPerformance(timePeriod, filters);
            fetchCentres();
            setAssignedLeads([]);
            setAnalyticsData(null);
        } else {
            const loadData = async () => {
                setLoading(true);
                await Promise.all([
                    fetchAssignedLeads(telecallerNameFromUrl),
                    fetchAnalytics(telecallerNameFromUrl, filters),
                    fetchFollowUpStats(telecallerNameFromUrl, filters)
                ]);
                setLoading(false);
            };
            loadData();
        }
        // eslint-disable-next-line
    }, [telecallerNameFromUrl, filters, selectedCenters, timePeriod]);

    const fetchAnalytics = async (telecallerName, currentFilters = {}) => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({ ...currentFilters });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/analytics/${encodeURIComponent(telecallerName)}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setAnalyticsData(data);
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    };

    const fetchFollowUpStats = async (telecallerName, currentFilters = {}) => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                leadResponsibility: telecallerName,
                ...currentFilters
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/stats/today-followups?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setFollowUpStats(data);
            }
        } catch (error) {
            console.error("Error fetching follow-up stats:", error);
        }
    };

    const handleExportExcel = async () => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                telecallerName: telecallerNameFromUrl,
                ...filters
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/export/telecaller-logs?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const blob = await response.blob();
                saveAs(blob, `Telecaller_${telecallerNameFromUrl.replace(/\s+/g, '_')}_Report.xlsx`);
            } else {
                const error = await response.json();
                alert(error.message || "Failed to export logs");
            }
        } catch (error) {
            console.error("Export error:", error);
            alert("Error exporting logs");
        }
    };

    const handleViewTable = async () => {
        setViewTableLoading(true);
        setShowPerformanceTable(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                telecallerName: telecallerNameFromUrl,
                format: 'json',
                ...filters
            });

            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/export/telecaller-logs?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setPerformanceLogs(data);
            } else {
                const error = await response.json();
                console.error("Failed to fetch logs:", error.message);
            }
        } catch (error) {
            console.error("View table error:", error);
        } finally {
            setViewTableLoading(false);
        }
    };

    const setDatePreset = (preset) => {
        const today = new Date().toISOString().split('T')[0];
        let fromDate = today;
        let toDate = today;

        if (preset === 'yesterday') {
            fromDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            toDate = fromDate;
        } else if (preset === '7days') {
            fromDate = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        } else if (preset === '30days') {
            fromDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        }

        setFilters(prev => ({ ...prev, fromDate, toDate }));
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: "",
            toDate: "",
            startTime: "",
            endTime: ""
        });
    };

    const fetchAllPerformance = async (period = 'daily', customFilters = {}) => {
        setSummaryLoading(true);
        try {
            const token = localStorage.getItem("token");
            // Map centre names to IDs for backend if needed, or just send names if backend handles them.
            // Our backend 'getAllTelecallerAnalytics' expects centre IDs or matching logic.
            // Let's find consistent IDs for the selected centres.
            const centreIds = availableCenters
                .filter(c => selectedCenters.includes(c.centreName))
                .map(c => c._id);

            const params = new URLSearchParams({
                period,
                ...customFilters,
                ...(centreIds.length > 0 ? { centre: centreIds } : {})
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/analytics-all?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                // De-duplicate performance data by ID to prevent merge issues
                const perfData = data.performance || [];
                const uniquePerf = Array.from(new Map(perfData.map(p => [p._id || p.userId, p])).values());
                setAllPerformance(uniquePerf);
                setGlobalTrends(data.trends || []);
                setGlobalAdmissionDetail(data.admissionDetail || { bySource: [], byCenter: [] });
            }
        } catch (error) {
            console.error("Error fetching performance summary:", error);
        } finally {
            setSummaryLoading(false);
        }
    };

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Ensure unique centres by ID to prevent duplicate key errors
                const uniqueCentres = Array.from(new Map((data || []).map(c => [c._id, c])).values());
                setAvailableCenters(uniqueCentres);
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
        }
    };

    const fetchTelecallers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role?.toLowerCase() === "superadmin" || currentUser.role?.toLowerCase() === "super admin";

            const userCentres = currentUser.centres?.map(c => c._id || c) || [];

            const response = await fetch(`${import.meta.env.VITE_API_URL}/superAdmin/getAllUsers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                let telecallersList = (data.users || []).filter(u =>
                    ["telecaller", "counsellor", "marketing"].includes(u.role)
                );

                if (!isSuperAdmin && userCentres.length > 0) {
                    telecallersList = telecallersList.filter(telecaller => {
                        const telecallerCentres = telecaller.centres?.map(c => c._id || c) || [];
                        return telecallerCentres.some(tc => userCentres.includes(tc));
                    });
                }
                // De-duplicate the list by ID to prevent React key warnings
                const uniqueTelecallers = Array.from(new Map(telecallersList.map(u => [u._id, u])).values());
                setTelecallers(uniqueTelecallers);
            }
        } catch (error) {
            console.error("Error fetching telecallers:", error);
        } finally {
            if (!telecallerNameFromUrl) setLoading(false);
        }
    };

    const fetchAssignedLeads = async (telecallerName) => {
        // Loading handled by wrapper
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const isSuperAdmin = currentUser.role?.toLowerCase() === "superadmin" || currentUser.role?.toLowerCase() === "super admin";

            const userCentres = currentUser.centres?.map(c => c.centreName || c) || [];

            const params = new URLSearchParams({ leadResponsibility: telecallerName, limit: 100 });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                let leads = data.leads || [];

                if (!isSuperAdmin && userCentres.length > 0) {
                    leads = leads.filter(lead => userCentres.includes(lead.centre));
                }

                // Sort by follow-ups length descending
                const sortedLeads = leads.sort((a, b) => (b.followUps?.length || 0) - (a.followUps?.length || 0));
                setAssignedLeads(sortedLeads);
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
        }
    };

    const handleTelecallerClick = (telecaller) => {
        navigate(`/admissions/telecalling-console?telecaller=${encodeURIComponent(telecaller.name)}`);
    };



    const fetchLeadsByStatus = async (status) => {
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                leadResponsibility: telecallerNameFromUrl,
                limit: 500, // Fetch up to 500 for the modal list
                followUpStatus: status
            });
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) return data.leads || [];
            return [];
        } catch (error) {
            console.error("Error fetching modal leads:", error);
            return [];
        }
    };


    const handleResetRedFlags = async (userId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to reset red flags for this telecaller?")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/red-flags/reset/${userId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Red flags reset successfully");
                fetchTelecallers();
                fetchAllPerformance();
            } else {
                toast.error(data.message || "Failed to reset red flags");
            }
        } catch (error) {
            console.error("Error resetting red flags:", error);
            toast.error("An error occurred while resetting red flags");
        }
    };

    const handleResetPerformance = async (userId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Are you sure you want to reset this telecaller's 5-day history? This will start their record from day one.")) return;

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/lead-management/performance/reset/${userId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                toast.success("Performance history reset successfully");
                // Refresh data
                fetchTelecallers();
                fetchAllPerformance();
            } else {
                toast.error(data.message || "Failed to reset performance");
            }
        } catch (error) {
            console.error("Error resetting performance:", error);
            toast.error("An error occurred while resetting performance");
        }
    };

    // Modal Handler
    const openLeadModal = async (type) => {
        setShowLeadModal(true);
        setModalLeads([]); // Clear previous data

        let leads = [];
        if (type === 'CONTACTED') {
            setModalTitle(`CONTACTED STUDENTS`);
            leads = await fetchLeadsByStatus('contacted');
            setModalTitle(`CONTACTED STUDENTS (${leads.length})`);
        } else if (type === 'REMAINING') {
            setModalTitle(`REMAINING STUDENTS`);
            leads = await fetchLeadsByStatus('remaining');
            setModalTitle(`REMAINING STUDENTS (${leads.length})`);
        } else {
            setModalTitle(`ALL ASSIGNED STUDENTS`);
            // Fallback to assignedLeads or fetch all if needed
            leads = assignedLeads;
        }
        setModalLeads(leads);
    };

    const contactData = [
        { name: 'Contacted', value: analyticsData?.performance?.called || 0 },
        { name: 'Remaining', value: analyticsData?.performance?.remaining || 0 }
    ];

    return (
        <Layout activePage="Admissions">
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-[#0f1215] text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
                <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />

                {/* Tactical Header */}
                <div className={`p-6 border-b flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-md'}`}>
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <button
                            onClick={() => navigate(-1)}
                            className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <FaArrowLeft size={14} />
                        </button>
                        <div>
                            <h2 className={`text-2xl font-black italic tracking-tighter uppercase leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Performance Console
                            </h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2 italic">
                                {activeConsole === 'telecalling' ? (!telecallerNameFromUrl ? "ANALYZE PERFORMANCE AND METRICS" : `PERFORMANCE LOGS FOR AGENT: ${telecallerNameFromUrl.toUpperCase()}`) :
                                    "COUNSELLING PERFORMANCE & ADMISSIONS"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto justify-end">
                        {/* Console Switcher */}
                        <div className={`flex items-center p-1 rounded-[4px] border ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-100 border-gray-200'}`}>
                            {['telecalling', 'counselling'].map(consoleType => (
                                <button
                                    key={consoleType}
                                    onClick={() => setActiveConsole(consoleType)}
                                    className={`px-4 py-2 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all ${activeConsole === consoleType ? (isDarkMode ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-white text-black shadow-sm') : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}
                                >
                                    {consoleType}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                                title="Toggle Mode"
                            >
                                {isDarkMode ? <FaSun /> : <FaMoon />}
                            </button>
                            <button
                                onClick={() => telecallerNameFromUrl ? fetchAssignedLeads(telecallerNameFromUrl) : fetchTelecallers()}
                                className={`p-2.5 rounded-[4px] border transition-all active:scale-95 ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-black' : 'bg-cyan-50 border-cyan-200 text-cyan-600 hover:bg-cyan-100 shadow-sm'}`}
                                title="Refresh Data"
                            >
                                <FaSync className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-8 space-y-8 custom-scrollbar overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-6">
                            <FaSync size={48} className="text-cyan-500 animate-spin" />
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-cyan-500 animate-pulse">Synchronizing Data...</p>
                        </div>
                    ) : (
                        <>
                            {telecallerNameFromUrl ? (
                                <div className="space-y-10 animate-fadeIn">
                                    {/* Filters for specific agent */}
                                    <div className={`p-6 rounded-[4px] border flex flex-col lg:flex-row items-center justify-between gap-6 transition-all animate-fadeIn ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest mr-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Presets</span>
                                            {['today', 'yesterday', '7days', '30days'].map(preset => (
                                                <button
                                                    key={preset}
                                                    onClick={() => setDatePreset(preset)}
                                                    className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500'}`}
                                                >
                                                    {preset === '7days' ? 'Last 7 Days' : preset === '30days' ? 'Last 30 Days' : preset.charAt(0).toUpperCase() + preset.slice(1)}
                                                </button>
                                            ))}
                                            <button
                                                onClick={resetFilters}
                                                className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white'}`}
                                            >
                                                <FaRedo size={10} /> Reset
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Range</span>
                                                <input
                                                    type="date"
                                                    value={filters.fromDate}
                                                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                                    className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                />
                                                <span className="text-gray-500">→</span>
                                                <input
                                                    type="date"
                                                    value={filters.toDate}
                                                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                                    className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <FaClock className="text-cyan-500" size={12} />
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Time</span>
                                                <input
                                                    type="time"
                                                    value={filters.startTime}
                                                    onChange={(e) => handleFilterChange('startTime', e.target.value)}
                                                    className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                />
                                                <span className="text-gray-500">-</span>
                                                <input
                                                    type="time"
                                                    value={filters.endTime}
                                                    onChange={(e) => handleFilterChange('endTime', e.target.value)}
                                                    className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                                />
                                            </div>

                                            <button
                                                onClick={handleViewTable}
                                                className={`px-6 py-2.5 rounded-[2px] ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500 hover:text-black' : 'bg-cyan-50 text-cyan-600 border border-cyan-100 hover:bg-cyan-500 hover:text-white'} transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-500/10 active:scale-95`}
                                            >
                                                <FaChartBar size={14} /> View Table
                                            </button>

                                            <button
                                                onClick={handleExportExcel}
                                                className={`px-6 py-2.5 rounded-[2px] bg-green-600 text-black hover:bg-green-500 transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-500/20 active:scale-95`}
                                            >
                                                <FaFileExcel size={14} /> Export Report
                                            </button>
                                        </div>
                                    </div>

                                    {/* Analytics Dashboard */}
                                    <AnalyticsDashboard data={analyticsData} isDarkMode={isDarkMode} />

                                    {/* Detailed Stats Cards Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        {/* Scheduled Follow-ups Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('UPCOMING')}
                                            className={`p-5 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/50' : 'bg-cyan-50 border-cyan-100 shadow-sm hover:border-cyan-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Upcoming Tasks</p>
                                                    <h3 className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalScheduled}</h3>
                                                    <p className="text-[8px] font-bold text-cyan-500 mt-1 uppercase tracking-widest">Scheduled Follow-ups</p>
                                                </div>
                                                <div className={`p-2.5 rounded-[20px] transition-all bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]`}>
                                                    <FaCalendarAlt size={16} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-[0.03] transform group-hover:scale-110 transition-transform text-cyan-500">
                                                <FaCalendarAlt size={100} />
                                            </div>
                                        </div>

                                        {/* Total Follow-ups Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('TODAY')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:border-cyan-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-cyan-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Today's Activity</p>
                                                    <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.totalFollowUps}</h3>
                                                    <p className="text-[9px] font-bold text-cyan-500 mt-1 uppercase tracking-widest">Follow-ups Recorded</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fetchFollowUpStats(telecallerNameFromUrl);
                                                    }}
                                                    className={`p-3 rounded-[2px] transition-all hover:rotate-180 duration-500 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-cyan-50 text-cyan-600'}`}
                                                >
                                                    <FaHistory size={20} />
                                                </button>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform">
                                                <FaHistory size={100} />
                                            </div>
                                        </div>

                                        {/* Hot Leads Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('HOT')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/50' : 'bg-red-50 border-red-100 shadow-sm hover:border-red-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-red-500">Opportunity</p>
                                                    <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.hotLeads}</h3>
                                                    <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-widest">Potential Conversions</p>
                                                </div>
                                                <div className={`p-2.5 rounded-[20px] transition-all bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]`}>
                                                    <FaChartLine size={16} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform text-red-500">
                                                <FaChartLine size={100} />
                                            </div>
                                        </div>

                                        {/* Positive Leads Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('POSITIVE')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/50' : 'bg-green-50 border-green-100 shadow-sm hover:border-green-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-green-500">Positive</p>
                                                    <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.positiveLeads}</h3>
                                                    <p className="text-[9px] font-bold text-green-500 mt-1 uppercase tracking-widest">Interested Leads</p>
                                                </div>
                                                <div className={`p-2.5 rounded-[20px] transition-all bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.4)]`}>
                                                    <FaCheckCircle size={16} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform text-green-500">
                                                <FaCheckCircle size={100} />
                                            </div>
                                        </div>

                                        {/* Cold Leads Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('COLD')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/50' : 'bg-blue-50 border-blue-100 shadow-sm hover:border-blue-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-blue-500">Cold</p>
                                                    <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.coldLeads}</h3>
                                                    <p className="text-[9px] font-bold text-blue-500 mt-1 uppercase tracking-widest">Low Interest</p>
                                                </div>
                                                <div className={`p-2.5 rounded-[20px] transition-all bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]`}>
                                                    <FaClock size={16} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform text-blue-500">
                                                <FaClock size={100} />
                                            </div>
                                        </div>

                                        {/* Negative Results Card */}
                                        <div
                                            onClick={() => handleActivityCardClick('NEGATIVE')}
                                            className={`p-6 rounded-[2px] border relative overflow-hidden group transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isDarkMode ? 'bg-gray-500/5 border-gray-500/20 hover:border-gray-500/50' : 'bg-gray-50 border-gray-100 shadow-sm hover:border-gray-500/50'}`}>
                                            <div className="flex justify-between items-start relative z-10 transition-transform group-hover:-translate-y-1">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-gray-500">Negative</p>
                                                    <h3 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{followUpStats.negativeLeads}</h3>
                                                    <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Non-Conversions</p>
                                                </div>
                                                <div className={`p-2.5 rounded-[20px] transition-all bg-gray-500 text-white shadow-[0_0_15px_rgba(107,114,128,0.4)]`}>
                                                    <FaTimesCircle size={16} />
                                                </div>
                                            </div>
                                            <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform text-gray-500">
                                                <FaTimesCircle size={100} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        {/* Performance Matrix */}
                                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                                <h5 className={`text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    <FaUsers className="text-cyan-500" /> LEAD ALLOCATION & PROGRESS
                                                </h5>
                                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                                    {/* Chart */}
                                                    <div className="w-full md:w-1/2 h-[200px]">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={contactData}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={50}
                                                                    outerRadius={70}
                                                                    paddingAngle={5}
                                                                    dataKey="value"
                                                                >
                                                                    <Cell fill="#22c55e" /> {/* Contacted - Green */}
                                                                    <Cell fill="#ef4444" /> {/* Remaining - Red */}
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}
                                                                    itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                                                                />
                                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>

                                                    {/* Stats & Controls */}
                                                    <div className="w-full md:w-1/2 space-y-4">
                                                        <div
                                                            onClick={() => openLeadModal('CONTACTED')}
                                                            className={`p-4 rounded-[4px] border cursor-pointer transition-all active:scale-95 group ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:bg-green-500/5 hover:border-green-500/30' : 'bg-gray-50 border-gray-100 hover:bg-green-50'}`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <p className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>CONTACTED</p>
                                                                <div className={`w-2 h-2 rounded-full bg-green-500/50 group-hover:bg-green-500 group-hover:animate-pulse transition-all`}></div>
                                                            </div>
                                                            <h4 className={`text-xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.performance?.called || 0}</h4>
                                                            <p className="text-[9px] text-gray-500 mt-1">CLICK TO VIEW LIST</p>
                                                        </div>

                                                        <div
                                                            onClick={() => openLeadModal('REMAINING')}
                                                            className={`p-4 rounded-[4px] border cursor-pointer transition-all active:scale-95 group ${isDarkMode ? 'bg-[#131619] border-gray-800 hover:bg-red-500/5 hover:border-red-500/30' : 'bg-gray-50 border-gray-100 hover:bg-red-50'}`}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <p className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>REMAINING</p>
                                                                <div className={`w-2 h-2 rounded-full bg-red-500/50 group-hover:bg-red-500 group-hover:animate-pulse transition-all`}></div>
                                                            </div>
                                                            <h4 className={`text-xl font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.performance?.remaining || 0}</h4>
                                                            <p className="text-[9px] text-gray-500 mt-1">CLICK TO VIEW LIST</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={`p-8 rounded-[4px] border transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                                <h5 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    <FaHistory className="text-purple-500" /> PERIODIC PERFORMANCE
                                                </h5>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between p-4 rounded-[4px] border-b border-dashed border-gray-700">
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>DAILY CALLS</span>
                                                        <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.calls?.today || 0}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 rounded-[4px] border-b border-dashed border-gray-700">
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>MONTHLY CALLS</span>
                                                        <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.calls?.last30Days || 0}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 rounded-[4px] border-b border-dashed border-gray-700">
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>CONVERSION RATE</span>
                                                        <span className={`text-lg font-black ${(analyticsData?.performance?.conversionRate || 0) > 0 ? 'text-green-500' : 'text-gray-500'}`}>{analyticsData?.performance?.conversionRate || 0}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 rounded-[4px]">
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>TOTAL FOLLOW-UPS</span>
                                                        <span className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData?.performance?.totalFollowUps || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Admission Analysis for Counsellors (Individual View) */}
                                    {telecallers.find(c => c.name === telecallerNameFromUrl)?.role === 'counsellor' && analyticsData?.admissionDetail && (
                                        <div className="space-y-6 pt-10 border-t border-gray-800/50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className={`text-lg font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        <FaChartLine className="text-cyan-500" /> ADMISSION PERFORMANCE REPORT
                                                    </h4>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        Individual Conversion Velocity & Metrics
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className={`p-8 rounded-[4px] border md:col-span-2 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                                    <h5 className={`text-[10px] font-black uppercase tracking-widest mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Conversion Growth (Last 30 Days)</h5>
                                                    <div className="h-[300px]">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={analyticsData.admissionDetail.trend}>
                                                                <defs>
                                                                    <linearGradient id="colorPersonalAdmissionTrend" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#333' : '#eee'} />
                                                                <XAxis
                                                                    dataKey="date"
                                                                    tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }}
                                                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                                />
                                                                <YAxis tick={{ fontSize: 9, fontWeight: 900, fill: isDarkMode ? '#666' : '#999' }} />
                                                                <Tooltip
                                                                    contentStyle={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}
                                                                    labelStyle={{ color: isDarkMode ? '#9ca3af' : '#4b5563' }}
                                                                />
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey="admissions"
                                                                    stroke="#06b6d4"
                                                                    fillOpacity={1}
                                                                    fill="url(#colorPersonalAdmissionTrend)"
                                                                    strokeWidth={4}
                                                                    animationDuration={2000}
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                                        <h5 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Conversion Accuracy</h5>
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="relative w-40 h-40">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <PieChart>
                                                                        <Pie
                                                                            data={[
                                                                                { name: 'Admissions', value: analyticsData.admissionDetail.trend?.reduce((acc, curr) => acc + (curr.admissions || 0), 0) || 0 },
                                                                                { name: 'Remaining Leads', value: Math.max(0, (analyticsData.performance?.totalAssigned || 0) - (analyticsData.admissionDetail.trend?.reduce((acc, curr) => acc + (curr.admissions || 0), 0) || 0)) }
                                                                            ]}
                                                                            innerRadius={50}
                                                                            outerRadius={70}
                                                                            startAngle={90}
                                                                            endAngle={450}
                                                                            dataKey="value"
                                                                        >
                                                                            <Cell fill="#06b6d4" />
                                                                            <Cell fill={isDarkMode ? '#131619' : '#f3f4f6'} />
                                                                        </Pie>
                                                                    </PieChart>
                                                                </ResponsiveContainer>
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                                    <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{analyticsData.performance?.conversionRate || 0}%</span>
                                                                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Efficiency</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={`p-8 rounded-[4px] border ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                                        <h5 className={`text-[10px] font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source Breakdown</h5>
                                                        <div className="h-[150px]">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie
                                                                        data={analyticsData.admissionDetail.bySource || []}
                                                                        innerRadius={40}
                                                                        outerRadius={60}
                                                                        paddingAngle={5}
                                                                        dataKey="value"
                                                                    >
                                                                        {(analyticsData.admissionDetail.bySource || []).map((entry, index) => (
                                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                        ))}
                                                                    </Pie>
                                                                    <Tooltip contentStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fadeIn">
                                    {/* COMMAND CENTER: ADVANCED FILTERS */}
                                    <div className={`p-8 rounded-[4px] border space-y-8 transition-all animate-fadeIn ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-2xl' : 'bg-white border-gray-200 shadow-md'}`}>
                                        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                                            {/* Search & Metadata */}
                                            <div className="flex flex-1 items-center gap-6 w-full lg:w-auto">
                                                <div className={`p-4 rounded-[4px] border hidden md:block ${isDarkMode ? 'bg-[#131619] border-gray-800 text-cyan-500' : 'bg-gray-50 border-gray-200 text-cyan-600'}`}>
                                                    <FaFilter size={18} />
                                                </div>
                                                <div className="flex-1 max-w-md relative group">
                                                    <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-gray-600 group-focus-within:text-cyan-500' : 'text-gray-400 group-focus-within:text-cyan-500'}`} />
                                                    <input
                                                        type="text"
                                                        placeholder="SEARCH SQUAD MEMBERS..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className={`w-full pl-12 pr-4 py-3 rounded-[2px] border text-[10px] font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Period Selector & Date Range */}
                                            <div className="flex flex-wrap items-center gap-6 justify-end w-full lg:w-auto">
                                                <div className="flex items-center gap-1 p-1 bg-black/10 rounded-[6px]">
                                                    {['daily', 'weekly', 'monthly'].map((period) => (
                                                        <button
                                                            key={period}
                                                            onClick={() => {
                                                                setTimePeriod(period);
                                                                fetchAllPerformance(period, filters);
                                                            }}
                                                            className={`px-6 py-2 rounded-[4px] text-[10px] font-black uppercase tracking-widest transition-all ${timePeriod === period
                                                                ? (isDarkMode ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-cyan-600 text-white shadow-sm')
                                                                : (isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-500 hover:text-gray-700')
                                                                }`}
                                                        >
                                                            {period}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex items-center gap-3 border-l border-gray-700/50 pl-6 h-10">
                                                    <input
                                                        type="date"
                                                        value={filters.fromDate}
                                                        onChange={(e) => {
                                                            const nf = { ...filters, fromDate: e.target.value };
                                                            setFilters(nf);
                                                            fetchAllPerformance(timePeriod, nf);
                                                        }}
                                                        className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                                    />
                                                    <span className="text-gray-500">→</span>
                                                    <input
                                                        type="date"
                                                        value={filters.toDate}
                                                        onChange={(e) => {
                                                            const nf = { ...filters, toDate: e.target.value };
                                                            setFilters(nf);
                                                            fetchAllPerformance(timePeriod, nf);
                                                        }}
                                                        className={`px-3 py-2 rounded-[2px] border text-[10px] font-bold outline-none transition-all ${isDarkMode ? 'bg-[#131619] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500 shadow-sm'}`}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            resetFilters();
                                                            fetchAllPerformance('daily', { fromDate: "", toDate: "" });
                                                        }}
                                                        className={`p-2.5 rounded-[4px] border transition-all ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`}
                                                        title="Reset Date Filters"
                                                    >
                                                        <FaRedo size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Center Multi-Selector */}
                                        <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-dashed border-gray-800/50">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] mr-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Region Filtering:</span>
                                            <button
                                                onClick={() => setSelectedCenters([])}
                                                className={`px-4 py-1.5 rounded-[20px] text-[9px] font-black uppercase tracking-widest transition-all border ${selectedCenters.length === 0 ? (isDarkMode ? 'bg-cyan-500 text-black border-cyan-500' : 'bg-cyan-600 text-white') : (isDarkMode ? 'bg-gray-800 text-gray-500 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:border-cyan-500')}`}
                                            >
                                                ALL REGIONS
                                            </button>
                                            {availableCenters.map((center, idx) => (
                                                <button
                                                    key={`center-${center._id || idx}`}
                                                    onClick={() => {
                                                        setSelectedCenters(prev =>
                                                            prev.includes(center.centreName)
                                                                ? prev.filter(c => c !== center.centreName)
                                                                : [...prev, center.centreName]
                                                        );
                                                    }}
                                                    className={`px-4 py-1.5 rounded-[20px] text-[9px] font-black uppercase tracking-widest transition-all border ${selectedCenters.includes(center.centreName) ? (isDarkMode ? 'bg-cyan-500 text-black border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-cyan-600 text-white shadow-sm') : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white' : 'bg-white text-gray-500 border-gray-200 hover:border-cyan-500')}`}
                                                >
                                                    {center.centreName.toUpperCase()}
                                                </button>
                                            ))}
                                            {selectedCenters.length > 0 && (
                                                <button
                                                    onClick={() => setSelectedCenters([])}
                                                    className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-4 hover:underline"
                                                >
                                                    CLEAR ALL
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* CONSOLE VIEW RENDERING */}
                                    {activeConsole === 'telecalling' ? (
                                        <div className={`p-8 rounded-[4px] border animate-fadeIn ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 shadow-xl' : 'bg-white border-gray-200 shadow-sm'}`}>
                                            <div className="flex items-center justify-between mb-8">
                                                <h5 className={`text-sm font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                    <FaChartBar className="text-cyan-500" /> COMPARATIVE PERFORMANCE MATRIX
                                                    {summaryLoading && <FaSync className="animate-spin text-cyan-500" size={12} />}
                                                </h5>
                                                <button
                                                    onClick={exportToExcel}
                                                    className={`px-6 py-2 rounded-[2px] transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-black' : 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-500 hover:text-white shadow-sm'}`}
                                                >
                                                    <FaDownload /> EXPORT SQUAD DATA
                                                </button>
                                            </div>

                                            <div className="h-[400px] w-full mt-10">
                                                <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                                                    <BarChart
                                                        data={allPerformance
                                                            .filter(u => {
                                                                const matchesRole = u.role === 'telecaller' || u.role === 'centralizedTelecaller';
                                                                const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
                                                                const uCentres = u.centres || u.centers || [];
                                                                const matchesCenter = selectedCenters.length === 0 || (uCentres.some(c => selectedCenters.includes(c.centreName || c)));
                                                                return matchesRole && matchesSearch && matchesCenter;
                                                            }).length > 0 ? allPerformance.filter(u => {
                                                                const matchesRole = u.role === 'telecaller' || u.role === 'centralizedTelecaller';
                                                                const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
                                                                const uCentres = u.centres || u.centers || [];
                                                                const matchesCenter = selectedCenters.length === 0 || (uCentres.some(c => selectedCenters.includes(c.centreName || c)));
                                                                return matchesRole && matchesSearch && matchesCenter;
                                                            }) : [{ name: 'No Data', currentCalls: 0, previousCalls: 0 }]}
                                                        margin={{ top: 20, right: 20, left: 20, bottom: 5 }}
                                                        barGap={0}
                                                    >
                                                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#333' : '#eee'} vertical={false} />
                                                        <XAxis dataKey="name" stroke={isDarkMode ? '#666' : '#999'} fontSize={10} fontWeight="bold" tickFormatter={(val) => val.split(' ')[0]} />
                                                        <YAxis stroke={isDarkMode ? '#666' : '#999'} fontSize={10} fontWeight="bold" />
                                                        <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', borderColor: isDarkMode ? '#374151' : '#e5e7eb', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }} />
                                                        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                                        <Bar name="PREVIOUS PERIOD" dataKey="previousCalls" fill={isDarkMode ? '#2d333b' : '#cbd5e1'} radius={[4, 4, 0, 0]} barSize={30} />
                                                        <Bar name="CURRENT PERIOD" dataKey="currentCalls" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={30}>
                                                            <LabelList content={<CustomBarLabel />} position="top" />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    ) : (
                                        <CounsellingConsole
                                            mainTheme={theme}
                                            timePeriod={timePeriod}
                                            performanceData={allPerformance.filter(u => {
                                                const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
                                                const uCentres = u.centres || u.centers || [];
                                                const matchesCenter = selectedCenters.length === 0 || (uCentres.some(c => selectedCenters.includes(c.centreName || c)));
                                                const matchesRole = ['telecaller', 'counsellor', 'centralizedTelecaller'].includes(u.role);
                                                return matchesRole && matchesSearch && matchesCenter;
                                            })}
                                            monthlyTrends={globalTrends}
                                            admissionDetail={globalAdmissionDetail}
                                        />
                                    )}

                                    {/* AGENT GRID CARDS */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn pb-20">
                                        {enrichedTelecallers
                                            .filter(tc => {
                                                const roleMap = {
                                                    'telecalling': 'telecaller',
                                                    'counselling': 'counsellor'
                                                };
                                                const targetRole = roleMap[activeConsole];
                                                const matchesRole = tc.role === targetRole;
                                                const matchesSearch = tc.name.toLowerCase().includes(searchQuery.toLowerCase());
                                                const telecallerCentres = tc.centres?.map(c => c.centreName || c) || [];
                                                const matchesCenter = selectedCenters.length === 0 || selectedCenters.some(sc => telecallerCentres.includes(sc));
                                                return matchesRole && matchesSearch && matchesCenter;
                                            })
                                            .map((caller, idx) => (
                                                <div
                                                    key={caller._id || `caller-${idx}`}
                                                    onClick={() => handleTelecallerClick(caller)}
                                                    className={`p-6 rounded-[8px] border transition-all cursor-pointer group flex flex-col relative overflow-hidden ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/50 hover:bg-[#1e242a] shadow-xl hover:shadow-cyan-500/5' : 'bg-white border-gray-200 hover:border-cyan-500/50 hover:bg-gray-50 shadow-sm'}`}
                                                >
                                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>

                                                    <div className="flex items-start gap-5 mb-6">
                                                        <div className={`w-20 h-20 rounded-[8px] flex-shrink-0 flex items-center justify-center text-3xl shadow-lg transition-all group-hover:scale-105 overflow-hidden border-2 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border-cyan-100'}`}>
                                                            {caller.profileImage ? (
                                                                <img
                                                                    src={caller.profileImage}
                                                                    alt={caller.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <FaUserTie />
                                                            )}
                                                            {caller.taskProgress?.percent === 100 && (
                                                                <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center backdrop-blur-[1px] animate-pulse">
                                                                    <FaCheckCircle className="text-green-500 bg-white rounded-full shadow-lg" size={24} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <h3 className={`text-lg font-black uppercase tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{caller.name}</h3>
                                                                {caller.redFlags > 0 && (
                                                                    <div className="flex gap-0.5 ml-2 shrink-0">
                                                                        {[...Array(caller.redFlags)].map((_, i) => (
                                                                            <FaStar key={i} size={10} className="text-red-500 animate-bounce" style={{ animationDelay: `${i * 100}ms` }} />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isDarkMode ? 'text-cyan-500' : 'text-cyan-600'}`}>{caller.role}</p>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                                                                {caller.mobNum && (
                                                                    <div className="flex items-center gap-2 text-gray-400">
                                                                        <FaPhoneAlt size={10} className="text-cyan-500" />
                                                                        <span className="text-[10px] font-bold tracking-wider">{caller.mobNum}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Task Progress Section */}
                                                    <div className="mb-6 space-y-3">
                                                        <div className="flex justify-between items-end mb-1">
                                                            <div>
                                                                <p className="text-[7.5px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Performance Points (Last 5 Days)</p>
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                                        <span className="text-cyan-500">{Math.round(caller.taskProgress?.completed || 0)}</span>/60 PTS
                                                                    </h4>
                                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-[2px] ${caller.taskProgress?.percent > 80 ? 'bg-green-500/10 text-green-500' :
                                                                        caller.taskProgress?.percent > 50 ? 'bg-blue-500/10 text-blue-500' :
                                                                            caller.taskProgress?.percent > 20 ? 'bg-yellow-500/10 text-yellow-500' :
                                                                                'bg-red-500/10 text-red-500'
                                                                        }`}>
                                                                        {caller.taskProgress?.percent > 80 ? 'Elite' :
                                                                            caller.taskProgress?.percent > 50 ? 'Stable' :
                                                                                caller.taskProgress?.percent > 20 ? 'Active' :
                                                                                    'Low Activity'}
                                                                    </span>
                                                                    {caller.taskProgress?.history5Days?.[4]?.met && (
                                                                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-[2px] bg-green-500 text-white animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                                                                            Goal Met
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[7.5px] text-gray-500 font-black uppercase tracking-widest mb-0.5">Goal</p>
                                                                <p className={`text-[9px] font-black ${caller.taskProgress?.history5Days?.[4]?.met ? 'text-green-500' : isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>50 CALLS/DAY</p>
                                                            </div>
                                                        </div>

                                                        {/* 5-Day History Dots */}
                                                        <div className="grid grid-cols-5 gap-1 pt-1 pb-2">
                                                            {caller.taskProgress?.history5Days ? (
                                                                caller.taskProgress.history5Days.map((day, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setHistoryDetail({ name: caller.name, history: caller.taskProgress.history5Days });
                                                                        }}
                                                                        className={`h-1.5 rounded-full transition-all cursor-help ${day.met ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                                                                            day.count > 0 ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]' :
                                                                                'bg-red-500/20'
                                                                            }`}
                                                                        title={`${day.date}: ${day.count} calls (${day.points} pts)`}
                                                                    ></div>
                                                                ))
                                                            ) : (
                                                                [...Array(5)].map((_, i) => <div key={i} className="h-1.5 rounded-full bg-gray-800/50"></div>)
                                                            )}
                                                        </div>

                                                        <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100 shadow-inner'}`}>
                                                            <div
                                                                className={`h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] ${caller.taskProgress?.percent > 70 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                                                                    caller.taskProgress?.percent > 30 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                                                                        'bg-gradient-to-r from-red-600 to-red-400'
                                                                    }`}
                                                                style={{ width: `${caller.taskProgress?.percent || 0}%` }}
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setHistoryDetail({ name: caller.name, history: caller.taskProgress?.history5Days || [] });
                                                            }}
                                                            className={`w-full py-1.5 rounded-[2px] text-[8px] font-black uppercase tracking-widest border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                                                        >
                                                            VIEW 5-DAY HISTORY
                                                        </button>
                                                    </div>

                                                    <div className={`space-y-3 pt-5 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex-1">
                                                                <p className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-black mb-2">Assigned Centers</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {(caller.centres || []).length > 0 ? (
                                                                        caller.centres.map((c, i) => (
                                                                            <span key={i} className={`px-2 py-1 rounded-[2px] text-[8px] font-black uppercase tracking-widest border ${isDarkMode ? 'bg-black/20 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                                                                {c.centreName || c}
                                                                            </span>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-[9px] font-bold italic text-gray-600">No centers assigned</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {JSON.parse(localStorage.getItem('user') || '{}').role?.toLowerCase() === 'superadmin' && (
                                                                <div className="flex gap-2 ml-2">
                                                                    {caller.redFlags > 0 && (
                                                                        <button
                                                                            onClick={(e) => handleResetRedFlags(caller.userId, e)}
                                                                            className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                                            title="Reset Red Flags"
                                                                        >
                                                                            <FaExclamationTriangle size={12} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => handleResetPerformance(caller.userId, e)}
                                                                        className="p-1.5 rounded bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-white transition-all shadow-sm"
                                                                        title="Reset 5-Day Performance"
                                                                    >
                                                                        <FaSync size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className={`mt-6 pt-4 border-t flex justify-center ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isDarkMode ? 'text-cyan-500/40 group-hover:text-cyan-400' : 'text-cyan-600/40 group-hover:text-cyan-600'}`}>
                                                            ANALYZE METRICS <FaArrowLeft className="rotate-180" size={8} />
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {showLeadModal && (
                                <LeadListModal
                                    title={modalTitle}
                                    leads={modalLeads}
                                    onClose={() => setShowLeadModal(false)}
                                    isDarkMode={isDarkMode}
                                />
                            )}

                            <FollowUpActivityModal
                                isOpen={activityModal.isOpen}
                                onClose={() => setActivityModal(prev => ({ ...prev, isOpen: false }))}
                                title={activityModal.title}
                                data={activityModal.data}
                                isDarkMode={isDarkMode}
                            />

                            {/* Performance Logs Table Modal */}
                            {showPerformanceTable && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                                    <div className={`w-full max-w-[95vw] max-h-[90vh] rounded-[4px] border overflow-hidden flex flex-col ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-2xl'}`}>
                                        <div className={`p-6 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                <FaFileExcel className="text-green-500" />
                                                Performance Logs: {telecallerNameFromUrl}
                                                {filters.fromDate && <span className="text-gray-500 ml-2">({filters.fromDate} to {filters.toDate || 'Present'})</span>}
                                            </h3>
                                            <button
                                                onClick={() => setShowPerformanceTable(false)}
                                                className={`p-2 rounded-[2px] transition-all ${isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}
                                            >
                                                <FaTimesCircle size={24} />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                                            {viewTableLoading ? (
                                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                                    <FaSync className="animate-spin text-cyan-500" size={32} />
                                                    <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Loading Logs...</p>
                                                </div>
                                            ) : performanceLogs.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse min-w-[1200px]">
                                                        <thead>
                                                            <tr className={`${isDarkMode ? 'bg-black/20' : 'bg-gray-50'}`}>
                                                                {Object.keys(performanceLogs[0]).map((key) => (
                                                                    <th key={key} className={`p-4 text-[10px] font-black uppercase tracking-widest border-b ${isDarkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                                                                        {key}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {performanceLogs.map((row, idx) => (
                                                                <tr
                                                                    key={idx}
                                                                    className={`border-b transition-colors ${isDarkMode ? 'border-gray-800/50 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50/50'}`}
                                                                >
                                                                    {Object.entries(row).map(([key, value], i) => (
                                                                        <td key={i} className={`p-4 text-[11px] font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                            {key === 'Status' ? (
                                                                                <span className={`px-2 py-1 rounded-[2px] text-[9px] uppercase font-black ${value.toUpperCase().includes('HOT') ? 'bg-red-500/10 text-red-500' :
                                                                                    value.toUpperCase().includes('COLD') ? 'bg-blue-500/10 text-blue-500' :
                                                                                        value.toUpperCase().includes('NEGATIVE') ? 'bg-gray-500/10 text-gray-500' :
                                                                                            'bg-cyan-500/10 text-cyan-500'
                                                                                    }`}>
                                                                                    {value}
                                                                                </span>
                                                                            ) : value}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                                    <FaSearch className="text-gray-600" size={32} />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No logs found for selected period</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`p-6 border-t flex justify-end gap-4 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <button
                                                onClick={handleExportExcel}
                                                className="px-6 py-2.5 rounded-[2px] bg-green-600 text-black hover:bg-green-500 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-green-500/20"
                                            >
                                                <FaFileExcel size={14} /> Export to Excel
                                            </button>
                                            <button
                                                onClick={() => setShowPerformanceTable(false)}
                                                className={`px-6 py-2.5 rounded-[2px] border transition-all font-black text-[10px] uppercase tracking-widest ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white border-gray-200 text-black hover:bg-gray-50'}`}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 5-DAY HISTORY DETAIL MODAL */}
                            {historyDetail && (
                                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                                    <div className={`w-full max-w-lg rounded-2xl border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-200'}`}>
                                        <div className="p-8 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-transparent to-cyan-500/5">
                                            <div>
                                                <h3 className={`text-lg font-black uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{historyDetail.name}</h3>
                                                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-1">5-Day Performance Breakdown</p>
                                            </div>
                                            <button onClick={() => setHistoryDetail(null)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                                                <FaTimesCircle className="text-gray-500 hover:text-white" size={24} />
                                            </button>
                                        </div>
                                        <div className="p-8 space-y-4">
                                            {historyDetail.history.map((day, idx) => (
                                                <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${day.met ? (isDarkMode ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200') : (isDarkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200')}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${day.met ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                                                            {day.met ? <FaCheckCircle /> : <FaHistory />}
                                                        </div>
                                                        <div>
                                                            <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                                {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                                                            </p>
                                                            <p className={`text-[10px] font-bold ${day.met ? 'text-green-500' : 'text-red-500'}`}>
                                                                {day.count} / 50 FOLLOW-UPS
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex flex-col items-end">
                                                            <p className={`text-xl font-black italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{day.points} PTS</p>
                                                            {day.bonusPoints > 0 && (
                                                                <span className="text-[9px] font-black text-green-500 animate-pulse bg-green-500/10 px-2 py-0.5 rounded-[2px] border border-green-500/20 mt-1">
                                                                    BONUS: +{day.bonusPoints}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Weight: 12 MAX</p>
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="mt-8 p-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-cyan-500 text-black rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                                                        <FaChartBar size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em]">Aggregate Score</p>
                                                        <p className={`text-2xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                            {Math.round(historyDetail.history.reduce((acc, curr) => acc + curr.points + (curr.bonusPoints || 0), 0))} / 60
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        {Math.round((historyDetail.history.reduce((acc, curr) => acc + curr.points + (curr.bonusPoints || 0), 0) / 60) * 100)}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f1215' : '#f3f4f6'}; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#1f2937' : '#d1d5db'}; border-radius: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isDarkMode ? '#374151' : '#9ca3af'}; }
            .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}</style>
            </div>
        </Layout>
    );
};

export default TelecallingConsole;
