import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FaExclamationCircle, FaExclamationTriangle, FaRedo, FaCheckCircle, 
    FaFilter, FaInfoCircle, FaPaperPlane, FaCheck, FaBuilding, FaUser 
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

    const roles = ['Telecaller', 'Counsellor', 'Marketing', 'Center Incharge', 'Zonal Manager', 'Class Coordinator', 'Teacher', 'HR'];

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
                repeat: data.filter(f => !f.isResolved && f.repeatCount > 0).length,
                recoveredToday: data.filter(f => f.isResolved || f.severity === 'Low').length
            };
            setStats(calculatedStats);

            setLastUpdated(new Date().toLocaleTimeString());
            
            if (data.length > 0) {
                setSelectedFlag(data[0]);
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

    const handleResolve = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL}/red-flags/${id}`, 
                { isResolved: true }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Flag marked as recovered");
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
                        { label: 'Open Flags', value: stats.total, sub: 'Due Issues', icon: <FaExclamationCircle />, color: 'blue' },
                        { label: 'Critical', value: stats.critical, sub: 'Same-day action', icon: <FaExclamationTriangle />, color: 'red' },
                        { label: 'High Risk', value: stats.high, sub: 'CI/ZM push', icon: <FaInfoCircle />, color: 'orange' },
                        { label: 'Repeat', value: stats.repeat, sub: '2+ days missed', icon: <FaRedo />, color: 'purple' },
                        { label: 'Recovered', value: stats.recoveredToday, sub: 'Closed today', icon: <FaCheckCircle />, color: 'green' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white dark:bg-[#1a1f24] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{stat.label}</p>
                                <span className={`text-${stat.color}-500 text-lg`}>{stat.icon}</span>
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
                        ) : flags.length === 0 ? (
                            <div className="bg-white dark:bg-[#1a1f24] rounded-3xl p-20 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
                                <div className="bg-green-100 dark:bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FaCheckCircle className="text-green-500 text-4xl" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">System Clean</h3>
                                <p className="text-gray-500">No active records found for the selected filters.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 pr-2 max-h-[700px] overflow-y-auto custom-scrollbar">
                                {flags.map(flag => (
                                    <div 
                                        key={flag._id}
                                        onClick={() => setSelectedFlag(flag)}
                                        className={`group relative bg-white dark:bg-[#1a1f24] rounded-3xl p-6 border-2 transition-all cursor-pointer hover:shadow-xl ${
                                            selectedFlag?._id === flag._id 
                                            ? 'border-gray-900 dark:border-white shadow-lg translate-x-2' 
                                            : flag.severity === 'Low' || flag.isResolved
                                                ? 'border-transparent dark:border-gray-800 hover:border-green-500/30'
                                                : 'border-transparent dark:border-gray-800 hover:border-red-500/30'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#131619] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400">
                                                    {flag.user?.profileImage ? (
                                                        <img src={flag.user.profileImage} alt="" className="w-full h-full object-cover rounded-2xl" />
                                                    ) : (
                                                        <FaUser />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg text-gray-900 dark:text-white group-hover:text-red-500 transition-colors">
                                                        {flag.user?.name}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                                                        {flag.role} - {flag.centre?.centreName || 'No Center'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    flag.severity === 'Critical' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                                                    flag.severity === 'High' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' :
                                                    'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                }`}>
                                                    {flag.severity === 'Low' || flag.isResolved ? 'Clean' : flag.severity}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-mono tracking-tighter">#{flag.user?.employeeId}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-6">
                                            <div className="flex justify-between items-end mb-2">
                                                <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider truncate pr-4">{flag.issue}</p>
                                                <p className="text-xs font-bold text-gray-500">
                                                    {flag.role === 'teacher' ? (
                                                        `${flag.metricValue} Correct`
                                                    ) : (
                                                        `${flag.metricValue}/${flag.targetValue}`
                                                    )}
                                                </p>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 dark:bg-[#131619] rounded-full overflow-hidden p-0.5 border border-gray-200 dark:border-gray-800">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-1000 ${
                                                        flag.severity === 'Low' || flag.isResolved ? 'bg-gradient-to-r from-green-600 to-green-400' : 
                                                        flag.severity === 'Critical' ? 'bg-gradient-to-r from-red-600 to-red-400' : 
                                                        'bg-gradient-to-r from-orange-600 to-orange-400'
                                                    }`}
                                                    style={{ width: `${Math.min((flag.metricValue/(flag.targetValue || 1)) * 100 || 0, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{flag.isVirtual ? (isToday ? 'Live Metric' : 'Period Performance') : 'Persistent Flag'}</p>
                                            {isToday && (
                                                <p className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                                                    {new Date(flag.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                            <p className="text-xs font-black mb-2 uppercase tracking-wide text-gray-900 dark:text-white">Metric Progress</p>
                                            <div className="flex justify-between items-center gap-4">
                                                <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${selectedFlag.severity === 'Low' || selectedFlag.isResolved ? 'bg-green-500' : 'bg-red-500'}`}
                                                        style={{ width: `${(selectedFlag.metricValue/(selectedFlag.targetValue || 1)) * 100 || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-900 dark:text-white">{Math.round((selectedFlag.metricValue/(selectedFlag.targetValue || 1)) * 100 || 0)}%</span>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">What Went Wrong</p>
                                            <div className="bg-gray-50 dark:bg-[#131619] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {selectedFlag.whatWentWrong || "Details not specified"}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-2">Business Impact</p>
                                            <div className="bg-gray-50 dark:bg-[#131619] p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {selectedFlag.businessImpact || "Details not specified"}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Recovery Action</p>
                                            <div className="bg-red-50 dark:bg-red-500/5 p-4 rounded-2xl border border-red-100 dark:border-red-500/20">
                                                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                                                    {selectedFlag.recoveryAction || "Corrective action needed immediately"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Owner</p>
                                                <p className="text-xs font-bold">{selectedFlag.owner || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Escalation</p>
                                                <p className="text-xs font-bold text-red-600 dark:text-red-400">{selectedFlag.escalation || "Immediate"}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative z-10">
                                        <button 
                                            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-red-600/20 transition-all active:scale-95"
                                        >
                                            <FaPaperPlane /> Send Escalation
                                        </button>
                                        <button 
                                            onClick={() => handleResolve(selectedFlag._id)}
                                            className="w-full bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-700 dark:text-green-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 border border-green-200 dark:border-green-500/30 transition-all active:scale-95"
                                        >
                                            <FaCheck /> Mark Recovery Done
                                        </button>
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
