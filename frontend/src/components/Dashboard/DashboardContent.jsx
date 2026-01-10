import React, { useState, useEffect } from "react";
import {
    FaExclamationTriangle, FaLightbulb, FaRocket, FaChartLine, FaRobot,
    FaMapMarkerAlt, FaBuilding, FaUsers, FaMoneyBillWave, FaArrowUp,
    FaArrowDown, FaChevronRight, FaPlus, FaSearch, FaEllipsisV,
    FaChartBar, FaChartPie, FaGlobe
} from "react-icons/fa";
import { toast } from "react-toastify";

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
        <div className="relative h-64 flex items-center justify-center">
            {children}
        </div>
    </div>
);

// Custom SVG Bar Chart
const BarChart = ({ data }) => {
    const maxValue = Math.max(...data.map(d => parseInt(d.value.replace(/[^0-9.]/g, ''))));
    return (
        <div className="flex items-end justify-between w-full h-full gap-4 pt-10 px-4">
            {data.map((d, i) => {
                const height = (parseInt(d.value.replace(/[^0-9.]/g, '')) / maxValue) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                        <div
                            className="bg-gradient-to-t from-cyan-600 to-blue-400 w-full rounded-t-lg transition-all duration-700 group-hover:brightness-125"
                            style={{ height: `${height}%` }}
                        >
                            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-xs font-black py-1 px-2 rounded whitespace-nowrap z-20">
                                {d.value}
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-3 text-center whitespace-nowrap overflow-hidden w-full overflow-ellipsis">
                            {d.name.split(' ')[0]}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

// Custom SVG Circle Chart
const DonutChart = ({ value, label, sublabel, color }) => {
    const size = 160;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#252b32"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white leading-none">{value}%</span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{label}</span>
            </div>
        </div>
    );
};

const DashboardContent = () => {
    const [selectedZone, setSelectedZone] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        metrics: {
            totalRevenue: "₹0",
            activeStudents: "0",
            leadConversion: "0%",
            activeCentres: "0",
            growth: { revenue: "+0%", students: "+0%", conversion: "+0%" }
        },
        zones: [],
        revenueTrend: [0, 0, 0, 0, 0, 0, 0, 0],
        departmentConversion: [
            { name: "Academics", value: 0 },
            { name: "Marketing", value: 0 }
        ]
    });

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/analytics`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) throw new Error('Failed to fetch analytics');

                const result = await response.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error('Analytics Fetch Error:', error);
                toast.error('Failed to load real-time analytics');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const handleZoneClick = (zone) => {
        setIsAnimating(true);
        setTimeout(() => {
            setSelectedZone(zone);
            setIsAnimating(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    };

    const handleBack = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setSelectedZone(null);
            setIsAnimating(false);
        }, 300);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#131619]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Syncing Global Data...</p>
                </div>
            </div>
        );
    }

    // If a zone is selected, show detail view
    if (selectedZone) {
        const details = selectedZone.centres || [];
        return (
            <div className={`flex-1 p-6 overflow-y-auto bg-[#131619] transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                {/* Header with Back Button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-3 bg-gray-800 rounded-xl text-cyan-400 hover:bg-gray-700 transition-all border border-gray-700 focus:outline-none"
                        >
                            <FaChevronRight className="transform rotate-180" />
                        </button>
                        <div>
                            <h2 className="text-3xl font-black text-white flex items-center gap-3">
                                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                                    {selectedZone.name}
                                </span>
                                <span className="text-lg bg-gray-800 text-gray-400 px-3 py-1 rounded-full font-bold">Analysis</span>
                            </h2>
                            <p className="text-gray-500 mt-1 font-medium italic">Zone-wise breakdown of {selectedZone.centresCount} alloted centres</p>
                        </div>
                    </div>
                </div>

                {/* Sub-Metrics for the Zone */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Zone Revenue" value={selectedZone.totalRevenue} growth={selectedZone.growth} icon={FaMoneyBillWave} color="cyan" />
                    <StatCard title="Total Students" value={selectedZone.students} growth="+3.2%" icon={FaUsers} color="blue" />
                    <StatCard title="Avg Conversion" value="24.4%" growth="-1.2%" icon={FaChartPie} color="purple" />
                    <StatCard title="Active Campaigns" value="8" growth="+4" icon={FaRocket} color="orange" />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <ChartContainer title="Revenue by Centre" icon={FaChartBar}>
                        <BarChart data={details.map(c => ({ name: c.name, value: c.revenue }))} />
                    </ChartContainer>
                    <ChartContainer title="Performance Efficiency" icon={FaChartPie}>
                        <div className="flex flex-wrap justify-center gap-8">
                            <DonutChart value={85} label="Capacity" color="#06b6d4" />
                            <DonutChart value={68} label="Conversion" color="#8b5cf6" />
                        </div>
                    </ChartContainer>
                </div>

                {/* Detailed Table */}
                <div className="bg-[#1a1f24] rounded-2xl border border-gray-800 shadow-xl overflow-hidden mb-8">
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Centre Performance Breakdown</h3>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[10px] font-black uppercase rounded-full tracking-widest border border-green-500/20">Live Sync</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#131619]/50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Centre Name</th>
                                    <th className="px-6 py-4">Revenue</th>
                                    <th className="px-6 py-4">Students</th>
                                    <th className="px-6 py-4">Conversion</th>
                                    <th className="px-6 py-4">Trend</th>
                                    <th className="px-6 py-4">Performance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {details.map((centre, i) => (
                                    <tr key={i} className="hover:bg-cyan-500/5 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-white group-hover:text-cyan-400">{centre.name}</td>
                                        <td className="px-6 py-4 font-mono text-cyan-400">{centre.revenue}</td>
                                        <td className="px-6 py-4 text-gray-300 font-bold">{centre.students}</td>
                                        <td className="px-6 py-4 text-gray-300 font-bold">{centre.conversion}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-black ${centre.growth.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                                {centre.growth}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full`}
                                                    style={{ width: centre.conversion }}
                                                />
                                            </div>
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

    // Default Summary View
    return (
        <div className={`flex-1 p-6 overflow-y-auto bg-[#131619] transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">
                        Executive <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent italic">Insights</span>
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Holistic overview of all business zones and performance metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-gray-800 text-gray-400 rounded-xl font-bold border border-gray-700 hover:text-white transition-all flex items-center gap-2">
                        <FaGlobe /> Financial Year 2023-24
                    </button>
                    <button className="p-3 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
                        <FaPlus />
                    </button>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="Total Revenue" value={data.metrics.totalRevenue} growth={data.metrics.growth.revenue} icon={FaMoneyBillWave} color="cyan" />
                <StatCard title="Active Students" value={data.metrics.activeStudents} growth={data.metrics.growth.students} icon={FaUsers} color="blue" />
                <StatCard title="Lead Conversion" value={data.metrics.leadConversion} growth={data.metrics.growth.conversion} icon={FaChartLine} color="purple" />
                <StatCard title="Active Centres" value={data.metrics.activeCentres} growth="+0" icon={FaBuilding} color="orange" />
            </div>

            {/* AI Powered Section (Modernized) */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg shadow-purple-500/20">
                        <FaRobot className="text-xl text-white animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">AI Strategies <span className="text-cyan-500">& Insights</span></h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Insights from existing code, restyled */}
                    <div className="bg-[#1a1f24] rounded-2xl p-6 border-t-4 border-red-500 shadow-xl group hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <FaExclamationTriangle className="text-red-500 text-xl" />
                            <h3 className="font-black text-white group-hover:text-red-400 transition-colors">Revenue Alert</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Malda center performance is <span className="text-red-400 font-bold italic">45% below target</span>. Conversion rates dropped significantly this week.
                        </p>
                        <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-2">
                                <FaLightbulb className="text-yellow-400" />
                                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">AI Action Plan</span>
                            </div>
                            <p className="text-xs text-gray-100 font-medium">Re-route senior counselors from high-performing zones for a 7-day intensive workshop.</p>
                        </div>
                    </div>

                    <div className="bg-[#1a1f24] rounded-2xl p-6 border-t-4 border-orange-500 shadow-xl group hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <FaRocket className="text-orange-500 text-xl" />
                            <h3 className="font-black text-white group-hover:text-orange-400 transition-colors">Growth Opportunity</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Salt Lake operates at <span className="text-orange-400 font-bold italic">78% capacity</span>. Local demand surged by 14.5% last quarter.
                        </p>
                        <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-2">
                                <FaLightbulb className="text-yellow-400" />
                                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">AI Action Plan</span>
                            </div>
                            <p className="text-xs text-gray-100 font-medium">Implement geo-targeted Meta campaigns within a 5km radius to fill the remaining 50 slots.</p>
                        </div>
                    </div>

                    <div className="bg-[#1a1f24] rounded-2xl p-6 border-t-4 border-cyan-500 shadow-xl group hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <FaChartLine className="text-cyan-400 text-xl" />
                            <h3 className="font-black text-white group-hover:text-cyan-400 transition-colors">Forecasting Insight</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                            Q4 projected to hit <span className="text-cyan-400 font-bold italic">₹8.4 Cr</span>. Historical data suggests 22% seasonal growth.
                        </p>
                        <div className="bg-gray-800/80 p-4 rounded-xl border border-gray-700 backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-2">
                                <FaLightbulb className="text-yellow-400" />
                                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">AI Smart Focus</span>
                            </div>
                            <p className="text-xs text-gray-100 font-medium">Incentivize early-bird admissions to maximize cash-flow stability for Q1 expansion.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zones Section */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-800 rounded-lg text-cyan-500">
                            <FaMapMarkerAlt />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Zone <span className="text-gray-500">Performance Overview</span></h2>
                    </div>
                    <button className="text-cyan-400 hover:text-cyan-300 text-sm font-black uppercase tracking-widest transition-colors">See all zones</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.zones.map(zone => (
                        <ZoneCard key={zone._id} zone={zone} onClick={handleZoneClick} />
                    ))}
                </div>
                {data.zones.length === 0 && (
                    <div className="p-12 text-center bg-gray-800/20 rounded-2xl border border-gray-800 dashed">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No Zone Data Available</p>
                    </div>
                )}
            </div>

            {/* Bottom Analysis Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                <ChartContainer title="Global Revenue Trend" icon={FaChartLine}>
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <div className="w-full h-40 relative group">
                            {/* Line Chart with dynamic anchor */}
                            <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <path
                                    d={`M0 80 Q 50 20, 100 60 T 200 10 T 300 70 T 400 ${100 - (data.revenueTrend[7] * 10)} L 400 100 L 0 100 Z`}
                                    fill="url(#gradient)"
                                    className="transition-all duration-1000"
                                />
                                <path
                                    d={`M0 80 Q 50 20, 100 60 T 200 10 T 300 70 T 400 ${100 - (data.revenueTrend[7] * 10)}`}
                                    fill="none"
                                    stroke="#06b6d4"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute top-0 right-0 p-2 bg-gray-700/50 backdrop-blur-md rounded border border-gray-600 text-[10px] font-black text-white uppercase">Live Analytics</div>
                        </div>
                    </div>
                </ChartContainer>

                <ChartContainer title="Conversion by Department" icon={FaChartPie}>
                    <div className="flex gap-8 items-center justify-center h-full">
                        <DonutChart value={data.departmentConversion[0].value} label="Academics" color="#3b82f6" />
                        <DonutChart value={data.departmentConversion[1].value} label="Marketing" color="#f59e0b" />
                    </div>
                </ChartContainer>
            </div>
        </div>
    );
};

export default DashboardContent;
