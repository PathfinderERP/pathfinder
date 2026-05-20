import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FaExclamationCircle, FaExclamationTriangle, FaRedo, FaCheckCircle, 
    FaFilter, FaInfoCircle, FaPaperPlane, FaCheck, FaBuilding, FaUser, FaWalking
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';

const RedFlagDesk = () => {
    const [flags, setFlags] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        critical: 0,
        high: 0,
        repeat: 0,
        recoveredToday: 0
    });
    const [selectedFlag, setSelectedFlag] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterCenter, setFilterCenter] = useState('All Centers');
    const [filterSeverity, setFilterSeverity] = useState('All Severity');
    const [activeRoleTab, setActiveRoleTab] = useState('Telecaller');
    const [centers, setCenters] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeStatFilter, setActiveStatFilter] = useState('Open Flags');

    const roles = ['Telecaller', 'Counsellor', 'Marketing', 'Center Incharge', 'Zonal Manager', 'Teacher', 'HR'];

    useEffect(() => {
        fetchData();
        fetchCenters();
    }, [filterCenter, filterSeverity, activeRoleTab, startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            // Map display role name to backend role name
            let backendRole = activeRoleTab;
            if (activeRoleTab === 'Center Incharge') backendRole = 'centerIncharge';
            if (activeRoleTab === 'Zonal Manager') backendRole = 'zonalManager';
            if (activeRoleTab === 'Class Coordinator') backendRole = 'Class_Coordinator';
            if (activeRoleTab === 'Teacher') backendRole = 'teacher';
            if (activeRoleTab === 'Counsellor') backendRole = 'counsellor';
            if (activeRoleTab === 'Telecaller') backendRole = 'telecaller';
            if (activeRoleTab === 'Marketing') backendRole = 'marketing';
            if (activeRoleTab === 'HR') backendRole = 'hr';

            const config = { 
                headers: { Authorization: `Bearer ${token}` },
                params: { 
                    startDate, 
                    endDate,
                    role: backendRole,
                    centreId: filterCenter !== 'All Centers' ? filterCenter : undefined,
                    severity: filterSeverity !== 'All Severity' ? filterSeverity : undefined
                }
            };

            // Fetch Flags with filters
            const flagsRes = await axios.get(`${import.meta.env.VITE_API_URL}/red-flags`, config);
            const data = flagsRes.data;
            setFlags(data);
            
            // Calculate Stats dynamically from the data
            const calculatedStats = {
                total: data.filter(f => !f.isResolved && f.severity !== 'Low').length,
                critical: data.filter(f => !f.isResolved && f.severity === 'Critical').length,
                high: data.filter(f => !f.isResolved && f.severity === 'High').length,
                medium: data.filter(f => !f.isResolved && f.severity === 'Medium').length,
                low: data.filter(f => f.isResolved || f.severity === 'Low').length
            };
            setStats(calculatedStats);

            setLastUpdated(new Date().toLocaleTimeString());
            
            if (data.length > 0) {
                const firstUser = data[0].user._id;
                const firstUserIssues = data.filter(f => f.user._id === firstUser);
                
                // Find highest severity among firstUserIssues for the initial selection
                let maxSeverity = 'Low';
                const severityRank = { 'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3 };
                firstUserIssues.forEach(f => {
                    if (severityRank[f.severity] > severityRank[maxSeverity]) {
                        maxSeverity = f.severity;
                    }
                });

                setSelectedFlag({
                    ...data[0],
                    severity: maxSeverity,
                    issuesList: firstUserIssues
                });
            } else {
                setSelectedFlag(null);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching red flag data:", error);
            toast.error("Failed to load red flag data");
            setLoading(false);
        }
    };

    const isToday = startDate === new Date().toISOString().split('T')[0] && endDate === new Date().toISOString().split('T')[0];

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
        try {
            const token = localStorage.getItem('token');
            const group = groupedFlags.find(g => g._id === groupOrFlagId);
            const issuesToResolve = group ? group.issuesList : [{ _id: groupOrFlagId }];
            
            for (const issue of issuesToResolve) {
                // If it's virtual, resolving it might not make sense unless backend handles it, but let's fire for all anyway just in case backend creates the virtual flag
                await axios.put(`${import.meta.env.VITE_API_URL}/red-flags/${issue._id}`, 
                    { isResolved: true }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            toast.success("Flag(s) marked as recovered");
            fetchData();
        } catch (error) {
            toast.error("Failed to update flag");
        }
    };

    const triggerGenerate = async () => {
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

    const groupedFlags = Object.values(flags.reduce((acc, flag) => {
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
        if (activeStatFilter === 'Open Flags') {
            return group.issuesList.some(i => !i.isResolved && i.severity !== 'Low');
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
            return group.issuesList.every(i => i.isResolved || i.severity === 'Low'); // Low means clean/resolved
        }
        return true;
    });

    return (
        <Layout activePage="Red Flag Desk">
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f1113] p-4 md:p-6 text-gray-800 dark:text-gray-200">
                
                {/* Header Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a1f24] to-[#2c343a] p-8 mb-8 shadow-2xl border border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Pathfinder ERP - Daily Control Tab</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">RedFlag Command Desk</h1>
                            <p className="text-gray-400 max-w-xl text-sm leading-relaxed">
                                One simple screen to catch who missed targets, who failed to update ERP, who needs escalation, and what action must happen before the day closes.
                            </p>
                        </div>
                        <div className="flex gap-4 items-center">
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
                            <div className="bg-[#131619] border border-gray-800 rounded-2xl p-4 min-w-[120px] shadow-inner">
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Mode</p>
                                <p className="text-xl font-bold text-white">Live</p>
                            </div>
                        </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Open Flags', value: stats.total, sub: 'Due Issues', icon: <FaExclamationCircle />, colorClass: 'text-blue-500 dark:text-blue-400', key: 'Open Flags' },
                        { label: 'Critical', value: stats.critical, sub: 'Same-day action', icon: <FaExclamationTriangle />, colorClass: 'text-red-500 dark:text-red-400', key: 'Critical' },
                        { label: 'High Risk', value: stats.high, sub: 'CI/ZM push', icon: <FaInfoCircle />, colorClass: 'text-orange-500 dark:text-orange-400', key: 'High Risk' },
                        { label: 'Medium Risk', value: stats.medium, sub: 'Monitor closely', icon: <FaInfoCircle />, colorClass: 'text-yellow-500 dark:text-yellow-400', key: 'Medium Risk' },
                        { label: 'Low Risk', value: stats.low, sub: 'Operating normally', icon: <FaCheckCircle />, colorClass: 'text-green-500 dark:text-green-400', key: 'Low Risk' }
                    ].map((stat, i) => (
                        <div 
                            key={i} 
                            onClick={() => setActiveStatFilter(stat.key)}
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

                {/* Filters and Tabs */}
                <div className="bg-white dark:bg-[#1a1f24] rounded-2xl p-4 mb-8 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                            <h2 className="text-xl font-bold mr-4">Today's Red Flags</h2>
                            <div className="relative group">
                                <select 
                                    value={filterCenter}
                                    onChange={(e) => setFilterCenter(e.target.value)}
                                    className="appearance-none bg-gray-100 dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-2.5 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
                                >
                                    <option>All Centers</option>
                                    {centers.map(c => <option key={c._id} value={c._id}>{c.centreName}</option>)}
                                </select>
                                <FaBuilding className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="relative group">
                                <select 
                                    value={filterSeverity}
                                    onChange={(e) => setFilterSeverity(e.target.value)}
                                    className="appearance-none bg-gray-100 dark:bg-[#131619] border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-2.5 pr-10 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
                                >
                                    <option>All Severity</option>
                                    <option>Critical</option>
                                    <option>High</option>
                                    <option>Medium</option>
                                    <option>Low</option>
                                </select>
                                <FaFilter className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]" />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 bg-gray-100 dark:bg-[#131619] p-1.5 rounded-2xl overflow-x-auto w-full lg:w-auto">
                            {roles.map(role => (
                                <button
                                    key={role}
                                    onClick={() => setActiveRoleTab(role)}
                                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        activeRoleTab === role 
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Flags List (Left) */}
                    <div className="lg:col-span-7 space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mb-4"></div>
                                <p className="text-sm font-bold animate-pulse">Scanning live ERP data...</p>
                            </div>
                        ) : displayFlags.length === 0 ? (
                            <div className="bg-white dark:bg-[#1a1f24] rounded-3xl p-20 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div className="bg-green-100 dark:bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FaCheckCircle className="text-green-500 text-4xl" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">System Clean</h3>
                                <p className="text-gray-500">No active records found for the selected filters.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 pr-2 max-h-[700px] overflow-y-auto custom-scrollbar">
                                {displayFlags.map(flagGroup => (
                                    <div 
                                        key={flagGroup._id}
                                        onClick={() => setSelectedFlag(flagGroup)}
                                        className={`group relative bg-white dark:bg-[#1a1f24] rounded-3xl p-6 border-2 transition-all cursor-pointer hover:shadow-xl ${
                                            selectedFlag?._id === flagGroup._id 
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

                                        {/* Walk-In Progress Bar – always shown for telecaller & counsellor */}
                                        {['telecaller', 'counsellor'].includes(flagGroup.role?.toLowerCase()) && (() => {
                                            const walkInIssue = flagGroup.issuesList.find(i => i.type === 'walkin');
                                            const walkInCount = walkInIssue?.metricValue ?? 0;
                                            const walkInTarget = walkInIssue?.targetValue ?? 5;
                                            const pct = Math.min(Math.round((walkInCount / (walkInTarget || 1)) * 100), 100);
                                            const isGoalMet = walkInCount >= walkInTarget;
                                            return (
                                                <div className="mt-4 mb-4">
                                                    <div className="flex justify-between items-end mb-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <FaWalking className="text-blue-500" size={12} />
                                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Walk-Ins Progress</p>
                                                        </div>
                                                        <p className={`text-xs font-black ${isGoalMet ? 'text-green-500' : 'text-gray-400'}`}>
                                                            {walkInCount} / {walkInTarget}
                                                        </p>
                                                    </div>
                                                    <div className="relative h-3 bg-gray-100 dark:bg-[#131619] rounded-full overflow-hidden p-0.5 border border-gray-200 dark:border-gray-800">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${
                                                                isGoalMet ? 'bg-gradient-to-r from-green-600 to-green-400' :
                                                                pct >= 60 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                                                                'bg-gradient-to-r from-blue-600 to-blue-400'
                                                            }`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                        
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
                                    <p className="text-gray-500 font-medium">Select a flag card to view details and take action</p>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-[#1a1f24] rounded-3xl p-8 border border-gray-200 dark:border-gray-800 shadow-2xl relative overflow-hidden">
                                    {/* Glass effect bg */}
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
                                                            <span className="text-[10px] font-bold text-gray-900 dark:text-white">{Math.round((issue.metricValue/(issue.targetValue || 1)) * 100 || 0)}%</span>
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

                                            {/* Walk-In Progress Bar in Action Panel – always shown for telecaller & counsellor */}
                                            {['telecaller', 'counsellor'].includes(selectedFlag.role?.toLowerCase()) && (() => {
                                                const walkInIssue = selectedFlag.issuesList.find(i => i.type === 'walkin');
                                                const walkInCount = walkInIssue?.metricValue ?? 0;
                                                const walkInTarget = walkInIssue?.targetValue ?? 5;
                                                const pct = Math.min(Math.round((walkInCount / (walkInTarget || 1)) * 100), 100);
                                                const isGoalMet = walkInCount >= walkInTarget;
                                                return (
                                                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                        <div className="flex justify-between items-end mb-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <FaWalking className="text-blue-500" size={12} />
                                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Walk-Ins Progress</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-gray-900 dark:text-white">{pct}% ({walkInCount}/{walkInTarget})</span>
                                                        </div>
                                                        <div className="h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${isGoalMet ? 'bg-green-500' : 'bg-blue-500'}`}
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default RedFlagDesk;
