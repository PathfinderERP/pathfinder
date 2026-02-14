import React, { useState, useEffect, useRef } from "react";
import Layout from "../../components/Layout";
import { FaDownload, FaChevronDown, FaSync } from "react-icons/fa";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-toastify";

const CentreRank = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [centres, setCentres] = useState([]);

    // Filters
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentDate = new Date();
    const [filterFinancialYear, setFilterFinancialYear] = useState("");
    const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
    const [filterMonth, setFilterMonth] = useState(monthNames[currentDate.getMonth()]);
    const [viewMode, setViewMode] = useState("Monthly");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        fetchMasterData();
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsCentreDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        fetchRankings();
    }, [filterFinancialYear, filterYear, filterMonth, startDate, endDate, viewMode, selectedCentres]);

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [sessionRes, centreRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/session/list`, { headers }),
                fetch(`${import.meta.env.VITE_API_URL}/centre`, { headers })
            ]);

            if (sessionRes.ok) {
                const data = await sessionRes.json();
                const sessionList = Array.isArray(data) ? data : [];
                setSessions(sessionList);
                if (sessionList.length > 0 && !filterFinancialYear) {
                    setFilterFinancialYear(sessionList[0].sessionName);
                }
            }

            if (centreRes.ok) {
                const resData = await centreRes.json();
                let centerList = Array.isArray(resData) ? resData : resData.centres || [];
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    const user = JSON.parse(storedUser);
                    if (user.role !== 'superAdmin' && user.centres) {
                        const allowedIds = user.centres.map(id => typeof id === 'object' ? id._id : id);
                        centerList = centerList.filter(c => allowedIds.includes(c._id));
                    }
                }
                setCentres(centerList);
            }
        } catch (error) {
            console.error("Error fetching master data:", error);
        }
    };

    const fetchRankings = async () => {
        if (!filterFinancialYear && viewMode !== "Custom") return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();

            if (viewMode === "Custom" && startDate && endDate) {
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            } else {
                params.append("financialYear", filterFinancialYear);
                if (viewMode === "Monthly") {
                    params.append("year", filterYear);
                    params.append("month", filterMonth);
                }
            }

            if (selectedCentres.length > 0) {
                params.append("centreIds", selectedCentres.join(","));
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
                            {["Monthly", "Yearly", "Custom"].map(mode => (
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
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                className={`text-sm rounded-md px-3 py-2 outline-none font-bold min-w-[180px] flex justify-between items-center transition-colors border ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-300 hover:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-800 hover:border-blue-500 shadow-sm'
                                    }`}
                            >
                                <span className="truncate max-w-[140px] uppercase text-xs tracking-widest font-black">
                                    {selectedCentres.length === 0
                                        ? "All Centres"
                                        : `${selectedCentres.length} Selected`}
                                </span>
                                <FaChevronDown size={10} className={`ml-2 transition-transform duration-200 ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isCentreDropdownOpen && (
                                <div className={`absolute top-full mt-2 left-0 w-60 z-20 border rounded-lg shadow-xl overflow-hidden text-left ${isDarkMode ? 'bg-[#1a1f24] border-gray-700' : 'bg-white border-gray-200'
                                    }`}>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                        {centres.map(c => (
                                            <div
                                                key={c._id}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                                                    }`}
                                                onClick={() => toggleCentreSelection(c._id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCentres.includes(c._id)}
                                                    readOnly
                                                    className={`rounded w-4 h-4 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-cyan-500' : 'border-gray-300 text-cyan-600'}`}
                                                />
                                                <span className={`text-sm truncate font-bold uppercase tracking-tighter ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{c.centreName}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`p-2 border-t ${isDarkMode ? 'border-gray-700 bg-[#131619]' : 'border-gray-100 bg-gray-50'}`}>
                                        <button
                                            onClick={() => setSelectedCentres([])}
                                            className="text-xs font-black uppercase tracking-widest text-cyan-500 hover:text-cyan-400 w-full text-center"
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewMode !== "Custom" && (
                            <select
                                value={filterFinancialYear}
                                onChange={(e) => setFilterFinancialYear(e.target.value)}
                                className={`text-sm rounded-md block px-3 py-2 outline-none font-bold w-32 border transition-colors ${isDarkMode
                                    ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-blue-500'
                                    : 'bg-white border-gray-300 text-gray-800 shadow-sm focus:border-blue-500'
                                    }`}
                            >
                                {sessions.map(session => (
                                    <option key={session._id} value={session.sessionName}>{session.sessionName}</option>
                                ))}
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
                                <select
                                    value={filterMonth}
                                    onChange={(e) => setFilterMonth(e.target.value)}
                                    className={`text-sm rounded-md block px-3 py-2 outline-none font-bold w-32 border transition-colors ${isDarkMode
                                        ? 'bg-[#1a1f24] border-gray-700 text-gray-300 focus:border-blue-500'
                                        : 'bg-white border-gray-300 text-gray-800 shadow-sm focus:border-blue-500'
                                        }`}
                                >
                                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
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
                                    <th className="px-6 py-4 tracking-widest text-center">Last Month %</th>
                                    <th className="px-6 py-4 tracking-widest text-center">Last Month Rank</th>
                                    <th className="px-6 py-4 tracking-widest text-right">Best Achievement %</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-medium">Calculating ranks...</td>
                                    </tr>
                                ) : rankings.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-medium">No ranking data found for this period.</td>
                                    </tr>
                                ) : (
                                    rankings.map((rank, index) => (
                                        <tr key={index} className={`transition-all duration-200 cursor-default group ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-blue-50/50'}`}>
                                            <td className={`px-6 py-5 font-black text-lg transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'} group-hover:text-blue-500`}>{rank.rank}</td>
                                            <td className={`px-6 py-5 font-black uppercase tracking-wide transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{rank.centreName}</td>
                                            <td className={`px-6 py-5 font-black text-lg text-center ${parseFloat(rank.achievementPercentage) > 50 ? "text-green-500" : "text-blue-500"}`}>
                                                {rank.achievementPercentage}%
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