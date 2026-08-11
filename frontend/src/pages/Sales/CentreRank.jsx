import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaDownload, FaChevronDown, FaSync } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import CustomMultiSelect from "../../components/common/CustomMultiSelect";

const CentreRank = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [centres, setCentres] = useState([]);
    const [zones, setZones] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);

    // Filters
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentDate = new Date();
    const [filterFinancialYear, setFilterFinancialYear] = useState("");
    const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
    const [selectedMonths, setSelectedMonths] = useState([monthNames[currentDate.getMonth()]]);
    const [viewMode, setViewMode] = useState("Monthly");
    const [selectedQuarter, setSelectedQuarter] = useState("All");
    const [startDate, setStartDate] = useState(() => {
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [sessionRes, centreRes, zoneRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/zone`, { headers })
            ]);

            if (sessionRes.ok) {
                const data = await sessionRes.json();
                const sessionList = (Array.isArray(data) ? data : []).sort((a, b) => (b.sessionName || "").localeCompare(a.sessionName || ""));
                setSessions(sessionList);
                if (sessionList.length > 0 && !filterFinancialYear) {
                    const activeSession = sessionList.find(s => s.isGlobalActive);
                    setFilterFinancialYear(activeSession ? activeSession.sessionName : sessionList[0].sessionName);
                }
            }

            if (centreRes.ok) {
                const resData = await centreRes.json();
                let centerList = Array.isArray(resData) ? resData : resData.centres || [];
                centerList = centerList.filter(c => c.status !== "deactive");
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    if (user.role !== 'superAdmin' && user.centres) {
                        const allowedIds = user.centres.map(id => typeof id === 'object' ? id._id : id);
                        centerList = centerList.filter(c => allowedIds.includes(c._id));
                    }
                }
                const sortedCentres = centerList.sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setCentres(sortedCentres);
            }

            if (zoneRes.ok) {
                const zoneData = await zoneRes.json();
                const zoneList = Array.isArray(zoneData) ? zoneData : (zoneData.data || zoneData.zones || []);
                const sortedZones = zoneList.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setZones(sortedZones);
            }
        } catch (error) {
            console.error("Error fetching master data:", error);
        }
    };

    // ── Zone Matching Helper ──────────────────────────────────────────────────
    const zoneCentreMatchInfo = React.useMemo(() => {
        if (!selectedZones || selectedZones.length === 0) return null;
        const allowedIds = new Set();
        const allowedNames = new Set();

        zones.filter(z => selectedZones.includes(z._id)).forEach(z => {
            (z.centres || []).forEach(c => {
                const id = typeof c === 'object' ? c._id : c;
                if (id) allowedIds.add(id.toString());
                const name = typeof c === 'object' ? c.centreName : null;
                if (name) allowedNames.add(name.toLowerCase().trim());
            });
        });

        return { ids: allowedIds, names: allowedNames };
    }, [zones, selectedZones]);

    const isCentreAllowedByZone = React.useCallback((cId, cName) => {
        if (!zoneCentreMatchInfo) return true;
        if (!cId && !cName) return false;

        const idStr = cId ? cId.toString() : "";
        const nameStr = (cName || "").toLowerCase().trim();

        if (idStr && zoneCentreMatchInfo.ids.has(idStr)) return true;
        if (nameStr && zoneCentreMatchInfo.names.has(nameStr)) return true;

        const cleanName = nameStr.replace(/phsps/gi, "").replace(/[^a-z0-9]/gi, "");
        for (const zoneCentreName of zoneCentreMatchInfo.names) {
            const cleanZoneCentreName = zoneCentreName.replace(/phsps/gi, "").replace(/[^a-z0-9]/gi, "");
            if (cleanZoneCentreName && cleanName && (cleanName.includes(cleanZoneCentreName) || cleanZoneCentreName.includes(cleanName))) {
                return true;
            }
        }

        return false;
    }, [zoneCentreMatchInfo]);

    const availableCentres = React.useMemo(() => {
        if (!zoneCentreMatchInfo) return centres;
        return centres.filter(c => isCentreAllowedByZone(c._id, c.centreName));
    }, [centres, zoneCentreMatchInfo, isCentreAllowedByZone]);

    const fetchRankings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            params.append("viewMode", viewMode);

            if (viewMode === "Custom") {
                const sDate = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                const eDate = endDate || new Date().toISOString().split('T')[0];
                params.append("startDate", sDate);
                params.append("endDate", eDate);
                if (filterFinancialYear) params.append("financialYear", filterFinancialYear);
            } else if (viewMode === "Quarterly") {
                if (filterFinancialYear) params.append("financialYear", filterFinancialYear);
                if (selectedQuarter && selectedQuarter !== "All") {
                    params.append("quarter", selectedQuarter);
                }
            } else if (viewMode === "Yearly") {
                if (filterFinancialYear) params.append("financialYear", filterFinancialYear);
            } else if (viewMode === "Monthly") {
                params.append("year", filterYear);
                if (selectedMonths.length === 1) {
                    params.append("month", selectedMonths[0]);
                } else if (selectedMonths.length > 1) {
                    params.append("months", selectedMonths.join(","));
                }
            }

            let effectiveCentreIds = [];
            if (selectedCentres.length > 0) {
                effectiveCentreIds = selectedCentres;
            } else if (selectedZones.length > 0) {
                effectiveCentreIds = availableCentres.map(c => c._id);
            }

            if (effectiveCentreIds.length > 0) {
                params.append("centreIds", effectiveCentreIds.join(","));
            }

            if (search) {
                params.append("search", search);
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/centre-rank?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setRankings(data.rankings || []);
            } else {
                toast.error("Failed to load rankings");
            }
        } catch (error) {
            console.error("Error fetching rankings", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        fetchRankings();
    }, [filterFinancialYear, filterYear, selectedMonths, selectedQuarter, startDate, endDate, viewMode, selectedCentres, selectedZones, availableCentres, search]);

    const displayedRankings = React.useMemo(() => {
        if (!zoneCentreMatchInfo) return rankings;
        return rankings.filter(r => isCentreAllowedByZone(r.centreId || r._id, r.centreName));
    }, [rankings, zoneCentreMatchInfo, isCentreAllowedByZone]);

    const toggleCentreSelection = (centreId) => {
        setSelectedCentres(prev =>
            prev.includes(centreId) ? prev.filter(id => id !== centreId) : [...prev, centreId]
        );
    };

    const handleExport = () => {
        if (!rankings || rankings.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const exportData = rankings.map(r => ({
            "Rank": r.rank,
            "Center": r.centreName,
            "Achievement %": `${r.achievementPercentage}%`,
            "Achieved Amount (₹)": r.achieved ? Math.round(r.achieved).toLocaleString("en-IN") : 0,
            "Target Amount (₹)": r.target ? Math.round(r.target).toLocaleString("en-IN") : 0,
            "Last Month %": `${r.lastMonthPercentage}%`,
            "Last Month Rank": r.lastMonthRank,
            "Best Achievement %": `${r.bestAchievementPercentage}%`
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "CentreRankings");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `CentreRankings_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Centre Rank</h1>
                        <p className={`font-bold uppercase tracking-widest text-xs ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Monthly Performance Ranking</p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-green-600/90 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300"
                    >
                        <FaDownload size={14} /> Export Excel
                    </button>
                </div>

                <div className={`p-5 rounded-xl border shadow-lg flex flex-wrap items-center justify-between gap-4 transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-4">
                        <h3 className={`font-bold text-lg hidden lg:block ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Centre Performance Ranking</h3>
                        <div className={`rounded-lg p-1 flex ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            {["Monthly", "Quarterly", "Yearly", "Custom"].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold uppercase tracking-widest transition-all ${viewMode === mode
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>

                        {viewMode === "Custom" && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className={`flex items-center gap-2 border rounded-lg px-2 py-1 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-gray-400">From</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`bg-transparent text-xs focus:outline-none w-28 font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
                                    />
                                </div>
                                <div className={`flex items-center gap-2 border rounded-lg px-2 py-1 ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-tight text-gray-400">To</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`bg-transparent text-xs focus:outline-none w-28 font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search Centre..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`text-sm rounded-md pl-9 pr-3 py-2 outline-none font-bold w-48 border transition-all ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-blue-500 focus:w-60'
                                    : 'bg-white border-gray-300 text-gray-800 shadow-sm focus:border-blue-500 focus:w-60'
                                    }`}
                            />
                            <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>

                        {/* Zone MultiSelect */}
                        <div className="min-w-[150px] z-10 w-full sm:w-48 text-left">
                            <CustomMultiSelect
                                options={zones.map(z => ({ value: z._id, label: z.name }))}
                                value={zones.map(z => ({ value: z._id, label: z.name })).filter(opt => selectedZones.includes(opt.value))}
                                onChange={(selected) => setSelectedZones(selected ? selected.map(o => o.value) : [])}
                                placeholder="All Zones"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {/* Centre MultiSelect */}
                        <div className="min-w-[150px] z-10 w-full sm:w-48 text-left">
                            <CustomMultiSelect
                                options={availableCentres.map(c => ({ value: c._id, label: c.centreName }))}
                                value={availableCentres.map(c => ({ value: c._id, label: c.centreName })).filter(opt => selectedCentres.includes(opt.value))}
                                onChange={(selected) => setSelectedCentres(selected ? selected.map(o => o.value) : [])}
                                placeholder="All Centres"
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        {(viewMode === "Quarterly" || viewMode === "Yearly") && (
                            <select
                                value={filterFinancialYear}
                                onChange={(e) => setFilterFinancialYear(e.target.value)}
                                className={`text-sm rounded-md block px-3 py-2 outline-none font-bold w-36 border transition-colors ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-800 shadow-sm focus:border-blue-500'
                                    }`}
                            >
                                {sessions.map(s => (
                                    <option key={s._id} value={s.sessionName}>{s.sessionName}</option>
                                ))}
                            </select>
                        )}

                        {viewMode === "Quarterly" && (
                            <select
                                value={selectedQuarter}
                                onChange={(e) => setSelectedQuarter(e.target.value)}
                                className={`text-sm rounded-md block px-3 py-2 outline-none font-bold w-36 border transition-colors ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-800 shadow-sm focus:border-blue-500'
                                    }`}
                            >
                                <option value="All">All Quarters</option>
                                <option value="Q1">Q1 (Apr - Jun)</option>
                                <option value="Q2">Q2 (Jul - Sep)</option>
                                <option value="Q3">Q3 (Oct - Dec)</option>
                                <option value="Q4">Q4 (Jan - Mar)</option>
                            </select>
                        )}

                        {viewMode === "Monthly" && (
                            <>
                                <select
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(e.target.value)}
                                    className={`text-sm rounded-md block px-3 py-2 outline-none font-bold w-24 border transition-colors ${isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-800 shadow-sm focus:border-blue-500'
                                        }`}
                                >
                                    {Array.from({ length: 13 }, (_, i) => 2024 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <div className="min-w-[150px] z-10 w-full sm:w-48 text-left">
                                    <CustomMultiSelect
                                        options={months.map(m => ({ value: m, label: m }))}
                                        value={months.map(m => ({ value: m, label: m })).filter(opt => selectedMonths.includes(opt.value))}
                                        onChange={(selected) => setSelectedMonths(selected ? selected.map(o => o.value) : [])}
                                        placeholder="All Months"
                                        isDarkMode={isDarkMode}
                                    />
                                </div>
                            </>
                        )}

                        <button
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold transition-colors flex items-center gap-2 shadow-lg"
                            onClick={fetchRankings}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} /> Calculate Ranks
                        </button>
                    </div>
                </div>

                <div className={`rounded-xl shadow-xl overflow-hidden min-h-[400px] border transition-colors ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm font-bold">
                            <thead className={`uppercase font-black text-xs border-b ${isDarkMode ? 'bg-black/20 text-gray-400 border-gray-800' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                <tr>
                                    <th className="px-6 py-4 tracking-widest">Rank</th>
                                    <th className="px-6 py-4 tracking-widest">Center</th>
                                    <th className="px-6 py-4 tracking-widest text-center">Achievement %</th>
                                    <th className="px-6 py-4 tracking-widest text-right">Achieved Amt</th>
                                    <th className="px-6 py-4 tracking-widest text-center">Last Month %</th>
                                    <th className="px-6 py-4 tracking-widest text-center">Last Month Rank</th>
                                    <th className="px-6 py-4 tracking-widest text-right">Best Achievement %</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-medium">Calculating ranks...</td>
                                    </tr>
                                ) : displayedRankings.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-medium">No ranking data found for this period.</td>
                                    </tr>
                                ) : (
                                    displayedRankings.map((rank, index) => (
                                        <tr key={index} className={`transition-all duration-200 cursor-default group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-blue-50/50'}`}>
                                            <td className={`px-6 py-5 font-black text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'} group-hover:text-blue-500`}>{rank.rank}</td>
                                            <td className={`px-6 py-5 font-black uppercase tracking-wide transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{rank.centreName}</td>
                                            <td className={`px-6 py-5 font-black text-lg text-center ${parseFloat(rank.achievementPercentage) > 50 ? "text-green-500" : "text-blue-500"}`}>
                                                {rank.achievementPercentage}%
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className={`inline-flex flex-col items-end`}>
                                                    <span className={`font-black text-sm ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                                                        ₹{rank.achieved ? Math.round(rank.achieved).toLocaleString("en-IN") : 0}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        of ₹{rank.target ? Math.round(rank.target).toLocaleString("en-IN") : 0}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={`px-6 py-5 font-bold text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                <span className={parseFloat(rank.lastMonthPercentage) > 50 ? "text-green-500" : ""}>
                                                    {rank.lastMonthPercentage}%
                                                </span>
                                                {rank.growth && (
                                                    <span className={`ml-2 text-xs font-black ${parseFloat(rank.growth) > 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {parseFloat(rank.growth) > 0 ? "↑" : "↓"} {Math.abs(parseFloat(rank.growth))}%
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`px-6 py-5 font-black text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {rank.lastMonthRank}
                                                {rank.rankChange !== 0 && (
                                                    <span className={`ml-2 text-xs font-black ${rank.rankChange > 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {rank.rankChange > 0 ? `↑ ${rank.rankChange}` : `↓ ${Math.abs(rank.rankChange)}`}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 font-black text-right text-green-500 text-lg">{rank.bestAchievementPercentage}%</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default CentreRank;