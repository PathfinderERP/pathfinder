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
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
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

    const COLORS = ['#00C49F', '#cc4387ff', '#FFBB28', '#FF8042', '#0088FE', '#FF3D67'];

    useEffect(() => {
        const init = async () => {
            const perms = await fetchUserPermissions();
            setAllowedCentres(perms);

            const loadedCentres = await fetchCentres(perms);
            await fetchSessions();

            if (perms !== null && loadedCentres && loadedCentres.length > 0) {
                // By default select nothing (all allowed) or first one? 
                // Let's keep it empty for "All Allowed"
            }

            setIsReady(true);
        };
        init();

        // Auto-refresh every 5 minutes
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

                // Default to All Sessions for comparison with Transaction List
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
            if (selectedSessions.length > 0) params.append("session", selectedSessions[0]); // Backend handles single session for now or I can update it
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

        // Overview Data
        const overviewData = [
            ["Metric", "Value"],
            ["Gross Billing", analytics.totalAmountToCome],
            ["Realized Revenue", analytics.totalAmountCame],
            ["Expected Receivables", analytics.amountWillCome],
            ["Total Overdue", analytics.totalDue]
        ];
        const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

        // Breakdown Data
        const breakdownHeaders = ["Instrument", "Amount"];
        const breakdownRows = Object.entries(analytics.paymentBreakdown).map(([k, v]) => [k, v]);
        const wsBreakdown = XLSX.utils.aoa_to_sheet([breakdownHeaders, ...breakdownRows]);
        XLSX.utils.book_append_sheet(wb, wsBreakdown, "Payment Breakdown");

        // Centre Data
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
            prev.includes(name) ? prev.filter(i => i !== name) : [name] // Keeping it single for simplicity or can be multi
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
        <div className={`p-5 rounded-[5px] border transition-all hover:border-cyan-500/50 group relative overflow-hidden shadow-xl ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className={`absolute top-0 left-0 w-full h-[2px] ${colorClass}`}></div>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-[5px] transition-all duration-300 ${isDarkMode ? 'bg-gray-800/50 text-cyan-400' : 'bg-cyan-50 text-cyan-600'} group-hover:bg-cyan-500 group-hover:text-white`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
                <h3 className={`text-2xl font-black mb-1 tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(amount)}</h3>
                <p className={`text-[10px] font-medium italic ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>{subtitle}</p>
            </div>
        </div>
    );

    const paymentBreakdownData = Object.entries(analytics.paymentBreakdown)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
            return (
                <div className={`border p-3 rounded-[5px] shadow-2xl backdrop-blur-md ${isDarkMode ? 'bg-[#11161a]/90 border-gray-800' : 'bg-white/90 border-gray-200'}`}>
                    <p className="text-gray-400 text-[10px] uppercase font-black mb-1">{label}</p>
                    <p className="text-cyan-500 font-bold text-lg">{formatCurrency(total)}</p>
                    <div className={`mt-2 pt-2 border-t space-y-1 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        {payload.map((entry, idx) => (
                            <div key={idx} className="flex justify-between gap-4 text-[9px] font-bold">
                                <span className="text-gray-500 uppercase">{entry.name}:</span>
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
            <div className={`p-4 md:p-10 max-w-[1800px] mx-auto min-h-screen pb-20 transition-colors duration-500 ${isDarkMode ? 'bg-[#0d0f11]' : 'bg-gray-50'}`}>
                <ToastContainer position="top-right" theme="dark" />

                {/* Glassmorphic Header */}
                <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 p-6 rounded-[5px] border backdrop-blur-xl relative z-50 transition-all ${isDarkMode ? 'bg-[#1a1f24]/50 border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-[5px]"></div>
                        <div className="flex items-center gap-4 mb-2 relative z-10">
                            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[5px] text-white shadow-lg shadow-cyan-500/20">
                                <FaChartLine size={28} />
                            </div>
                            <div>
                                <h1 className={`text-3xl font-black tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment <span className="text-cyan-500">Analysis</span></h1>
                                <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mt-1">Real-time Financial Intelligence Unit</p>
                            </div>
                        </div>
                    </div>

                    <div className={`flex flex-wrap items-center gap-4 p-3 rounded-[5px] border backdrop-blur-md relative z-50 transition-all ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                        {/* Centres Multi-select */}
                        <div className="relative group">
                            <div
                                onClick={() => setIsCentreDropdownOpen(!isCentreDropdownOpen)}
                                className={`flex items-center gap-3 px-4 py-2 rounded-[5px] border transition-all cursor-pointer min-w-[200px] ${isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:border-cyan-500' : 'bg-white border-gray-200 hover:border-cyan-500'}`}
                            >
                                <FaBuilding className="text-cyan-500 text-sm" />
                                <span className={`text-[10px] font-black uppercase tracking-wider truncate flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                    {selectedCentres.length === 0 ? "All Global Centres" : `${selectedCentres.length} Centres`}
                                </span>
                                <FaChevronDown className={`text-gray-500 text-[10px] transform transition-transform ${isCentreDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isCentreDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-2 w-64 border rounded-[5px] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                    <div className={`p-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <div className="relative">
                                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" />
                                            <input
                                                type="text"
                                                placeholder="SEARCH CENTRES..."
                                                value={centreSearch}
                                                onChange={(e) => setCentreSearch(e.target.value)}
                                                className={`w-full rounded-[5px] py-2 pl-8 pr-3 text-[10px] font-black uppercase outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {centres.filter(c => c.centreName.toLowerCase().includes(centreSearch.toLowerCase())).map(c => (
                                            <div
                                                key={c._id}
                                                onClick={() => toggleCentre(c._id)}
                                                className={`px-4 py-3 hover:bg-cyan-500/10 flex items-center gap-3 cursor-pointer transition-colors border-b last:border-0 ${isDarkMode ? 'border-gray-800/50' : 'border-gray-50'}`}
                                            >
                                                <div className={`w-3 h-3 rounded border ${selectedCentres.includes(c._id) ? 'bg-cyan-500 border-cyan-500' : (isDarkMode ? 'border-gray-600' : 'border-gray-300')} flex items-center justify-center`}>
                                                    {selectedCentres.includes(c._id) && <div className="w-1.5 h-1.5 bg-white rounded-[5px]"></div>}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{c.centreName}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="w-[1px] h-8 bg-gray-800 hidden lg:block"></div>

                        {/* Sessions Filter */}
                        <div className="relative group">
                            <div
                                onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
                                className={`flex items-center gap-3 px-4 py-2 rounded-[5px] border transition-all cursor-pointer min-w-[180px] ${isDarkMode ? 'bg-gray-800/50 border-gray-700 hover:border-cyan-500' : 'bg-white border-gray-200 hover:border-cyan-500'}`}
                            >
                                <FaFilter className="text-cyan-500 text-sm" />
                                <span className={`text-[10px] font-black uppercase tracking-wider truncate flex-1 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                                    {selectedSessions.length === 0 ? "All Sessions" : selectedSessions[0]}
                                </span>
                                <FaChevronDown className={`text-gray-500 text-[10px] transform transition-transform ${isSessionDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {isSessionDropdownOpen && (
                                <div className={`absolute top-full left-0 mt-2 w-64 border rounded-[5px] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                    <div className={`p-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                        <div className="relative">
                                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]" />
                                            <input
                                                type="text"
                                                placeholder="SEARCH SESSIONS..."
                                                value={sessionSearch}
                                                onChange={(e) => setSessionSearch(e.target.value)}
                                                className={`w-full rounded-[5px] py-2 pl-8 pr-3 text-[10px] font-black uppercase outline-none focus:border-cyan-500 ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        <div
                                            onClick={() => { setSelectedSessions([]); setIsSessionDropdownOpen(false); }}
                                            className={`px-4 py-3 hover:bg-cyan-500/10 flex items-center gap-3 cursor-pointer transition-colors border-b ${isDarkMode ? 'border-gray-800/50' : 'border-gray-50'}`}
                                        >
                                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest truncate italic">Reset to All Sessions</span>
                                        </div>
                                        {sessions.filter(s => (s.sessionName || s.name).toLowerCase().includes(sessionSearch.toLowerCase())).map(s => {
                                            const sName = s.sessionName || s.name;
                                            return (
                                                <div
                                                    key={s._id}
                                                    onClick={() => { toggleSession(sName); setIsSessionDropdownOpen(false); }}
                                                    className={`px-4 py-3 hover:bg-cyan-500/10 flex items-center gap-3 cursor-pointer transition-colors border-b last:border-0 ${isDarkMode ? 'border-gray-800/50' : 'border-gray-50'}`}
                                                >
                                                    <div className={`w-3 h-3 rounded border ${selectedSessions.includes(sName) ? 'bg-cyan-500 border-cyan-500' : (isDarkMode ? 'border-gray-600' : 'border-gray-300')} flex items-center justify-center`}>
                                                        {selectedSessions.includes(sName) && <div className="w-1.5 h-1.5 bg-white rounded-[5px]"></div>}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{sName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="w-[1px] h-8 bg-gray-800 hidden lg:block"></div>

                        {/* Period Select */}
                        <div className="flex items-center gap-3 px-3">
                            <FaCalendarAlt className="text-cyan-500 text-sm" />
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className={`bg-transparent text-[10px] focus:outline-none cursor-pointer font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                            >
                                <option value="This Month" className={isDarkMode ? "bg-[#1a1f24] text-white" : "bg-white text-gray-800"}>Reporting Month</option>
                                <option value="Last Month" className={isDarkMode ? "bg-[#1a1f24] text-white" : "bg-white text-gray-800"}>Previous Month</option>
                                <option value="This Quarter" className={isDarkMode ? "bg-[#1a1f24] text-white" : "bg-white text-gray-800"}>Quarterly View</option>
                                <option value="From April 1st" className={isDarkMode ? "bg-[#1a1f24] text-white" : "bg-white text-gray-800"}>Financial Year</option>
                                <option value="Last Year" className={isDarkMode ? "bg-[#1a1f24] text-white" : "bg-white text-gray-800"}>Last Financial Year</option>
                                <option value="All Time" className={isDarkMode ? "bg-[#1a1f24] text-white" : "bg-white text-gray-800"}>Historical Data</option>
                                <option value="Custom" className={isDarkMode ? "bg-[#1a1f24] text-white" : "bg-white text-gray-800"}>Custom Range</option>
                            </select>
                        </div>

                        {selectedPeriod === "Custom" && (
                            <>
                                <div className="w-[1px] h-8 bg-gray-800 hidden lg:block"></div>
                                <div className="flex items-center gap-2 px-3">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className={`text-[10px] px-2 py-1 rounded-[5px] border outline-none focus:border-cyan-500 font-black ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}
                                    />
                                    <span className="text-gray-500 text-[10px] font-black">TO</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className={`text-[10px] px-2 py-1 rounded-[5px] border outline-none focus:border-cyan-500 font-black ${isDarkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}
                                    />
                                </div>
                            </>
                        )}

                        <div className="w-[1px] h-8 bg-gray-800 hidden lg:block"></div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchAnalytics}
                                className={`p-3 rounded-[5px] border transition-all group ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-cyan-400 border-gray-700' : 'bg-white hover:bg-gray-50 text-cyan-600 border-gray-200'}`}
                                title="Refresh Data"
                            >
                                <FaSync className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-[5px] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20"
                            >
                                <FaDownload />
                                EXPORT
                            </button>
                            <button
                                onClick={resetFilters}
                                className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-[5px] border border-red-500/20 transition-all group"
                                title="Reset All Filters"
                            >
                                <FaFilter />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="relative w-20 h-20">
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500/20 rounded-[5px]"></div>
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500 border-t-transparent rounded-[5px] animate-spin"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500">
                                <FaChartLine size={24} className="animate-pulse" />
                            </div>
                        </div>
                        <p className="text-cyan-500 font-black tracking-[0.3em] text-[10px] uppercase mt-8 animate-pulse">Processing Neural Analytics...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* High-Level Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="FISCAL TOTAL (INC. GST)"
                                amount={analytics.fiscalWithGst}
                                subtitle="From April 1st, 2026"
                                colorClass="bg-gradient-to-r from-blue-600 to-cyan-500"
                                icon={<FaChartLine size={20} />}
                                trend={12}
                            />
                            <StatCard
                                title="FISCAL REVENUE (BASE)"
                                amount={analytics.fiscalWithoutGst}
                                subtitle="FY Base Income"
                                colorClass="bg-gradient-to-r from-green-600 to-emerald-500"
                                icon={<FaMoneyBillWave size={20} />}
                                trend={8}
                            />
                            <StatCard
                                title="SELECTION TOTAL (INC. GST)"
                                amount={analytics.totalAmountCame}
                                subtitle="Total Paid (All Modes)"
                                colorClass="bg-gradient-to-r from-purple-600 to-pink-500"
                                icon={<FaMoneyBillWave size={20} />}
                                trend={-3}
                            />
                            <StatCard
                                title="SELECTION REVENUE (BASE)"
                                amount={analytics.selectionWithoutGst}
                                subtitle="Matching Current Filter"
                                colorClass="bg-gradient-to-r from-red-600 to-orange-500"
                                icon={<FaFilter size={20} />}
                                trend={5}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Revenue Trend Chart */}
                            <div className={`lg:col-span-2 p-8 rounded-[5px] border shadow-2xl relative overflow-hidden group transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent opacity-30"></div>
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className={`font-black uppercase italic tracking-tighter text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Revenue Performance Trend</h3>
                                    <div className={`flex items-center gap-2 text-[10px] font-black tracking-widest px-3 py-1 rounded-[5px] border ${isDarkMode ? 'text-gray-500 bg-gray-900/50 border-gray-800' : 'text-gray-400 bg-gray-50 border-gray-100'}`}>
                                        <div className="w-2 h-2 rounded-[5px] bg-cyan-500"></div>
                                        MONTHLY GROWTH
                                    </div>
                                </div>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analytics.trendData}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#4a5568"
                                                fontSize={10}
                                                fontWeight="bold"
                                                tickLine={false}
                                                axisLine={false}
                                                dy={10}
                                            />
                                            <YAxis
                                                stroke="#4a5568"
                                                fontSize={10}
                                                fontWeight="bold"
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => `₹${value / 1000}k`}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="#06b6d4"
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorRev)"
                                                animationDuration={2000}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Payment Method Distribution */}
                            <div className={`p-8 rounded-[5px] border shadow-2xl flex flex-col h-full transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                                <h3 className={`font-black uppercase italic tracking-tighter text-lg mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Payment Mix</h3>
                                <div className="flex-1 min-h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentBreakdownData}
                                                innerRadius={80}
                                                outerRadius={110}
                                                paddingAngle={5}
                                                dataKey="value"
                                                animationBegin={500}
                                            >
                                                {paymentBreakdownData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend
                                                verticalAlign="bottom"
                                                align="center"
                                                iconType="circle"
                                                formatter={(value) => <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-8 space-y-3">
                                    {paymentBreakdownData.slice(0, 3).map((item, idx) => (
                                        <div key={idx} className={`flex justify-between items-center p-3 rounded-[5px] border transition-all ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.name}</span>
                                            <span className={`font-bold ml-auto mr-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-600'}`}>{Math.round((item.value / analytics.totalAmountCame) * 100)}%</span>
                                            <span className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(item.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Centre Distribution Stacked Bar Chart */}
                        <div className={`p-8 rounded-[5px] border shadow-2xl relative overflow-hidden group transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px]"></div>
                            <div className="flex justify-between items-center mb-8 relative z-10">
                                <div>
                                    <h3 className={`font-black uppercase italic tracking-tighter text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Revenue Mix by Global Centre</h3>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Scroll horizontally to view all centres</p>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="flex gap-2">
                                        {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CHEQUE_PENDING'].map((method, idx) => (
                                            <div key={method} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border ${isDarkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                                                <div className="w-2 h-2 rounded-[5px]" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{method.replace('_', ' ')}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-2 bg-cyan-500/10 rounded-[5px] text-cyan-400">
                                        <FaBuilding size={20} />
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto pb-4 custom-scrollbar">
                                <div style={{ minWidth: Math.max(1200, analytics.centreData.length * 100) }} className="h-[450px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={analytics.centreData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2d3748" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#4a5568', fontSize: 10, fontWeight: '900' }}
                                                interval={0}
                                                angle={-45}
                                                textAnchor="end"
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#4a5568', fontSize: 10, fontWeight: '900' }}
                                                tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            />
                                            <Bar dataKey="CASH" stackId="a" fill={COLORS[0]}>
                                                <LabelList dataKey="CASH" position="inside" fill="#fff" fontSize={8} fontWeight="bold" formatter={(v) => v > 5000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                            <Bar dataKey="UPI" stackId="a" fill={COLORS[1]}>
                                                <LabelList dataKey="UPI" position="inside" fill="#fff" fontSize={8} fontWeight="bold" formatter={(v) => v > 5000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                            <Bar dataKey="BANK_TRANSFER" stackId="a" fill={COLORS[2]}>
                                                <LabelList dataKey="BANK_TRANSFER" position="inside" fill="#fff" fontSize={8} fontWeight="bold" formatter={(v) => v > 5000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                            <Bar dataKey="CHEQUE" stackId="a" fill={COLORS[3]}>
                                                <LabelList dataKey="CHEQUE" position="inside" fill="#fff" fontSize={8} fontWeight="bold" formatter={(v) => v > 5000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                            <Bar dataKey="CHEQUE_PENDING" stackId="a" fill={COLORS[4]} radius={5}>
                                                <LabelList dataKey="CHEQUE_PENDING" position="inside" fill="#fff" fontSize={8} fontWeight="bold" formatter={(v) => v > 5000 ? `₹${(v / 1000).toFixed(0)}k` : ''} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table Section (Simulated) */}
                        <div className={`p-8 rounded-[5px] border shadow-2xl relative overflow-hidden transition-all ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200'}`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px]"></div>
                            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 relative z-10">
                                <div>
                                    <h3 className={`font-black uppercase italic tracking-tighter text-xl mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Detailed Financial Breakdown</h3>
                                    <p className="text-gray-500 text-xs font-bold leading-relaxed">Cross-referenced audit of all financial instruments for the current reporting cycle.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-1">Portfolio Value</p>
                                    <h2 className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(analytics.totalAmountCame)}</h2>
                                </div>
                            </div>

                            <div className="overflow-x-auto relative z-10">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-800">
                                            <th className="py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Instrument</th>
                                            <th className="py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Volume Contribution</th>
                                            <th className="py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Settled Amount</th>
                                            <th className="py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-800/50' : 'divide-gray-100'}`}>
                                        {Object.entries(analytics.paymentBreakdown).map(([key, val], idx) => (
                                            <tr key={idx} className={`transition-all group ${isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                                                <td className="py-6">
                                                    <div className={`flex items-center gap-3 font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                                        <div className={`w-2 h-2 rounded-[5px] ${COLORS[idx % COLORS.length]}`}></div>
                                                        {key}
                                                    </div>
                                                </td>
                                                <td className="py-6">
                                                    <div className="w-48 h-1.5 bg-gray-800 rounded-[5px] overflow-hidden">
                                                        <div
                                                            className="h-full bg-cyan-500 rounded-[5px] transition-all duration-1000"
                                                            style={{ width: `${(val / analytics.totalAmountCame) * 100 || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td className="py-6 text-right font-black transition-colors ${isDarkMode ? 'text-white' : 'text-gray-900'}">{formatCurrency(val)}</td>
                                                <td className="py-6 text-right">
                                                    <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-[5px] uppercase tracking-widest border border-green-500/20">
                                                        Audited
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default FinancialAnalysis;
