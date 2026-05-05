import React, { useState } from "react";
import { 
    FaChartLine, FaShoppingCart, FaTrophy, FaUsers, 
    FaDollarSign, FaArrowUp, FaArrowDown, FaCalendarAlt,
    FaFilter, FaDownload, FaPlus
} from "react-icons/fa";
import { useTheme } from "../../context/ThemeContext";
import { hasPermission } from "../../config/permissions";

const SalesContent = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [selectedPeriod, setSelectedPeriod] = useState("month");

    // Permission checks
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const canCreate = hasPermission(user.granularPermissions, 'sales', 'sales', 'create');

    // Demo data
    const salesStats = [
        {
            title: "Total Revenue",
            value: "₹12,45,000",
            change: "+12.5%",
            trend: "up",
            icon: <FaDollarSign />,
            color: "cyan"
        },
        {
            title: "Total Orders",
            value: "1,234",
            change: "+8.2%",
            trend: "up",
            icon: <FaShoppingCart />,
            color: "green"
        },
        {
            title: "Active Customers",
            value: "856",
            change: "+15.3%",
            trend: "up",
            icon: <FaUsers />,
            color: "purple"
        },
        {
            title: "Conversion Rate",
            value: "68.5%",
            change: "-2.1%",
            trend: "down",
            icon: <FaTrophy />,
            color: "orange"
        }
    ];

    const recentOrders = [
        { id: "ORD-001", customer: "Rahul Sharma", amount: "₹15,000", status: "Completed", date: "2025-12-06" },
        { id: "ORD-002", customer: "Priya Patel", amount: "₹22,500", status: "Pending", date: "2025-12-06" },
        { id: "ORD-003", customer: "Amit Kumar", amount: "₹8,750", status: "Processing", date: "2025-12-05" },
        { id: "ORD-004", customer: "Sneha Reddy", amount: "₹31,200", status: "Completed", date: "2025-12-05" },
        { id: "ORD-005", customer: "Vikram Singh", amount: "₹19,800", status: "Completed", date: "2025-12-04" },
    ];

    const topProducts = [
        { name: "Premium Course Package", sales: 145, revenue: "₹4,35,000" },
        { name: "Standard Course Package", sales: 289, revenue: "₹3,46,800" },
        { name: "Basic Course Package", sales: 412, revenue: "₹2,47,200" },
        { name: "Advanced Coaching", sales: 98, revenue: "₹1,96,000" },
    ];

    const getStatusColor = (status) => {
        const colors = {
            Completed: isDarkMode ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-green-100 text-green-700 border-green-200",
            Pending: isDarkMode ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" : "bg-yellow-100 text-yellow-700 border-yellow-200",
            Processing: isDarkMode ? "bg-blue-500/20 text-blue-400 border-blue-500/50" : "bg-blue-100 text-blue-700 border-blue-200",
            Cancelled: isDarkMode ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-red-100 text-red-700 border-red-200"
        };
        return colors[status] || (isDarkMode ? "bg-gray-500/20 text-gray-400 border-gray-500/50" : "bg-gray-100 text-gray-700 border-gray-200");
    };

    const getStatColor = (color) => {
        const colors = {
            cyan: isDarkMode ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-cyan-100 text-cyan-600 border-cyan-200",
            green: isDarkMode ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-green-100 text-green-600 border-green-200",
            purple: isDarkMode ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-purple-100 text-purple-600 border-purple-200",
            orange: isDarkMode ? "bg-orange-500/20 text-orange-400 border-orange-500/50" : "bg-orange-100 text-orange-600 border-orange-200"
        };
        return colors[color] || (isDarkMode ? "bg-gray-500/20 text-gray-400 border-gray-500/50" : "bg-gray-100 text-gray-600 border-gray-200");
    };

    return (
        <div className={`flex-1 p-6 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#131619]' : 'bg-gray-50'}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <FaChartLine className="text-cyan-500" />
                        Sales <span className="text-cyan-500">Dashboard</span>
                    </h2>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1 font-bold`}>Track your sales performance and revenue</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className={`px-4 py-2 rounded-lg border focus:outline-none focus:border-cyan-500 font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'bg-[#1a1f24] text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200 shadow-sm'}`}
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>

                    <button className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'bg-gray-800 text-white border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm'}`}>
                        <FaFilter /> Filter
                    </button>

                    <button className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all font-bold text-xs uppercase tracking-widest ${isDarkMode ? 'bg-green-600/10 text-green-400 border-green-600/50 hover:bg-green-600/20' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}>
                        <FaDownload /> Export
                    </button>

                    {canCreate && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-black uppercase tracking-widest text-[10px] rounded-lg hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
                            <FaPlus /> New Order
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {salesStats.map((stat, index) => (
                    <div key={index} className={`p-6 rounded-xl border transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800 hover:border-cyan-500/50' : 'bg-white border-gray-200 shadow-sm hover:border-cyan-500/50'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-lg ${getStatColor(stat.color)} flex items-center justify-center text-xl`}>
                                {stat.icon}
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-black ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                                {stat.trend === "up" ? <FaArrowUp /> : <FaArrowDown />}
                                {stat.change}
                            </div>
                        </div>
                        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.title}</h3>
                        <p className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders */}
                <div className={`lg:col-span-2 rounded-xl border overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <h3 className={`text-lg font-black uppercase tracking-tighter italic flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaShoppingCart className="text-cyan-500" />
                            Recent <span className="text-cyan-500">Orders</span>
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isDarkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                    <th className={`p-4 text-left border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>Order ID</th>
                                    <th className={`p-4 text-left border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>Customer</th>
                                    <th className={`p-4 text-left border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>Amount</th>
                                    <th className={`p-4 text-left border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>Status</th>
                                    <th className={`p-4 text-left border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>Date</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y transition-colors ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {recentOrders.map((order, index) => (
                                    <tr key={index} className={`transition-colors ${isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                                        <td className="p-4 text-cyan-500 font-black text-xs">{order.id}</td>
                                        <td className={`p-4 font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.customer}</td>
                                        <td className={`p-4 font-black text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{order.amount}</td>
                                        <td className="p-4">
                                            <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-[10px] font-bold flex items-center gap-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            <FaCalendarAlt />
                                            {order.date}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Products */}
                <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${isDarkMode ? 'bg-[#1a1f24] border-gray-800' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className={`p-6 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                        <h3 className={`text-lg font-black uppercase tracking-tighter italic flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            <FaTrophy className="text-orange-500" />
                            Top <span className="text-orange-500">Products</span>
                        </h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {topProducts.map((product, index) => (
                            <div key={index} className={`p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${isDarkMode ? 'bg-gray-800/30 border-gray-700 hover:border-cyan-500/50' : 'bg-gray-50 border-gray-100 hover:border-cyan-500/50 shadow-sm'}`}>
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className={`font-black text-xs uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{product.name}</h4>
                                    <span className="bg-cyan-500/10 text-cyan-600 text-[10px] font-black px-2 py-1 rounded-full border border-cyan-500/20">
                                        #{index + 1}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{product.sales} sales</span>
                                    <span className="text-green-600 uppercase tracking-widest">{product.revenue}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Demo Notice */}
            <div className={`mt-6 border rounded-xl p-8 transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-cyan-800/50' : 'bg-gradient-to-r from-cyan-50 to-purple-50 border-cyan-100 shadow-sm'}`}>
                <div className="flex items-start gap-6">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0 shadow-lg ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400 shadow-cyan-500/10' : 'bg-white text-cyan-600 shadow-cyan-500/5'}`}>
                        <FaChartLine />
                    </div>
                    <div>
                        <h3 className={`text-xl font-black uppercase tracking-tighter italic mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Sales Dashboard - <span className="text-cyan-500">Demo Version</span></h3>
                        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm leading-relaxed font-bold`}>
                            This is a demo sales dashboard showcasing key metrics, recent orders, and top-performing products. 
                            The data shown here is sample data for demonstration purposes. In the production version, this will 
                            display real-time sales data, analytics, and comprehensive reporting features.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="bg-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full">
                                Real-time Analytics
                            </span>
                            <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-3 py-1 rounded-full">
                                Revenue Tracking
                            </span>
                            <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
                                Order Management
                            </span>
                            <span className="bg-orange-500/20 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full">
                                Performance Reports
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesContent;
