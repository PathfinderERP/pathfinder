import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaFilter, FaSync, FaDownload } from "react-icons/fa";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const CentreRank = () => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);

    // Filters
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentDate = new Date();
    // Filters
    const [filterFinancialYear, setFilterFinancialYear] = useState(""); // This will be set dynamically after sessions are fetched
    const [filterYear, setFilterYear] = useState(currentDate.getFullYear());
    const [filterMonth, setFilterMonth] = useState(monthNames[currentDate.getMonth()]);
    const [viewMode, setViewMode] = useState("Monthly");

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        fetchMasterData();
    }, []);

    useEffect(() => {
        fetchRankings();
    }, [filterFinancialYear, filterYear, filterMonth]); // Fetch on filter change

    const fetchMasterData = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/session/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const sessionList = Array.isArray(data) ? data : [];
                setSessions(sessionList);

                // Auto-select the first session if available and none selected or currently selected is not in list
                if (sessionList.length > 0) {
                    const sessionNames = sessionList.map(s => s.sessionName);
                    if (!filterFinancialYear || !sessionNames.includes(filterFinancialYear)) {
                        setFilterFinancialYear(sessionList[0].sessionName);
                    }
                }
            } else {
                console.error("Failed to fetch sessions");
                // Fallback to default sessions if API fails
                setSessions([
                    { _id: '1', sessionName: '2024-2025' },
                    { _id: '2', sessionName: '2025-2026' }
                ]);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
            // Fallback to default sessions if API fails
            setSessions([
                { _id: '1', sessionName: '2024-2025' },
                { _id: '2', sessionName: '2025-2026' }
            ]);
        }
    };

    const fetchRankings = async () => {
        if (!filterFinancialYear) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                financialYear: filterFinancialYear,
                year: filterYear,
                month: filterMonth
            });

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

    const handleExport = () => {
        if (!rankings || rankings.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const exportData = rankings.map(r => ({
            "Rank": r.rank,
            "Center": r.centreName,
            "Selected Month": `${filterMonth} ${filterYear}`,
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
        saveAs(data, `CentreRankings_${filterMonth}_${filterYear}.xlsx`);
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Centre Rank</h1>
                        <p className="text-cyan-400">Monthly Performance Ranking</p>
                    </div>
                </div>

                {/* Filters Section (Card similar to screenshot) */}
                <div className="bg-[#1a1f24] p-5 rounded-xl border border-gray-800 shadow-lg flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-white font-bold text-lg">Centre Performance Ranking</h3>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Monthly/Yearly Toggle - Visual for now, user screenshot shows Monthly selected */}
                        <div className="bg-gray-800 rounded-lg p-1 flex">
                            <button
                                onClick={() => setViewMode("Monthly")}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "Monthly" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setViewMode("Yearly")}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "Yearly" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                            >
                                Yearly
                            </button>
                        </div>

                        {/* Filters */}
                        <select
                            value={filterFinancialYear}
                            onChange={(e) => setFilterFinancialYear(e.target.value)}
                            className="bg-white text-gray-800 text-sm rounded-md block px-3 py-2 outline-none font-medium w-32"
                        >
                            {sessions.length === 0 ? (
                                <option value="">No sessions available</option>
                            ) : (
                                sessions.map(session => (
                                    <option key={session._id} value={session.sessionName}>
                                        {session.sessionName}
                                    </option>
                                ))
                            )}
                        </select>

                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="bg-white text-gray-800 text-sm rounded-md block px-3 py-2 outline-none font-medium w-24"
                        >
                            {Array.from({ length: 13 }, (_, i) => 2024 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="bg-white text-gray-800 text-sm rounded-md block px-3 py-2 outline-none font-medium w-32"
                        >
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>

                        <button
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md font-bold transition-colors flex items-center gap-2 shadow-lg hover:shadow-green-500/20"
                            onClick={fetchRankings}
                        >
                            <FaSync className={loading ? "animate-spin" : ""} /> Calculate Ranks
                        </button>
                    </div>
                </div>

                {/* Rankings Table */}
                <div className="bg-white rounded-xl shadow-xl overflow-hidden min-h-[400px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Rank</th>
                                    <th className="px-6 py-4">Center</th>
                                    <th className="px-6 py-4">Selected Month</th>
                                    <th className="px-6 py-4">Achievement %</th>
                                    <th className="px-6 py-4">Last Month %</th>
                                    <th className="px-6 py-4">Last Month Rank</th>
                                    <th className="px-6 py-4">Best Achievement %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-medium">Calculating ranks...</td>
                                    </tr>
                                ) : rankings.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-400 font-medium">No ranking data found for this period.</td>
                                    </tr>
                                ) : (
                                    rankings.map((rank, index) => (
                                        <tr
                                            key={index}
                                            className="hover:bg-blue-50/50 transition-all duration-200 hover:scale-[1.002] hover:shadow-md cursor-default group"
                                        >
                                            <td className="px-6 py-5 font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">
                                                {rank.rank}
                                            </td>
                                            <td className="px-6 py-5 font-bold text-gray-700 uppercase tracking-wide group-hover:text-gray-900">
                                                {rank.centreName}
                                            </td>
                                            <td className="px-6 py-5 text-gray-500">
                                                {filterMonth} {filterYear}
                                            </td>
                                            <td className={`px-6 py-5 font-bold text-base ${parseFloat(rank.achievementPercentage) > 50 ? "text-green-600" :
                                                parseFloat(rank.achievementPercentage) === 50 ? "text-yellow-500" : "text-blue-600" // Screenshot shows Blue for high values? Wait, screenshot shows 173% Green. 92% Blue? No, let's stick to user request logic from Target page or Screenshot? Screenshot: 173% Green, 120% Green, 99% Blue, 98% Blue.
                                                // Actually screenshot shows Green > 100? or Green > 100 and Blue < 100? 
                                                // Let's stick to User's previous requested logic for consistency: >50 Green, <50 Red.
                                                // Screenshot aesthetics: Green for high, Blue for mid?
                                                // Let's use user logic: > 50 Green.
                                                }`}>
                                                {rank.achievementPercentage}%
                                            </td>
                                            <td className="px-6 py-5 font-medium text-gray-600">
                                                <span className={parseFloat(rank.lastMonthPercentage) > 50 ? "text-green-600" : "text-gray-600"}>
                                                    {rank.lastMonthPercentage}%
                                                </span>
                                                {rank.growth && (
                                                    <span className={`ml-2 text-xs ${rank.growth > 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {rank.growth > 0 ? "↑" : "↓"} {Math.abs(rank.growth)}%
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-gray-600 font-medium">
                                                {rank.lastMonthRank}
                                                {rank.rankChange && (
                                                    <span className={`ml-2 text-xs font-bold ${rank.rankChange > 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {rank.rankChange > 0 ? `↑ ${rank.rankChange}` : `↓ ${Math.abs(rank.rankChange)}`}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 font-bold text-green-600">
                                                {rank.bestAchievementPercentage}%
                                            </td>
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
