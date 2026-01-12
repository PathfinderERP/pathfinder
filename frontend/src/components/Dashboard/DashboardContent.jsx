import React, { useState, useEffect, useMemo } from "react";
import {
    FaExclamationTriangle, FaLightbulb, FaRocket, FaChartLine, FaRobot,
    FaMapMarkerAlt, FaBuilding, FaUsers, FaMoneyBillWave, FaArrowUp,
    FaArrowDown, FaChevronRight, FaPlus, FaSearch, FaEllipsisV,
    FaChartBar, FaChartPie, FaGlobe, FaFilter, FaLayerGroup, FaFire, FaDatabase
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart as ReBarChart, Bar, Cell, PieChart, Pie, Legend,
    ComposedChart, Line
} from 'recharts';

// --- Mock Data ---
const MOCK_METRICS = {
    totalRevenue: "₹12.4 Cr",
    revenueGrowth: "+15.2%",
    activeStudents: "4,250",
    studentGrowth: "+5.4%",
    leadConversion: "22.5%",
    conversionGrowth: "-2.1%",
    activeCentres: "14"
};

const MOCK_ZONES = [
    {
        _id: "z1",
        name: "North Kolkata",
        centresCount: 5,
        totalRevenue: "₹3.2 Cr",
        performance: "Excellent",
        growth: "+12%",
        students: 1200,
        trend: [40, 55, 45, 60, 75, 70, 85, 90]
    },
    {
        _id: "z2",
        name: "South Kolkata",
        centresCount: 4,
        totalRevenue: "₹4.1 Cr",
        performance: "Good",
        growth: "+8%",
        students: 1500,
        trend: [30, 40, 35, 50, 45, 60, 55, 65]
    },
    {
        _id: "z3",
        name: "West Bengal Suburban",
        centresCount: 5,
        totalRevenue: "₹2.8 Cr",
        performance: "Average",
        growth: "+4%",
        students: 950,
        trend: [50, 45, 55, 40, 50, 45, 40, 35]
    }
];

const MOCK_CENTRES_DETAIL = {
    "z1": [
        { name: "Kolkata Main Campus", revenue: "₹1.2 Cr", students: 450, growth: "+15%", conversion: "28%" },
        { name: "Salt Lake", revenue: "₹85L", students: 320, growth: "+10%", conversion: "24%" },
        { name: "Howrah Maidan", revenue: "₹65L", students: 250, growth: "+8%", conversion: "21%" },
        { name: "KOL004", revenue: "₹30L", students: 120, growth: "-2%", conversion: "15%" },
        { name: "KOL005", revenue: "₹20L", students: 60, growth: "+5%", conversion: "18%" }
    ],
    "z2": [
        { name: "Gariahat", revenue: "₹1.5 Cr", students: 550, growth: "+18%", conversion: "32%" },
        { name: "Tollygunge", revenue: "₹90L", students: 350, growth: "+5%", conversion: "22%" },
        { name: "Behala", revenue: "₹1.1 Cr", students: 400, growth: "+12%", conversion: "26%" },
        { name: "South City", revenue: "₹60L", students: 200, growth: "-1%", conversion: "19%" }
    ],
    "z3": [
        { name: "Durgapur", revenue: "₹1.1 Cr", students: 400, growth: "+7%", conversion: "25%" },
        { name: "Asansol", revenue: "₹80L", students: 300, growth: "+3%", conversion: "20%" },
        { name: "Siliguri", revenue: "₹60L", students: 250, growth: "-5%", conversion: "16%" },
        { name: "Malda", revenue: "₹30L", students: 120, growth: "-10%", conversion: "12%" }
    ]
};

// --- Sub-components ---

