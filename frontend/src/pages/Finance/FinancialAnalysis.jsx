import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { FaChartLine, FaMoneyBillWave, FaCalendarAlt, FaFilter, FaArrowUp, FaArrowDown, FaBuilding } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

const FinancialAnalysis = () => {
    const [loading, setLoading] = useState(true);
    const [selectedCentre, setSelectedCentre] = useState("");
    const [allowedCentres, setAllowedCentres] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState("This Month");
    const [centres, setCentres] = useState([]);
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

    const COLORS = ['#00C49F', '#8884d8', '#FFBB28', '#FF8042', '#0088FE', '#FF3D67'];

    useEffect(() => {
        const init = async () => {
            const perms = await fetchUserPermissions();
            setAllowedCentres(perms);

            const loadedCentres = await fetchCentres(perms);

            if (perms !== null && loadedCentres && loadedCentres.length > 0) {
                setSelectedCentre(loadedCentres[0]._id);
            }

            setIsReady(true);
        };
        init();
    }, []);

    useEffect(() => {
        if (isReady) {
            fetchAnalytics();
        }
    }, [selectedCentre, selectedPeriod, isReady]);

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
            if (selectedCentre) params.append("centreId", selectedCentre);
            params.append("period", selectedPeriod);

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

    const StatCard = ({ title, amount, subtitle, colorClass, icon, trend }) => (
        <div className={`bg-[#1a1f24] p-5 rounded-2xl border border-gray-800 transition-all hover:border-cyan-500/50 group relative overflow-hidden shadow-xl`}>
            <div className={`absolute top-0 left-0 w-full h-[2px] ${colorClass}`}></div>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-800/50 rounded-xl text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-300">
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
                <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{formatCurrency(amount)}</h3>
                <p className="text-gray-600 text-[10px] font-medium italic">{subtitle}</p>
            </div>
        </div>
    );

    const paymentBreakdownData = Object.entries(analytics.paymentBreakdown)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ name, value }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#11161a] border border-gray-800 p-3 rounded-xl shadow-2xl">
                    <p className="text-gray-400 text-[10px] uppercase font-black mb-1">{label}</p>
                    <p className="text-cyan-400 font-bold text-lg">{formatCurrency(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <Layout activePage="Finance & Fees">
            <div className="p-4 space-y-8 animate-fade-in pb-20">
                <ToastContainer position="top-right" theme="dark" />

                {/* Glassmorphic Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-[#1a1f24]/50 p-6 rounded-3xl border border-gray-800 backdrop-blur-xl">
                    <div className="relative">
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 blur-[50px] rounded-full"></div>
                        <div className="flex items-center gap-4 mb-2 relative z-10">
                            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-cyan-500/20">
                                <FaChartLine size={28} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Payment <span className="text-cyan-400">Analysis</span></h1>
                                <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mt-1">Real-time Financial Intelligence Unit</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 bg-gray-900/50 p-2 rounded-2xl border border-gray-800 backdrop-blur-md relative z-10">
                        <div className="flex items-center gap-3 px-3">
                            <FaBuilding className="text-cyan-500 text-sm" />
                            <select
                                value={selectedCentre}
                                onChange={(e) => setSelectedCentre(e.target.value)}
                                className="bg-transparent text-white text-xs focus:outline-none cursor-pointer font-black uppercase tracking-wider w-44"
                            >
                                {allowedCentres === null && <option value="" className="bg-[#1a1f24]">All Global Centres</option>}
                                {centres.map(c => (
                                    <option key={c._id} value={c._id} className="bg-[#1a1f24]">{c.centreName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-[1px] h-8 bg-gray-800 hidden lg:block"></div>
                        <div className="flex items-center gap-3 px-3">
                            <FaCalendarAlt className="text-cyan-500 text-sm" />
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="bg-transparent text-white text-xs focus:outline-none cursor-pointer font-black uppercase tracking-wider"
                            >
                                <option value="This Month" className="bg-[#1a1f24]">Reporting Month</option>
                                <option value="Last Month" className="bg-[#1a1f24]">Previous Month</option>
                                <option value="This Quarter" className="bg-[#1a1f24]">Quarterly View</option>
                                <option value="This Year" className="bg-[#1a1f24]">Annual Forecast</option>
                                <option value="All Time" className="bg-[#1a1f24]">Historical Data</option>
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="relative w-20 h-20">
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500/20 rounded-full"></div>
                            <div className="absolute top-0 left-0 w-full h-full border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
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
                                title="Gross Billing"
                                amount={analytics.totalAmountToCome}
                                subtitle="Total Invoiced Value"
                                colorClass="bg-gradient-to-r from-blue-600 to-cyan-500"
                                icon={<FaChartLine size={20} />}
                                trend={12}
                            />
                            <StatCard
                                title="Realized Revenue"
                                amount={analytics.totalAmountCame}
                                subtitle="Active Cash Flow"
                                colorClass="bg-gradient-to-r from-green-600 to-emerald-500"
                                icon={<FaMoneyBillWave size={20} />}
                                trend={8}
                            />
                            <StatCard
                                title="Expected Receivables"
                                amount={analytics.amountWillCome}
                                subtitle="Current Cycle Pending"
                                colorClass="bg-gradient-to-r from-purple-600 to-pink-500"
                                icon={<FaCalendarAlt size={20} />}
                                trend={-3}
                            />
                            <StatCard
                                title="Total Overdue"
                                amount={analytics.totalDue}
                                subtitle="High Risk Recovery"
                                colorClass="bg-gradient-to-r from-red-600 to-orange-500"
                                icon={<FaFilter size={20} />}
                                trend={5}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Revenue Trend Chart */}
                            <div className="lg:col-span-2 bg-[#1a1f24] p-8 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent opacity-30"></div>
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-white font-black uppercase italic tracking-tighter text-lg">Revenue Performance Trend</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 tracking-widest bg-gray-900/50 px-3 py-1 rounded-full border border-gray-800">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
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
                            <div className="bg-[#1a1f24] p-8 rounded-3xl border border-gray-800 shadow-2xl flex flex-col h-full">
                                <h3 className="text-white font-black uppercase italic tracking-tighter text-lg mb-8">Payment Mix</h3>
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
                                        <div key={idx} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.name}</span>
                                            <span className="text-gray-200 font-bold ml-auto mr-4">{Math.round((item.value / analytics.totalAmountCame) * 100)}%</span>
                                            <span className="text-white font-black">{formatCurrency(item.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Centre Distribution (ONLY IF ALL CENTRES SELECTED) */}
                        {!selectedCentre && analytics.centreData.length > 0 && (
                            <div className="bg-[#1a1f24] p-8 rounded-3xl border border-gray-800 shadow-2xl group">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-white font-black uppercase italic tracking-tighter text-lg">Revenue by Global Centre</h3>
                                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                                        <FaBuilding size={20} />
                                    </div>
                                </div>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.centreData} layout="vertical">
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                stroke="#4a5568"
                                                fontSize={10}
                                                fontWeight="black"
                                                tickLine={false}
                                                axisLine={false}
                                                width={150}
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                            <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={25}>
                                                {analytics.centreData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Detailed Table Section (Simulated) */}
                        <div className="bg-[#1a1f24] p-8 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px]"></div>
                            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8 relative z-10">
                                <div>
                                    <h3 className="text-white font-black uppercase italic tracking-tighter text-xl mb-2">Detailed Financial Breakdown</h3>
                                    <p className="text-gray-500 text-xs font-bold leading-relaxed">Cross-referenced audit of all financial instruments for the current reporting cycle.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase mb-1">Portfolio Value</p>
                                    <h2 className="text-4xl font-black text-white tracking-tighter">{formatCurrency(analytics.totalAmountToCome)}</h2>
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
                                    <tbody className="divide-y divide-gray-800/50">
                                        {Object.entries(analytics.paymentBreakdown).map(([key, val], idx) => (
                                            <tr key={idx} className="hover:bg-gray-800/30 transition-colors group">
                                                <td className="py-6">
                                                    <div className="flex items-center gap-3 font-bold text-white text-sm">
                                                        <div className={`w-2 h-2 rounded-full ${COLORS[idx % COLORS.length]}`}></div>
                                                        {key}
                                                    </div>
                                                </td>
                                                <td className="py-6">
                                                    <div className="w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-cyan-500 rounded-full transition-all duration-1000"
                                                            style={{ width: `${(val / analytics.totalAmountCame) * 100 || 0}%` }}
                                                        ></div>
                                                    </div>
                                                </td>
                                                <td className="py-6 text-right font-black text-white">{formatCurrency(val)}</td>
                                                <td className="py-6 text-right">
                                                    <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-black rounded-full uppercase tracking-widest border border-green-500/20">
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
