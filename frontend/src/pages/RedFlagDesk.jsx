import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    FaExclamationCircle, FaExclamationTriangle, FaRedo, FaCheckCircle, 
    FaFilter, FaInfoCircle, FaPaperPlane, FaCheck, FaBuilding, FaUser, FaWalking,
    FaArrowLeft, FaTimesCircle, FaSearch, FaFileExcel, FaList, FaThLarge, FaCalendarAlt
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { downloadExcel } from '../utils/exportUtils';
import RedFlagDetailsModal from '../components/Dashboard/RedFlagDetailsModal';
import { useTheme } from '../context/ThemeContext';
import { hasPermission } from '../config/permissions';

const getDatesInRange = (startStr, endStr) => {
    if (!startStr || !endStr) return [];
    const dates = [];
    let current = new Date(startStr);
    const end = new Date(endStr);
    // Limit to safe iterations (e.g. max 90 days) to prevent infinite loops
    let limit = 0;
    while (current <= end && limit < 100) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
        limit++;
    }
    return dates.reverse(); // Newest first
};

const roleMap = {
    'Telecaller': 'telecaller',
    'Counsellor': 'counsellor',
    'Marketing': 'marketing',
    'Center Incharge': 'centerIncharge',
    'Zonal Manager': 'zonalManager',
    'Coordinator': 'coordinator',
    'Teacher': 'teacher',
    'Support Staff': 'supportStaff'
};

const matchRole = (flagRole, selectedTabRoleName) => {
    const backendRole = roleMap[selectedTabRoleName];
    if (backendRole === 'coordinator') {
        return flagRole === 'coordinator' || flagRole === 'Class_Coordinator';
    }
    if (backendRole === 'zonalManager') {
        return flagRole === 'zonalManager' || flagRole === 'assistantZonalManager';
    }
    if (backendRole === 'centerIncharge') {
        return flagRole === 'centerIncharge' || flagRole === 'assistantCenterIncharge';
    }
    return flagRole === backendRole;
};

