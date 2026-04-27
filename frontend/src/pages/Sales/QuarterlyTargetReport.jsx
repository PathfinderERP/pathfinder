import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaSync, FaDownload, FaTable, FaSun, FaMoon, FaArrowLeft } from "react-icons/fa";
import { toast } from "react-toastify";
import { useTheme } from "../../context/ThemeContext";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

const QuarterlyTargetReport = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [filterFinancialYear, setFilterFinancialYear] = useState("");
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const navigate = useNavigate();

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        if (filterFinancialYear) {
            fetchReport();
        }
    }, [filterFinancialYear]);

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/session/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const sessionData = await response.json();
                const sessionList = (Array.isArray(sessionData) ? sessionData : []).sort((a, b) => (b.sessionName || "").localeCompare(a.sessionName || ""));
                setSessions(sessionList);
                if (sessionList.length > 0 && !filterFinancialYear) {
                    const defaultSession = sessionList.find(s => s.sessionName === "2026-2027");
                    setFilterFinancialYear(defaultSession ? defaultSession.sessionName : sessionList[0].sessionName);
                }
            }
        } catch (error) {
            console.error("Error fetching sessions", error);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/quarterly-target-report?financialYear=${filterFinancialYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const result = await response.json();
                const sortedData = (result.data || []).sort((a, b) => (a.centreName || "").localeCompare(b.centreName || ""));
                setData(sortedData);
            } else {
                toast.error("Failed to load quarterly report");
            }
        } catch (error) {
            console.error("Error fetching quarterly report", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data || data.length === 0) {
            toast.warn("No data to export");
            return;
        }

        const wb = XLSX.utils.book_new();
        const sheetData = [
            ["Quarterly Target vs Achievement Matrix"],
            [`Financial Year: ${filterFinancialYear}`],
            ["Generated on: " + new Date().toLocaleDateString()],
            [],
            ["Centre Name", "Q1 Target", "Q1 Achieved", "Q2 Target", "Q2 Achieved", "Q3 Target", "Q3 Achieved", "Q4 Target", "Q4 Achieved", "Total Target", "Total Achieved"]
        ];

        data.forEach(item => {
            sheetData.push([
                item.centreName,
                item.q1.target, item.q1.achieved,
                item.q2.target, item.q2.achieved,
                item.q3.target, item.q3.achieved,
                item.q4.target, item.q4.achieved,
                item.total.target, item.total.achieved
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, "Quarterly Report");
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `Quarterly_Report_${filterFinancialYear}.xlsx`);
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <Layout activePage="Sales">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate(-1)}
                            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                        >
                            <FaArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Quarterly Performance Matrix</h1>
                            <p className="text-gray-600 dark:text-gray-400">Target vs Achieved Breakdown by Quarters</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <button
                            onClick={toggleTheme}
                             className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${isDarkMode
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500 hover:text-black'
                                : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500 hover:text-white'
                                }`}
                        >
                            {isDarkMode ? <><FaSun /> Day Mode</> : <><FaMoon /> Night Mode</>}
                        </button>
                        <select
                            value={filterFinancialYear}
                            onChange={(e) => setFilterFinancialYear(e.target.value)}
                            className={`px-4 py-2 rounded-lg border outline-none font-bold text-sm ${isDarkMode ? 'bg-[#1a1f24] border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                        >
                            {sessions.map(s => <option key={s._id} value={s.sessionName}>{s.sessionName}</option>)}
                        </select>
                        <button
                            onClick={handleExport}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg hover:shadow-green-500/20"
                        >
                            <FaDownload /> Export
                        </button>
                    </div>
                </div>

                <div className={`rounded-[2px] border overflow-hidden transition-all shadow-2xl ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'} border-b`}>
                                    <th className="p-5 text-xs font-black uppercase tracking-widest text-gray-500 sticky left-0 z-10 bg-inherit" rowSpan={2}>Centre Name</th>
                                    <th className="p-5 text-xs font-black uppercase tracking-widest text-center border-l border-gray-700" colSpan={2}>Q1 (Apr-Jun)</th>
                                    <th className="p-5 text-xs font-black uppercase tracking-widest text-center border-l border-gray-700" colSpan={2}>Q2 (Jul-Sep)</th>
                                    <th className="p-5 text-xs font-black uppercase tracking-widest text-center border-l border-gray-700" colSpan={2}>Q3 (Oct-Dec)</th>
                                    <th className="p-5 text-xs font-black uppercase tracking-widest text-center border-l border-gray-700" colSpan={2}>Q4 (Jan-Mar)</th>
                                    <th className="p-5 text-xs font-black uppercase tracking-widest text-center border-l border-green-700 bg-green-900/10" colSpan={2}>Total Year</th>
                                </tr>
                                <tr className={`${isDarkMode ? 'bg-[#131619] border-gray-800' : 'bg-gray-50 border-gray-200'} border-b`}>
                                    {/* Q1 */}
                                    <th className="p-4 text-[10px] font-bold text-gray-400 text-right border-l border-gray-800">Target</th>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 text-right">Achieved</th>
                                    {/* Q2 */}
                                    <th className="p-4 text-[10px] font-bold text-gray-400 text-right border-l border-gray-800">Target</th>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 text-right">Achieved</th>
                                    {/* Q3 */}
                                    <th className="p-4 text-[10px] font-bold text-gray-400 text-right border-l border-gray-800">Target</th>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 text-right">Achieved</th>
                                    {/* Q4 */}
                                    <th className="p-4 text-[10px] font-bold text-gray-400 text-right border-l border-gray-800">Target</th>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 text-right">Achieved</th>
                                    {/* Total */}
                                    <th className="p-4 text-[10px] font-bold text-green-500 text-right border-l border-green-800 bg-green-900/10">Target</th>
                                    <th className="p-4 text-[10px] font-bold text-green-500 text-right bg-green-900/10">Achieved</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-[2px] animate-spin"></div>
                                                <p className="text-gray-500 font-bold text-sm tracking-widest animate-pulse">GENERATING MATRIX...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : data.map((item, idx) => {
                                    const getPct = (ach, tar) => tar > 0 ? (ach / tar) * 100 : 0;
                                    const getColorClass = (pct) => {
                                        if (pct >= 50) return 'text-green-500';
                                        if (pct >= 20) return 'text-yellow-500';
                                        return 'text-red-500';
                                    };

                                    return (
                                        <tr key={idx} className={`hover:bg-blue-600/5 transition-colors group ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <td className="p-4 text-xs font-black uppercase sticky left-0 z-10 bg-inherit group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xl">{item.centreName}</td>
                                            
                                            {/* Q1 */}
                                            <td className="p-4 text-xs text-right border-l border-gray-800/10">{item.q1.target.toLocaleString()}</td>
                                            <td className="p-4 text-xs text-right">
                                                <div className="font-bold">{item.q1.achieved.toLocaleString()}</div>
                                                <div className={`text-[9px] font-black ${getColorClass(getPct(item.q1.achieved, item.q1.target))}`}>
                                                    {getPct(item.q1.achieved, item.q1.target).toFixed(1)}%
                                                </div>
                                            </td>
                                            
                                            {/* Q2 */}
                                            <td className="p-4 text-xs text-right border-l border-gray-800/10">{item.q2.target.toLocaleString()}</td>
                                            <td className="p-4 text-xs text-right">
                                                <div className="font-bold">{item.q2.achieved.toLocaleString()}</div>
                                                <div className={`text-[9px] font-black ${getColorClass(getPct(item.q2.achieved, item.q2.target))}`}>
                                                    {getPct(item.q2.achieved, item.q2.target).toFixed(1)}%
                                                </div>
                                            </td>
                                            
                                            {/* Q3 */}
                                            <td className="p-4 text-xs text-right border-l border-gray-800/10">{item.q3.target.toLocaleString()}</td>
                                            <td className="p-4 text-xs text-right">
                                                <div className="font-bold">{item.q3.achieved.toLocaleString()}</div>
                                                <div className={`text-[9px] font-black ${getColorClass(getPct(item.q3.achieved, item.q3.target))}`}>
                                                    {getPct(item.q3.achieved, item.q3.target).toFixed(1)}%
                                                </div>
                                            </td>
                                            
                                            {/* Q4 */}
                                            <td className="p-4 text-xs text-right border-l border-gray-800/10">{item.q4.target.toLocaleString()}</td>
                                            <td className="p-4 text-xs text-right">
                                                <div className="font-bold">{item.q4.achieved.toLocaleString()}</div>
                                                <div className={`text-[9px] font-black ${getColorClass(getPct(item.q4.achieved, item.q4.target))}`}>
                                                    {getPct(item.q4.achieved, item.q4.target).toFixed(1)}%
                                                </div>
                                            </td>
                                            
                                            {/* Total */}
                                            <td className="p-4 text-xs text-right font-black border-l border-green-800/10 bg-green-500/5">{item.total.target.toLocaleString()}</td>
                                            <td className="p-4 text-xs text-right font-black bg-green-500/5">
                                                <div className="font-bold">{item.total.achieved.toLocaleString()}</div>
                                                <div className={`text-[9px] font-black ${getColorClass(getPct(item.total.achieved, item.total.target))}`}>
                                                    {getPct(item.total.achieved, item.total.target).toFixed(1)}%
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default QuarterlyTargetReport;
