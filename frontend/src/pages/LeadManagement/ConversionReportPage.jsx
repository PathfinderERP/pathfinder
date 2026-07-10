import React, { useState, useEffect, useCallback } from 'react';
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";
import { FaChartLine, FaCalendarAlt, FaSyncAlt, FaBuilding, FaUserAlt, FaFilter, FaBullhorn, FaTimes, FaGraduationCap, FaUserCheck } from 'react-icons/fa';

export default function ConversionReportPage() {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const apiUrl = import.meta.env.VITE_API_URL;

    // Filters state
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        centre: [],
        leadResponsibility: [],
        source: []
    });

    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    // Admitted detail modal
    const [admittedModal, setAdmittedModal] = useState({ open: false, leadType: null, data: [], loading: false });

    // Dropdown options
    const [allowedCentres, setAllowedCentres] = useState([]);
    const [telecallers, setTelecallers] = useState([]);
    const [sources, setSources] = useState([]);

    // Fetch allowed centres based on user profile
    const fetchAllowedCentres = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const userResponse = await fetch(`${apiUrl}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!userResponse.ok) return;
            const responseData = await userResponse.json();
            const currentUser = responseData.user;

            if (currentUser.role === 'superAdmin') {
                const response = await fetch(`${apiUrl}/centre`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const centres = await response.json();
                setAllowedCentres(centres.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || "")));
            } else {
                const userCentres = (currentUser.centres || []).sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setAllowedCentres(userCentres);
            }
        } catch (error) {
            console.error("Error fetching allowed centres:", error);
        }
    }, [apiUrl]);

    // Fetch telecallers and sources
    const fetchFilterOptions = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");

            // Fetch sources
            const [sourceResponse, distinctSourceResponse, userResponse] = await Promise.all([
                fetch(`${apiUrl}/source`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/lead-management/distinct-sources`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiUrl}/superAdmin/getAllUsers`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (sourceResponse.ok && distinctSourceResponse.ok) {
                const sourceData = await sourceResponse.json();
                const distinctSourceData = await distinctSourceResponse.json();

                const masterSources = sourceData.sources || [];
                const masterSourceNames = new Set(masterSources.map(s => s.sourceName?.toLowerCase()));
                const extraSources = (distinctSourceData.sources || [])
                    .filter(s => !masterSourceNames.has(s.toLowerCase()))
                    .map(s => ({ sourceName: s }));

                setSources([...masterSources, ...extraSources].sort((a, b) => (a.sourceName || "").localeCompare(b.sourceName || "")));
            }

            if (userResponse.ok) {
                const userData = await userResponse.json();
                const leadUsers = (userData.users || []).filter(u => {
                    const r = u.role?.toLowerCase()?.replace(/\s+/g, '') || '';
                    const isActive = u.isActive !== false;
                    const allowedRoles = ['telecaller', 'centralizedtelecaller', 'counsellor', 'marketing', 'rm', 'centerincharge', 'centreincharge', 'zonalmanager', 'hod', 'superadmin', 'assistantzonalmanager', 'assistantcenterincharge'];
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
                        value: isDuplicate ? displayName : u.name
                    };
                });
                formattedUsers.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
                setTelecallers(formattedUsers);
            }
        } catch (error) {
            console.error("Error fetching filters:", error);
        }
    }, [apiUrl]);

    // Fetch report data from endpoint
    const fetchReport = useCallback(async () => {
        // Require at least one date to be set to prevent full-collection scan timeouts
        if (!filters.fromDate && !filters.toDate) {
            toast.warn("Please select a date range before syncing. Running without a date filter may cause timeouts on large datasets.");
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (filters.fromDate) params.append("fromDate", filters.fromDate);
            if (filters.toDate) params.append("toDate", filters.toDate);

            if (filters.centre.length > 0) {
                filters.centre.forEach(c => params.append("centre", c.value));
            }
            if (filters.leadResponsibility.length > 0) {
                filters.leadResponsibility.forEach(lr => params.append("leadResponsibility", lr.value));
            }
            if (filters.source.length > 0) {
                filters.source.forEach(s => params.append("source", s.value));
            }

            const response = await fetch(`${apiUrl}/lead-management/stats/conversion-report?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                toast.error("Failed to fetch conversion report");
                return;
            }

            const data = await response.json();
            setReportData(data.conversionStats || []);
            setHasFetched(true);
        } catch (error) {
            console.error("Error fetching conversion report:", error);
            toast.error("Network error fetching conversion report");
        } finally {
            setLoading(false);
        }
    }, [apiUrl, filters]);

    // Initialize allowed centres & filter parameters
    useEffect(() => {
        fetchAllowedCentres();
        fetchFilterOptions();
    }, [fetchAllowedCentres, fetchFilterOptions]);


    // NOTE: fetchReport is called explicitly via the Sync Report button only.
    // No auto-fetch on mount or filter changes to avoid slow heavy aggregation on page load.

    // Fetch the detailed list of admitted leads for a specific leadType
    const fetchAdmittedDetails = useCallback(async (leadType) => {
        setAdmittedModal({ open: true, leadType, data: [], loading: true });
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (filters.fromDate) params.append("fromDate", filters.fromDate);
            if (filters.toDate) params.append("toDate", filters.toDate);
            if (leadType) params.append("leadType", leadType);
            filters.centre.forEach(c => params.append("centre", c.value));
            filters.leadResponsibility.forEach(lr => params.append("leadResponsibility", lr.value));
            filters.source.forEach(s => params.append("source", s.value));

            const response = await fetch(`${apiUrl}/lead-management/stats/conversion-report/admitted-leads?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch admitted leads");
            const data = await response.json();
            setAdmittedModal(prev => ({ ...prev, data: data.admittedLeads || [], loading: false }));
        } catch (err) {
            console.error("Error fetching admitted leads:", err);
            toast.error("Failed to load admitted lead details");
            setAdmittedModal(prev => ({ ...prev, loading: false }));
        }
    }, [apiUrl, filters]);


    // Preset filters helper
    const setDatePreset = (preset) => {
        const today = new Date().toISOString().split('T')[0];
        if (preset === 'today') {
            setFilters(prev => ({ ...prev, fromDate: today, toDate: today }));
        } else if (preset === 'yesterday') {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            setFilters(prev => ({ ...prev, fromDate: yesterday, toDate: yesterday }));
        } else if (preset === 'last7days') {
            const last7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            setFilters(prev => ({ ...prev, fromDate: last7, toDate: today }));
        } else if (preset === 'lastMonth') {
            const last30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
            setFilters(prev => ({ ...prev, fromDate: last30, toDate: today }));
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            fromDate: "",
            toDate: "",
            centre: [],
            leadResponsibility: [],
            source: []
        });
    };

    // Calculate metrics
    const totalLeads = reportData.reduce((sum, r) => sum + r.total, 0);
    const totalCounselling = reportData.reduce((sum, r) => sum + r.counselled, 0);
    const totalAdmitted = reportData.reduce((sum, r) => sum + r.admitted, 0);
    const overallCounsellingPercent = totalLeads > 0 ? ((totalCounselling / totalLeads) * 100).toFixed(1) : "0.0";
    const overallAdmissionPercent = totalLeads > 0 ? ((totalAdmitted / totalLeads) * 100).toFixed(1) : "0.0";

    return (
        <Layout activePage="Lead Management">
            <div className={`p-6 space-y-6 ${isDarkMode ? 'bg-[#0f1114] text-white' : 'bg-gray-50 text-gray-900'} min-h-screen`}>

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
                    <div className="flex items-center gap-3">
                        <span className="p-3 bg-cyan-500/10 text-cyan-500 rounded-[2px]">
                            <FaChartLine size={20} />
                        </span>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight italic">
                                Lead <span className="text-cyan-500">Conversion Report</span>
                            </h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                                Summary analysis of lead type conversions to counselling and final admission
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={fetchReport}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-[2px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500 hover:text-black' : 'bg-white border-gray-200 hover:border-cyan-500 text-cyan-600'}`}
                    >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} /> {loading ? 'Fetching...' : 'Sync Report'}
                    </button>
                </div>

                {/* Date Presets and Filters */}
                <div className={`p-6 border rounded-[2px] transition-all space-y-5 ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Preset buttons */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setDatePreset('today')}
                                className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${filters.fromDate === new Date().toISOString().split('T')[0] && filters.toDate === new Date().toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setDatePreset('yesterday')}
                                className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${filters.fromDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] && filters.toDate === new Date(Date.now() - 86400000).toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                            >
                                Yesterday
                            </button>
                            <button
                                onClick={() => setDatePreset('last7days')}
                                className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${filters.fromDate === new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] && filters.toDate === new Date().toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                            >
                                Last 7 Days
                            </button>
                            <button
                                onClick={() => setDatePreset('lastMonth')}
                                className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border ${filters.fromDate === new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] && filters.toDate === new Date().toISOString().split('T')[0] ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : (isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-500')}`}
                            >
                                Last Month
                            </button>
                            <button
                                onClick={resetFilters}
                                className={`px-4 py-2 rounded-[2px] text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${isDarkMode ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-500 hover:text-white'}`}
                            >
                                <FaSyncAlt size={8} /> Reset Filters
                            </button>
                        </div>

                        {/* Custom Dates */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>From</span>
                                <input
                                    type="date"
                                    value={filters.fromDate}
                                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                    className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all w-full sm:w-auto ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>To</span>
                                <input
                                    type="date"
                                    value={filters.toDate}
                                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                    className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-bold outline-none transition-all w-full sm:w-auto ${isDarkMode ? 'bg-[#0a0a0b] border-gray-800 text-white focus:border-cyan-500' : 'bg-white border-gray-200 text-gray-900 focus:border-cyan-500'}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dropdown Filters Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                <FaBuilding size={9} /> Centre
                            </label>
                            <CustomMultiSelect
                                options={allowedCentres.map(c => ({ value: c._id, label: c.centreName || c.name }))}
                                value={filters.centre}
                                onChange={(selected) => handleFilterChange('centre', selected)}
                                placeholder="All Centres"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                <FaUserAlt size={9} /> Lead Responsibility
                            </label>
                            <CustomMultiSelect
                                options={telecallers.map(t => ({ value: t.value, label: t.displayName }))}
                                value={filters.leadResponsibility}
                                onChange={(selected) => handleFilterChange('leadResponsibility', selected)}
                                placeholder="All Responsibilities"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                <FaBullhorn size={9} /> Lead Source
                            </label>
                            <CustomMultiSelect
                                options={sources.map(s => ({ value: s.sourceName, label: s.sourceName }))}
                                value={filters.source}
                                onChange={(selected) => handleFilterChange('source', selected)}
                                placeholder="All Sources"
                                theme={isDarkMode ? 'dark' : 'light'}
                            />
                        </div>
                    </div>
                </div>

                {/* Date Required Warning Banner */}
                {!filters.fromDate && !filters.toDate && (
                    <div className={`flex items-center gap-3 px-5 py-3 rounded-[2px] border text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                        <span className="text-amber-500 text-base">⚠</span>
                        Select a date range above, then click <span className={`font-black mx-1 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Sync Report</span> to fetch conversion data.
                        Running without a date filter may be very slow on large datasets.
                    </div>
                )}

                {/* Scorecards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-5 border rounded-[2px] ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Total Leads in selection</span>
                        <h4 className="text-2xl font-black italic tracking-tighter mt-1">{loading ? '...' : totalLeads}</h4>
                    </div>
                    <div className={`p-5 border rounded-[2px] ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500">Converted to Counselling</span>
                        <h4 className="text-2xl font-black italic tracking-tighter text-cyan-500 mt-1">{loading ? '...' : totalCounselling}</h4>
                    </div>
                    <div className={`p-5 border rounded-[2px] ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Converted to Admitted</span>
                        <h4 className="text-2xl font-black italic tracking-tighter text-emerald-500 mt-1">{loading ? '...' : totalAdmitted}</h4>
                    </div>
                    <div className={`p-5 border rounded-[2px] ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Overall Conversion Rate</span>
                        <h4 className="text-2xl font-black italic tracking-tighter text-amber-500 mt-1">
                            {loading ? '...' : `${overallAdmissionPercent}%`}
                        </h4>
                    </div>
                </div>

                {/* Table Content */}
                <div className={`p-6 border rounded-[2px] ${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="overflow-x-auto custom-scrollbar border rounded-[2px] overflow-hidden border-gray-200 dark:border-gray-800">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isDarkMode ? 'border-gray-800 bg-[#0a0a0b]' : 'border-gray-150 bg-gray-50'}`}>
                                    <th className={`px-6 py-4 text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lead Type</th>
                                    <th className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Leads</th>
                                    <th className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Converted to Counselling</th>
                                    <th className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Counselling %</th>
                                    <th className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Converted to Admitted</th>
                                    <th className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admission %</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-200'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-xs text-gray-500 uppercase tracking-widest font-black animate-pulse">
                                            Aggregating Conversion Stats...
                                        </td>
                                    </tr>
                                ) : !hasFetched ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <FaChartLine size={28} className="text-cyan-500/40" />
                                                <p className={`text-[11px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    Set your filters and click <span className="text-cyan-500">Sync Report</span> to load data
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : reportData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-xs text-gray-500 uppercase tracking-widest font-black">
                                            No conversion data found for selected filters
                                        </td>
                                    </tr>
                                ) : (
                                    ['HOT LEAD', 'WARM LEAD', 'COLD LEAD', 'NEUTRAL LEAD', 'INVALID LEAD'].map(type => {
                                        const record = reportData.find(r => r._id === type) || { total: 0, counselled: 0, admitted: 0 };
                                        const counselPercent = record.total > 0 ? ((record.counselled / record.total) * 100).toFixed(1) : "0.0";
                                        const admitPercent = record.total > 0 ? ((record.admitted / record.total) * 100).toFixed(1) : "0.0";

                                        const typeColors = {
                                            "HOT LEAD": "text-red-500 font-extrabold",
                                            "WARM LEAD": "text-orange-500 font-extrabold",
                                            "COLD LEAD": "text-blue-500 font-extrabold",
                                            "NEUTRAL LEAD": "text-purple-500 font-extrabold",
                                            "INVALID LEAD": "text-gray-500 font-extrabold"
                                        };

                                        return (
                                            <tr key={type} className={`hover:bg-cyan-500/[0.02] transition-colors ${isDarkMode ? 'bg-[#131619]' : 'bg-white'}`}>
                                                <td className="px-6 py-4">
                                                    <span className={`text-sm font-black uppercase tracking-wider ${typeColors[type] || 'text-gray-500'}`}>{type}</span>
                                                </td>
                                                <td className={`px-6 py-4 text-center text-sm font-black italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{record.total}</td>
                                                <td className={`px-6 py-4 text-center text-sm font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{record.counselled}</td>
                                                <td className="px-6 py-4 text-center text-sm font-black">
                                                    <span className={`px-2.5 py-0.5 rounded-[2px] ${isDarkMode ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border border-cyan-200 text-cyan-600'}`}>
                                                        {counselPercent}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => record.admitted > 0 && fetchAdmittedDetails(type)}
                                                        className={`text-sm font-black transition-all rounded px-2 py-0.5 ${
                                                            record.admitted > 0
                                                                ? (isDarkMode
                                                                    ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer underline underline-offset-2'
                                                                    : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer underline underline-offset-2')
                                                                : (isDarkMode ? 'text-gray-600 cursor-default' : 'text-gray-400 cursor-default')
                                                        }`}
                                                        title={record.admitted > 0 ? `View ${record.admitted} admitted lead(s)` : ''}
                                                        disabled={record.admitted === 0}
                                                    >
                                                        {record.admitted}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-black">
                                                    <span className={`px-2.5 py-0.5 rounded-[2px] ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'}`}>
                                                        {admitPercent}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                {!loading && reportData.length > 0 && (
                                    <tr className={`font-black ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-cyan-500/[0.03]'}`}>
                                        <td className={`px-6 py-4 text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>OVERALL SUMMARY</td>
                                        <td className={`px-6 py-4 text-center text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalLeads}</td>
                                        <td className={`px-6 py-4 text-center text-sm font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{totalCounselling}</td>
                                        <td className={`px-6 py-4 text-center text-sm font-black ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{overallCounsellingPercent}%</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => totalAdmitted > 0 && fetchAdmittedDetails(null)}
                                                className={`text-sm font-black transition-all rounded px-2 py-0.5 ${
                                                    totalAdmitted > 0
                                                        ? (isDarkMode
                                                            ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer underline underline-offset-2'
                                                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer underline underline-offset-2')
                                                        : (isDarkMode ? 'text-gray-600 cursor-default' : 'text-gray-400 cursor-default')
                                                }`}
                                                title={totalAdmitted > 0 ? `View all ${totalAdmitted} admitted leads` : ''}
                                                disabled={totalAdmitted === 0}
                                            >
                                                {totalAdmitted}
                                            </button>
                                        </td>
                                        <td className={`px-6 py-4 text-center text-sm font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{overallAdmissionPercent}%</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Admitted Leads Detail Modal */}
            {admittedModal.open && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
                    <div className={`relative w-full max-w-5xl max-h-[85vh] flex flex-col rounded-[2px] border shadow-2xl ${
                        isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-white border-gray-200'
                    }`}>
                        {/* Modal Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${
                            isDarkMode ? 'border-gray-800 bg-[#0a0a0b]' : 'border-gray-200 bg-gray-50'
                        }`}>
                            <div className="flex items-center gap-3">
                                <span className="p-2 bg-emerald-500/10 text-emerald-500 rounded-[2px]">
                                    <FaGraduationCap size={16} />
                                </span>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider">
                                        Admitted Leads
                                        {admittedModal.leadType && (
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded font-black ${
                                                admittedModal.leadType === 'HOT LEAD' ? 'bg-red-500/10 text-red-500' :
                                                admittedModal.leadType === 'WARM LEAD' ? 'bg-orange-500/10 text-orange-500' :
                                                admittedModal.leadType === 'COLD LEAD' ? 'bg-blue-500/10 text-blue-500' :
                                                admittedModal.leadType === 'NEUTRAL LEAD' ? 'bg-purple-500/10 text-purple-500' :
                                                'bg-gray-500/10 text-gray-500'
                                            }`}>{admittedModal.leadType}</span>
                                        )}
                                    </h3>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${
                                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                        {admittedModal.loading ? 'Loading...' : `${admittedModal.data.length} record(s) found`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setAdmittedModal({ open: false, leadType: null, data: [], loading: false })}
                                className={`p-2 rounded-[2px] transition-all ${
                                    isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                <FaTimes size={14} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-auto flex-1">
                            {admittedModal.loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="flex flex-col items-center gap-3">
                                        <FaSyncAlt size={24} className="text-emerald-500 animate-spin" />
                                        <p className={`text-xs font-black uppercase tracking-widest animate-pulse ${
                                            isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                        }`}>Fetching admission details...</p>
                                    </div>
                                </div>
                            ) : admittedModal.data.length === 0 ? (
                                <div className="flex items-center justify-center py-16">
                                    <p className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                        No admitted leads found for selected filters
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`border-b sticky top-0 ${
                                            isDarkMode ? 'border-gray-800 bg-[#0a0a0b]' : 'border-gray-200 bg-gray-50'
                                        }`}>
                                            {['Lead Name', 'Centre', 'Enroll No.', 'Class', 'Course', 'Exam Tag', 'Session', 'Down Payment', 'Adm. Date', 'Admitted By'].map(col => (
                                                <th key={col} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${
                                                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                        {admittedModal.data.map((row, idx) => (
                                            <tr key={idx} className={`hover:bg-emerald-500/[0.02] transition-colors ${
                                                isDarkMode ? 'bg-[#131619]' : 'bg-white'
                                            }`}>
                                                <td className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${
                                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                                }`}>{row.leadName}</td>
                                                <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>{row.centre}</td>
                                                <td className={`px-4 py-3 text-xs font-black whitespace-nowrap ${
                                                    isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                                                }`}>{row.admissionNumber}</td>
                                                <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>{row.class}</td>
                                                <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap max-w-[160px] truncate ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`} title={row.course}>{row.course}</td>
                                                <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>{row.examTag}</td>
                                                <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>{row.session}</td>
                                                <td className={`px-4 py-3 text-sm font-black whitespace-nowrap ${
                                                    isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                                }`}>
                                                    ₹{row.admissionAmount?.toLocaleString('en-IN') || '0'}
                                                </td>
                                                <td className={`px-4 py-3 text-xs font-semibold whitespace-nowrap ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                                                }`}>
                                                    {row.admissionDate
                                                        ? new Date(row.admissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-[2px] ${
                                                        isDarkMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-200'
                                                    }`}>
                                                        <FaUserCheck size={8} />
                                                        {row.admittedBy}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