const RedFlagDesk = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canView = hasPermission(user, 'trackingFlagging', 'redFlagDesk', 'view');
    const canEdit = hasPermission(user, 'trackingFlagging', 'redFlagDesk', 'edit');
    const canCreate = hasPermission(user, 'trackingFlagging', 'redFlagDesk', 'create');

    useEffect(() => {
        if (!canView && user.role !== 'superAdmin' && user.role !== 'superadmin') {
            toast.error("Access Denied");
            navigate("/");
        }
    }, [canView, user.role, navigate]);

    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [flags, setFlags] = useState([]);
    const [selectedFlag, setSelectedFlag] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCentreId, setSelectedCentreId] = useState(null);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('All Severity');
    const [activeRoleTab, setActiveRoleTab] = useState('Telecaller');
    const [centers, setCenters] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeStatFilter, setActiveStatFilter] = useState('Open Flags');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const roles = ['Telecaller', 'Counsellor', 'Marketing', 'Center Incharge', 'Zonal Manager', 'Coordinator', 'Teacher', 'Support Staff'];

    const getModalFlags = (category) => {
        let filtered = flags;
        
        // Filter flags to only include those belonging to active centers (status !== 'deactive')
        const activeCenterIds = new Set(
            centers
                .filter(c => c.status !== 'deactive')
                .map(c => (c._id || c).toString())
        );
        
        filtered = filtered.filter(f => {
            const cId = f.centre?._id || f.centre;
            return cId && activeCenterIds.has(cId.toString());
        });

        if (selectedCentreId) {
            filtered = filtered.filter(f => f.centre?._id === selectedCentreId || f.centre === selectedCentreId);
            if (activeRoleTab) {
                filtered = filtered.filter(f => matchRole(f.role, activeRoleTab));
            }
        }

        // Now filter by category
        if (category === 'Open Flags') {
            return filtered;
        }
        if (category === 'Critical') {
            return filtered.filter(f => !f.isResolved && f.severity === 'Critical');
        }
        if (category === 'High Risk') {
            return filtered.filter(f => !f.isResolved && f.severity === 'High');
        }
        if (category === 'Medium Risk') {
            return filtered.filter(f => !f.isResolved && f.severity === 'Medium');
        }
        if (category === 'Low Risk') {
            return filtered.filter(f => f.isResolved || f.severity === 'Low');
        }
        return filtered;
    };

    useEffect(() => {
        if (!canView && user.role !== 'superAdmin' && user.role !== 'superadmin') return;
        fetchData();
        fetchCenters();
    }, [selectedCentreId, filterSeverity, startDate, endDate, canView]);

    // Handle role tab switching select first user
    useEffect(() => {
        if (selectedCentreId) {
            const centerRoleFlags = flags.filter(f => 
                (f.centre?._id === selectedCentreId || f.centre === selectedCentreId) && 
                matchRole(f.role, activeRoleTab)
            );
            
            if (centerRoleFlags.length > 0) {
                const grouped = Object.values(centerRoleFlags.reduce((acc, flag) => {
                    if (!acc[flag.user._id]) {
                        acc[flag.user._id] = { ...flag, issuesList: [flag] };
                    } else {
                        acc[flag.user._id].issuesList.push(flag);
                        const severityRank = { 'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3 };
                        if (severityRank[flag.severity] > severityRank[acc[flag.user._id].severity]) {
                            acc[flag.user._id].severity = flag.severity;
                        }
                    }
                    return acc;
                }, {}));
                
                const stillExists = grouped.find(g => g.user._id === selectedFlag?.user?._id);
                setSelectedFlag(stillExists || grouped[0]);
            } else {
                setSelectedFlag(null);
            }
        }
    }, [activeRoleTab, flags, selectedCentreId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const config = { 
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    startDate, 
                    endDate,
                    role: 'All Roles',
                    centreId: selectedCentreId || undefined,
                    severity: filterSeverity !== 'All Severity' ? filterSeverity : undefined
                }
            };

            const flagsRes = await axios.get(`${import.meta.env.VITE_API_URL}/red-flags`, config);
            const data = flagsRes.data;
            setFlags(data);
            
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
        } catch (error) {
            console.error("Error fetching red flag data:", error);
            toast.error("Failed to load red flag data");
            setLoading(false);
        }
    };

    const fetchCenters = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCenters(res.data);
        } catch (error) {
            console.error("Error fetching centers:", error);
        }
    };

    const handleResolve = async (groupOrFlagId) => {
        if (!canEdit && user.role !== 'superAdmin' && user.role !== 'superadmin') {
            toast.error("You do not have permission to resolve red flags");
            return;
        }
        try {
            const token = localStorage.getItem('token');
            let issuesToResolve = [];
            
            // Check if it is a grouped user object or single flag ID
            if (typeof groupOrFlagId === 'string' && groupOrFlagId.startsWith('virtual_')) {
                toast.warning("Cannot resolve virtual metric directly. Complete action in CRM to clear.");
                return;
            }

            if (selectedFlag && selectedFlag.user?._id === groupOrFlagId) {
                issuesToResolve = selectedFlag.issuesList;
            } else {
                issuesToResolve = [{ _id: groupOrFlagId }];
            }
            
            for (const issue of issuesToResolve) {
                if (issue._id.startsWith('virtual_')) continue;
                await axios.put(`${import.meta.env.VITE_API_URL}/red-flags/${issue._id}`, 
                    { isResolved: true }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            toast.success("Flag(s) marked as resolved");
            fetchData();
        } catch (error) {
            toast.error("Failed to update flag");
        }
    };

    const handleExportExcel = () => {
        const centerName = centers.find(c => c._id === selectedCentreId)?.centreName || 'All_Centers';
        
        const exportData = flags
            .filter(f => !f.isResolved && f.severity !== 'Low')
            .map(flag => ({
                'Staff Name': flag.user?.name || '',
                'Employee ID': flag.user?.employeeId || '',
                'Role': flag.role || '',
                'Center': flag.centre?.centreName || '',
                'Issue': flag.issue || '',
                'Metric Value': flag.metricValue || 0,
                'Target Value': flag.targetValue || 0,
                'Severity': flag.severity || '',
                'Created At': new Date(flag.createdAt).toLocaleDateString()
            }));

        if (exportData.length === 0) {
            toast.info("No active red flags to export");
            return;
        }

        downloadExcel(exportData, `Red_Flags_${centerName}`);
    };

    const triggerGenerate = async () => {
        if (!canCreate && user.role !== 'superAdmin' && user.role !== 'superadmin') {
            toast.error("You do not have permission to scan red flags");
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL}/red-flags/generate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Scanning for red flags...");
            fetchData();
        } catch (error) {
            toast.error("Failed to trigger scan");
        }
    };

    // Calculate active flag count for each center (role-wise unique users counts)
    const getCenterFlagStats = (centerId) => {
        const centerFlags = flags.filter(f => 
            !f.isResolved && 
            f.severity !== 'Low' && 
            (f.centre?._id === centerId || f.centre === centerId)
        );
        
        const getUniqueUsersCountForRole = (roleTabName) => {
            const roleFlags = centerFlags.filter(f => matchRole(f.role, roleTabName));
            const uniqueUsers = new Set(roleFlags.map(f => f.user?._id || f.user));
            return uniqueUsers.size;
        };

        const telecaller = getUniqueUsersCountForRole('Telecaller');
        const counsellor = getUniqueUsersCountForRole('Counsellor');
        const marketing = getUniqueUsersCountForRole('Marketing');
        const centerIncharge = getUniqueUsersCountForRole('Center Incharge');
        const zonalManager = getUniqueUsersCountForRole('Zonal Manager');
        const coordinator = getUniqueUsersCountForRole('Coordinator');
        const teacher = getUniqueUsersCountForRole('Teacher');
        const total = telecaller + counsellor + marketing + centerIncharge + zonalManager + coordinator + teacher;

        return {
            total,
            telecaller,
            counsellor,
            marketing,
            centerIncharge,
            zonalManager,
            coordinator,
            teacher
        };
    };

    // Calculate active flag count for each role within the selected center (unique users count)
    const getRoleFlagCount = (roleName) => {
        if (!selectedCentreId) return 0;
        const activeFlags = flags.filter(f => 
            !f.isResolved && 
            f.severity !== 'Low' && 
            (f.centre?._id === selectedCentreId || f.centre === selectedCentreId) &&
            matchRole(f.role, roleName)
        );
        const uniqueUsers = new Set(activeFlags.map(f => f.user?._id || f.user));
        return uniqueUsers.size;
    };

    const isToday = startDate === new Date().toISOString().split('T')[0] && endDate === new Date().toISOString().split('T')[0];

    // OVERVIEW VIEW: Filter Centers (Active centers only)
    const filteredCenters = centers.filter(c => 
        c.status !== 'deactive' &&
        c.centreName && c.centreName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // DETAIL VIEW: Group & Filter Flags
    const centerFlags = selectedCentreId 
        ? flags.filter(f => f.centre?._id === selectedCentreId || f.centre === selectedCentreId)
        : [];

    // Compute dynamic stats based on selected center and selected role tab (if center drilldown is open)
    const getDisplayStats = () => {
        let filtered = flags;
        
        // Filter flags to only include those belonging to active centers (status !== 'deactive')
        const activeCenterIds = new Set(
            centers
                .filter(c => c.status !== 'deactive')
                .map(c => (c._id || c).toString())
        );
        
        filtered = filtered.filter(f => {
            const cId = f.centre?._id || f.centre;
            return cId && activeCenterIds.has(cId.toString());
        });

        if (selectedCentreId) {
            filtered = filtered.filter(f => f.centre?._id === selectedCentreId || f.centre === selectedCentreId);
            if (activeRoleTab) {
                filtered = filtered.filter(f => matchRole(f.role, activeRoleTab));
            }
        }

        let critical = 0;
        let high = 0;
        let medium = 0;
        let low = 0;

        filtered.forEach(f => {
            if (f.isResolved) {
                low++;
            } else {
                if (f.severity === 'Critical') {
                    critical++;
                } else if (f.severity === 'High') {
                    high++;
                } else if (f.severity === 'Medium') {
                    medium++;
                } else {
                    low++;
                }
            }
        });

        const total = critical + high + medium + low;

        return { total, critical, high, medium, low };
    };
    const displayStats = getDisplayStats();

    const roleFlags = centerFlags.filter(f => matchRole(f.role, activeRoleTab));

    const groupedFlags = Object.values(roleFlags.reduce((acc, flag) => {
        if (!acc[flag.user._id]) {
            acc[flag.user._id] = {
                ...flag,
                issuesList: [flag]
            };
        } else {
            acc[flag.user._id].issuesList.push(flag);
            const severityRank = { 'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3 };
            const currRank = severityRank[flag.severity] || 0;
            const existingRank = severityRank[acc[flag.user._id].severity] || 0;
            
            if (currRank > existingRank) {
                acc[flag.user._id].severity = flag.severity;
            }
            if (flag.isVirtual === false) acc[flag.user._id].isVirtual = false;
        }
        return acc;
    }, {}));

    const displayFlags = groupedFlags.filter(group => {
        // Filter by Search Query (Staff name or employee id)
        const nameMatches = group.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const idMatches = group.user?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
        if (searchQuery && !nameMatches && !idMatches) return false;

        // Filter by Severity Stat Row Cards
        if (activeStatFilter === 'Open Flags') {
            return true;
        }
        if (activeStatFilter === 'Critical') {
            return group.issuesList.some(i => !i.isResolved && i.severity === 'Critical');
        }
        if (activeStatFilter === 'High Risk') {
            return group.issuesList.some(i => !i.isResolved && i.severity === 'High');
        }
        if (activeStatFilter === 'Medium Risk') {
            return group.issuesList.some(i => !i.isResolved && i.severity === 'Medium');
        }
        if (activeStatFilter === 'Low Risk') {
            return group.issuesList.every(i => i.isResolved || i.severity === 'Low');
        }
        return true;
    });

    const centerCoordinators = useMemo(() => {
        if (!selectedCentreId) return [];
        const uniqueCoordinatorsMap = new Map();
        flags.forEach(f => {
            if ((f.centre?._id === selectedCentreId || f.centre === selectedCentreId) && 
                (f.role === 'coordinator' || f.role === 'Class_Coordinator')) {
                const userId = f.user?._id?.toString() || f.user?.toString();
                if (userId && !uniqueCoordinatorsMap.has(userId)) {
                    // Compute their active flags
                    const userFlags = flags.filter(flag => 
                        (flag.user?._id?.toString() === userId || flag.user?.toString() === userId) && 
                        !flag.isResolved && 
                        flag.severity !== 'Low'
                    );
                    uniqueCoordinatorsMap.set(userId, {
                        user: f.user,
                        role: f.role,
                        activeFlagsCount: userFlags.length,
                        activeFlags: userFlags
                    });
                }
            }
        });
        return Array.from(uniqueCoordinatorsMap.values());
    }, [flags, selectedCentreId]);

    if (!canView && user.role !== 'superAdmin' && user.role !== 'superadmin') {
        return null;
    }

    return (
        <Layout activePage="Tracking & Flagging">
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f1113] p-4 md:p-6 text-gray-800 dark:text-gray-200">
                
                {/* Header Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a1f24] to-[#2c343a] p-8 mb-8 shadow-2xl border border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Pathfinder ERP - Control Tower</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">RedFlag Command Desk</h1>
                            <p className="text-gray-400 max-w-xl text-sm leading-relaxed">
                                Identify operational deficits, track missed targets, view center-wise active alerts, and take immediate day-end regularizations.
                            </p>
                        </div>
                        <div className="flex gap-4 flex-wrap items-center">
                            <div className="bg-[#131619] border border-gray-800 rounded-2xl p-3 flex gap-4 items-center shadow-inner">
                                <div className="flex flex-col">
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">From</p>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        style={{ colorScheme: 'dark' }}
                                        className="bg-transparent text-white text-xs border-none outline-none focus:ring-0 cursor-pointer"
                                    />
                                </div>
                                <div className="w-[1px] h-8 bg-gray-800"></div>
                                <div className="flex flex-col">
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">To</p>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        style={{ colorScheme: 'dark' }}
                                        className="bg-transparent text-white text-xs border-none outline-none focus:ring-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="bg-[#131619] border border-gray-800 rounded-2xl p-4 min-w-[120px] shadow-inner">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Updated</p>
                                <p className="text-xl font-bold text-white">{lastUpdated}</p>
                            </div>
                            <button 
                                onClick={triggerGenerate}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-4 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-red-500/20 active:scale-95"
                            >
                                <FaRedo className={loading ? "animate-spin" : ""} /> Scan System
                            </button>
                        </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Open Flags', value: displayStats.total, sub: 'Due Issues', icon: <FaExclamationCircle />, colorClass: 'text-blue-500 dark:text-blue-400', key: 'Open Flags' },
                        { label: 'Critical', value: displayStats.critical, sub: 'Same-day action', icon: <FaExclamationTriangle />, colorClass: 'text-red-500 dark:text-red-400', key: 'Critical' },
                        { label: 'High Risk', value: displayStats.high, sub: 'CI/ZM push', icon: <FaInfoCircle />, colorClass: 'text-orange-500 dark:text-orange-400', key: 'High Risk' },
                        { label: 'Medium Risk', value: displayStats.medium, sub: 'Monitor closely', icon: <FaInfoCircle />, colorClass: 'text-yellow-500 dark:text-yellow-400', key: 'Medium Risk' },
                        { label: 'Low Risk', value: displayStats.low, sub: 'Operating normally', icon: <FaCheckCircle />, colorClass: 'text-green-500 dark:text-green-400', key: 'Low Risk' }
                    ].map((stat, i) => (
                        <div 
                            key={i} 
                            onClick={() => {
                                setActiveStatFilter(stat.key);
                                setSelectedCategory(stat.key);
                                setModalTitle(`${stat.label} Details`);
                                setShowDetailsModal(true);
                            }}
                            className={`bg-white dark:bg-[#1a1f24] rounded-2xl p-5 border shadow-sm transition-all cursor-pointer hover:shadow-md hover:-translate-y-1 ${
                                activeStatFilter === stat.key 
                                    ? `border-cyan-500 shadow-cyan-500/20 shadow-lg ring-1 ring-cyan-500` 
                                    : `border-gray-200 dark:border-gray-800`
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <span className={`${stat.colorClass} text-lg`}>{stat.icon}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-black text-gray-900 dark:text-white">{stat.value}</p>
                                <p className="text-[10px] text-gray-500 font-medium">{stat.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Layout */}
                {!selectedCentreId ? (
                    // ==========================================
                    // VIEW 1: CENTER-WISE OVERVIEW DASHBOARD
                    // ==========================================
                    <div className="bg-white dark:bg-[#1a1f24] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                        
                        {/* Filters & View Toggle Bar */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <h2 className="text-2xl font-black flex items-center gap-2">
                                    <FaBuilding className="text-cyan-500" /> Center Overview
                                </h2>
                                <span className="bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 font-bold px-3 py-1 rounded-full text-xs">
                                    {filteredCenters.length} Active Centers
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                                <div className="relative w-full md:w-64">
                                    <input 
                                        type="text"
                                        placeholder="Search center..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                                
                                <div className="flex bg-gray-100 dark:bg-[#131619] p-1 rounded-xl">
                                    <button 
                                        onClick={() => setViewMode('cards')}
                                        className={`p-2 rounded-lg text-sm transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-800 text-cyan-500 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        <FaThLarge />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('table')}
                                        className={`p-2 rounded-lg text-sm transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-800 text-cyan-500 shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                                    >
                                        <FaList />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Cards Overview Grid */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
                                <p className="text-sm font-bold animate-pulse">Scanning live red flags...</p>
                            </div>
                        ) : filteredCenters.length === 0 ? (
                            <div className="text-center py-20 text-gray-500 font-bold">No centers found matching search.</div>
                        ) : viewMode === 'cards' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredCenters.map(center => {
                                    const cStats = getCenterFlagStats(center._id);
                                    return (
                                        <div 
                                            key={center._id} 
                                            className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 hover:border-cyan-500/50 rounded-3xl p-6 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-500 font-black text-lg flex items-center justify-center">
                                                            {center.centreName?.charAt(0) || 'C'}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-black text-lg text-gray-900 dark:text-white leading-tight">
                                                                {center.centreName}
                                                            </h3>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                                                Status: {center.status || 'Active'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {cStats.total > 0 ? (
                                                        <span className="bg-red-500/10 text-red-500 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 animate-pulse">
                                                            <FaExclamationTriangle /> {cStats.total} Alert{cStats.total > 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-green-500/10 text-green-500 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1.5">
                                                            <FaCheckCircle /> Clean
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Red Flag Metric Counters */}
                                                <div className="grid grid-cols-3 gap-3 py-4 my-2 bg-gray-50 dark:bg-[#181c20] rounded-2xl px-4 border border-gray-100 dark:border-gray-800 text-center">
                                                    <div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">Telecaller</p>
                                                        <span className={`text-lg font-black ${cStats.telecaller > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {cStats.telecaller}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">Counsellor</p>
                                                        <span className={`text-lg font-black ${cStats.counsellor > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {cStats.counsellor}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">Marketing</p>
                                                        <span className={`text-lg font-black ${cStats.marketing > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {cStats.marketing}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">Incharge</p>
                                                        <span className={`text-lg font-black ${cStats.centerIncharge > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {cStats.centerIncharge}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">Zonal Mgr</p>
                                                        <span className={`text-lg font-black ${cStats.zonalManager > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {cStats.zonalManager}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate">Coordinator</p>
                                                        <span className={`text-lg font-black ${cStats.coordinator > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {cStats.coordinator}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3 border-t border-gray-200 dark:border-gray-700/50 my-1"></div>
                                                    <div className="col-span-3 flex justify-between px-2">
                                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Teacher Alert</p>
                                                        <span className={`text-xs font-black ${cStats.teacher > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {cStats.teacher}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setSelectedCentreId(center._id);
                                                }}
                                                className="w-full mt-4 bg-gray-100 hover:bg-cyan-500 hover:text-white dark:bg-gray-800 dark:hover:bg-cyan-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-2xl text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2"
                                            >
                                                View Details <FaArrowLeft className="rotate-180 text-[10px]" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            // Table View Mode
                            <div className="overflow-x-auto rounded-3xl border border-gray-200 dark:border-gray-800 shadow-inner">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-[#131619] text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                                            <th className="p-4">Center Name</th>
                                            <th className="p-4 text-center">Telecaller</th>
                                            <th className="p-4 text-center">Counsellor</th>
                                            <th className="p-4 text-center">Marketing</th>
                                            <th className="p-4 text-center">Incharge</th>
                                            <th className="p-4 text-center">Zonal Mgr</th>
                                            <th className="p-4 text-center">Coordinator</th>
                                            <th className="p-4 text-center">Teacher</th>
                                            <th className="p-4 text-center">Total Red Flags</th>
                                            <th className="p-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-semibold">
                                        {filteredCenters.map(center => {
                                            const cStats = getCenterFlagStats(center._id);
                                            return (
                                                <tr key={center._id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#131619] transition-colors">
                                                    <td className="p-4 font-black flex items-center gap-3">
                                                        <span className={`w-2.5 h-2.5 rounded-full ${cStats.total > 0 ? 'bg-red-500' : 'bg-green-500'}`}></span>
                                                        {center.centreName}
                                                    </td>
                                                    <td className={`p-4 text-center font-bold ${cStats.telecaller > 0 ? 'text-red-500' : 'text-gray-400'}`}>{cStats.telecaller}</td>
                                                    <td className={`p-4 text-center font-bold ${cStats.counsellor > 0 ? 'text-red-500' : 'text-gray-400'}`}>{cStats.counsellor}</td>
                                                    <td className={`p-4 text-center font-bold ${cStats.marketing > 0 ? 'text-red-500' : 'text-gray-400'}`}>{cStats.marketing}</td>
                                                    <td className={`p-4 text-center font-bold ${cStats.centerIncharge > 0 ? 'text-red-500' : 'text-gray-400'}`}>{cStats.centerIncharge}</td>
                                                    <td className={`p-4 text-center font-bold ${cStats.zonalManager > 0 ? 'text-red-500' : 'text-gray-400'}`}>{cStats.zonalManager}</td>
                                                    <td className={`p-4 text-center font-bold ${cStats.coordinator > 0 ? 'text-red-500' : 'text-gray-400'}`}>{cStats.coordinator}</td>
                                                    <td className={`p-4 text-center font-bold ${cStats.teacher > 0 ? 'text-red-500' : 'text-gray-400'}`}>{cStats.teacher}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${cStats.total > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                                            {cStats.total} Alert{cStats.total !== 1 ? 's' : ''}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button 
                                                            onClick={() => {
                                                                setSearchQuery('');
                                                                setSelectedCentreId(center._id);
                                                            }}
                                                            className="bg-gray-100 hover:bg-cyan-500 hover:text-white dark:bg-gray-800 dark:hover:bg-cyan-600 font-bold px-4 py-2 rounded-xl text-xs tracking-wider uppercase transition-all"
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    // ==========================================
                    // VIEW 2: CENTER DRILLDOWN DETAILS VIEW
                    // ==========================================
                    <div>
                        {/* Details Control Tower Bar */}
                        <div className="bg-white dark:bg-[#1a1f24] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 mb-8 shadow-sm">
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                                
                                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                                    <button 
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCentreId(null);
                                        }}
                                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white p-3.5 rounded-2xl transition-all active:scale-95 flex items-center gap-2 text-xs font-bold uppercase"
                                    >
                                        <FaArrowLeft /> Back to Dashboard
                                    </button>
                                    
                                    <div className="w-[1px] h-8 bg-gray-800 hidden md:block"></div>
                                    
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                                            {centers.find(c => c._id === selectedCentreId)?.centreName}
                                        </h2>
                                        <p className="text-xs text-gray-500 font-bold mt-0.5">
                                            Performance checking for active roles and personnel
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-end">
                                    <div className="relative w-full md:w-64">
                                        <input 
                                            type="text"
                                            placeholder="Search staff name or ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-gray-100 dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                        <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>

                                    <button 
                                        onClick={handleExportExcel}
                                        className="bg-[#131619] hover:bg-cyan-500 text-cyan-400 hover:text-white border border-gray-800 hover:border-transparent font-bold px-6 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 shadow-inner"
                                    >
                                        <FaFileExcel /> Export Excel
                                    </button>
                                </div>
                            </div>

                            {/* Role Selection Tabs Row */}
                            <div className="flex flex-wrap items-center gap-2 bg-gray-100 dark:bg-[#131619] p-1.5 rounded-2xl mt-6 overflow-x-auto">
                                {roles.map(role => {
                                    const alertCount = getRoleFlagCount(role);
                                    return (
                                        <button
                                            key={role}
                                            onClick={() => setActiveRoleTab(role)}
                                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                                                activeRoleTab === role 
                                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            {role}
                                            {alertCount > 0 && (
                                                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                                                    {alertCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Two-Column Detail Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            
                            {/* Staff List Grid (Left) */}
                            <div className="lg:col-span-7 space-y-4">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
                                        <p className="text-sm font-bold animate-pulse">Scanning live performance data...</p>
                                    </div>
                                ) : activeRoleTab === 'Coordinator' ? (
                                    // Dedicated Coordinator Directory View showing all coordinators for the center
                                    <div className="space-y-4 pr-2 max-h-[700px] overflow-y-auto custom-scrollbar">
                                        {/* Directory Header Summary */}
                                        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-3xl p-6 border border-cyan-500/20 mb-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-sm font-black text-cyan-400 uppercase tracking-widest">Coordinator Directory</h4>
                                                    <p className="text-xs text-gray-400 mt-1 font-bold">All coordinators mapped to this center.</p>
                                                </div>
                                                <span className="bg-cyan-500 text-white font-black text-sm px-3.5 py-1.5 rounded-2xl">
                                                    {centerCoordinators.length} Total
                                                </span>
                                            </div>
                                        </div>

                                        {centerCoordinators.length === 0 ? (
                                            <div className="bg-white dark:bg-[#1a1f24] rounded-3xl p-20 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
                                                <p className="text-gray-500 font-bold">No coordinators found mapped to this center.</p>
                                            </div>
                                        ) : (
                                            centerCoordinators
                                                .filter(coord => {
                                                    const nameMatches = coord.user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                                                    const idMatches = coord.user?.employeeId?.toLowerCase().includes(searchQuery.toLowerCase());
                                                    return !searchQuery || nameMatches || idMatches;
                                                })
                                                .map(coord => {
                                                    const hasFlags = coord.activeFlagsCount > 0;
                                                    const flagGroup = groupedFlags.find(g => g.user?._id === coord.user?._id);
                                                    
                                                    const targetGroup = flagGroup || {
                                                        _id: `clean_${coord.user?._id}`,
                                                        user: coord.user,
                                                        role: coord.role,
                                                        centre: centers.find(c => c._id === selectedCentreId) || { centreName: "N/A" },
                                                        severity: 'Low',
                                                        issue: 'Operating normally',
                                                        metricValue: 1,
                                                        targetValue: 1,
                                                        isResolved: true,
                                                        isVirtual: true,
                                                        issuesList: [{
                                                            issue: 'Class Commencement & End Compliance',
                                                            severity: 'Low',
                                                            metricValue: 1,
                                                            targetValue: 1,
                                                            isResolved: true
                                                        }]
                                                    };

                                                    return (
                                                        <div 
                                                            key={coord.user?._id}
                                                            onClick={() => setSelectedFlag(targetGroup)}
                                                            className={`group relative bg-white dark:bg-[#1a1f24] rounded-3xl p-6 border-2 transition-all cursor-pointer hover:shadow-xl ${
                                                                selectedFlag?.user?._id === coord.user?._id 
                                                                ? 'border-gray-900 dark:border-white shadow-lg translate-x-2' 
                                                                : hasFlags
                                                                    ? 'border-transparent dark:border-gray-800 hover:border-red-500/30'
                                                                    : 'border-transparent dark:border-gray-800 hover:border-green-500/30'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#131619] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400">
                                                                        {coord.user?.profileImage ? (
                                                                            <img src={coord.user.profileImage} alt="" className="w-full h-full object-cover rounded-2xl" />
                                                                        ) : (
                                                                            <FaUser />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-black text-lg text-gray-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                                                                            {coord.user?.name}
                                                                        </h4>
                                                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                                                                            {coord.role === 'Class_Coordinator' ? 'Class Coordinator' : 'Coordinator'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-2">
                                                                    {hasFlags ? (
                                                                        <span className="bg-red-500/15 text-red-500 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                                                                            <FaExclamationTriangle /> {coord.activeFlagsCount} Alert{coord.activeFlagsCount > 1 ? 's' : ''}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="bg-green-500/15 text-green-500 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                                            <FaCheckCircle /> Clean
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[10px] text-gray-400 font-mono tracking-tighter">#{coord.user?.employeeId}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                ) : displayFlags.length === 0 ? (
                                    <div className="bg-white dark:bg-[#1a1f24] rounded-3xl p-20 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
                                        <div className="bg-green-100 dark:bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FaCheckCircle className="text-green-500 text-4xl" />
                                        </div>
                                        <h3 className="text-2xl font-bold mb-2">No Active Red Flags</h3>
                                        <p className="text-gray-500">All personnel under this role are operating normally.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pr-2 max-h-[700px] overflow-y-auto custom-scrollbar">
                                        {displayFlags.map(flagGroup => (
                                            <div 
                                                key={flagGroup._id}
                                                onClick={() => setSelectedFlag(flagGroup)}
                                                className={`group relative bg-white dark:bg-[#1a1f24] rounded-3xl p-6 border-2 transition-all cursor-pointer hover:shadow-xl ${
                                                    selectedFlag?.user?._id === flagGroup.user?._id 
                                                    ? 'border-gray-900 dark:border-white shadow-lg translate-x-2' 
                                                    : flagGroup.severity === 'Low' || flagGroup.isResolved
                                                        ? 'border-transparent dark:border-gray-800 hover:border-green-500/30'
                                                        : 'border-transparent dark:border-gray-800 hover:border-red-500/30'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#131619] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400">
                                                            {flagGroup.user?.profileImage ? (
                                                                <img src={flagGroup.user.profileImage} alt="" className="w-full h-full object-cover rounded-2xl" />
                                                            ) : (
                                                                <FaUser />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-lg text-gray-900 dark:text-white group-hover:text-red-500 transition-colors">
                                                                {flagGroup.user?.name}
                                                            </h4>
                                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                                                                {flagGroup.role} - {flagGroup.centre?.centreName || 'No Center'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                            flagGroup.severity === 'Critical' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                                                            flagGroup.severity === 'High' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' :
                                                            'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                        }`}>
                                                            {flagGroup.severity === 'Low' || flagGroup.isResolved ? 'Clean' : flagGroup.severity}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-mono tracking-tighter">#{flagGroup.user?.employeeId}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-6 space-y-4">
                                                    {flagGroup.issuesList.map((issue, idx) => (
                                                        <div key={idx}>
                                                            <div className="flex justify-between items-end mb-2">
                                                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider truncate pr-4">{issue.issue}</p>
                                                                <p className="text-xs font-bold text-gray-500">
                                                                    {issue.role === 'teacher' ? (
                                                                        `${issue.metricValue} Correct`
                                                                    ) : (
                                                                        `${issue.metricValue}/${issue.targetValue}`
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="h-2.5 bg-gray-100 dark:bg-[#131619] rounded-full overflow-hidden p-0.5 border border-gray-200 dark:border-gray-800">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${
                                                                        issue.severity === 'Low' || issue.isResolved ? 'bg-gradient-to-r from-green-600 to-green-400' : 
                                                                        issue.severity === 'Critical' ? 'bg-gradient-to-r from-red-600 to-red-400' : 
                                                                        'bg-gradient-to-r from-orange-600 to-orange-400'
                                                                    }`}
                                                                    style={{ width: `${Math.min((issue.metricValue/(issue.targetValue || 1)) * 100 || 0, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{flagGroup.isVirtual ? (isToday ? 'Live Metric' : 'Period Performance') : 'Persistent Flag'}</p>
                                                    {isToday && (
                                                        <p className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                                                            {new Date(flagGroup.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Panel (Right) */}
                            <div className="lg:col-span-5">
                                <div className="sticky top-24">
                                    {!selectedFlag ? (
                                        <div className="bg-gray-100 dark:bg-[#131619] rounded-3xl p-12 text-center border border-dashed border-gray-300 dark:border-gray-700">
                                            <p className="text-gray-500 font-medium">Select a staff card to take action</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-[#1a1f24] rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-2xl relative overflow-hidden">
                                            {/* Decorative radial gradient */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                                            
                                            <div className="flex justify-between items-center mb-8 relative z-10">
                                                <div>
                                                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Action Panel</p>
                                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{selectedFlag.user?.name}</h3>
                                                    <p className="text-sm text-gray-500 font-bold">{selectedFlag.role} - {selectedFlag.centre?.centreName || 'No Center'}</p>
                                                </div>
                                                <div className="w-12 h-12 bg-gray-100 dark:bg-[#131619] rounded-2xl flex items-center justify-center">
                                                    {selectedFlag.severity === 'Low' || selectedFlag.isResolved ? <FaCheckCircle className="text-green-500" /> : <FaExclamationTriangle className="text-orange-500" />}
                                                </div>
                                            </div>

                                            <div className="space-y-6 mb-8 relative z-10">
                                                <div className="bg-gray-50 dark:bg-gray-800/20 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                                                    <div className="flex justify-between mb-2">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                                            selectedFlag.severity === 'Low' || selectedFlag.isResolved ? 'bg-green-500 text-white' :
                                                            selectedFlag.severity === 'Critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                                                        }`}>
                                                            {selectedFlag.severity === 'Low' || selectedFlag.isResolved ? 'Clean' : selectedFlag.severity}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                            Status: {selectedFlag.isResolved ? 'Resolved' : 'Live Check'}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-xs font-black mb-4 uppercase tracking-wide text-gray-900 dark:text-white">Metric Progress</p>
                                                    <div className="space-y-4">
                                                        {selectedFlag.issuesList.map((issue, idx) => (
                                                            <div key={idx} className="flex flex-col gap-2">
                                                                <div className="flex justify-between items-end">
                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{issue.type}</span>
                                                                    <span className="text-[10px] font-bold text-gray-900 dark:text-white">
                                                                        {Math.round((issue.metricValue/(issue.targetValue || 1)) * 100 || 0)}%
                                                                    </span>
                                                                </div>
                                                                <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full ${issue.severity === 'Low' || issue.isResolved ? 'bg-green-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${Math.min((issue.metricValue/(issue.targetValue || 1)) * 100 || 0, 100)}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Date-wise Class Compliance Breakdown */}
                                                {(selectedFlag.role === 'coordinator' || selectedFlag.role === 'Class_Coordinator') && (
                                                    <div className="bg-gray-50 dark:bg-gray-800/20 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                                                        <h4 className="text-xs font-black mb-4 uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                                                            <FaCalendarAlt className="text-cyan-500" /> Date-Wise Class Compliance
                                                        </h4>
                                                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {getDatesInRange(startDate, endDate).map(dateStr => {
                                                                const stats = selectedFlag.classBreakdown?.[dateStr] || { total: 0, started: 0, ended: 0, ongoing: 0 };
                                                                const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
                                                                    weekday: 'short',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric'
                                                                });

                                                                return (
                                                                    <div key={dateStr} className="bg-white dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 transition-all">
                                                                        <div className="flex justify-between items-center mb-3">
                                                                            <span className="text-xs font-black text-gray-800 dark:text-white">{formattedDate}</span>
                                                                            {stats.total > 0 ? (
                                                                                stats.ongoing > 0 ? (
                                                                                    <span className="bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                                                                        <FaExclamationTriangle className="animate-pulse" /> {stats.ongoing} Pending Closure
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                                                                        <FaCheckCircle /> All Closed
                                                                                    </span>
                                                                                )
                                                                            ) : (
                                                                                <span className="bg-gray-100 dark:bg-gray-800/40 text-gray-400 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md">
                                                                                    No Classes
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        {stats.total > 0 ? (
                                                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                                                <div className="bg-gray-50 dark:bg-[#1a1f24] border border-gray-100 dark:border-gray-850 p-2 rounded-xl">
                                                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Scheduled</p>
                                                                                    <p className="text-xs font-black text-gray-900 dark:text-white mt-0.5">{stats.total}</p>
                                                                                </div>
                                                                                <div className="bg-gray-50 dark:bg-[#1a1f24] border border-gray-100 dark:border-gray-850 p-2 rounded-xl">
                                                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Started</p>
                                                                                    <p className="text-xs font-black text-cyan-500 mt-0.5">{stats.started}</p>
                                                                                </div>
                                                                                <div className="bg-gray-50 dark:bg-[#1a1f24] border border-gray-100 dark:border-gray-850 p-2 rounded-xl">
                                                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ended</p>
                                                                                    <p className="text-xs font-black text-green-500 mt-0.5">{stats.ended}</p>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-[10px] text-gray-400 italic">No class was there on that centre.</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <RedFlagDetailsModal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title={modalTitle}
                data={getModalFlags(selectedCategory)}
                isDarkMode={isDarkMode}
                onResolve={handleResolve}
            />
        </Layout>
    );
};

export default RedFlagDesk;
