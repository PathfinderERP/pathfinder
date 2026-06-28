import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { 
    FaChevronLeft, FaSearch, FaFilter, FaCalendarAlt, FaBullseye, 
    FaCrown, FaUpload, FaPlusCircle, FaComments, FaClock, FaListOl, FaUserTie
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

// Custom Multi-Select Dropdown with search filter
const MultiSelectDropdown = ({ label, options, selectedValues, onChange, placeholder = "Select options" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (value) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    const toggleAll = () => {
        if (selectedValues.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(o => o.value));
        }
    };

    const filteredOptions = options.filter(o => 
        (o.label || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative flex-1 min-w-[200px]" ref={dropdownRef}>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left bg-[#131619] border border-gray-800 rounded-[2px] p-2.5 text-xs text-white flex justify-between items-center hover:border-cyan-500/40 transition-colors"
            >
                <span className="truncate">
                    {selectedValues.length === 0 
                        ? placeholder 
                        : selectedValues.length === options.length 
                            ? "All Selected" 
                            : `${selectedValues.length} Selected`}
                </span>
                <span className="text-[10px] text-gray-500 font-black">▼</span>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#131619] border border-gray-800 rounded-[2px] shadow-2xl p-3 max-h-64 overflow-y-auto custom-scrollbar">
                    {/* Search field */}
                    <div className="flex items-center gap-2 border border-gray-800 bg-[#0a0a0b] px-2 py-1.5 rounded-[2px] mb-2.5">
                        <FaSearch size={10} className="text-gray-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search..."
                            className="bg-transparent border-none outline-none text-xs text-white placeholder-gray-600 w-full"
                        />
                    </div>

                    {/* Toggle All */}
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-left w-full text-[10px] text-cyan-400 font-bold uppercase hover:underline mb-2 pb-2 border-b border-gray-800/50 flex justify-between items-center"
                    >
                        <span>{selectedValues.length === options.length ? "Deselect All" : "Select All"}</span>
                        <span>{selectedValues.length}/{options.length}</span>
                    </button>

                    {/* Options list */}
                    <div className="space-y-1.5">
                        {filteredOptions.length === 0 ? (
                            <div className="text-[10px] text-gray-500 italic p-2">No options found</div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isChecked = selectedValues.includes(opt.value);
                                return (
                                    <label
                                        key={opt.value}
                                        className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white p-1 hover:bg-gray-800/30 rounded-[1px] transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleOption(opt.value)}
                                            className="accent-cyan-500 w-3 h-3 cursor-pointer"
                                        />
                                        <span className="truncate">{opt.label}</span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CEOLeadAnalytics() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [filters, setFilters] = useState({
        centres: [],
        sources: [],
        users: [],
        responsibilities: []
    });

    // Selected filter values
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split("T")[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedSources, setSelectedSources] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedResponsibilities, setSelectedResponsibilities] = useState([]);

    // UI State
    const [activeTab, setActiveTab] = useState("overall");
    const [statusSortField, setStatusSortField] = useState("totalCount");
    const [statusSortOrder, setStatusSortOrder] = useState("desc");

    useEffect(() => {
        fetchAnalytics();
    }, [startDate, endDate, selectedCentres, selectedSources, selectedUsers, selectedResponsibilities]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            // Assemble query parameters
            const params = new URLSearchParams();
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            
            if (selectedCentres.length > 0) params.append("centre", selectedCentres.join(","));
            if (selectedSources.length > 0) params.append("source", selectedSources.join(","));
            if (selectedUsers.length > 0) params.append("createdBy", selectedUsers.join(","));
            if (selectedResponsibilities.length > 0) params.append("leadResponsibility", selectedResponsibilities.join(","));

            const res = await axios.get(`${import.meta.env.VITE_API_URL}/ceo/lead-analytics?${params.toString()}`, { headers });
            
            if (res.data?.success) {
                setData(res.data.data);
                
                // Populate filter selections lists if not initialized
                if (filters.centres.length === 0) {
                    setFilters({
                        centres: res.data.filters?.centres?.map(c => ({ value: c._id, label: c.centreName })) || [],
                        sources: res.data.filters?.sources?.map(s => ({ value: s.sourceName, label: s.sourceName })) || [],
                        users: res.data.filters?.users?.map(u => ({ value: u._id, label: u.name })) || [],
                        responsibilities: res.data.filters?.responsibilities?.map(r => ({ value: r, label: r })) || []
                    });
                }
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching CEO lead analytics:", error);
            setLoading(false);
        }
    };

    // Reset filters
    const handleResetFilters = () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        setStartDate(d.toISOString().split("T")[0]);
        setEndDate(new Date().toISOString().split("T")[0]);
        setSelectedCentres([]);
        setSelectedSources([]);
        setSelectedUsers([]);
        setSelectedResponsibilities([]);
    };

    // Sort handle for Telecaller Status matrix
    const handleSortStatusTable = (field) => {
        if (statusSortField === field) {
            setStatusSortOrder(statusSortOrder === "asc" ? "desc" : "asc");
        } else {
            setStatusSortField(field);
            setStatusSortOrder("desc");
        }
    };

    const getSortedStatusData = () => {
        if (!data?.typeLeaderboard) return [];
        return [...data.typeLeaderboard].sort((a, b) => {
            const valA = a[statusSortField] || 0;
            const valB = b[statusSortField] || 0;
            return statusSortOrder === "asc" ? valA - valB : valB - valA;
        });
    };

    return (
        <Layout activePage="CEO Control Tower">
            <div className="flex-1 flex flex-col min-h-screen bg-[#0a0a0b] text-white p-6 overflow-y-auto custom-scrollbar">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-800/40 pb-5">
                    <div>
                        <button 
                            onClick={() => navigate("/ceo-control-tower")}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-400 mb-2 transition-colors"
                        >
                            <FaChevronLeft size={10} /> Back to Tower
                        </button>
                        <h1 className="text-2xl font-black italic tracking-tight mb-1 flex items-center gap-3">
                            <span className="p-2 border-2 border-cyan-500 rounded-[2px] text-cyan-500"><FaBullseye /></span>
                            LEAD MANAGEMENT ANALYTICS
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">CEO Dynamic Performance Audit & Leaderboards</p>
                    </div>

                    <button
                        onClick={handleResetFilters}
                        className="px-3 py-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-wider rounded-[2px] transition-all"
                    >
                        Reset All Filters
                    </button>
                </div>

                {/* Advanced Filter Panel */}
                <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-5 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                    
                    <div className="flex items-center gap-2 mb-4">
                        <FaFilter className="text-cyan-500" size={12} />
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-300">Advanced Query Filters</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        
                        {/* Start Date */}
                        <div className="flex flex-col flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">Start Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-[2px] p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* End Date */}
                        <div className="flex flex-col flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1.5">End Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-[#131619] border border-gray-800 rounded-[2px] p-2 text-xs text-white focus:border-cyan-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Centres */}
                        <MultiSelectDropdown
                            label="Centres"
                            options={filters.centres}
                            selectedValues={selectedCentres}
                            onChange={setSelectedCentres}
                            placeholder="All Centres"
                        />

                        {/* Sources */}
                        <MultiSelectDropdown
                            label="Leads Sources"
                            options={filters.sources}
                            selectedValues={selectedSources}
                            onChange={setSelectedSources}
                            placeholder="All Sources"
                        />

                        {/* Creators */}
                        <MultiSelectDropdown
                            label="Uploaded By (User)"
                            options={filters.users}
                            selectedValues={selectedUsers}
                            onChange={setSelectedUsers}
                            placeholder="All Uploaders"
                        />

                        {/* Assigned Telecaller */}
                        <MultiSelectDropdown
                            label="Assigned Caller"
                            options={filters.responsibilities}
                            selectedValues={selectedResponsibilities}
                            onChange={setSelectedResponsibilities}
                            placeholder="All Telecallers"
                        />

                    </div>
                </div>

                {/* KPI Metrics row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    
                    {/* Total Leads */}
                    <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-4 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 blur-xl group-hover:bg-cyan-500/10 transition-colors" />
                        <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Total Leads</div>
                        <div className="text-2xl font-black text-cyan-400">{loading ? "..." : data?.totalLeads || 0}</div>
                        <div className="w-full bg-cyan-500/20 h-[2px] mt-2 rounded-[1px] overflow-hidden">
                            <div className="bg-cyan-500 h-full w-full" />
                        </div>
                    </div>

                    {/* Hot Leads */}
                    <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-4 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 blur-xl group-hover:bg-red-500/10 transition-colors" />
                        <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Hot Leads</div>
                        <div className="text-2xl font-black text-red-500">{loading ? "..." : data?.statusBreakdown?.["HOT LEAD"] || 0}</div>
                        <div className="w-full bg-red-500/20 h-[2px] mt-2 rounded-[1px] overflow-hidden">
                            <div 
                                className="bg-red-500 h-full" 
                                style={{ width: `${data?.totalLeads ? ((data.statusBreakdown["HOT LEAD"] / data.totalLeads) * 100) : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Warm Leads */}
                    <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-4 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 blur-xl group-hover:bg-orange-500/10 transition-colors" />
                        <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Warm Leads</div>
                        <div className="text-2xl font-black text-orange-400">{loading ? "..." : data?.statusBreakdown?.["WARM LEAD"] || 0}</div>
                        <div className="w-full bg-orange-500/20 h-[2px] mt-2 rounded-[1px] overflow-hidden">
                            <div 
                                className="bg-orange-500 h-full" 
                                style={{ width: `${data?.totalLeads ? ((data.statusBreakdown["WARM LEAD"] / data.totalLeads) * 100) : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Cold Leads */}
                    <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-4 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-xl group-hover:bg-blue-500/10 transition-colors" />
                        <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Cold Leads</div>
                        <div className="text-2xl font-black text-blue-400">{loading ? "..." : data?.statusBreakdown?.["COLD LEAD"] || 0}</div>
                        <div className="w-full bg-blue-500/20 h-[2px] mt-2 rounded-[1px] overflow-hidden">
                            <div 
                                className="bg-blue-500 h-full" 
                                style={{ width: `${data?.totalLeads ? ((data.statusBreakdown["COLD LEAD"] / data.totalLeads) * 100) : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Neutral Leads */}
                    <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-4 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 blur-xl group-hover:bg-yellow-500/10 transition-colors" />
                        <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Neutral Leads</div>
                        <div className="text-2xl font-black text-yellow-400">{loading ? "..." : data?.statusBreakdown?.["NEUTRAL LEAD"] || 0}</div>
                        <div className="w-full bg-yellow-500/20 h-[2px] mt-2 rounded-[1px] overflow-hidden">
                            <div 
                                className="bg-yellow-500 h-full" 
                                style={{ width: `${data?.totalLeads ? ((data.statusBreakdown["NEUTRAL LEAD"] / data.totalLeads) * 100) : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Invalid Leads */}
                    <div className="bg-[#131619] border border-gray-800 rounded-[2px] p-4 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-xl group-hover:bg-purple-500/10 transition-colors" />
                        <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Invalid Leads</div>
                        <div className="text-2xl font-black text-purple-400">{loading ? "..." : data?.statusBreakdown?.["INVALID LEAD"] || 0}</div>
                        <div className="w-full bg-purple-500/20 h-[2px] mt-2 rounded-[1px] overflow-hidden">
                            <div 
                                className="bg-purple-500 h-full" 
                                style={{ width: `${data?.totalLeads ? ((data.statusBreakdown["INVALID LEAD"] / data.totalLeads) * 100) : 0}%` }}
                            />
                        </div>
                    </div>

                </div>

                {/* Tab select bar */}
                <div className="flex flex-wrap border-b border-gray-800 gap-1.5 mb-6">
                    <button
                        onClick={() => setActiveTab("overall")}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                            activeTab === "overall" 
                                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                                : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><FaCrown /> Combined Performance</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("status")}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                            activeTab === "status" 
                                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                                : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><FaListOl /> Status Leaderboard</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("uploads")}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                            activeTab === "uploads" 
                                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                                : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><FaUpload /> Uploader Rank</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("manual")}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                            activeTab === "manual" 
                                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                                : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><FaPlusCircle /> Creator Rank</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("followups")}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                            activeTab === "followups" 
                                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                                : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><FaComments /> Follow-up Rank</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("nextFollowups")}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                            activeTab === "nextFollowups" 
                                ? "border-cyan-500 text-cyan-400 bg-cyan-500/5" 
                                : "border-transparent text-gray-500 hover:text-gray-300"
                        }`}
                    >
                        <span className="flex items-center gap-1.5"><FaClock /> Next Follow-up planner</span>
                    </button>
                </div>

                {/* Tab content */}
                <div className="flex-1 bg-[#131619] border border-gray-800 rounded-[2px] p-5 relative min-h-[300px]">
                    
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col justify-center items-center gap-3 bg-[#131619]/90 z-10">
                            <div className="w-8 h-8 border-2 border-t-cyan-500 border-r-transparent border-l-transparent border-b-transparent animate-spin rounded-full" />
                            <span className="text-xs uppercase font-black tracking-widest text-cyan-500">Loading Analytics Data...</span>
                        </div>
                    ) : null}

                    {/* OVERALL TAB */}
                    {activeTab === "overall" && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                    <FaCrown className="text-yellow-500" /> Unified Performance Scoreboard
                                </h3>
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider bg-gray-900 px-2 py-1 rounded-[1px]">
                                    Weights: Hot (5) • Warm (3) • FollowUp (2) • Creator (2) • Upload (1) • Neutral (1) • Invalid (-2)
                                </div>
                            </div>
                            
                            {(!data?.overallLeaderboard || data.overallLeaderboard.length === 0) ? (
                                <div className="text-xs text-gray-500 italic text-center py-10">No leaderboard data found matching the current criteria.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-800 text-gray-500 font-black uppercase text-[10px]">
                                                <th className="py-2.5 px-3">Rank</th>
                                                <th className="py-2.5 px-3">User Name</th>
                                                <th className="py-2.5 px-3 text-center">Uploads</th>
                                                <th className="py-2.5 px-3 text-center">Manual Added</th>
                                                <th className="py-2.5 px-3 text-center text-red-400">Hot</th>
                                                <th className="py-2.5 px-3 text-center text-orange-400">Warm</th>
                                                <th className="py-2.5 px-3 text-center">Follow-ups</th>
                                                <th className="py-2.5 px-3 text-center text-cyan-400">Scheduled</th>
                                                <th className="py-2.5 px-3 text-right text-yellow-500">Combined Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/40">
                                            {data.overallLeaderboard.map((u) => (
                                                <tr key={u.name} className="hover:bg-gray-800/20 transition-colors">
                                                    <td className="py-3 px-3 font-black">
                                                        {u.rank === 1 ? (
                                                            <span className="text-yellow-500 flex items-center gap-1">🥇 1</span>
                                                        ) : u.rank === 2 ? (
                                                            <span className="text-gray-400 flex items-center gap-1">🥈 2</span>
                                                        ) : u.rank === 3 ? (
                                                            <span className="text-amber-600 flex items-center gap-1">🥉 3</span>
                                                        ) : (
                                                            u.rank
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold">{u.name}</div>
                                                        <div className="text-[10px] text-gray-500">{u.email}</div>
                                                    </td>
                                                    <td className="py-3 px-3 text-center font-bold text-gray-400">{u.uploads}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-gray-400">{u.added}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-red-500">{u.hotCount}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-orange-400">{u.warmCount}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-purple-400">{u.followUps}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-cyan-400">{u.nextFollowUps}</td>
                                                    <td className="py-3 px-3 text-right font-black text-yellow-500 text-sm">{u.score}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STATUS LEADERBOARD TAB */}
                    {activeTab === "status" && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                    <FaListOl className="text-cyan-500" /> Assigned Telecaller Lead-Type Matrix
                                </h3>
                                <div className="text-[9px] text-cyan-500 uppercase font-black bg-cyan-500/10 px-2.5 py-1 rounded-[1px]">
                                    Click column headers to sort rank-wise
                                </div>
                            </div>
                            
                            {(!data?.typeLeaderboard || data.typeLeaderboard.length === 0) ? (
                                <div className="text-xs text-gray-500 italic text-center py-10">No telecaller status data found matching filters.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-800 text-gray-500 font-black uppercase text-[10px] select-none">
                                                <th className="py-2.5 px-3">Telecaller Name</th>
                                                
                                                <th 
                                                    onClick={() => handleSortStatusTable("hotCount")} 
                                                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-800/40 text-red-400 transition-colors"
                                                >
                                                    Hot Leads {statusSortField === "hotCount" ? (statusSortOrder === "asc" ? "▲" : "▼") : ""}
                                                </th>
                                                
                                                <th 
                                                    onClick={() => handleSortStatusTable("warmCount")} 
                                                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-800/40 text-orange-400 transition-colors"
                                                >
                                                    Warm Leads {statusSortField === "warmCount" ? (statusSortOrder === "asc" ? "▲" : "▼") : ""}
                                                </th>
                                                
                                                <th 
                                                    onClick={() => handleSortStatusTable("coldCount")} 
                                                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-800/40 text-blue-400 transition-colors"
                                                >
                                                    Cold Leads {statusSortField === "coldCount" ? (statusSortOrder === "asc" ? "▲" : "▼") : ""}
                                                </th>

                                                <th 
                                                    onClick={() => handleSortStatusTable("neutralCount")} 
                                                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-800/40 text-yellow-400 transition-colors"
                                                >
                                                    Neutral Leads {statusSortField === "neutralCount" ? (statusSortOrder === "asc" ? "▲" : "▼") : ""}
                                                </th>

                                                <th 
                                                    onClick={() => handleSortStatusTable("invalidCount")} 
                                                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-gray-800/40 text-purple-400 transition-colors"
                                                >
                                                    Invalid Leads {statusSortField === "invalidCount" ? (statusSortOrder === "asc" ? "▲" : "▼") : ""}
                                                </th>

                                                <th 
                                                    onClick={() => handleSortStatusTable("totalCount")} 
                                                    className="py-2.5 px-3 text-right cursor-pointer hover:bg-gray-800/40 text-cyan-400 transition-colors"
                                                >
                                                    Total Leads {statusSortField === "totalCount" ? (statusSortOrder === "asc" ? "▲" : "▼") : ""}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/40">
                                            {getSortedStatusData().map((u) => (
                                                <tr key={u.name} className="hover:bg-gray-800/20 transition-colors">
                                                    <td className="py-3 px-3 font-bold">{u.name}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-red-500 bg-red-500/5 border-x border-gray-900">{u.hotCount}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-orange-400 bg-orange-400/5 border-x border-gray-900">{u.warmCount}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-blue-400 bg-blue-400/5 border-x border-gray-900">{u.coldCount}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-yellow-400 bg-yellow-500/5 border-x border-gray-900">{u.neutralCount}</td>
                                                    <td className="py-3 px-3 text-center font-bold text-purple-400 bg-purple-500/5 border-x border-gray-900">{u.invalidCount}</td>
                                                    <td className="py-3 px-3 text-right font-black text-cyan-400 bg-cyan-500/5">{u.totalCount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* UPLOADS TAB */}
                    {activeTab === "uploads" && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                    <FaUpload className="text-cyan-500" /> Excel Bulk / Campaign Upload Rankings
                                </h3>
                            </div>
                            
                            {(!data?.uploadRank || data.uploadRank.length === 0) ? (
                                <div className="text-xs text-gray-500 italic text-center py-10">No upload performance statistics found.</div>
                            ) : (
                                <div className="max-w-2xl">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-800 text-gray-500 font-black uppercase text-[10px]">
                                                <th className="py-2.5 px-3 w-16">Rank</th>
                                                <th className="py-2.5 px-3">Uploader (User)</th>
                                                <th className="py-2.5 px-3 text-right">Uploaded Leads</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/40">
                                            {data.uploadRank.map((u, idx) => (
                                                <tr key={u.name} className="hover:bg-gray-800/20 transition-colors">
                                                    <td className="py-3 px-3 font-black text-gray-400">#{idx + 1}</td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold flex items-center gap-2">
                                                            <FaUserTie className="text-gray-600" />
                                                            {u.name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 ml-5">{u.email}</div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-black text-cyan-400 text-sm">{u.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MANUAL TAB */}
                    {activeTab === "manual" && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                    <FaPlusCircle className="text-cyan-500" /> Manual Lead Creator Rankings
                                </h3>
                            </div>
                            
                            {(!data?.addedRank || data.addedRank.length === 0) ? (
                                <div className="text-xs text-gray-500 italic text-center py-10">No manual creation statistics found.</div>
                            ) : (
                                <div className="max-w-2xl">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-800 text-gray-500 font-black uppercase text-[10px]">
                                                <th className="py-2.5 px-3 w-16">Rank</th>
                                                <th className="py-2.5 px-3">Creator Name</th>
                                                <th className="py-2.5 px-3 text-right">Manually Created Leads</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/40">
                                            {data.addedRank.map((u, idx) => (
                                                <tr key={u.name} className="hover:bg-gray-800/20 transition-colors">
                                                    <td className="py-3 px-3 font-black text-gray-400">#{idx + 1}</td>
                                                    <td className="py-3 px-3">
                                                        <div className="font-bold flex items-center gap-2">
                                                            <FaUserTie className="text-gray-600" />
                                                            {u.name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 ml-5">{u.email}</div>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-black text-cyan-400 text-sm">{u.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FOLLOWUPS TAB */}
                    {activeTab === "followups" && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                                    <FaComments className="text-cyan-500" /> Follow-up Activity Rankings
                                </h3>
                            </div>
                            
                            {(!data?.followupRank || data.followupRank.length === 0) ? (
                                <div className="text-xs text-gray-500 italic text-center py-10">No follow-ups recorded inside the selected range.</div>
                            ) : (
                                <div className="max-w-2xl">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-800 text-gray-500 font-black uppercase text-[10px]">
                                                <th className="py-2.5 px-3 w-16">Rank</th>
                                                <th className="py-2.5 px-3">User Name</th>
                                                <th className="py-2.5 px-3 text-right">Follow-ups Added</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/40">
                                            {data.followupRank.map((u, idx) => (
                                                <tr key={u.name} className="hover:bg-gray-800/20 transition-colors">
                                                    <td className="py-3 px-3 font-black text-gray-400">#{idx + 1}</td>
                                                    <td className="py-3 px-3 font-bold flex items-center gap-2">
                                                        <FaUserTie className="text-gray-600" />
                                                        {u.name}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-black text-cyan-400 text-sm">{u.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* NEXT FOLLOWUPS TAB */}
                    {activeTab === "nextFollowups" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Left: Caller Rank based on Next Followups */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 mb-3">Telecaller Scheduled Next Followups</h4>
                                {(!data?.nextFollowUpRank || data.nextFollowUpRank.length === 0) ? (
                                    <div className="text-xs text-gray-500 italic py-6">No future scheduled follow-ups.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-gray-800 text-gray-500 font-black uppercase text-[10px]">
                                                    <th className="py-2 px-2 w-16">Rank</th>
                                                    <th className="py-2 px-2">Telecaller</th>
                                                    <th className="py-2 px-2 text-right">Scheduled Leads</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800/40">
                                                {data.nextFollowUpRank.map((u, idx) => (
                                                    <tr key={u.name} className="hover:bg-gray-800/10">
                                                        <td className="py-2 px-2 text-gray-400">#{idx + 1}</td>
                                                        <td className="py-2 px-2 font-bold">{u.name}</td>
                                                        <td className="py-2 px-2 text-right font-black text-cyan-400">{u.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Right: Upcoming Day-by-Day Schedule */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 mb-3">Upcoming Date-wise Schedule Plan</h4>
                                {(!data?.nextFollowUpSchedule || data.nextFollowUpSchedule.length === 0) ? (
                                    <div className="text-xs text-gray-500 italic py-6">No upcoming follow-up schedules found.</div>
                                ) : (
                                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-gray-800 text-gray-500 font-black uppercase text-[10px]">
                                                    <th className="py-2 px-2">Next Followup Date</th>
                                                    <th className="py-2 px-2">Responsible Caller</th>
                                                    <th className="py-2 px-2 text-right">Leads Count</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800/40">
                                                {data.nextFollowUpSchedule.map((s, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-800/10">
                                                        <td className="py-2.5 px-2 font-bold text-gray-300">
                                                            <span className="flex items-center gap-1.5"><FaCalendarAlt className="text-cyan-500/50" /> {s.date}</span>
                                                        </td>
                                                        <td className="py-2.5 px-2 text-gray-400">{s.responsible}</td>
                                                        <td className="py-2.5 px-2 text-right font-black text-cyan-400">{s.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
            `}</style>
        </Layout>
    );
}
