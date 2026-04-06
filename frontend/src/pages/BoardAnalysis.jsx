import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { 
    FaChartPie, FaUsers, FaMoneyBillWave, FaCalendarAlt, FaFilter, 
    FaArrowUp, FaArrowDown, FaBuilding, FaGlobe, FaSearch, FaSync,
    FaArrowRight
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line
} from 'recharts';
import Select from "react-select";
import { useTheme } from "../context/ThemeContext";

const BoardAnalysis = () => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);

    const customSelectStyles = {
        control: (base) => ({
            ...base,
            backgroundColor: theme === "dark" ? "#1a1f24" : "#ffffff",
            borderColor: theme === "dark" ? "#2d3748" : "#edf2f7",
            color: theme === "dark" ? "#ffffff" : "#1a1f24",
            borderRadius: "1rem",
            padding: "2px",
            fontSize: "0.875rem",
            fontWeight: "bold",
            boxShadow: "none",
            "&:hover": {
                borderColor: "#06b6d4"
            }
        }),
        menu: (base) => ({
            ...base,
            backgroundColor: theme === "dark" ? "#1a1f24" : "#ffffff",
            borderRadius: "1rem",
            overflow: "hidden",
            zIndex: 100
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused 
                ? (theme === "dark" ? "#2d3748" : "#f7fafc")
                : "transparent",
            color: theme === "dark" ? "#ffffff" : "#1a1f24",
            cursor: "pointer",
            fontSize: "0.875rem"
        }),
        singleValue: (base) => ({
            ...base,
            color: theme === "dark" ? "#ffffff" : "#1a1f24"
        })
    };
    const [selectedCentre, setSelectedCentre] = useState("");
    const [allowedCentres, setAllowedCentres] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [centres, setCentres] = useState([]);
    const [analytics, setAnalytics] = useState({
        overview: {
            totalAdmissions: 0,
            totalExpected: 0,
            totalPaid: 0,
            totalWaiver: 0
        },
        byCentre: [],
        byBoard: [],
        byMonth: []
    });

    const COLORS = ['#00C49F', '#8884d8', '#FFBB28', '#FF8042', '#0088FE', '#FF3D67', '#06b6d4', '#8b5cf6'];

    useEffect(() => {
        const init = async () => {
            try {
                const perms = await fetchUserPermissions();
                setAllowedCentres(perms);
                const loadedCentres = await fetchCentres(perms);
                setIsReady(true);
            } catch (err) {
                console.error("Initialization failed", err);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (isReady) {
            fetchAnalytics();
        }
    }, [isReady, selectedCentre]);

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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/master-data/centre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                let filtered = data;
                const perms = allowedOverride !== undefined ? allowedOverride : allowedCentres;

                if (perms !== null) {
                    filtered = data.filter(c => perms.includes(c.centreName));
                }

                setCentres(filtered);
                return filtered;
            }
        } catch (error) {
            console.error("Error fetching centres:", error);
            return [];
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams();
            if (selectedCentre) params.append("centre", selectedCentre);

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/board-admission/analysis?${params.toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const data = await response.json();
            if (response.ok && data.success) {
                setAnalytics(data);
            } else {
                toast.error(data.message || "Failed to fetch board analysis");
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

    const StatCard = ({ title, amount, subtitle, colorClass, icon, trend, prefix = "" }) => (
        <div className={`bg-white dark:bg-[#1a1f24] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 transition-all hover:border-cyan-500/50 group relative overflow-hidden shadow-sm hover:shadow-xl`}>
            <div className={`absolute top-0 left-0 w-full h-[3px] ${colorClass}`}></div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300">
                    {icon}
                </div>
            </div>
            <div>
                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">
                    {prefix}{amount.toLocaleString()}
                </h3>
                <p className="text-gray-400 dark:text-gray-600 text-[10px] font-medium italic">{subtitle}</p>
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-[#11161a] border border-gray-100 dark:border-gray-800 p-3 rounded-2xl shadow-2xl">
                    <p className="text-gray-400 text-[10px] uppercase font-black mb-1">{label}</p>
                    <p className="text-cyan-500 font-bold text-lg">{formatCurrency(payload[0].value)}</p>
                    {payload[1] && <p className="text-emerald-500 text-xs font-bold mt-1">Paid: {formatCurrency(payload[1].value)}</p>}
                </div>
            );
        }
        return null;
    };

    return (
        <Layout activePage="Admissions">
            <div className="p-4 space-y-8 animate-fade-in pb-20">
                <ToastContainer position="top-right" theme="dark" />

                {/* Cyber Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white/80 dark:bg-[#1a1f24]/50 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 backdrop-blur-xl shadow-2xl">
                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full"></div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="p-4 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-[1.5rem] text-white shadow-2xl shadow-cyan-500/30">
                                <FaChartPie size={32} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                    Board <span className="text-cyan-500">Analysis</span>
                                </h1>
                                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-black tracking-[0.3em] uppercase mt-2">Strategic Enrollment Intelligence Unit</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        {/* Global Centre Hub Filter */}
                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-2 pl-6 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 min-w-[320px]">
                            <FaGlobe className="text-cyan-500 text-xl" />
                            <div className="flex-1">
                                <p className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1 ml-1">Reporting Node</p>
                                <Select
                                    placeholder="SELECT GLOBAL NODE"
                                    isClearable
                                    options={centres.map(c => ({ value: c.centreName, label: c.centreName.toUpperCase() }))}
                                    onChange={(option) => setSelectedCentre(option ? option.value : "")}
                                    styles={customSelectStyles}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={fetchAnalytics}
                            className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-cyan-500 hover:bg-cyan-500 hover:text-white transition-all shadow-lg active:scale-95"
                        >
                            <FaSync className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="relative w-24 h-24">
                            <div className="absolute top-0 left-0 w-full h-full border-[6px] border-cyan-500/10 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-full h-full border-[6px] border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-cyan-500">
                                <FaGlobe size={32} className="animate-pulse" />
                            </div>
                        </div>
                        <p className="text-cyan-500 font-black tracking-[0.4em] text-[10px] uppercase mt-10 animate-pulse">Synchronizing Global Indices...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Stats Matrix */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard
                                title="Net Admissions"
                                amount={analytics.overview.totalAdmissions}
                                subtitle="Confirmed Board Enrollments"
                                colorClass="bg-gradient-to-r from-blue-500 to-cyan-400"
                                icon={<FaUsers size={20} />}
                            />
                            <StatCard
                                title="Projected Revenue"
                                amount={analytics.overview.totalExpected}
                                subtitle="Total Fee Value (Excl. Gaps)"
                                colorClass="bg-gradient-to-r from-indigo-500 to-blue-400"
                                icon={<FaMoneyBillWave size={20} />}
                                prefix="₹"
                            />
                            <StatCard
                                title="Liquid Collection"
                                amount={analytics.overview.totalPaid}
                                subtitle="Current Realized CashFlow"
                                colorClass="bg-gradient-to-r from-emerald-500 to-green-400"
                                icon={<FaMoneyBillWave size={20} />}
                                prefix="₹"
                            />
                            <StatCard
                                title="Strategic Waivers"
                                amount={analytics.overview.totalWaiver}
                                subtitle="Scholarships & Concessions"
                                colorClass="bg-gradient-to-r from-orange-500 to-yellow-400"
                                icon={<FaArrowDown size={20} />}
                                prefix="₹"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Growth Vectors Chart */}
                            <div className="lg:col-span-2 bg-white dark:bg-[#1a1f24] p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl group">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-gray-900 dark:text-white font-black uppercase italic tracking-tighter text-xl">Enrollment Growth Vector</h3>
                                    <div className="flex bg-gray-50 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <div className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-[10px] font-black uppercase">Volume</div>
                                    </div>
                                </div>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analytics.byMonth.map(m => ({ 
                                            name: `${m._id.month}/${m._id.year}`, 
                                            count: m.count,
                                            paid: m.paid 
                                        }))}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={document.documentElement.classList.contains('dark') ? "#2d3748" : "#edf2f7"} vertical={false} />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                                            <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={5} fillOpacity={1} fill="url(#colorCount)" animationDuration={2000} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Board Mix */}
                            <div className="bg-white dark:bg-[#1a1f24] p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col justify-between">
                                <h3 className="text-gray-900 dark:text-white font-black uppercase italic tracking-tighter text-xl mb-10">Board Market Share</h3>
                                <div className="flex-1 min-h-[300px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.byBoard}
                                                innerRadius={85}
                                                outerRadius={115}
                                                paddingAngle={8}
                                                dataKey="count"
                                                nameKey="_id"
                                                stroke="none"
                                            >
                                                {analytics.byBoard.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Boards</p>
                                        <h4 className="text-3xl font-black text-gray-900 dark:text-white">{analytics.byBoard.length}</h4>
                                    </div>
                                </div>
                                <div className="mt-10 space-y-4">
                                    {analytics.byBoard.slice(0, 4).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                                <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{item._id}</span>
                                            </div>
                                            <span className="text-gray-900 dark:text-white font-black text-sm">{Math.round((item.count / analytics.overview.totalAdmissions) * 100)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Territorial Dominance Table */}
                        <div className="bg-white dark:bg-[#1a1f24] p-10 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-2xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                                <div>
                                    <h3 className="text-gray-900 dark:text-white font-black uppercase italic tracking-tighter text-2xl mb-2">Regional Performance audit</h3>
                                    <p className="text-gray-400 dark:text-gray-500 text-xs font-bold">Territorial breakdown of market penetration and collection efficiency.</p>
                                </div>
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 px-6 py-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <FaBuilding className="text-cyan-500" />
                                    <div className="text-left">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Active Hubs</p>
                                        <h4 className="text-lg font-black text-gray-900 dark:text-white leading-none">{analytics.byCentre.length}</h4>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-50 dark:border-gray-800">
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-left">Centre Unit</th>
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Enroll Ratio</th>
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Invoiced (₹)</th>
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Settled (₹)</th>
                                            <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Efficiency</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                        {analytics.byCentre.map((item, idx) => {
                                            const efficiency = Math.round((item.paid / item.expected) * 100) || 0;
                                            return (
                                                <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-all">
                                                    <td className="py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-cyan-500 font-black text-[10px] border border-gray-100 dark:border-gray-700">
                                                                {item._id.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-tight">{item._id}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-6">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-gray-900 dark:text-white font-black text-sm">{item.count}</span>
                                                            <div className="w-24 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-cyan-500" 
                                                                    style={{ width: `${(item.count / analytics.overview.totalAdmissions) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 text-right font-bold text-gray-400 dark:text-gray-500 text-sm">
                                                        {item.expected.toLocaleString()}
                                                    </td>
                                                    <td className="py-6 text-right font-black text-gray-900 dark:text-white text-sm">
                                                        {item.paid.toLocaleString()}
                                                    </td>
                                                    <td className="py-6 text-right">
                                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                                                            ${efficiency > 80 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                              efficiency > 50 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                                                              'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                            {efficiency}%
                                                            <FaArrowRight className="text-[8px]" />
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
                )}
            </div>
        </Layout>
    );
};

export default BoardAnalysis;