const StatCard = ({ title, value, growth, icon: Icon, color }) => (
    <div className="bg-[#1a1f24] rounded-2xl p-6 border border-gray-800 hover:border-cyan-500/50 transition-all group overflow-hidden relative">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-${color}-500 opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-black text-white mb-2">{value}</h3>
                <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold ${growth.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                        {growth.startsWith('+') ? <FaArrowUp className="inline mr-1" /> : <FaArrowDown className="inline mr-1" />}
                        {growth.replace(/[+-]/, '')}
                    </span>
                    <span className="text-gray-600 text-[10px] font-bold">vs last month</span>
                </div>
            </div>
            <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform`}>
                <Icon className="text-xl" />
            </div>
        </div>
    </div>
);

const Sparkline = ({ data, color }) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    const width = 100;
    const height = 30;
    const points = data.map((d, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((d - min) / range) * height
    }));

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            />
        </svg>
    );
};

const ZoneCard = ({ zone, onClick }) => (
    <div
        onClick={() => onClick(zone)}
        className="bg-[#1a1f24] rounded-2xl p-6 border border-gray-800 hover:border-cyan-500 transition-all cursor-pointer group hover:shadow-2xl hover:shadow-cyan-500/10"
    >
        <div className="flex justify-between items-start mb-6">
            <div>
                <h4 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{zone.name}</h4>
                <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">{zone.centresCount} Centres</p>
            </div>
            <div className="flex items-center gap-2">
                <Sparkline data={zone.trend} color={zone.growth.startsWith('+') ? '#4ade80' : '#f87171'} />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Total Revenue</p>
                <p className="text-lg font-black text-white">{zone.totalRevenue}</p>
            </div>
            <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Growth</p>
                <p className={`text-lg font-black ${zone.growth.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                    {zone.growth}
                </p>
            </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${zone.performance === 'Excellent' ? 'bg-green-500 animate-pulse' : zone.performance === 'Good' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                <span className="text-xs font-bold text-gray-400">{zone.performance} Performance</span>
            </div>
            <FaChevronRight className="text-gray-600 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-all" />
        </div>
    </div>
);

const ChartContainer = ({ title, children, icon: Icon }) => (
    <div className="bg-[#1a1f24] rounded-2xl p-6 border border-gray-800 shadow-xl overflow-hidden relative">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg text-cyan-400">
                    <Icon />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            </div>
            <button className="text-gray-500 hover:text-white">
                <FaEllipsisV />
            </button>
        </div>
        <div className="relative h-64 w-full">
            {children}
        </div>
    </div>
);

const DashboardDonut = ({ data, colors }) => (
    <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ backgroundColor: '#1a1f24', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
            </PieChart>
        </ResponsiveContainer>
    </div>
);

const FunnelSegment = ({ label, value, sublabel, percentage, color }) => (
    <div className="flex flex-col gap-2 group cursor-pointer">
        <div className="flex justify-between items-end px-2">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
            <span className="text-xs font-bold text-white">{value}</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700/50">
            <div
                className={`h-full bg-gradient-to-r ${color} transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.2)]`}
                style={{ width: `${percentage}%` }}
            />
        </div>
        <div className="flex justify-between items-center px-2">
            <span className="text-[9px] text-gray-400 italic">{sublabel}</span>
            <span className="text-[10px] font-black text-cyan-400">{percentage}%</span>
        </div>
    </div>
);

const DashboardContent = () => {
    const [selectedZone, setSelectedZone] = useState(null);
    const [selectedCentre, setSelectedCentre] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [centreLoading, setCentreLoading] = useState(false);
    const [sessions, setSessions] = useState([]);
    const [filters, setFilters] = useState({
        session: "",
        startDate: "",
        endDate: ""
    });
    const [data, setData] = useState({
        metrics: {
            totalRevenue: "₹0",
            activeStudents: "0",
            leadConversion: "0%",
            activeCentres: "0",
            growth: { revenue: "+0%", students: "+0%", conversion: "+0%" }
        },
        zones: [],
        revenueTrend: [
            { name: "Jun", revenue: 0, admissions: 0 },
            { name: "Jul", revenue: 0, admissions: 0 },
            { name: "Aug", revenue: 0, admissions: 0 },
            { name: "Sep", revenue: 0, admissions: 0 },
            { name: "Oct", revenue: 0, admissions: 0 },
            { name: "Nov", revenue: 0, admissions: 0 },
            { name: "Dec", revenue: 0, admissions: 0 },
            { name: "Jan", revenue: 0, admissions: 0 }
        ],
        funnel: {
            leads: 0,
            hotLeads: 0,
            coldLeads: 0,
            admissions: 0
        },
        courseDistribution: [],
        sourceStats: []
    });
    const [centreData, setCentreData] = useState(null);

    // Fetch Analytics Data
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            if (filters.session) queryParams.append('session', filters.session);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/analytics?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch analytics');

            const result = await response.json();
            if (result.success) {
                setData(result.data);
                // If we have a selected zone, update it from the new data
                if (selectedZone) {
                    const updatedZone = result.data.zones.find(z => z._id === selectedZone._id);
                    if (updatedZone) setSelectedZone(updatedZone);
                }
            }
        } catch (error) {
            console.error('Analytics Fetch Error:', error);
            toast.error('Failed to load real-time analytics');
        } finally {
            setLoading(false);
        }
    };

    // Fetch Sessions for Filter
    const fetchSessions = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/session/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) setSessions(result.data);
        } catch (error) {
            console.error('Session Fetch Error:', error);
        }
    };

    // Fetch Specific Centre Analytics
    const fetchCentreDetails = async (centreId) => {
        try {
            setCentreLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/centre/${centreId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result.success) {
                setCentreData(result.data);
            }
        } catch (error) {
            console.error('Centre Analytics Fetch Error:', error);
            toast.error('Failed to load centre details');
        } finally {
            setCentreLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        fetchAnalytics();
    }, []);

    // Re-fetch when filters change
    useEffect(() => {
        fetchAnalytics();
    }, [filters]);

    const handleZoneClick = (zone) => {
        setIsAnimating(true);
        setTimeout(() => {
            setSelectedZone(zone);
            setIsAnimating(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    };

    const handleCentreClick = (centre) => {
        setIsAnimating(true);
        setTimeout(() => {
            setSelectedCentre(centre);
            fetchCentreDetails(centre._id);
            setIsAnimating(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    };

    const handleBack = () => {
        setIsAnimating(true);
        setTimeout(() => {
            if (selectedCentre) {
                setSelectedCentre(null);
                setCentreData(null);
            } else if (selectedZone) {
                setSelectedZone(null);
            }
            setIsAnimating(false);
        }, 300);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    if (loading && !data.zones.length) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#131619]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Syncing Global Data...</p>
                </div>
            </div>
        );
    }

    // --- Centre Detail View ---
    if (selectedCentre) {
        return (
            <div className={`flex-1 p-6 overflow-y-auto bg-[#131619] transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={handleBack} className="p-3 bg-gray-800 rounded-xl text-cyan-400 hover:bg-gray-700 transition-all border border-gray-700">
                        <FaChevronRight className="transform rotate-180" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                                {selectedCentre.name}
                            </span>
                            <span className="text-lg bg-gray-800 text-gray-400 px-3 py-1 rounded-full font-bold tracking-tighter uppercase">Tower Analysis</span>
                        </h2>
                        <p className="text-gray-500 mt-1 font-medium">Deep dive into centre-specific financial performance and trends</p>
                    </div>
                </div>

                {centreLoading ? (
                    <div className="h-96 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                    </div>
                ) : centreData ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard title="Total Revenue" value={selectedCentre.revenue} growth={selectedCentre.growth} icon={FaMoneyBillWave} color="cyan" />
                            <StatCard title="Total Admitted" value={selectedCentre.students} growth="+2.1%" icon={FaUsers} color="blue" />
                            <StatCard title="Efficiency Score" value="94%" growth="+5%" icon={FaRocket} color="orange" />
                            <StatCard title="Active Inquiries" value="124" growth="+12" icon={FaSearch} color="purple" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                            <div className="lg:col-span-2">
                                <ChartContainer title="Monthly Revenue Trend" icon={FaChartLine}>
                                    <BarChart data={centreData.monthlyData.map(d => ({ name: d.month, value: d.revenue, displayValue: d.revenueFormatted }))} />
                                </ChartContainer>
                            </div>
                            <div>
                                <ChartContainer title="Admissions Split" icon={FaChartPie}>
                                    <DonutChart value={parseInt(selectedCentre.conversion)} label="Conversion" color="#3b82f6" />
                                </ChartContainer>
                            </div>
                        </div>

                        <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 overflow-hidden">
                            <div className="p-6 border-b border-gray-800">
                                <h3 className="text-lg font-bold text-white">Monthly breakdown - {centreData.year}</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#131619]/50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Month</th>
                                            <th className="px-6 py-4 text-right">Revenue</th>
                                            <th className="px-6 py-4 text-right">Admissions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {centreData.monthlyData.slice().reverse().map((m, i) => (
                                            <tr key={i} className="hover:bg-cyan-500/5 transition-colors">
                                                <td className="px-6 py-4 font-bold text-white">{m.month}</td>
                                                <td className="px-6 py-4 text-right font-mono text-cyan-400">{m.revenueFormatted}</td>
                                                <td className="px-6 py-4 text-right text-gray-300 font-bold">{m.admissions}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="p-12 text-center bg-gray-800/20 rounded-2xl border border-gray-800">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No Data Found for this Centre</p>
                    </div>
                )}
            </div>
        );
    }

    // --- Zone Detail View ---
    if (selectedZone) {
        const details = selectedZone.centres || [];
        return (
            <div className={`flex-1 p-6 overflow-y-auto bg-[#131619] transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={handleBack} className="p-3 bg-gray-800 rounded-xl text-cyan-400 hover:bg-gray-700 transition-all border border-gray-700">
                        <FaChevronRight className="transform rotate-180" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-white flex items-center gap-3">
                            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                                {selectedZone.name}
                            </span>
                            <span className="text-lg bg-gray-800 text-gray-400 px-3 py-1 rounded-full font-bold tracking-tighter uppercase">Insights</span>
                        </h2>
                        <p className="text-gray-500 mt-1 font-medium italic">Zone-wise breakdown of {selectedZone.centresCount} alloted centres</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Zone Revenue" value={selectedZone.totalRevenue} growth={selectedZone.growth} icon={FaMoneyBillWave} color="cyan" />
                    <StatCard title="Total Students" value={selectedZone.students} growth="+3.2%" icon={FaUsers} color="blue" />
                    <StatCard title="Avg Conversion" value="24.4%" growth="-1.2%" icon={FaChartPie} color="purple" />
                    <StatCard title="Active Campaigns" value="8" growth="+4" icon={FaRocket} color="orange" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <ChartContainer title="Revenue by Centre" icon={FaChartBar}>
                        <BarChart data={details.map(c => ({ name: c.name, value: c.revenueRaw, displayValue: c.revenue }))} />
                    </ChartContainer>
                    <ChartContainer title="Performance Efficiency" icon={FaChartPie}>
                        <div className="flex flex-wrap justify-center gap-8">
                            <DonutChart value={85} label="Capacity" color="#06b6d4" />
                            <DonutChart value={68} label="Conversion" color="#8b5cf6" />
                        </div>
                    </ChartContainer>
                </div>

                <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Centre Performance Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#131619]/50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Centre Name</th>
                                    <th className="px-6 py-4">Revenue</th>
                                    <th className="px-6 py-4 text-center">Students</th>
                                    <th className="px-6 py-4 text-center">Conversion</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {details.map((centre, i) => (
                                    <tr key={i} className="hover:bg-cyan-500/5 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{centre.name}</td>
                                        <td className="px-6 py-4 font-mono text-cyan-400">{centre.revenue}</td>
                                        <td className="px-6 py-4 text-center text-gray-300 font-bold">{centre.students}</td>
                                        <td className="px-6 py-4 text-center text-gray-300 font-bold">{centre.conversion}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleCentreClick(centre)}
                                                className="px-4 py-1.5 bg-gray-800 text-cyan-400 text-[10px] font-black uppercase rounded-lg border border-gray-700 hover:bg-cyan-500 hover:text-black transition-all"
                                            >
                                                View Tower
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // --- Main Dashboard View ---
    return (
        <div className={`flex-1 p-6 overflow-y-auto bg-[#131619] transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            {/* Executive Header & Filters */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-10 gap-6">
                <div>
                    <h1 className="text-5xl font-black text-white tracking-tighter leading-none mb-2">
                        EXECUTIVE <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent italic">TOWER</span>
                    </h1>
                    <p className="text-gray-500 font-medium uppercase tracking-[0.2em] text-[10px]">Real-time command center for zone & academic performance</p>
                </div>

                {/* Advanced Filters */}
                <div className="flex flex-wrap items-center gap-4 bg-[#1a1f24] p-4 rounded-2xl border border-gray-800 shadow-2xl">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Academic Session</label>
                        <select
                            name="session"
                            value={filters.session}
                            onChange={handleFilterChange}
                            className="bg-[#131619] text-gray-300 text-xs font-bold px-4 py-2 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none transition-all w-48"
                        >
                            <option value="">All Sessions</option>
                            {sessions.map(s => <option key={s._id} value={s.sessionName}>{s.sessionName}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Start Date</label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="bg-[#131619] text-gray-300 text-xs font-bold px-4 py-2 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-gray-500 uppercase ml-1">End Date</label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="bg-[#131619] text-gray-300 text-xs font-bold px-4 py-2 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setFilters({ session: "", startDate: "", endDate: "" })}
                        className="self-end p-2 bg-gray-800 text-gray-400 rounded-xl hover:text-white transition-all border border-gray-700"
                        title="Reset Filters"
                    >
                        <FaSearch className="transform rotate-90" />
                    </button>
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500 self-center ml-2"></div>}
                </div>
            </div>

            {/* Global Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="Global Revenue" value={data.metrics.totalRevenue} growth={data.metrics.growth.revenue} icon={FaMoneyBillWave} color="cyan" />
                <StatCard title="Active Roster" value={data.metrics.activeStudents} growth={data.metrics.growth.students} icon={FaUsers} color="blue" />
                <StatCard title="Conversion Path" value={data.metrics.leadConversion} growth={data.metrics.growth.conversion} icon={FaChartLine} color="purple" />
                <StatCard title="Operational Hubs" value={data.metrics.activeCentres} growth="+0" icon={FaBuilding} color="orange" />
            </div>

            {/* Zone Map Section */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/5">
                            <FaMapMarkerAlt className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Operational <span className="text-cyan-500">Zones</span></h2>
                            <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">Performance Index by Territory</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.zones.map(zone => (
                        <ZoneCard key={zone._id} zone={zone} onClick={handleZoneClick} />
                    ))}
                    {data.zones.length === 0 && (
                        <div className="col-span-full p-20 text-center bg-[#1a1f24] rounded-3xl border-2 border-gray-800 border-dashed">
                            <i className="text-gray-600 block mb-4 text-3xl font-black">404_NO_ZONES_SYNCED</i>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Awaiting data stream from backend services...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Advanced Sales Analytics Command Center */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

                {/* 1. Global Performance Nexus (Trends) */}
                <div className="lg:col-span-2 bg-[#1a1f24] rounded-3xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                <FaChartLine className="text-cyan-400" />
                                SALES GROWTH TRAJECTORY
                            </h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Global Revenue vs Enrollment Velocity</p>
                        </div>
                        <div className="flex items-center gap-4 bg-gray-800/50 p-1.5 rounded-xl border border-gray-700">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase rounded-lg border border-cyan-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Revenue
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase rounded-lg border border-blue-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Admissions
                            </span>
                        </div>
                    </div>

                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.revenueTrend}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#4b5563"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontWeight: '800' }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="#4b5563"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                                    tick={{ fontWeight: '800' }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#4b5563"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontWeight: '800' }}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#06b6d4"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRev)"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="admissions"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Conversion Pipeline (Funnel) */}
                <div className="bg-[#1a1f24] rounded-3xl p-8 border border-gray-800 shadow-2xl flex flex-col relative overflow-hidden group">
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

                    <div className="mb-8 relative z-10">
                        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                            <FaLayerGroup className="text-orange-400" />
                            SALES PIPELINE
                        </h3>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Lead Conversion Efficiency Funnel</p>
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-4 space-y-6 relative z-10">
                        <FunnelSegment
                            label="Total Leads Sync"
                            value={data.funnel.leads}
                            sublabel="Untapped Potential"
                            percentage={100}
                            color="from-gray-700 to-gray-800"
                        />
                        <FunnelSegment
                            label="Hot Prospects"
                            value={data.funnel.hotLeads}
                            sublabel="High Probability"
                            percentage={data.funnel.leads > 0 ? Math.round((data.funnel.hotLeads / data.funnel.leads) * 100) : 0}
                            color="from-orange-500 to-red-500"
                        />
                        <FunnelSegment
                            label="Confirmed Admissions"
                            value={data.funnel.admissions}
                            sublabel="Realized Value"
                            percentage={parseInt(data.metrics.leadConversion)}
                            color="from-cyan-500 to-blue-500"
                        />
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-800/50 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-500 uppercase">Velocity</span>
                            <span className="text-lg font-black text-white">+12.4%</span>
                        </div>
                        <div className="p-3 bg-gray-800/80 rounded-2xl text-orange-400 border border-gray-700">
                            <FaFire className="animate-bounce" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* 3. Course Enrollment Matrix */}
                <div className="bg-[#1a1f24] rounded-3xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                <FaDatabase className="text-blue-400" />
                                ENROLLMENT BY COURSE
                            </h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Market Share Distribution</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-center">
                        <DashboardDonut
                            data={data.courseDistribution}
                            colors={['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']}
                        />
                    </div>
                </div>

                {/* 4. Lead Origin Analytics */}
                <div className="bg-[#1a1f24] rounded-3xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                <FaGlobe className="text-green-400" />
                                SOURCE ATTRIBUTION
                            </h3>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Lead Acquisition Channels</p>
                        </div>
                    </div>
                    <div className="h-[240px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ReBarChart data={data.sourceStats} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1f2937" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#9ca3af"
                                    fontSize={10}
                                    width={80}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontWeight: '800' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#1f2937' }}
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
                                />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                                    {data.sourceStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5]} />
                                    ))}
                                </Bar>
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
