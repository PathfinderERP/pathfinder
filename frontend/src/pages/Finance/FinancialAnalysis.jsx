import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../context/ThemeContext";
import { FaChartLine, FaMoneyBillWave, FaCalendarAlt, FaFilter, FaArrowUp, FaArrowDown, FaBuilding, FaDownload, FaSync, FaChevronDown, FaSearch } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, LabelList
} from 'recharts';

const FinancialAnalysis = () => {
    const { isDarkMode } = useTheme();
    const [loading, setLoading] = useState(true);
    const [selectedCentres, setSelectedCentres] = useState([]);
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [allowedCentres, setAllowedCentres] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState("This Month");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [centres, setCentres] = useState([]);
    const [sessions, setSessions] = useState([]);

    // UI States for dropdowns
    const [isCentreDropdownOpen, setIsCentreDropdownOpen] = useState(false);
    const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);
    const [centreSearch, setCentreSearch] = useState("");
    const [sessionSearch, setSessionSearch] = useState("");
    const [analytics, setAnalytics] = useState({
        totalAmountToCome: 0,
        totalAmountCame: 0,
        amountWillCome: 0,
        totalDue: 0,
        paymentBreakdown: {
            CASH: 0,
            UPI: 0,
            CARD: 0,
            BANK_TRANSFER: 0,
            CHEQUE: 0,
            CHEQUE_PENDING: 0
        },
        trendData: [],
        centreData: []
    });

    const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

    useEffect(() => {
        const init = async () => {
            const perms = await fetchUserPermissions();
            setAllowedCentres(perms);

            const loadedCentres = await fetchCentres(perms);
            await fetchSessions();

            setIsReady(true);
        };
        init();

        const interval = setInterval(() => {
            if (isReady) fetchAnalytics();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isReady) {
            fetchAnalytics();
        }
    }, [selectedCentres, selectedSessions, selectedPeriod, startDate, endDate, isReady]);

    const fetchUserPermissions = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.user.role === 'superAdmin' || data.user.role === 'SuperAdmin') return null;
                return data.user.centres?.map(c => c.centreName) || [];
            }
        } catch (error) {
            console.error(error);
        }
        return [];
    };

    const fetchCentres = async (allowedOverride) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                let filtered = data;
                const perms = allowedOverride !== undefined ? allowedOverride : allowedCentres;

                if (perms !== null) {
                    filtered = data.filter(c => perms.includes(c.centreName));
                }

                setCentres(filtered.sort((a, b) => a.centreName.localeCompare(b.centreName)));
                return filtered;
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
            return [];
        }
    };

    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/session/list`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSessions(data);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (selectedCentres.length > 0) params.append("centreIds", selectedCentres.join(","));
            if (selectedSessions.length > 0) params.append("session", selectedSessions[0]); 
            params.append("period", selectedPeriod);
            if (selectedPeriod === "Custom") {
                if (!startDate || !endDate) {
                    setLoading(false);
                    return;
                }
                params.append("startDate", startDate);
                params.append("endDate", endDate);
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/finance/installment/analytics?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = await response.json();
            if (response.ok) {
                setAnalytics(data);
            } else {
                toast.error(data.message || "Failed to fetch analytics");
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const handleExportExcel = () => {
        if (!analytics) return;

        const wb = XLSX.utils.book_new();

        const overviewData = [
            ["Metric", "Value"],
            ["Gross Billing", analytics.totalAmountToCome],
            ["Realized Revenue", analytics.totalAmountCame],
            ["Expected Receivables", analytics.amountWillCome],
            ["Total Overdue", analytics.totalDue]
        ];
        const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

        const breakdownHeaders = ["Instrument", "Amount"];
        const breakdownRows = Object.entries(analytics.paymentBreakdown).map(([k, v]) => [k, v]);
        const wsBreakdown = XLSX.utils.aoa_to_sheet([breakdownHeaders, ...breakdownRows]);
        XLSX.utils.book_append_sheet(wb, wsBreakdown, "Payment Breakdown");

        if (analytics.centreData.length > 0) {
            const centreHeaders = ["Centre Name", "Revenue"];
            const centreRows = analytics.centreData.map(c => [c.name, c.value]);
            const wsCentres = XLSX.utils.aoa_to_sheet([centreHeaders, ...centreRows]);
            XLSX.utils.book_append_sheet(wb, wsCentres, "Centre-wise Revenue");
        }

        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(blob, `Financial_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const toggleCentre = (id) => {
        setSelectedCentres(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSession = (name) => {
        setSelectedSessions(prev =>
            prev.includes(name) ? prev.filter(i => i !== name) : [name] 
        );
    };

    const resetFilters = () => {
        setSelectedCentres([]);
        setSelectedSessions([]);
        setSelectedPeriod("This Month");
        setStartDate("");
        setEndDate("");
        toast.info("Filters reset to default");
    };

    const StatCard = ({ title, amount, subtitle, colorClass, icon, trend }) => (
        <div className={`p-6 rounded-[2rem] border transition-all duration-500 hover:scale-[1.02] group relative overflow-hidden shadow-2xl ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className={`absolute top-0 left-0 w-full h-[3px] ${colorClass}`}></div>
            <div className="flex justify-between items-start mb-5 relative z-10">
                <div className={`p-4 rounded-2xl transition-all duration-500 ${isDarkMode ? 'bg-white/5 text-cyan-400' : 'bg-cyan-50 text-cyan-600'} group-hover:bg-cyan-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-cyan-500/30`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {trend > 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="relative z-10">
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</p>
                <h3 className={`text-3xl font-black mb-1 tracking-tighter tabular-nums italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(amount)}</h3>
                <p className={`text-[10px] font-black italic uppercase tracking-widest ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{subtitle}</p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-cyan-500/5 blur-2xl group-hover:bg-cyan-500/10 transition-all duration-500"></div>
        </div>
    );

    const paymentBreakdownData = Object.entries(analytics.paymentBreakdown)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
            return (
                <div className={`border p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl ${isDarkMode ? 'bg-[#0f1215]/95 border-gray-800' : 'bg-white/95 border-gray-200'}`}>
                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-2 italic border-b border-gray-800/50 pb-2">{label}</p>
                    <p className="text-cyan-500 font-black text-2xl tracking-tighter tabular-nums mb-3">{formatCurrency(total)}</p>
                    <div className="space-y-2">
                        {payload.map((entry, idx) => (
                            <div key={idx} className="flex justify-between gap-6 text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                                    <span className="text-gray-500">{entry.name}:</span>
                                </div>
                                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{formatCurrency(entry.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-all duration-500 ${isDarkMode ? 'bg-[#0f1215]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme={isDarkMode ? "dark" : "light"} />

                {/* Header & Controls */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 mb-12">
                    <div>
                        <h1 className={`text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <span className="p-3 bg-cyan-500/10 rounded-2xl text-cyan-500 border border-cyan-500/20 shadow-inner">
                                <FaChartLine size={28} />
                            </span>
                            Fiscal <span className="text-cyan-500">Analysis</span>
                        </h1>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2 italic">Real-time predictive intelligence & structural revenue mapping</p>
                    </div>

                    <div className={`flex flex-wrap items-center gap-4 p-4 rounded-[2.5rem] border shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-200'}`}>
                        {/* Centres Multi-select */}
                        <div className="relative group">
                            <div
                                onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all cursor-pointer min-w-[220px] ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-500/50 shadow-inner'}`}
                            >
                                <FaBuilding className="text-cyan-500 text-sm" />
                                <span className={`text-[10px] font-black uppercase tracking-widest truncate flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedCentres.length === 0 ? "Global Map" : `${selectedCentres.length} NODES`}
                                </span>
                                <FaChevronDown className={`text-gray-500 text-[10px] transition-transform duration-300 ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isCentreDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-3 w-72 border rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100'}`}>
                                    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <div className="relative">
                                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" />
                                            <input
                                                type="text"
                                                placeholder="TRACE NODES..."
                                                value={centreSearch}
                                                onChange={(e) => setCentreSearch(e.target.value)}
                                                className={`w-full rounded-xl py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-white/5 border border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-cyan-500/50 shadow-inner'}`}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
                                        {centres.filter(c => c.centreName.toLowerCase().includes(centreSearch.toLowerCase())).map(c => (
                                            <div
                                                key={c._id}
                                                onClick={() => toggleCentre(c._id)}
                                                className={`px-5 py-4 hover:bg-cyan-500/10 rounded-2xl flex items-center gap-4 cursor-pointer transition-all mb-1 ${selectedCentres.includes(c._id) ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''}`}
                                            >
                                                <div className={`w-4 h-4 rounded-lg border transition-all ${selectedCentres.includes(c._id) ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/30' : (isDarkMode ? 'border-gray-700' : 'border-gray-300 shadow-inner')}`}>
                                                    {selectedCentres.includes(c._id) && <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-black">✓</div>}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest truncate ${selectedCentres.includes(c._id) ? 'text-cyan-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{c.centreName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sessions Filter */}
                        <div className="relative group">
                            <div
                                onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all cursor-pointer min-w-[200px] ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-200 hover:border-cyan-500/50 shadow-inner'}`}
                            >
                                <FaFilter className="text-cyan-500 text-sm" />
                                <span className={`text-[10px] font-black uppercase tracking-widest truncate flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {selectedSessions.length === 0 ? "Global Horizon" : selectedSessions[0]}
                                </span>
                                <FaChevronDown className={`text-gray-500 text-[10px] transition-transform duration-300 ${isSessionDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isSessionDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-3 w-72 border rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ${isDarkMode ? 'bg-[#0f1215] border-gray-800' : 'bg-white border-gray-100'}`}>
                                    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <div className="relative">
                                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" />
                                            <input
                                                type="text"
                                                placeholder="TRACE SESSIONS..."
                                                value={sessionSearch}
                                                onChange={(e) => setSessionSearch(e.target.value)}
                                                className={`w-full rounded-xl py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all ${isDarkMode ? 'bg-white/5 border border-gray-800 text-white focus:border-cyan-500/50' : 'bg-gray-50 border border-gray-200 text-gray-900 focus:border-cyan-500/50 shadow-inner'}`}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
                                        <div
                                            onClick={() => { setSelectedSessions([]); setIsSessionDropdownOpen(false); }}
                                            className="px-5 py-4 hover:bg-cyan-500/10 rounded-2xl flex items-center gap-4 cursor-pointer transition-all mb-1 border-b border-gray-800/10"
                                        >
                                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest truncate italic">Global Expansion (Reset)</span>
                                        </div>
                                        {sessions.filter(s => (s.sessionName || s.name).toLowerCase().includes(sessionSearch.toLowerCase())).map(s => {
                                            const sName = s.sessionName || s.name;
                                            return (
                                                <div
                                                    key={s._id}
                                                    onClick={() => { toggleSession(sName); setIsSessionDropdownOpen(false); }}
                                                    className={`px-5 py-4 hover:bg-cyan-500/10 rounded-2xl flex items-center gap-4 cursor-pointer transition-all mb-1 ${selectedSessions.includes(sName) ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : ''}`}
                                                >
                                                    <div className={`w-4 h-4 rounded-lg border transition-all ${selectedSessions.includes(sName) ? 'bg-cyan-500 border-cyan-500 shadow-lg shadow-cyan-500/30' : (isDarkMode ? 'border-gray-700' : 'border-gray-300 shadow-inner')}`}>
                                                        {selectedSessions.includes(sName) && <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-black">✓</div>}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest truncate ${selectedSessions.includes(sName) ? 'text-cyan-500' : (isDarkMode ? 'text-gray-400' : 'text-gray-600')}`}>{sName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Period Select */}
                        <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                            <FaCalendarAlt className="text-cyan-500 text-sm" />
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className={`bg-transparent text-[10px] focus:outline-none cursor-pointer font-black uppercase tracking-widest appearance-none pr-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                            >
                                <option value="This Month" className={isDarkMode ? "bg-[#0f1215]" : ""}>Reporting Cycle</option>
                                <option value="Last Month" className={isDarkMode ? "bg-[#0f1215]" : ""}>Historical Month</option>
                                <option value="This Quarter" className={isDarkMode ? "bg-[#0f1215]" : ""}>Quarterly Mapping</option>
                                <option value="From April 1st" className={isDarkMode ? "bg-[#0f1215]" : ""}>Fiscal Year Map</option>
                                <option value="Last Year" className={isDarkMode ? "bg-[#0f1215]" : ""}>Past Fiscal Horizon</option>
                                <option value="All Time" className={isDarkMode ? "bg-[#0f1215]" : ""}>Infinity Ledger</option>
                                <option value="Custom" className={isDarkMode ? "bg-[#0f1215]" : ""}>Custom Parameter</option>
                            </select>
                        </div>

                        {selectedPeriod === "Custom" && (
                            <div className="flex items-center gap-3 px-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={`text-[10px] px-4 py-2.5 rounded-xl border outline-none focus:border-cyan-500 font-black uppercase tracking-widest [color-scheme:dark] ${isDarkMode ? 'bg-white/5 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200 shadow-inner'}`}
                                />
                                <span className="text-gray-500 text-[10px] font-black">---</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={`text-[10px] px-4 py-2.5 rounded-xl border outline-none focus:border-cyan-500 font-black uppercase tracking-widest [color-scheme:dark] ${isDarkMode ? 'bg-white/5 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-200 shadow-inner'}`}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchAnalytics}
                                className={`p-3.5 rounded-2xl border transition-all duration-300 group active:scale-95 shadow-xl ${isDarkMode ? 'bg-white/5 hover:bg-cyan-500/10 text-cyan-400 border-gray-800' : 'bg-white hover:bg-cyan-50 text-cyan-600 border-gray-200 shadow-sm'}`}
                            >
                                <FaSync className={`transition-transform duration-700 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-3 px-6 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-cyan-600/20 active:scale-95"
                            >
                                <FaDownload size={14} /> EXPORT LEDGER
                            </button>
                            <button
                                onClick={resetFilters}
                                className={`p-3.5 rounded-2xl border transition-all duration-300 active:scale-95 shadow-xl ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white border-gray-200 text-red-500 hover:bg-red-500 hover:text-white shadow-sm'}`}
                            >
                                <FaFilter size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="relative w-24 h-24">
                            <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-cyan-500 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                                <FaChartLine size={32} className="animate-pulse" />
                            </div>
                        </div>
                        <p className="text-gray-500 font-black tracking-[0.4em] text-[10px] uppercase mt-12 animate-pulse italic">Aggregating Global Fiscal Streams...</p>
                    </div>
                ) : (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        {/* High-Level Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <StatCard
                                title="GROSS BILLING PROTOCOL"
                                amount={analytics.fiscalWithGst}
                                subtitle="Authorized FY Cycle (GST Incl.)"
                                colorClass="bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-cyan-500/20"
                                icon={<FaChartLine size={24} />}
                                trend={12}
                            />
                            <StatCard
                                title="CORE ASSET REVENUE"
                                amount={analytics.fiscalWithoutGst}
                                subtitle="Operational Base Income"
                                colorClass="bg-gradient-to-r from-emerald-600 to-cyan-400 shadow-lg shadow-emerald-500/20"
                                icon={<FaMoneyBillWave size={24} />}
                                trend={8}
                            />
                            <StatCard
                                title="REALIZED LIQUIDITY"
                                amount={analytics.totalAmountCame}
                                subtitle="Total Settled Portfolio"
                                colorClass="bg-gradient-to-r from-purple-600 to-blue-500 shadow-lg shadow-purple-500/20"
                                icon={<FaMoneyBillWave size={24} />}
                                trend={-3}
                            />
                            <StatCard
                                title="SELECTION AUDIT"
                                amount={analytics.selectionWithoutGst}
                                subtitle="Active Parameter Revenue"
                                colorClass="bg-gradient-to-r from-red-600 to-pink-500 shadow-lg shadow-red-500/20"
                                icon={<FaFilter size={24} />}
                                trend={5}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Revenue Trend Chart */}
                            <div className={`lg:col-span-2 p-10 rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-cyan-500 via-blue-500 to-transparent opacity-20 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <div className="flex justify-between items-center mb-12 relative z-10">
                                    <div>
                                        <h3 className={`font-black uppercase italic tracking-tighter text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Performance Horizon</h3>
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Temporal revenue growth mapping</p>
                                    </div>
                                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full border shadow-inner ${isDarkMode ? 'bg-white/5 border-gray-800 text-cyan-400' : 'bg-gray-50 border-gray-100 text-cyan-600'}`}>
                                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                                        <span className="text-[10px] font-black tracking-widest uppercase">Live Metrics</span>
                                    </div>
                                </div>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analytics.trendData}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1f2937" : "#f1f5f9"} vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#6b7280"
                                                fontSize={10}
                                                fontWeight="900"
                                                tickLine={false}
                                                axisLine={false}
                                                dy={15}
                                                tick={{ fill: '#6b7280', textTransform: 'uppercase' }}
                                            />
                                            <YAxis
                                                stroke="#6b7280"
                                                fontSize={10}
                                                fontWeight="900"
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => `₹${value / 1000}k`}
                                                tick={{ fill: '#6b7280' }}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#06b6d4', strokeWidth: 2, strokeDasharray: '5 5' }} />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#06b6d4"
                                                strokeWidth={5}
                                                fillOpacity={1}
                                                fill="url(#colorRev)"
                                                animationDuration={3000}
                                                activeDot={{ r: 8, fill: '#06b6d4', stroke: '#fff', strokeWidth: 3, shadow: '0 0 20px rgba(6,182,212,0.8)' }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Payment Method Distribution */}
                            <div className={`p-10 rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] flex flex-col h-full transition-all duration-500 group relative overflow-hidden ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <h3 className={`font-black uppercase italic tracking-tighter text-2xl mb-2 relative z-10 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Protocol Mix</h3>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-10 relative z-10 italic">Instrument distribution analysis</p>
                                
                                <div className="flex-1 min-h-[320px] relative z-10">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentBreakdownData}
                                                innerRadius={90}
                                                outerRadius={120}
                                                paddingAngle={8}
                                                dataKey="value"
                                                animationBegin={500}
                                                animationDuration={2000}
                                            >
                                                {paymentBreakdownData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend
                                                verticalAlign="bottom"
                                                align="center"
                                                iconType="diamond"
                                                iconSize={10}
                                                formatter={(value) => <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                <div className="mt-10 space-y-4 relative z-10">
                                    {paymentBreakdownData.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className={`flex justify-between items-center p-5 rounded-2xl border transition-all duration-500 group/item hover:translate-x-2 ${isDarkMode ? 'bg-white/5 border-gray-800 hover:border-cyan-500/30' : 'bg-gray-50 border-gray-100 hover:border-cyan-500/30 shadow-inner'}`}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className={`font-black text-[10px] italic transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{Math.round((item.value / analytics.totalAmountCame) * 100)}%</span>
                                                <span className={`font-black text-sm tabular-nums tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(item.value)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-500/5 blur-3xl group-hover:bg-cyan-500/10 transition-all duration-1000"></div>
                            </div>
                        </div>

                        {/* Centre Distribution Stacked Bar Chart */}
                        <div className={`p-10 rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden group transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] -z-10"></div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 relative z-10">
                                <div>
                                    <h3 className={`font-black uppercase italic tracking-tighter text-2xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Structural Revenue Mix</h3>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Cross-node instrument analysis</p>
                                </div>
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="hidden xl:flex gap-3">
                                        {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'PENDING'].map((method, idx) => (
                                            <div key={method} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-white/5 border-gray-800 shadow-inner' : 'bg-gray-50 border-gray-100 shadow-sm'}`}>
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{method.replace('_', ' ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`p-4 rounded-2xl shadow-xl transition-all duration-500 ${isDarkMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-100'}`}>
                                        <FaBuilding size={24} className="group-hover:scale-110 transition-transform" />
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto pb-8 custom-scrollbar">
                                <div style={{ minWidth: Math.max(1400, analytics.centreData.length * 120) }} className="h-[500px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={analytics.centreData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                                            barGap={8}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#1f2937" : "#f1f5f9"} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6b7280', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' }}
                                                interval={0}
                                                angle={-45}
                                                textAnchor="end"
                                                dy={20}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#6b7280', fontSize: 10, fontWeight: '900' }}
                                                tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                                cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.01)', radius: 10 }}
                                            />
                                            <Bar dataKey="CASH" stackId="a" fill={COLORS[0]} barSize={50}>
                                                <LabelList dataKey="CASH" position="inside" fill="#fff" fontSize={9} fontWeight="black" formatter={(v) => v > 10000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                            <Bar dataKey="UPI" stackId="a" fill={COLORS[1]}>
                                                <LabelList dataKey="UPI" position="inside" fill="#fff" fontSize={9} fontWeight="black" formatter={(v) => v > 10000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                            <Bar dataKey="BANK_TRANSFER" stackId="a" fill={COLORS[2]}>
                                                <LabelList dataKey="BANK_TRANSFER" position="inside" fill="#fff" fontSize={9} fontWeight="black" formatter={(v) => v > 10000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                            <Bar dataKey="CHEQUE" stackId="a" fill={COLORS[3]}>
                                                <LabelList dataKey="CHEQUE" position="inside" fill="#fff" fontSize={9} fontWeight="black" formatter={(v) => v > 10000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                            <Bar dataKey="CHEQUE_PENDING" stackId="a" fill={COLORS[4]} radius={[10, 10, 0, 0]}>
                                                <LabelList dataKey="CHEQUE_PENDING" position="inside" fill="#fff" fontSize={9} fontWeight="black" formatter={(v) => v > 10000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table Section */}
                        <div className={`p-10 rounded-[3rem] border shadow-[0_40px_100px_rgba(0,0,0,0.4)] relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-12 relative z-10">
                                <div>
                                    <h3 className={`font-black uppercase italic tracking-tighter text-2xl mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Protocol Audit Ledger</h3>
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest italic leading-relaxed max-w-xl">Cross-referenced archival verification of all fiscal instruments processed within the selected temporal horizon.</p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <p className="text-[10px] font-black text-gray-500 tracking-[0.3em] uppercase mb-2">Total Settled Portfolio</p>
                                    <h2 className={`text-5xl font-black tracking-tighter italic tabular-nums leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(analytics.totalAmountCame)}</h2>
                                </div>
                            </div>

                            <div className="overflow-x-auto relative z-10">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className={`border-b text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                            <th className="py-6 px-4">Instrument Protocol</th>
                                            <th className="py-6 px-4">Contribution Velocity</th>
                                            <th className="py-6 px-4 text-right">Settled Asset Value</th>
                                            <th className="py-6 px-4 text-right">Verification</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/30' : 'divide-gray-100'}`}>
                                        {Object.entries(analytics.paymentBreakdown).map(([key, val], idx) => (
                                            <tr key={idx} className={`transition-all group ${isDarkMode ? 'hover:bg-white/5 bg-transparent' : 'hover:bg-cyan-500/[0.02] bg-white'}`}>
                                                <td className="py-8 px-4">
                                                    <div className={`flex items-center gap-4 font-black text-base uppercase italic tracking-tighter leading-none transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        <div className="w-3 h-3 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                        {key.replace('_', ' ')}
                                                    </div>
                                                </td>
                                                <td className="py-8 px-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-64 h-2 rounded-full overflow-hidden shadow-inner ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}>
                                                            <div
                                                                className="h-full bg-cyan-500 rounded-full transition-all duration-2000 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                                                style={{ width: `${(val / analytics.totalAmountCame) * 100 || 0}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-500 tabular-nums">{Math.round((val / analytics.totalAmountCame) * 100 || 0)}%</span>
                                                    </div>
                                                </td>
                                                <td className={`py-8 px-4 text-right font-black text-xl tabular-nums tracking-tighter italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(val)}</td>
                                                <td className="py-8 px-4 text-right">
                                                    <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-inner ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                        Verified Archival
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-500/5 blur-[100px] -z-10"></div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default FinancialAnalysis;
